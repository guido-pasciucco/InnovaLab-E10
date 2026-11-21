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
ALTER TABLE "supplier_invites" ADD CONSTRAINT "supplier_invites_owner_user_id_profiles_id_fk" FOREIGN KEY ("owner_user_id") REFERENCES "public"."profiles"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "supplier_invites" ADD CONSTRAINT "supplier_invites_used_by_supplier_user_id_suppliers_user_id_fk" FOREIGN KEY ("used_by_supplier_user_id") REFERENCES "public"."suppliers"("user_id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "supplier_links" ADD CONSTRAINT "supplier_links_owner_user_id_profiles_id_fk" FOREIGN KEY ("owner_user_id") REFERENCES "public"."profiles"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "supplier_links" ADD CONSTRAINT "supplier_links_supplier_user_id_suppliers_user_id_fk" FOREIGN KEY ("supplier_user_id") REFERENCES "public"."suppliers"("user_id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "suppliers" ADD CONSTRAINT "suppliers_user_id_profiles_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."profiles"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "supplier_invites_owner_idx" ON "supplier_invites" USING btree ("owner_user_id");--> statement-breakpoint
CREATE INDEX "supplier_links_supplier_idx" ON "supplier_links" USING btree ("supplier_user_id");