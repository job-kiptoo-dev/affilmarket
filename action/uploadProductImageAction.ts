



'use server';

const BUCKET        = 'affiliate-market-bucket';
const MAX_MB        = 5;
const ALLOWED_TYPES = ['image/jpeg', 'image/png', 'image/webp', 'image/gif'];

export interface UploadResult {
  url?:   string;
  error?: string;
}

export async function uploadProductImage(formData: FormData): Promise<UploadResult> {
  const { createClient } = await import('@supabase/supabase-js');
  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
  );

  const file = formData.get('file') as File | null;

  if (!file || file.size === 0)
    return { error: 'No file received.' };

  if (!ALLOWED_TYPES.includes(file.type))
    return { error: 'Only JPEG, PNG, WebP and GIF images are allowed.' };

  if (file.size > MAX_MB * 1024 * 1024)
    return { error: `Image must be under ${MAX_MB} MB.` };

  const ext  = file.name.split('.').pop()?.toLowerCase() ?? 'jpg';
  const name = `${Date.now()}-${Math.random().toString(36).slice(2)}.${ext}`;
  const path = `products/${name}`;

  const { error: uploadError } = await supabase.storage
    .from(BUCKET)
    .upload(path, file, {
      contentType: file.type,
      upsert:      false,
    });

  if (uploadError) {
    console.error('[uploadProductImage]', uploadError);
    return { error: uploadError.message ?? 'Upload failed. Please try again.' };
  }

  const { data } = supabase.storage.from(BUCKET).getPublicUrl(path);
  return { url: data.publicUrl };
}


export async function uploadVendorLogo(formData: FormData): Promise<UploadResult> {
  const { createClient } = await import('@supabase/supabase-js');
  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
  );

  const file = formData.get('file') as File | null;
  if (!file || file.size === 0) return { error: 'No file received.' };
  if (!ALLOWED_TYPES.includes(file.type)) return { error: 'Only JPEG, PNG, WebP and GIF images are allowed.' };
  if (file.size > MAX_MB * 1024 * 1024) return { error: `Image must be under ${MAX_MB} MB.` };

  const ext  = file.name.split('.').pop()?.toLowerCase() ?? 'jpg';
  const name = `${Date.now()}-${Math.random().toString(36).slice(2)}.${ext}`;
  const path = `vendor-logos/${name}`;  // ← different folder from products

  const { error: uploadError } = await supabase.storage
    .from(BUCKET)
    .upload(path, file, { contentType: file.type, upsert: false });

  if (uploadError) {
    console.error('[uploadVendorLogo]', uploadError);
    return { error: uploadError.message ?? 'Upload failed. Please try again.' };
  }

  const { data } = supabase.storage.from(BUCKET).getPublicUrl(path);
  return { url: data.publicUrl };
}

export async function uploadKraDoc(formData: FormData): Promise<UploadResult> {
  const { createClient } = await import('@supabase/supabase-js');
  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
  );

  const file = formData.get('file') as File | null;
  if (!file || file.size === 0) return { error: 'No file received.' };
  if (file.size > MAX_MB * 1024 * 1024) return { error: `File must be under ${MAX_MB} MB.` };

  // KRA docs can be PDF too, not just images
  const ALLOWED_DOC_TYPES = [...ALLOWED_TYPES, 'application/pdf'];
  if (!ALLOWED_DOC_TYPES.includes(file.type))
    return { error: 'Only JPEG, PNG, WebP, GIF and PDF files are allowed.' };

  const ext  = file.name.split('.').pop()?.toLowerCase() ?? 'pdf';
  const name = `${Date.now()}-${Math.random().toString(36).slice(2)}.${ext}`;
  const path = `kra-docs/${name}`;  // ← private folder

  const { error: uploadError } = await supabase.storage
    .from(BUCKET)
    .upload(path, file, { contentType: file.type, upsert: false });

  if (uploadError) {
    console.error('[uploadKraDoc]', uploadError);
    return { error: uploadError.message ?? 'Upload failed. Please try again.' };
  }

  const { data } = supabase.storage.from(BUCKET).getPublicUrl(path);
  return { url: data.publicUrl };
}



