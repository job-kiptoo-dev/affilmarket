ALTER TABLE "mpesa_transactions" ALTER COLUMN "id" SET DEFAULT gen_random_uuid();--> statement-breakpoint
ALTER TABLE "mpesa_transactions" ALTER COLUMN "order_id" DROP NOT NULL;--> statement-breakpoint
ALTER TABLE "mpesa_transactions" ADD COLUMN "checkout_metadata" json;