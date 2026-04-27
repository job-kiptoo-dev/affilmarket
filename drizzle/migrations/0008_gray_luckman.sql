ALTER TABLE "products" DROP CONSTRAINT "products_vendor_id_vendor_profiles_id_fk";
--> statement-breakpoint
ALTER TABLE "products" ADD CONSTRAINT "products_vendor_id_vendor_profiles_id_fk" FOREIGN KEY ("vendor_id") REFERENCES "public"."vendor_profiles"("id") ON DELETE cascade ON UPDATE no action;