-- Forward repair for main databases that skipped the older Mora migrations.
-- Drizzle wraps this and its registry insert in the pending-migrations transaction.
-- Project entrypoints lock BEFORE Drizzle reads its high-water mark.
DO $repair$
DECLARE
  target oid;
  user_column smallint;
  auth_column smallint;
  expected record;
BEGIN
  PERFORM pg_advisory_xact_lock(259, 20261124);
  LOCK TABLE drizzle.__drizzle_migrations IN SHARE ROW EXCLUSIVE MODE;
  IF to_regclass('public.help_usage') IS NULL THEN
    CREATE TABLE public.help_usage (
      user_id uuid PRIMARY KEY NOT NULL,
      window_started_at timestamptz NOT NULL,
      request_count integer DEFAULT 0 NOT NULL,
      active_lease_id uuid,
      active_until timestamptz
    );
  END IF;
  target := 'public.help_usage'::regclass;
  IF NOT EXISTS (SELECT 1 FROM pg_class WHERE oid = target AND relkind = 'r'
      AND NOT relispartition AND relpersistence = 'p')
    OR EXISTS (SELECT 1 FROM pg_inherits WHERE inhrelid = target OR inhparent = target) THEN
    RAISE EXCEPTION 'Mora repair: help_usage must be an ordinary permanent, non-inherited table';
  END IF;
  LOCK TABLE public.help_usage IN ACCESS EXCLUSIVE MODE;

  -- Compare every live column, not just the five expected names.
  IF EXISTS (
    SELECT 1 FROM (
      VALUES ('user_id', 'uuid'::regtype::oid, true, NULL::text),
        ('window_started_at', 'timestamptz'::regtype::oid, true, NULL::text),
        ('request_count', 'integer'::regtype::oid, true, '0'),
        ('active_lease_id', 'uuid'::regtype::oid, false, NULL::text),
        ('active_until', 'timestamptz'::regtype::oid, false, NULL::text)
    ) AS e(name, type_id, required, default_sql)
    FULL JOIN (
      SELECT a.attname::text AS name, a.atttypid AS type_id, a.attnotnull AS required,
        pg_get_expr(d.adbin, d.adrelid) AS default_sql,
        a.atttypmod, a.attidentity, a.attgenerated, a.attndims
      FROM pg_attribute a LEFT JOIN pg_attrdef d
        ON d.adrelid = a.attrelid AND d.adnum = a.attnum
      WHERE a.attrelid = target AND a.attnum > 0 AND NOT a.attisdropped
    ) AS a USING (name)
    WHERE e.name IS NULL OR a.name IS NULL OR e.type_id <> a.type_id
      OR e.required <> a.required OR e.default_sql IS DISTINCT FROM a.default_sql
      OR a.atttypmod <> -1 OR a.attidentity <> '' OR a.attgenerated <> '' OR a.attndims <> 0
  ) THEN
    RAISE EXCEPTION 'Mora repair: unexpected help_usage columns, types, nullability or defaults';
  END IF;
  SELECT attnum INTO user_column FROM pg_attribute
    WHERE attrelid = target AND attname = 'user_id' AND NOT attisdropped;
  SELECT attnum INTO auth_column FROM pg_attribute
    WHERE attrelid = 'auth.users'::regclass AND attname = 'id' AND NOT attisdropped;
  IF (SELECT count(*) FROM pg_constraint WHERE conrelid = target AND contype = 'p') <> 1
    OR NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conrelid = target AND contype = 'p'
      AND conkey = ARRAY[user_column] AND NOT condeferrable AND convalidated)
    OR EXISTS (SELECT 1 FROM pg_constraint WHERE conrelid = target AND contype NOT IN ('p', 'f'))
    OR EXISTS (SELECT 1 FROM pg_trigger WHERE tgrelid = target AND NOT tgisinternal)
    OR EXISTS (SELECT 1 FROM pg_policy WHERE polrelid = target)
    OR EXISTS (SELECT 1 FROM pg_rewrite WHERE ev_class = target)
    OR EXISTS (SELECT 1 FROM pg_index WHERE indrelid = target AND NOT indisprimary) THEN
    RAISE EXCEPTION 'Mora repair: unexpected help_usage constraints, indexes, triggers, rules or policies';
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conrelid = target AND contype = 'f') THEN
    ALTER TABLE public.help_usage ADD CONSTRAINT help_usage_user_id_auth_users_id_fk
      FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE;
  END IF;
  IF (SELECT count(*) FROM pg_constraint WHERE conrelid = target AND contype = 'f') <> 1
    OR NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conrelid = target AND contype = 'f'
      AND conname = 'help_usage_user_id_auth_users_id_fk'
      AND conkey = ARRAY[user_column] AND confrelid = 'auth.users'::regclass
      AND confkey = ARRAY[auth_column] AND confdeltype = 'c' AND confupdtype = 'a'
      AND confmatchtype = 's' AND NOT condeferrable) THEN
    RAISE EXCEPTION 'Mora repair: unexpected help_usage foreign key';
  END IF;
  ALTER TABLE public.help_usage VALIDATE CONSTRAINT help_usage_user_id_auth_users_id_fk;
  ALTER TABLE public.help_usage ENABLE ROW LEVEL SECURITY;
  REVOKE ALL ON TABLE public.help_usage FROM PUBLIC, anon, authenticated;
  -- Table-level REVOKE does not remove pre-existing column grants.
  REVOKE ALL (user_id, window_started_at, request_count, active_lease_id, active_until)
    ON TABLE public.help_usage FROM PUBLIC, anon, authenticated;
  IF NOT (SELECT relrowsecurity FROM pg_class WHERE oid = target)
    OR EXISTS (SELECT 1 FROM pg_roles r WHERE r.rolname IN ('anon', 'authenticated')
      AND (r.rolsuper OR r.rolbypassrls
        OR has_table_privilege(r.oid, target, 'SELECT,INSERT,UPDATE,DELETE,TRUNCATE,REFERENCES,TRIGGER')
        OR EXISTS (SELECT 1 FROM pg_attribute a WHERE a.attrelid = target AND a.attnum > 0
          AND NOT a.attisdropped AND has_column_privilege(r.oid, target, a.attnum, 'SELECT,INSERT,UPDATE,REFERENCES'))))
    OR EXISTS (SELECT 1 FROM pg_class c, LATERAL aclexplode(c.relacl) acl
      WHERE c.oid = target AND acl.grantee = 0)
    -- Include inherited ACL privileges such as PostgreSQL 17's MAINTAIN,
    -- without assuming a fixed list of table privilege names.
    OR EXISTS (SELECT 1 FROM pg_roles r CROSS JOIN pg_class c
      CROSS JOIN LATERAL aclexplode(c.relacl) acl
      WHERE c.oid = target AND r.rolname IN ('anon', 'authenticated')
        AND CASE WHEN acl.grantee = 0 THEN false ELSE pg_has_role(r.oid, acl.grantee, 'USAGE') END)
    OR EXISTS (SELECT 1 FROM pg_attribute a, LATERAL aclexplode(a.attacl) acl
      WHERE a.attrelid = target AND acl.grantee = 0) THEN
    RAISE EXCEPTION 'Mora repair: help_usage still exposes privileges (including inherited grants)';
  END IF;

  -- Immutable historical SQL SHA-256, accepting LF/CRLF checkout variants.
  -- Only record satisfied effects, and never rewrite existing registry rows.
  FOR expected IN SELECT * FROM (VALUES
    (1795287505824::bigint,
      '5e8358a68d1a21b746d766e07fd64a6357d146e4b4c0a19237876899bc68bf0c',
      '339295b60d1b4032210e10dc81cd2fa723d7d9db0b00f4900e90b626be3a8971'),
    (1795287593887::bigint,
      '95678fdd46c5939e950775c6bd566d0f5ddca2cdc6fb3bf9e448c275c31f531f',
      '9927788f807b45101569e22e5aca0f003a54bab850076df347deb810883364f3')
  ) AS h(stamp, lf_hash, crlf_hash) LOOP
    IF (SELECT count(*) FROM drizzle.__drizzle_migrations WHERE created_at = expected.stamp) > 1
      OR EXISTS (SELECT 1 FROM drizzle.__drizzle_migrations WHERE created_at = expected.stamp
        AND hash NOT IN (expected.lf_hash, expected.crlf_hash)) THEN
      RAISE EXCEPTION 'Mora repair: conflicting historical registry entry at %', expected.stamp;
    END IF;
    INSERT INTO drizzle.__drizzle_migrations (hash, created_at)
      SELECT expected.lf_hash, expected.stamp
      WHERE NOT EXISTS (SELECT 1 FROM drizzle.__drizzle_migrations WHERE created_at = expected.stamp);
  END LOOP;
END
$repair$;
