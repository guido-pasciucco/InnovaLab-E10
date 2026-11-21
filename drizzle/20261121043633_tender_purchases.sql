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
ALTER TABLE "purchase_order_lines" ADD CONSTRAINT "purchase_order_lines_order_id_purchase_orders_id_fk" FOREIGN KEY ("order_id") REFERENCES "public"."purchase_orders"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "purchase_order_lines" ADD CONSTRAINT "purchase_order_lines_tender_item_id_tender_items_id_fk" FOREIGN KEY ("tender_item_id") REFERENCES "public"."tender_items"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "purchase_orders" ADD CONSTRAINT "purchase_orders_owner_user_id_profiles_id_fk" FOREIGN KEY ("owner_user_id") REFERENCES "public"."profiles"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "purchase_orders" ADD CONSTRAINT "purchase_orders_tender_id_tenders_id_fk" FOREIGN KEY ("tender_id") REFERENCES "public"."tenders"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "purchase_orders" ADD CONSTRAINT "purchase_orders_invitation_id_tender_invitations_id_fk" FOREIGN KEY ("invitation_id") REFERENCES "public"."tender_invitations"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "tender_awards" ADD CONSTRAINT "tender_awards_tender_item_id_tender_items_id_fk" FOREIGN KEY ("tender_item_id") REFERENCES "public"."tender_items"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "tender_awards" ADD CONSTRAINT "tender_awards_invitation_id_tender_invitations_id_fk" FOREIGN KEY ("invitation_id") REFERENCES "public"."tender_invitations"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "purchase_order_lines_order_idx" ON "purchase_order_lines" USING btree ("order_id");--> statement-breakpoint
CREATE INDEX "tender_awards_item_idx" ON "tender_awards" USING btree ("tender_item_id");