CREATE TYPE "public"."meeting_status" AS ENUM('pending', 'unconfirmed', 'confirmed', 'cancelled');--> statement-breakpoint
CREATE TABLE "approval_grants" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"granted_by" text NOT NULL,
	"granted_to" text NOT NULL,
	"amount" integer NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "meetings" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"initiator_username" text NOT NULL,
	"target_username" text NOT NULL,
	"witness_code" text,
	"witness_code_expires_at" timestamp with time zone,
	"witness_username" text,
	"status" "meeting_status" DEFAULT 'unconfirmed' NOT NULL,
	"hidden_by" text[] DEFAULT '{}'::text[] NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"confirmed_at" timestamp with time zone,
	"cancelled_at" timestamp with time zone,
	"client_created_at" timestamp with time zone NOT NULL
);
--> statement-breakpoint
CREATE TABLE "users" (
	"username" text PRIMARY KEY NOT NULL,
	"display_name" text NOT NULL,
	"avatar_url" text DEFAULT '' NOT NULL,
	"bio" text,
	"approvals_available" integer DEFAULT 3 NOT NULL,
	"confirmed_contacts_count" integer DEFAULT 0 NOT NULL,
	"is_admin" boolean DEFAULT false NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "approval_grants" ADD CONSTRAINT "approval_grants_granted_by_users_username_fk" FOREIGN KEY ("granted_by") REFERENCES "public"."users"("username") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "meetings" ADD CONSTRAINT "meetings_initiator_username_users_username_fk" FOREIGN KEY ("initiator_username") REFERENCES "public"."users"("username") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "meetings" ADD CONSTRAINT "meetings_target_username_users_username_fk" FOREIGN KEY ("target_username") REFERENCES "public"."users"("username") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "meetings" ADD CONSTRAINT "meetings_witness_username_users_username_fk" FOREIGN KEY ("witness_username") REFERENCES "public"."users"("username") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
CREATE UNIQUE INDEX "unique_meeting_pair" ON "meetings" USING btree (LEAST("initiator_username", "target_username"),GREATEST("initiator_username", "target_username")) WHERE "meetings"."status" != 'cancelled';