ALTER TABLE "supplier_invites" DISABLE ROW LEVEL SECURITY;--> statement-breakpoint
ALTER TABLE "supplier_links" DISABLE ROW LEVEL SECURITY;--> statement-breakpoint
ALTER TABLE "tender_invitations" DISABLE ROW LEVEL SECURITY;--> statement-breakpoint
DROP TABLE IF EXISTS "supplier_invites" CASCADE;--> statement-breakpoint
DROP TABLE IF EXISTS "supplier_links" CASCADE;--> statement-breakpoint
DROP TABLE IF EXISTS "tender_invitations" CASCADE;--> statement-breakpoint
ALTER TABLE "purchase_orders" DROP CONSTRAINT IF EXISTS "purchase_orders_tender_invitation_uq";--> statement-breakpoint
ALTER TABLE "purchase_orders" DROP CONSTRAINT IF EXISTS "purchase_orders_invitation_id_tender_invitations_id_fk";--> statement-breakpoint
ALTER TABLE "tender_awards" DROP CONSTRAINT IF EXISTS "tender_awards_invitation_id_tender_invitations_id_fk";--> statement-breakpoint
ALTER TABLE "tender_offers" DROP CONSTRAINT IF EXISTS "tender_offers_invitation_id_tender_invitations_id_fk";--> statement-breakpoint
DROP INDEX IF EXISTS "tender_offers_invitation_item_idx";--> statement-breakpoint
ALTER TABLE "purchase_orders" ALTER COLUMN "supplier_user_id" SET NOT NULL;--> statement-breakpoint
ALTER TABLE "tender_awards" ALTER COLUMN "supplier_user_id" SET NOT NULL;--> statement-breakpoint
ALTER TABLE "tender_offers" ALTER COLUMN "supplier_user_id" SET NOT NULL;--> statement-breakpoint
ALTER TABLE "purchase_orders" DROP COLUMN IF EXISTS "invitation_id";--> statement-breakpoint
ALTER TABLE "tender_awards" DROP COLUMN IF EXISTS "invitation_id";--> statement-breakpoint
ALTER TABLE "tender_offers" DROP COLUMN IF EXISTS "invitation_id";
