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
ALTER TABLE "tender_invitations" ADD CONSTRAINT "tender_invitations_tender_id_tenders_id_fk" FOREIGN KEY ("tender_id") REFERENCES "public"."tenders"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "tender_invitations" ADD CONSTRAINT "tender_invitations_supplier_user_id_suppliers_user_id_fk" FOREIGN KEY ("supplier_user_id") REFERENCES "public"."suppliers"("user_id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "tender_items" ADD CONSTRAINT "tender_items_tender_id_tenders_id_fk" FOREIGN KEY ("tender_id") REFERENCES "public"."tenders"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "tender_items" ADD CONSTRAINT "tender_items_supply_id_supplies_id_fk" FOREIGN KEY ("supply_id") REFERENCES "public"."supplies"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "tenders" ADD CONSTRAINT "tenders_owner_user_id_profiles_id_fk" FOREIGN KEY ("owner_user_id") REFERENCES "public"."profiles"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "tender_invitations_supplier_idx" ON "tender_invitations" USING btree ("supplier_user_id");