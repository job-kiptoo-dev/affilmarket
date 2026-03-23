ALTER TABLE "affiliate_profiles" ADD COLUMN "suspended_at" timestamp;--> statement-breakpoint
ALTER TABLE "affiliate_profiles" ADD COLUMN "suspended_reason" text;--> statement-breakpoint
ALTER TABLE "vendor_profiles" ADD COLUMN "suspended_at" timestamp;--> statement-breakpoint
ALTER TABLE "vendor_profiles" ADD COLUMN "suspended_reason" text;