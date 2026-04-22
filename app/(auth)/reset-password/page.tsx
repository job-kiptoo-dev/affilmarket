'use client';

import { useForm, Controller }          from 'react-hook-form';
import { z }                            from 'zod';
import { zodResolver }                  from '@hookform/resolvers/zod';
import { useState, useEffect }          from 'react';
import { useRouter, useSearchParams }   from 'next/navigation';
import { authClient }                   from '@/lib/utils/auth-client';
import Link from 'next/link';

const ResetPasswordSchema = z
  .object({
    password: z
      .string()
      .min(8,  { message: 'Password must be at least 8 characters' })
      .max(20, { message: 'Password must be at most 20 characters' }),
    confirmPassword: z.string().min(1, { message: 'Please confirm your password' }),
  })
  .refine((d) => d.password === d.confirmPassword, {
    message: 'Passwords do not match',
    path:    ['confirmPassword'],
  });

type FormData = z.infer<typeof ResetPasswordSchema>;

/* ── tiny sub-components ───────────────────────────────────────────── */

function FieldError({ message }: { message?: string }) {
  if (!message) return null;
  return (
    <p role="alert" style={{
      fontSize: 12, color: '#dc2626', marginTop: 5,
      display: 'flex', alignItems: 'center', gap: 4,
    }}>
      <svg width="12" height="12" viewBox="0 0 24 24" fill="none"
        stroke="currentColor" strokeWidth="2.5" strokeLinecap="round">
        <circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/>
        <line x1="12" y1="16" x2="12.01" y2="16"/>
      </svg>
      {message}
    </p>
  );
}

function AlertBox({ type, message }: { type: 'error' | 'success'; message: string }) {
  const isError = type === 'error';
  return (
    <div role="alert" style={{
      display: 'flex', alignItems: 'flex-start', gap: 10,
      background: isError ? '#fef2f2' : '#f0fdf4',
      border:     `1px solid ${isError ? '#fecaca' : '#86efac'}`,
      borderRadius: 10, padding: '12px 14px', marginTop: 16,
      fontSize: 13, color: isError ? '#dc2626' : '#15803d', fontWeight: 600,
    }}>
      <svg width="16" height="16" viewBox="0 0 24 24" fill="none"
        stroke="currentColor" strokeWidth="2.5" strokeLinecap="round"
        style={{ flexShrink: 0, marginTop: 1 }}>
        {isError
          ? <><circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/></>
          : <><circle cx="12" cy="12" r="10"/><polyline points="9 12 11 14 15 10"/></>}
      </svg>
      {message}
    </div>
  );
}

function StrengthBars({ value }: { value: string }) {
  if (!value) return null;
  const score  = getStrength(value);
  const filled = ['#e5e7eb', '#ef4444', '#f97316', '#eab308', '#16a34a'];
  const labels = ['',        'Weak',    'Fair',    'Good',    'Strong' ];
  return (
    <div style={{ marginTop: 8 }}>
      <div style={{ display: 'flex', gap: 4 }}>
        {[1,2,3,4].map((i) => (
          <div key={i} style={{
            height: 3, flex: 1, borderRadius: 2,
            background: i <= score ? filled[score] : '#e5e7eb',
            transition: 'background 0.3s',
          }}/>
        ))}
      </div>
      <p style={{ fontSize: 11, marginTop: 4, color: filled[score], fontWeight: 600, margin: '4px 0 0' }}>
        {labels[score]}
      </p>
    </div>
  );
}

function getStrength(p: string) {
  let s = 0;
  if (p.length >= 8)           s++;
  if (/[A-Z]/.test(p))         s++;
  if (/[0-9]/.test(p))         s++;
  if (/[^A-Za-z0-9]/.test(p))  s++;
  return s;
}

/* ── main component ─────────────────────────────────────────────────── */

