-- Issue #309: existing offers, awards and orders currently point to a tender
-- invitation, which is being removed. Copy the supplier from each invitation
-- before those rows and the invitation table are dropped by the next migration.
-- Runs right after the migration that added the new supplier_user_id columns.
--> statement-breakpoint
UPDATE "tender_offers" AS o
SET "supplier_user_id" = i."supplier_user_id"
FROM "tender_invitations" AS i
WHERE i."id" = o."invitation_id";--> statement-breakpoint
UPDATE "tender_awards" AS a
SET "supplier_user_id" = i."supplier_user_id"
FROM "tender_invitations" AS i
WHERE i."id" = a."invitation_id";--> statement-breakpoint
UPDATE "purchase_orders" AS p
SET "supplier_user_id" = i."supplier_user_id"
FROM "tender_invitations" AS i
WHERE i."id" = p."invitation_id";--> statement-breakpoint
-- RN-21 negotiation state also lived on the invitation row.
INSERT INTO "tender_negotiations" (
  "id", "tender_id", "supplier_user_id",
  "negotiation_requested_at", "negotiation_contact", "created_at"
)
SELECT
  gen_random_uuid(), i."tender_id", i."supplier_user_id",
  i."negotiation_requested_at", i."negotiation_contact", i."created_at"
FROM "tender_invitations" AS i
WHERE i."negotiation_requested_at" IS NOT NULL;