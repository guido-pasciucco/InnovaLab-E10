CREATE TABLE "supplier_invites" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"owner_user_id" uuid NOT NULL,
	"label" text NOT NULL,
	"token_hash" text NOT NULL,
	"expires_at" timestamp with time zone NOT NULL,
	"used_at" timestamp with time zone,
	"used_by_supplier_user_id" uuid,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "supplier_invites_token_hash_unique" UNIQUE("token_hash")
);
--> statement-breakpoint
CREATE TABLE "supplier_links" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"owner_user_id" uuid NOT NULL,
	"supplier_user_id" uuid NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "supplier_links_owner_supplier_uq" UNIQUE("owner_user_id","supplier_user_id")
);
--> statement-breakpoint
CREATE TABLE "suppliers" (
	"user_id" uuid PRIMARY KEY NOT NULL,
	"business_name" text NOT NULL,
	"cuit" text NOT NULL,
	"contact_name" text NOT NULL,
	"phone" text NOT NULL,
	"email" text NOT NULL,
	"categories" text[] NOT NULL,
	"terms_accepted_at" timestamp with time zone NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "suppliers_cuit_unique" UNIQUE("cuit"),
	CONSTRAINT "suppliers_cuit_format" CHECK ("suppliers"."cuit" ~ '^[0-9]{11}$')
);
--> statement-breakpoint
CREATE TABLE "purchase_order_lines" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"order_id" uuid NOT NULL,
	"tender_item_id" uuid NOT NULL,
	"position" integer NOT NULL,
	"supply_name" text NOT NULL,
	"unit" text NOT NULL,
	"quantity" numeric(14, 4) NOT NULL,
	"unit_price" numeric(12, 2) NOT NULL,
	"line_total" numeric(14, 2) NOT NULL
);
--> statement-breakpoint
CREATE TABLE "purchase_orders" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"owner_user_id" uuid NOT NULL,
	"tender_id" uuid NOT NULL,
	"invitation_id" uuid NOT NULL,
	"number" integer NOT NULL,
	"delivery_terms" text NOT NULL,
	"payment_terms" text NOT NULL,
	"total" numeric(14, 2) NOT NULL,
	"issued_at" timestamp with time zone NOT NULL,
	CONSTRAINT "purchase_orders_owner_number_uq" UNIQUE("owner_user_id","number"),
	CONSTRAINT "purchase_orders_tender_invitation_uq" UNIQUE("tender_id","invitation_id")
);
--> statement-breakpoint
CREATE TABLE "tender_awards" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"tender_item_id" uuid NOT NULL,
	"invitation_id" uuid NOT NULL,
	"unit_price" numeric(12, 2) NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "tender_awards_unit_price_positive" CHECK ("tender_awards"."unit_price" > 0)
);
--> statement-breakpoint
CREATE TABLE "tender_drafts" (
	"owner_user_id" uuid PRIMARY KEY NOT NULL,
	"content" jsonb NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "tender_invitations" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"tender_id" uuid NOT NULL,
	"supplier_user_id" uuid NOT NULL,
	"negotiation_requested_at" timestamp with time zone,
	"negotiation_contact" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "tender_invitations_tender_supplier_uq" UNIQUE("tender_id","supplier_user_id")
);
--> statement-breakpoint
CREATE TABLE "tender_items" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"tender_id" uuid NOT NULL,
	"supply_id" uuid,
	"position" integer NOT NULL,
	"supply_name" text NOT NULL,
	"unit" text NOT NULL,
	"quantity" numeric(14, 4) NOT NULL,
	"specs" text DEFAULT '' NOT NULL,
	"starting_price" numeric(12, 2) NOT NULL,
	"reference_price" numeric(12, 2),
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "tender_items_tender_position_uq" UNIQUE("tender_id","position"),
	CONSTRAINT "tender_items_quantity_positive" CHECK ("tender_items"."quantity" > 0),
	CONSTRAINT "tender_items_starting_price_positive" CHECK ("tender_items"."starting_price" > 0)
);
--> statement-breakpoint
CREATE TABLE "tender_offers" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"tender_item_id" uuid NOT NULL,
	"invitation_id" uuid NOT NULL,
	"round" integer NOT NULL,
	"unit_price" numeric(12, 2) NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "tender_offers_unit_price_positive" CHECK ("tender_offers"."unit_price" > 0),
	CONSTRAINT "tender_offers_round_positive" CHECK ("tender_offers"."round" >= 1)
);
--> statement-breakpoint
CREATE TABLE "tenders" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"owner_user_id" uuid NOT NULL,
	"number" integer NOT NULL,
	"round_hours" integer NOT NULL,
	"round_count" integer NOT NULL,
	"decrement_percent" numeric(5, 2) NOT NULL,
	"starts_at" timestamp with time zone NOT NULL,
	"ends_at" timestamp with time zone NOT NULL,
	"cancelled_at" timestamp with time zone,
	"no_offer_warning_ack_at" timestamp with time zone,
	"thank_you_note_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "tenders_owner_number_uq" UNIQUE("owner_user_id","number"),
	CONSTRAINT "tenders_round_hours_valid" CHECK ("tenders"."round_hours" in (6, 12, 24)),
	CONSTRAINT "tenders_round_count_valid" CHECK ("tenders"."round_count" between 2 and 5),
	CONSTRAINT "tenders_decrement_percent_valid" CHECK ("tenders"."decrement_percent" > 0 and "tenders"."decrement_percent" <= 50),
	CONSTRAINT "tenders_ends_after_start" CHECK ("tenders"."ends_at" > "tenders"."starts_at")
);
--> statement-breakpoint
ALTER TABLE "supplier_invites" ADD CONSTRAINT "supplier_invites_owner_user_id_profiles_id_fk" FOREIGN KEY ("owner_user_id") REFERENCES "public"."profiles"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "supplier_invites" ADD CONSTRAINT "supplier_invites_used_by_supplier_user_id_suppliers_user_id_fk" FOREIGN KEY ("used_by_supplier_user_id") REFERENCES "public"."suppliers"("user_id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "supplier_links" ADD CONSTRAINT "supplier_links_owner_user_id_profiles_id_fk" FOREIGN KEY ("owner_user_id") REFERENCES "public"."profiles"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "supplier_links" ADD CONSTRAINT "supplier_links_supplier_user_id_suppliers_user_id_fk" FOREIGN KEY ("supplier_user_id") REFERENCES "public"."suppliers"("user_id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "suppliers" ADD CONSTRAINT "suppliers_user_id_profiles_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."profiles"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "purchase_order_lines" ADD CONSTRAINT "purchase_order_lines_order_id_purchase_orders_id_fk" FOREIGN KEY ("order_id") REFERENCES "public"."purchase_orders"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "purchase_order_lines" ADD CONSTRAINT "purchase_order_lines_tender_item_id_tender_items_id_fk" FOREIGN KEY ("tender_item_id") REFERENCES "public"."tender_items"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "purchase_orders" ADD CONSTRAINT "purchase_orders_owner_user_id_profiles_id_fk" FOREIGN KEY ("owner_user_id") REFERENCES "public"."profiles"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "purchase_orders" ADD CONSTRAINT "purchase_orders_tender_id_tenders_id_fk" FOREIGN KEY ("tender_id") REFERENCES "public"."tenders"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "purchase_orders" ADD CONSTRAINT "purchase_orders_invitation_id_tender_invitations_id_fk" FOREIGN KEY ("invitation_id") REFERENCES "public"."tender_invitations"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "tender_awards" ADD CONSTRAINT "tender_awards_tender_item_id_tender_items_id_fk" FOREIGN KEY ("tender_item_id") REFERENCES "public"."tender_items"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "tender_awards" ADD CONSTRAINT "tender_awards_invitation_id_tender_invitations_id_fk" FOREIGN KEY ("invitation_id") REFERENCES "public"."tender_invitations"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "tender_drafts" ADD CONSTRAINT "tender_drafts_owner_user_id_profiles_id_fk" FOREIGN KEY ("owner_user_id") REFERENCES "public"."profiles"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "tender_invitations" ADD CONSTRAINT "tender_invitations_tender_id_tenders_id_fk" FOREIGN KEY ("tender_id") REFERENCES "public"."tenders"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "tender_invitations" ADD CONSTRAINT "tender_invitations_supplier_user_id_suppliers_user_id_fk" FOREIGN KEY ("supplier_user_id") REFERENCES "public"."suppliers"("user_id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "tender_items" ADD CONSTRAINT "tender_items_tender_id_tenders_id_fk" FOREIGN KEY ("tender_id") REFERENCES "public"."tenders"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "tender_items" ADD CONSTRAINT "tender_items_supply_id_supplies_id_fk" FOREIGN KEY ("supply_id") REFERENCES "public"."supplies"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "tender_offers" ADD CONSTRAINT "tender_offers_tender_item_id_tender_items_id_fk" FOREIGN KEY ("tender_item_id") REFERENCES "public"."tender_items"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "tender_offers" ADD CONSTRAINT "tender_offers_invitation_id_tender_invitations_id_fk" FOREIGN KEY ("invitation_id") REFERENCES "public"."tender_invitations"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "tenders" ADD CONSTRAINT "tenders_owner_user_id_profiles_id_fk" FOREIGN KEY ("owner_user_id") REFERENCES "public"."profiles"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "supplier_invites_owner_idx" ON "supplier_invites" USING btree ("owner_user_id");--> statement-breakpoint
CREATE INDEX "supplier_links_supplier_idx" ON "supplier_links" USING btree ("supplier_user_id");--> statement-breakpoint
CREATE INDEX "purchase_order_lines_order_idx" ON "purchase_order_lines" USING btree ("order_id");--> statement-breakpoint
CREATE INDEX "tender_awards_item_idx" ON "tender_awards" USING btree ("tender_item_id");--> statement-breakpoint
CREATE INDEX "tender_invitations_supplier_idx" ON "tender_invitations" USING btree ("supplier_user_id");--> statement-breakpoint
CREATE INDEX "tender_offers_invitation_item_idx" ON "tender_offers" USING btree ("invitation_id","tender_item_id");--> statement-breakpoint
CREATE INDEX "tender_offers_item_idx" ON "tender_offers" USING btree ("tender_item_id");