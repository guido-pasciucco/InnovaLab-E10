// Queries the validator must accept. Shared by the unit test and by
// sql-guard.int.test.ts, which runs each one against Postgres as analyst_reader
// so an accepted query is never one the database cannot execute.
export const ACCEPTED: [string, string][] = [
  ["a count over a view", "select count(*) from analyst.products"],
  ["a view without schema", "select name from products where is_active"],
  [
    "a monthly total with grouping and ordering",
    "select period, sum(amount_period) as total from analyst.business_expenses group by period order by period desc",
  ],
  [
    "a join with an alias",
    "select p.name, count(*) from analyst.products p join analyst.recipe_lines r on r.product_id = p.id group by p.name",
  ],
  [
    "a lowest margin ranking",
    "select product_name, round(expected_margin_pct, 1) from analyst.calculations order by expected_margin_pct asc nulls last limit 1",
  ],
  [
    "a CTE used in the same statement",
    "with total as (select sum(amount_period) as t from analyst.business_expenses) select t from total",
  ],
  [
    "a histogram bucket",
    "select width_bucket(amount_period, 0, 100000, 10) as bucket, count(*) from analyst.business_expenses group by 1 order by 1",
  ],
  [
    "a window function",
    "select name, rank() over (order by monthly_capacity desc) from analyst.products",
  ],
  [
    "a median",
    "select percentile_cont(0.5) within group (order by amount_period) from analyst.business_expenses",
  ],
  [
    "date functions and casts",
    "select date_trunc('month', created_at)::date, extract(month from created_at), cast(volume as numeric(12,2)) from analyst.calculations",
  ],
  [
    "CASE, COALESCE and LIKE",
    "select case when is_own_labor then 'propio' else 'otro' end, coalesce(hours, 0) from analyst.calculation_cost_lines where concept ilike '%harina%'",
  ],
  [
    "IN, BETWEEN and EXISTS",
    "select id from analyst.supplies s where kind in ('supply') and purchase_price between 1 and 99 and exists (select 1 from analyst.recipe_lines r where r.supply_id = s.id)",
  ],
  ["a UNION of two views", "select name from analyst.products union all select name from analyst.supplies"],
  ["a semicolon inside a string", "select ';' as separator"],
  ["a statement-looking comment", "select 1 -- ; drop table x"],
  ["CURRENT_DATE", "select current_date, now()"],
];
