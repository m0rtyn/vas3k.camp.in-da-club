ALTER TABLE "users" ADD COLUMN "camp_username" text;--> statement-breakpoint
CREATE UNIQUE INDEX "users_camp_username_unique" ON "users" USING btree ("camp_username");