"use server";

import { db }             from "@/lib/utils/db";
import { products }       from "@/drizzle/schema";
import { eq }             from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { getAuthUser }    from "@/lib/healpers/auth-server";
import { z }              from "zod";

const ReviewSchema = z.object({
  productId: z.string().uuid("Invalid product ID"),
  action:    z.enum(["approve", "reject"]),
  adminNote: z.string().max(500).optional(),
});

export async function reviewProduct(formData: unknown) {
  const auth = await getAuthUser();
  if (!auth || auth.role !== "ADMIN") {
    return { error: "Unauthorised." };
  }

  const parsed = ReviewSchema.safeParse(formData);
  if (!parsed.success) {
    return { error: parsed.error.message };
  }

  const { productId, action, adminNote } = parsed.data;

  const existing = await db
    .select({ id: products.id, status: products.status })
    .from(products)
    .where(eq(products.id, productId))
    .limit(1);

  if (!existing.length) {
    return { error: "Product not found." };
  }

  await db
    .update(products)
    .set({
      status:    action === "approve" ? "active" : "rejected",
      adminNote: adminNote ?? null,
      updatedAt: new Date(),
    })
    .where(eq(products.id, productId));

  revalidatePath("/admin/products");

  return { success: true, action };
}
