CREATE TABLE "help_usage" (
	"user_id" uuid PRIMARY KEY NOT NULL,
	"window_started_at" timestamp with time zone NOT NULL,
	"request_count" integer DEFAULT 0 NOT NULL,
	"active_lease_id" uuid,
	"active_until" timestamp with time zone
);