// "use server";
//
// import { createClient } from "@supabase/supabase-js";
// import { z } from "zod";
//
// // ── Supabase admin client (service-role — server only) ─────────────────────
// const supabase = createClient(
//   process.env.NEXT_PUBLIC_SUPABASE_URL!,
//   process.env.SUPABASE_SERVICE_ROLE_KEY!,
// );
//
// const BUCKET = "product-images"; // your Supabase Storage bucket name
//
// // ── Validation schema ──────────────────────────────────────────────────────
// const SignedUrlSchema = z.object({
//   fileName: z.string().min(1, "File name is required"),
//   fileType: z.enum(["image/jpeg", "image/png", "image/webp", "image/gif"], {
//     errorMap: () => ({ message: "Only JPEG, PNG, WebP and GIF are allowed" }),
//   }),
//   fileSize: z
//     .number()
//     .positive("File size must be positive")
//     .max(5 * 1024 * 1024, "Image must be under 5 MB"),
// });
//
// const PathSchema = z.object({
//   path: z.string().min(1, "Path is required"),
// });
//
// // ── Get signed upload URL ──────────────────────────────────────────────────
// // Call this before uploading — returns a short-lived URL so the browser
// // can PUT the file directly to Supabase Storage (bypasses Next.js body limit).
// export async function getSignedUploadUrl(formData: unknown) {
//   const parsed = SignedUrlSchema.safeParse(formData);
//   if (!parsed.success) {
//     return { error: parsed.error.message };
//   }
//
//   const { fileName, fileType, fileSize } = parsed.data;
//
//   const ext  = fileName.split(".").pop()?.toLowerCase() ?? "jpg";
//   const name = `${Date.now()}-${Math.random().toString(36).slice(2)}.${ext}`;
//   const path = `products/${name}`;
//
//   const { data, error } = await supabase.storage
//     .from(BUCKET)
//     .createSignedUploadUrl(path, { upsert: false });
//
//   if (error || !data) {
//     return { error: error?.message ?? "Could not create upload URL. Please try again." };
//   }
//
//   return {
//     success: true,
//     signedUrl: data.signedUrl,
//     token:     data.token,
//     path,
//   };
// }
//
// // ── Get public URL ─────────────────────────────────────────────────────────
// // Call this after the browser has finished uploading to get the permanent URL
// // to store in your database.
// export async function getPublicUrl(formData: unknown) {
//   const parsed = PathSchema.safeParse(formData);
//   if (!parsed.success) {
//     return { error: parsed.error.message };
//   }
//
//   const { path } = parsed.data;
//
//   const { data } = supabase.storage.from(BUCKET).getPublicUrl(path);
//
//   if (!data?.publicUrl) {
//     return { error: "Could not retrieve public URL." };
//   }
//
//   return { success: true, url: data.publicUrl };
// }
//




//
//
// 'use server';
//
// const BUCKET        = 'product-images';
// const MAX_MB        = 5;
// const ALLOWED_TYPES = ['image/jpeg', 'image/png', 'image/webp', 'image/gif'];
//
// export interface UploadResult {
//   url?:   string;
//   error?: string;
// }
//
// export async function uploadProductImage(formData: FormData): Promise<UploadResult> {
//   // ← Move client inside function so env vars are guaranteed loaded
//   const { createClient } = await import('@supabase/supabase-js');
//   const supabase = createClient(
//     process.env.NEXT_PUBLIC_SUPABASE_URL!,
//     process.env.SUPABASE_SERVICE_ROLE_KEY!,
//   );
//
//   const file = formData.get('file') as File | null;
//
//   if (!file || file.size === 0)
//     return { error: 'No file received.' };
//   if (!ALLOWED_TYPES.includes(file.type))
//     return { error: 'Only JPEG, PNG, WebP and GIF images are allowed.' };
//   if (file.size > MAX_MB * 1024 * 1024)
//     return { error: `Image must be under ${MAX_MB} MB.` };
//
//   const ext  = file.name.split('.').pop()?.toLowerCase() ?? 'jpg';
//   const name = `${Date.now()}-${Math.random().toString(36).slice(2)}.${ext}`;
//   const path = `products/${name}`;
//
//   const { error: uploadError } = await supabase.storage
//     .from(BUCKET)
//     .upload(path, file, {
//       contentType: file.type,
//       upsert:      false,
//     });
//
//   if (uploadError) {
//     console.error('[uploadProductImage]', uploadError);
//     return { error: uploadError.message ?? 'Upload failed. Please try again.' };
//   }
//
//   const { data } = supabase.storage.from(BUCKET).getPublicUrl(path);
//   return { url: data.publicUrl };
// }



// 'use server';
//
// import { createClient } from '@supabase/supabase-js';
//
// // Uses the service-role key so uploads bypass RLS.
// // Keep SUPABASE_SERVICE_ROLE_KEY server-side only — never expose to the browser.
// const supabase = createClient(
//   process.env.NEXT_PUBLIC_SUPABASE_URL!,
//   process.env.SUPABASE_SERVICE_ROLE_KEY!,
// );
//
// const BUCKET        = 'product-images';           // ← your Supabase Storage bucket name
// const MAX_MB        = 5;
// const ALLOWED_TYPES = ['image/jpeg', 'image/png', 'image/webp', 'image/gif'];
//
// export interface UploadResult {
//   url?:   string;
//   error?: string;
// }
//
// export async function uploadProductImage(formData: FormData): Promise<UploadResult> {
//   const file = formData.get('file') as File | null;
//
//   // ── Guards ────────────────────────────────────────────────────────────────
//   if (!file || file.size === 0)
//     return { error: 'No file received.' };
//
//   if (!ALLOWED_TYPES.includes(file.type))
//     return { error: 'Only JPEG, PNG, WebP and GIF images are allowed.' };
//
//   if (file.size > MAX_MB * 1024 * 1024)
//     return { error: `Image must be under ${MAX_MB} MB.` };
//
//   // ── Build a unique, safe storage path ────────────────────────────────────
//   const ext  = file.name.split('.').pop()?.toLowerCase() ?? 'jpg';
//   const name = `${Date.now()}-${Math.random().toString(36).slice(2)}.${ext}`;
//   const path = `products/${name}`;
//
//   // ── Upload ────────────────────────────────────────────────────────────────
//   const { error: uploadError } = await supabase.storage
//     .from(BUCKET)
//     .upload(path, file, {
//       contentType: file.type,
//       upsert:      false,
//     });
//
//   if (uploadError) {
//     console.error('[uploadProductImage]', uploadError);
//     return { error: uploadError.message ?? 'Upload failed. Please try again.' };
//   }
//
//   // ── Return public URL ─────────────────────────────────────────────────────
//   const { data } = supabase.storage.from(BUCKET).getPublicUrl(path);
//   return { url: data.publicUrl };
// }
