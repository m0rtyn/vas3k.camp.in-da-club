ALTER TABLE "users" ALTER COLUMN "approvals_available" SET DEFAULT 5;--> statement-breakpoint
UPDATE "users" SET "approvals_available" = 5 WHERE "approvals_available" < 5;
