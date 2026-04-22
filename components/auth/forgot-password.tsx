'use client';

import { useForm, Controller }  from 'react-hook-form';
import { z }                    from 'zod';
import { zodResolver }          from '@hookform/resolvers/zod';
import { useState }             from 'react';
import { ForgotPasswordSchema } from '@/lib/healpers/zod/forgot-password-schema';
import { authClient }           from '@/lib/utils/auth-client';

type FormData = z.infer<typeof ForgotPasswordSchema>;

const ForgotPassword = () => {
  const [error,   setError]   = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const form = useForm<FormData>({
    resolver: zodResolver(ForgotPasswordSchema),
    defaultValues: { email: '' },
  });

  const onSubmit = async (values: FormData) => {
    try {
      setError(null);
      setSuccess(null);
      setLoading(true);

      await authClient.requestPasswordReset(   // ✅ fixed: was authClient(...)
        {
          email:      values.email,
          redirectTo: '/reset-password',
        },
        {
          onResponse: () => setLoading(false),
          onSuccess:  () => setSuccess('Reset password link has been sent to your email.'),
          onError:    (ctx) => {
            setLoading(false);
            setError(ctx.error.message);
          },
        },
      );
    } catch (err) {
      console.error(err);
      setLoading(false);
      setError('Something went wrong. Please try again.');
    }
  };

  return (
    <>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=DM+Sans:wght@400;500;600;700;800&display=swap');
        .fp-wrap { font-family: 'DM Sans', sans-serif; min-height: 100vh; background: #f8f7f4; display: flex; align-items: center; justify-content: center; padding: 24px; }
        .fp-card { background: #fff; border: 1px solid #e5e7eb; border-radius: 16px; padding: 36px 32px; width: 100%; max-width: 420px; }
        .fp-title { font-size: 22px; font-weight: 800; color: #111; letter-spacing: -0.04em; margin-bottom: 6px; }
        .fp-desc  { font-size: 14px; color: #6b7280; margin-bottom: 28px; }
        .fp-label { display: block; font-size: 13px; font-weight: 600; color: #374151; margin-bottom: 6px; }
        .fp-input { width: 100%; padding: 11px 14px; border: 1.5px solid #e5e7eb; border-radius: 10px; font-size: 14px; font-family: 'DM Sans', sans-serif; color: #111; outline: none; transition: border-color 0.15s; box-sizing: border-box; }
        .fp-input:focus { border-color: #16a34a; box-shadow: 0 0 0 3px rgba(22,163,74,0.08); }
        .fp-input:disabled { background: #f9fafb; cursor: not-allowed; }
        .fp-err  { font-size: 12px; color: #dc2626; margin-top: 5px; }
        .fp-error-box   { background: #fef2f2; border: 1px solid #fecaca; border-radius: 9px; padding: 11px 14px; font-size: 13px; color: #dc2626; font-weight: 600; margin-top: 14px; }
        .fp-success-box { background: #f0fdf4; border: 1px solid #86efac; border-radius: 9px; padding: 11px 14px; font-size: 13px; color: #15803d; font-weight: 600; margin-top: 14px; }
        .fp-btn { width: 100%; margin-top: 20px; background: #16a34a; color: #fff; border: none; border-radius: 10px; padding: 12px; font-size: 15px; font-weight: 700; cursor: pointer; font-family: 'DM Sans', sans-serif; transition: background 0.2s; }
        .fp-btn:hover:not(:disabled) { background: #15803d; }
        .fp-btn:disabled { opacity: 0.5; cursor: not-allowed; }
        .fp-footer { text-align: center; margin-top: 20px; font-size: 13px; color: #6b7280; }
        .fp-footer a { color: #16a34a; font-weight: 600; text-decoration: none; }
        .fp-footer a:hover { text-decoration: underline; }
        @keyframes spin { to { transform: rotate(360deg) } }
        .fp-spinner { width: 15px; height: 15px; border: 2px solid rgba(255,255,255,0.35); border-top-color: #fff; border-radius: 50%; animation: spin 0.7s linear infinite; display: inline-block; margin-right: 8px; vertical-align: middle; }
      `}</style>

      <div className="fp-wrap">
        <div className="fp-card">
          <h1 className="fp-title">Forgot Password</h1>
          <p className="fp-desc">Enter your email and we'll send you a link to reset your password.</p>

          <form onSubmit={form.handleSubmit(onSubmit)} noValidate>
            <div>
              <label className="fp-label" htmlFor="email">Email address</label>
              <Controller
                control={form.control}
                name="email"
                render={({ field, fieldState }) => (
                  <>
                    <input
                      {...field}
                      id="email"
                      type="email"
                      className="fp-input"
                      placeholder="you@example.com"
                      disabled={loading}
                      autoComplete="email"
                    />
                    {fieldState.error && (
                      <p className="fp-err">{fieldState.error.message}</p>
                    )}
                  </>
                )}
              />
            </div>

            {error   && <div className="fp-error-box">{error}</div>}
            {success && <div className="fp-success-box">{success}</div>}

            <button className="fp-btn" type="submit" disabled={loading}>
              {loading
                ? <><span className="fp-spinner" />Sending...</>
                : 'Send Reset Link'}
            </button>
          </form>

          <div className="fp-footer">
            Remember your password? <a href="/login">Sign in</a>
          </div>
        </div>
      </div>
    </>
  );
};

export default ForgotPassword;
