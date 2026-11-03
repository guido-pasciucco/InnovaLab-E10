ALTER TABLE "calc_cost_lines" ADD COLUMN "yield_quantity" numeric(14, 4) DEFAULT '1' NOT NULL;--> statement-breakpoint
ALTER TABLE "calc_cost_lines" ADD CONSTRAINT "calc_cost_lines_yield_quantity_positive" CHECK ("calc_cost_lines"."yield_quantity" > 0);--> statement-breakpoint
-- Backfill: existing variable lines hold period totals. Yielding the setup volume
-- makes amount / yield the same per-unit value the old model computed, so
-- results stay identical. Volume is a positive integer; the guard keeps the
-- check constraint from rejecting a legacy row.
UPDATE calc_cost_lines l SET yield_quantity = s.volume FROM costing_setup s WHERE s.calculation_id = l.calculation_id AND l.behavior = 'variable' AND s.volume > 0;
