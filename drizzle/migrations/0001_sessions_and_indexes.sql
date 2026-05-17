CREATE TABLE "sessions" (
	"id" text PRIMARY KEY NOT NULL,
	"username" text NOT NULL,
	"expires_at" timestamp with time zone NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "sessions" ADD CONSTRAINT "sessions_username_users_username_fk" FOREIGN KEY ("username") REFERENCES "public"."users"("username") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "idx_sessions_username" ON "sessions" USING btree ("username");--> statement-breakpoint
CREATE INDEX "idx_sessions_expires_at" ON "sessions" USING btree ("expires_at");--> statement-breakpoint
CREATE INDEX "idx_approval_grants_granted_to" ON "approval_grants" USING btree ("granted_to");--> statement-breakpoint
CREATE INDEX "idx_meetings_initiator" ON "meetings" USING btree ("initiator_username");--> statement-breakpoint
CREATE INDEX "idx_meetings_target" ON "meetings" USING btree ("target_username");--> statement-breakpoint
CREATE INDEX "idx_meetings_status" ON "meetings" USING btree ("status");--> statement-breakpoint
CREATE INDEX "idx_meetings_created_at" ON "meetings" USING btree ("created_at" DESC);--> statement-breakpoint
CREATE INDEX "idx_meetings_witness" ON "meetings" USING btree ("witness_username");