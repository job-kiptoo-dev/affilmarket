'use client';

import { useState }              from 'react';
import Link                      from 'next/link';
import { useRouter }             from 'next/navigation';
import { useForm, Controller }   from 'react-hook-form';
import { zodResolver }           from '@hookform/resolvers/zod';
import { z }                     from 'zod';
import { LoginSchema }           from '@/lib/schemas';
import { Eye, EyeOff, ShoppingBag, Loader2, AlertCircle, MailWarning } from 'lucide-react';
import { signIn }                from '@/lib/utils/auth-client';
import { useAuthStore }          from '@/store/auth';
import { Field, FieldLabel, FieldError } from '@/components/ui/field';
import { Input }                 from '@/components/ui/input';
import { Button }                from '@/components/ui/button';

type LoginForm = z.infer<typeof LoginSchema>;

type ServerError =
  | { type: 'unverified' }
  | { type: 'generic'; message: string }
  | null;

export default function LoginPage() {
  const router = useRouter();
  const { fetchUser } = useAuthStore();

  const [showPassword, setShowPassword] = useState(false);
  const [serverError,  setServerError]  = useState<ServerError>(null);

  const form = useForm<LoginForm>({
    resolver:       zodResolver(LoginSchema),
    mode:           'onTouched',
    reValidateMode: 'onChange',
  });

  const onSubmit = async (data: LoginForm) => {
    setServerError(null);

    const result = await signIn.email(
      { email: data.email, password: data.password },
      {
        onError: (ctx) => {
          if (ctx.error.status === 403) {
            setServerError({ type: 'unverified' });
          } else {
            setServerError({ type: 'generic', message: ctx.error.message });
          }
        },
      },
    );

    if (result?.error) return;

    const user = await fetchUser();

    if      (user?.role === 'ADMIN')     router.push('/admin');
    else if (user?.role === 'AFFILIATE') router.push('/affiliate');
    else                                 router.push('/vendor');
  };

  const { formState: { isSubmitting } } = form;

  return (
    <div className="min-h-screen bg-gradient-to-br from-green-950 to-green-800 flex items-center justify-center p-4">
      <div className="w-full max-w-md">

        <div className="text-center mb-8">
          <Link href="/" className="inline-flex items-center gap-2">
            <div className="w-10 h-10 bg-white/20 rounded-xl flex items-center justify-center">
              <ShoppingBag className="w-5 h-5 text-white" />
            </div>
            <span className="text-2xl font-bold text-white">AffilMarket</span>
          </Link>
          <p className="text-green-200 mt-2 text-sm">Kenya's Affiliate Marketplace</p>
        </div>

        <div className="bg-white rounded-2xl shadow-2xl p-8">
          <h1 className="text-2xl font-bold text-gray-900 mb-1">Welcome back</h1>
          <p className="text-gray-500 text-sm mb-6">
            Don't have an account?{' '}
            <Link href="/register" className="text-brand-green font-medium hover:underline">
              Sign up free
            </Link>
          </p>

          {/* Unverified email banner */}
          {serverError?.type === 'unverified' && (
            <div className="mb-5 flex gap-3 p-4 bg-amber-50 border border-amber-200 rounded-xl">
              <MailWarning className="w-5 h-5 text-amber-500 shrink-0 mt-0.5" />
              <div>
                <p className="text-sm font-semibold text-amber-800">Email not verified</p>
                <p className="text-xs text-amber-700 mt-0.5">
                  Check your inbox and click the verification link before signing in.
                </p>
              </div>
            </div>
          )}

          {/* Generic error banner */}
          {serverError?.type === 'generic' && (
            <div className="mb-5 flex gap-3 p-4 bg-red-50 border border-red-200 rounded-xl">
              <AlertCircle className="w-5 h-5 text-red-500 shrink-0 mt-0.5" />
              <div>
                <p className="text-sm font-semibold text-red-800">Sign in failed</p>
                <p className="text-xs text-red-700 mt-0.5">{serverError.message}</p>
              </div>
            </div>
          )}

          <form onSubmit={form.handleSubmit(onSubmit)} noValidate className="space-y-4">

            {/* Email */}
            <Controller
              control={form.control}
              name="email"
              render={({ field, fieldState }) => (
                <Field data-invalid={fieldState.invalid}>
                  <FieldLabel htmlFor={field.name}>Email address</FieldLabel>
                  <Input
                    {...field}
                    id={field.name}
                    type="email"
                    placeholder="you@example.com"
                    autoComplete="email"
                    disabled={isSubmitting}
                    aria-invalid={fieldState.invalid}
                  />
                  {fieldState.invalid && <FieldError errors={[fieldState.error]} />}
                </Field>
              )}
            />

            {/* Password */}
            <Controller
              control={form.control}
              name="password"
              render={({ field, fieldState }) => (
                <Field data-invalid={fieldState.invalid}>
                  <div className="flex items-center justify-between">
                    <FieldLabel htmlFor={field.name}>Password</FieldLabel>
                    <Link href="/forgot-password" className="text-xs text-brand-green hover:underline">
                      Forgot password?
                    </Link>
                  </div>
                  <div className="relative">
                    <Input
                      {...field}
                      id={field.name}
                      type={showPassword ? 'text' : 'password'}
                      placeholder="Enter your password"
                      autoComplete="current-password"
                      disabled={isSubmitting}
                      aria-invalid={fieldState.invalid}
                      className="pr-10"
                    />
                    <button
                      type="button"
                      tabIndex={-1}
                      onClick={() => setShowPassword(p => !p)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"



                    >
                      {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                    </button>
                  </div>
                  {fieldState.invalid && <FieldError errors={[fieldState.error]} />}
                </Field>
              )}
            />

            <button
              type="submit"
              disabled={isSubmitting}
             className="w-full bg-brand-green text-white py-3 rounded-xl font-semibold hover:bg-brand-green-dark transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"

            >
              {isSubmitting && <Loader2 className="w-4 h-4 animate-spin" />}
              {isSubmitting ? 'Signing in...' : 'Sign in'}
            </button>
          </form>
        </div>

        <p className="text-center text-green-200 text-xs mt-6">
          © {new Date().getFullYear()} AffilMarket Kenya. All rights reserved.
        </p>
      </div>
    </div>
  );
}
