import { z } from 'zod';

// ─── Auth ──────────────────────────────────────────────────────

export const RegisterSchema = z.object({
  email: z.string().email('Invalid email address'),
  password: z
    .string()
    .min(8, 'Password must be at least 8 characters')
    .regex(/[A-Z]/, 'Password must contain at least one uppercase letter')
    .regex(/[0-9]/, 'Password must contain at least one number'),
  phone: z.string().regex(/^(\+254|0)[17]\d{8}$/, 'Enter a valid Kenyan phone number'),
  role: z.enum(['VENDOR', 'AFFILIATE', 'BOTH']),
  fullName: z.string().min(2, 'Name must be at least 2 characters').optional(),
});

export const LoginSchema = z.object({
  email: z.string().email('Invalid email address'),
  password: z.string().min(1, 'Password is required'),
});

export const ForgotPasswordSchema = z.object({
  email: z.string().email('Invalid email address'),
});

export const ResetPasswordSchema = z
  .object({
    token: z.string().min(1),
    password: z
      .string()
      .min(8, 'Password must be at least 8 characters')
      .regex(/[A-Z]/, 'Must contain uppercase')
      .regex(/[0-9]/, 'Must contain a number'),
    confirmPassword: z.string(),
  })
  .refine((d) => d.password === d.confirmPassword, {
    message: "Passwords don't match",
    path: ['confirmPassword'],
  });

// ─── Vendor Profile ────────────────────────────────────────────

export const VendorProfileSchema = z.object({
  shopName: z.string().min(2, 'Shop name is required'),
  legalName: z.string().optional(),
  phone: z.string().regex(/^(\+254|0)[17]\d{8}$/, 'Enter a valid Kenyan phone number').optional(),
  city: z.string().optional(),
  area: z.string().optional(),
  description: z.string().max(1000, 'Description too long').optional(),
  kraPin: z.string().regex(/^[AP]\d{9}[A-Z]$/, 'Invalid KRA PIN format').optional().or(z.literal('')),
});

// ─── Affiliate Profile ─────────────────────────────────────────

export const AffiliateProfileSchema = z.object({
  fullName: z.string().min(2, 'Full name is required'),
  phone: z.string().regex(/^(\+254|0)[17]\d{8}$/, 'Enter a valid Kenyan phone number'),
  payoutMethod: z.enum(['MPESA', 'BANK']),
  mpesaPhone: z.string().optional(),
  bankName: z.string().optional(),
  bankAccountName: z.string().optional(),
  bankAccountNumber: z.string().optional(),
  idNumber: z.string().min(6, 'Enter your national ID number').optional(),
}).refine(
  (d) => {
    if (d.payoutMethod === 'MPESA') return !!d.mpesaPhone;
    if (d.payoutMethod === 'BANK') return !!d.bankName && !!d.bankAccountNumber;
    return true;
  },
  { message: 'Please fill in your payout details', path: ['payoutMethod'] }
);

// ─── Product ───────────────────────────────────────────────────

export const ProductSchema = z.object({
  title: z.string().min(5, 'Title must be at least 5 characters').max(200),
  shortDescription: z.string().max(300, 'Short description too long').optional(),
  description: z.string().optional(),
  categoryId: z.string().uuid('Select a category').optional(),
  subcategoryId: z.string().uuid().optional(),
  sku: z.string().optional(),
  price: z
    .number({ invalid_type_error: 'Enter a valid price' })
    .positive('Price must be greater than 0')
    .max(1_000_000, 'Price too high'),
  stockQuantity: z.number().int().min(0, 'Stock cannot be negative'),
  affiliateCommissionRate: z
    .number()
    .min(0, 'Commission must be 0% or higher')
    .max(0.5, 'Commission cannot exceed 50%'),
  status: z.enum(['draft', 'pending_approval']).default('draft'),
});

// ─── Order / Checkout ──────────────────────────────────────────

export const CheckoutSchema = z.object({
  productId: z.string().uuid('Invalid product'),
  quantity: z.number().int().min(1).max(100).default(1),
  customerName: z.string().min(2, 'Enter your full name'),
  customerPhone: z
    .string()
    .regex(/^(\+254|0)[17]\d{8}$/, 'Enter a valid Kenyan M-Pesa number'),
  customerEmail: z.string().email().optional().or(z.literal('')),
  city: z.string().min(1, 'Enter your city'),
  address: z.string().min(5, 'Enter your delivery address'),
  notes: z.string().max(500).optional(),
  affiliateToken: z.string().optional(),
});

// ─── Payout Request ────────────────────────────────────────────

export const PayoutRequestSchema = z.object({
  amount: z.number().positive('Amount must be greater than 0'),
  method: z.enum(['MPESA', 'BANK']),
});

// ─── Admin ─────────────────────────────────────────────────────

export const UpdateVendorStatusSchema = z.object({
  status: z.enum(['approved', 'rejected', 'suspended', 'pending']),
  note: z.string().optional(),
});

export const UpdateProductStatusSchema = z.object({
  status: z.enum(['active', 'rejected', 'inactive', 'pending_approval']),
  adminNote: z.string().optional(),
});

export const UpdatePayoutStatusSchema = z.object({
  status: z.enum(['APPROVED', 'PAID', 'REJECTED']),
  adminNote: z.string().optional(),
});

export const PlatformSettingsSchema = z.object({
  platform_fee_rate: z.number().min(0).max(0.5),
  platform_fixed_fee: z.number().min(0),
  min_payout_threshold_vendor: z.number().min(0),
  min_payout_threshold_affiliate: z.number().min(0),
  affiliate_cookie_days: z.number().int().min(1).max(365),
  balance_release_days: z.number().int().min(1).max(90),
});