const ResetPassword = () => {
  const router       = useRouter();
  const searchParams = useSearchParams();
  const token        = searchParams.get('token');

  const [serverError,   setServerError]   = useState<string | null>(null);
  const [serverSuccess, setServerSuccess] = useState<string | null>(null);
  const [loading,       setLoading]       = useState(false);
  const [showPass,      setShowPass]      = useState(false);

  useEffect(() => {
    if (!token) setServerError('Invalid or expired reset link. Please request a new one.');
  }, [token]);

  const form = useForm<FormData>({
    resolver: zodResolver(ResetPasswordSchema),
    defaultValues:  { password: '', confirmPassword: '' },
    mode:           'onTouched',   // validate as soon as a field is blurred
    reValidateMode: 'onChange',    // then live-validate on every keystroke
  });

  const onSubmit = async (values: FormData) => {
    if (!token) return;
    setServerError(null);
    setServerSuccess(null);
    setLoading(true);

    const { error } = await authClient.resetPassword({
      newPassword: values.password,
      token,
    });

    setLoading(false);

    if (error) {
      setServerError(error.message ?? 'Something went wrong. Please try again.');
    } else {
      setServerSuccess('Password reset successfully! Redirecting to sign in…');
      setTimeout(() => router.push('/login'), 2500);
    }
  };

  const disabled = loading || !token;

  return (
    <>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=DM+Sans:wght@400;500;600;700;800&display=swap');
        *, *::before, *::after { box-sizing: border-box; }
        .rp-wrap  { font-family:'DM Sans',sans-serif; min-height:100vh; background:#f8f7f4; display:flex; align-items:center; justify-content:center; padding:24px; }
        .rp-card  { background:#fff; border:1px solid #e5e7eb; border-radius:16px; padding:36px 32px; width:100%; max-width:420px; }
        .rp-title { font-size:22px; font-weight:800; color:#111; letter-spacing:-0.04em; margin:0 0 6px; }
        .rp-desc  { font-size:14px; color:#6b7280; margin:0 0 28px; }
        .rp-group { margin-bottom:18px; }
        .rp-label { display:block; font-size:13px; font-weight:600; color:#374151; margin-bottom:6px; }
        .rp-field { position:relative; }
        .rp-input { width:100%; padding:11px 40px 11px 14px; border:1.5px solid #e5e7eb; border-radius:10px; font-size:14px; font-family:'DM Sans',sans-serif; color:#111; outline:none; transition:border-color 0.15s, box-shadow 0.15s; }
        .rp-input:focus        { border-color:#16a34a; box-shadow:0 0 0 3px rgba(22,163,74,0.1); }
        .rp-input:disabled     { background:#f9fafb; cursor:not-allowed; }
        .rp-input[aria-invalid="true"] { border-color:#dc2626; }
        .rp-input[aria-invalid="true"]:focus { box-shadow:0 0 0 3px rgba(220,38,38,0.1); }
        .rp-eye   { position:absolute; right:12px; top:50%; transform:translateY(-50%); background:none; border:none; cursor:pointer; color:#9ca3af; padding:0; display:flex; align-items:center; }
        .rp-eye:hover { color:#374151; }
        .rp-btn   { width:100%; margin-top:20px; background:#16a34a; color:#fff; border:none; border-radius:10px; padding:12px; font-size:15px; font-weight:700; cursor:pointer; font-family:'DM Sans',sans-serif; transition:background 0.2s; }
        .rp-btn:hover:not(:disabled) { background:#15803d; }
        .rp-btn:disabled { opacity:0.5; cursor:not-allowed; }
        .rp-footer { text-align:center; margin-top:20px; font-size:13px; color:#6b7280; }
        .rp-footer a { color:#16a34a; font-weight:600; text-decoration:none; }
        .rp-footer a:hover { text-decoration:underline; }
        @keyframes spin { to { transform:rotate(360deg) } }
        .rp-spinner { width:15px; height:15px; border:2px solid rgba(255,255,255,0.35); border-top-color:#fff; border-radius:50%; animation:spin 0.7s linear infinite; display:inline-block; margin-right:8px; vertical-align:middle; }
      `}</style>

      <div className="rp-wrap">
        <div className="rp-card">
          <h1 className="rp-title">Reset Password</h1>
          <p className="rp-desc">Choose a strong new password for your account.</p>

          <form onSubmit={form.handleSubmit(onSubmit)} noValidate>

            {/* ── New password ── */}
            <div className="rp-group">
              <label className="rp-label" htmlFor="password">New password</label>
              <Controller
                control={form.control}
                name="password"
                render={({ field, fieldState }) => (
                  <>
                    <div className="rp-field">
                      <input
                        {...field}
                        id="password"
                        type={showPass ? 'text' : 'password'}
                        className="rp-input"
                        placeholder="Min. 8 characters"
                        disabled={disabled}
                        autoComplete="new-password"
                        aria-invalid={!!fieldState.error}
                        aria-describedby={fieldState.error ? 'password-error' : undefined}
                      />
                      <button type="button" className="rp-eye" onClick={() => setShowPass(p => !p)} tabIndex={-1}>
                        {showPass
                          ? <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94"/><path d="M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19"/><line x1="1" y1="1" x2="23" y2="23"/></svg>
                          : <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/><circle cx="12" cy="12" r="3"/></svg>
                        }
                      </button>
                    </div>
                    <StrengthBars value={field.value} />
                    <FieldError message={fieldState.error?.message} />
                  </>
                )}
              />
            </div>

            {/* ── Confirm password ── */}
            <div className="rp-group">
              <label className="rp-label" htmlFor="confirmPassword">Confirm password</label>
              <Controller
                control={form.control}
                name="confirmPassword"
                render={({ field, fieldState }) => (
                  <>
                    <div className="rp-field">
                      <input
                        {...field}
                        id="confirmPassword"
                        type={showPass ? 'text' : 'password'}
                        className="rp-input"
                        placeholder="Repeat your password"
                        disabled={disabled}
                        autoComplete="new-password"
                        aria-invalid={!!fieldState.error}
                        aria-describedby={fieldState.error ? 'confirm-error' : undefined}
                      />
                    </div>
                    <FieldError message={fieldState.error?.message} />
                  </>
                )}
              />
            </div>

            {/* ── Server-level feedback ── */}
            {serverError   && <AlertBox type="error"   message={serverError}   />}
            {serverSuccess && <AlertBox type="success" message={serverSuccess} />}

            <button className="rp-btn" type="submit" disabled={disabled}>
              {loading
                ? <><span className="rp-spinner" />Resetting...</>
                : 'Reset Password'}
            </button>
          </form>

          <div className="rp-footer">
            Remembered it? <Link href="/login">Back to sign in</Link>
          </div>
        </div>
      </div>
    </>
  );
};

export default ResetPassword;
