ALTER TABLE "affiliate_clicks" DROP CONSTRAINT "affiliate_clicks_affiliate_id_affiliate_profiles_id_fk";
--> statement-breakpoint
ALTER TABLE "affiliate_clicks" DROP CONSTRAINT "affiliate_clicks_product_id_products_id_fk";
--> statement-breakpoint
ALTER TABLE "affiliate_clicks" ADD CONSTRAINT "affiliate_clicks_affiliate_id_affiliate_profiles_id_fk" FOREIGN KEY ("affiliate_id") REFERENCES "public"."affiliate_profiles"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "affiliate_clicks" ADD CONSTRAINT "affiliate_clicks_product_id_products_id_fk" FOREIGN KEY ("product_id") REFERENCES "public"."products"("id") ON DELETE cascade ON UPDATE no action;