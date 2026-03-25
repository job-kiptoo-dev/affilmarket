'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { RegisterSchema } from '@/lib/schemas';
import { useAuthStore } from '@/store/auth';
import { Eye, EyeOff, ShoppingBag, Loader2, Store, Link2, Layers } from 'lucide-react';
import { cn } from '@/lib/utils';
import { registerUser } from '@/action/registerAction';
// import { registerUser } from '@/lib/actions/auth';

type RegisterForm = z.infer<typeof RegisterSchema>;

const roleOptions = [
  {
    value: 'VENDOR',
    label: 'Vendor',
    description: 'List products and sell to customers',
    icon: Store,
    selectedColor: 'border-brand-green bg-brand-green-light ring-2 ring-brand-green/20',
  },
  {
    value: 'AFFILIATE',
    label: 'Affiliate',
    description: 'Promote products and earn commissions',
    icon: Link2,
    selectedColor: 'border-amber-500 bg-amber-50 ring-2 ring-amber-200',
  },
  {
    value: 'BOTH',
    label: 'Both',
    description: 'Sell and earn commissions',
    icon: Layers,
    selectedColor: 'border-purple-500 bg-purple-50 ring-2 ring-purple-200',
  },
];

export default function RegisterPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { fetchUser } = useAuthStore();
  const [showPassword, setShowPassword] = useState(false);
  const [serverError, setServerError] = useState('');

  const defaultRole = (searchParams.get('role') as any) || 'VENDOR';

  const {
    register,
    handleSubmit,
    watch,
    setValue,
    formState: { errors, isSubmitting },
  } = useForm<RegisterForm>({
    resolver: zodResolver(RegisterSchema),
    defaultValues: { role: defaultRole },
  });

  const selectedRole = watch('role');

  const onSubmit = async (data: RegisterForm) => {
    setServerError('');
    const result = await registerUser(data);

    if (result.error) {
      setServerError(result.error);
      return;
    }

    await fetchUser();
    if (result.role === 'AFFILIATE') router.push('/affiliate');
    else router.push('/vendor');
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-green-950 to-green-800 flex items-center justify-center p-4 py-12">
      <div className="w-full max-w-lg">
        {/* Logo */}
        <div className="text-center mb-8">
          <Link href="/" className="inline-flex items-center gap-2">
            <div className="w-10 h-10 bg-white/20 rounded-xl flex items-center justify-center">
              <ShoppingBag className="w-5 h-5 text-white" />
            </div>
            <span className="text-2xl font-bold text-white">AffilMarket</span>
          </Link>
          <p className="text-green-200 mt-2 text-sm">Join Kenya's fastest-growing marketplace</p>
        </div>

        <div className="bg-white rounded-2xl shadow-2xl p-8">
          <h1 className="text-2xl font-bold text-gray-900 mb-1">Create your account</h1>
          <p className="text-gray-500 text-sm mb-6">
            Already have an account?{' '}
            <Link href="/login" className="text-brand-green font-medium hover:underline">
              Sign in
            </Link>
          </p>

          {serverError && (
            <div className="mb-4 p-3 bg-red-50 border border-red-200 text-red-700 rounded-xl text-sm">
              {serverError}
            </div>
          )}

          <form onSubmit={handleSubmit(onSubmit)} className="space-y-5">
            {/* Role Selection */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">I want to...</label>
              <div className="grid grid-cols-3 gap-3">
                {roleOptions.map((opt) => (
                  <button
                    key={opt.value}
                    type="button"
                    onClick={() => setValue('role', opt.value as any)}
                    className={cn(
                      'relative flex flex-col items-center gap-1.5 p-3 rounded-xl border-2 transition-all text-center cursor-pointer',
                      selectedRole === opt.value ? opt.selectedColor : 'border-gray-200 hover:border-gray-300'
                    )}
                  >
                    <opt.icon className={cn('w-5 h-5', selectedRole === opt.value ? '' : 'text-gray-400')} />
                    <span className="text-xs font-semibold">{opt.label}</span>
                    <span className="text-xs text-gray-500 leading-tight">{opt.description}</span>
                  </button>
                ))}
              </div>
              {errors.role && <p className="mt-1 text-xs text-red-500">{errors.role.message}</p>}
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1.5">Full Name</label>
              <input
                {...register('fullName')}
                type="text"
                placeholder="Jane Muthoni"
                className="w-full px-4 py-3 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-brand-green/20 focus:border-brand-green transition-all"
              />
              {errors.fullName && <p className="mt-1 text-xs text-red-500">{errors.fullName.message}</p>}
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1.5">Email address</label>
              <input
                {...register('email')}
                type="email"
                placeholder="you@example.com"
                className="w-full px-4 py-3 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-brand-green/20 focus:border-brand-green transition-all"
              />
              {errors.email && <p className="mt-1 text-xs text-red-500">{errors.email.message}</p>}
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1.5">Phone (M-Pesa number)</label>
              <input
                {...register('phone')}
                type="tel"
                placeholder="+254712345678"
                className="w-full px-4 py-3 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-brand-green/20 focus:border-brand-green transition-all"
              />
              {errors.phone && <p className="mt-1 text-xs text-red-500">{errors.phone.message}</p>}
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1.5">Password</label>
              <div className="relative">
                <input
                  {...register('password')}
                  type={showPassword ? 'text' : 'password'}
                  placeholder="Min 8 chars, 1 uppercase, 1 number"
                  className="w-full px-4 py-3 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-brand-green/20 focus:border-brand-green transition-all pr-10"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
                >
                  {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
              {errors.password && <p className="mt-1 text-xs text-red-500">{errors.password.message}</p>}
            </div>

            <button
              type="submit"
              disabled={isSubmitting}
              className="w-full bg-brand-green text-white py-3 rounded-xl font-semibold hover:bg-brand-green-dark transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
            >
              {isSubmitting && <Loader2 className="w-4 h-4 animate-spin" />}
              {isSubmitting ? 'Creating account...' : 'Create free account'}
            </button>

            <p className="text-xs text-gray-400 text-center">
              By creating an account you agree to our{' '}
              <Link href="/terms" className="underline hover:text-gray-600">Terms of Service</Link>
              {' '}and{' '}
              <Link href="/privacy" className="underline hover:text-gray-600">Privacy Policy</Link>
            </p>
          </form>
        </div>
      </div>
    </div>
  );
}
