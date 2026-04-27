'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { submitAffiliateOnboarding } from '@/action/affiliateOnboardingAction';
import {
  Link2, Phone, CreditCard, Rocket,
  Loader2, ChevronRight, ChevronLeft,
  Smartphone, Building2, User, Hash,
  CheckCircle,
} from 'lucide-react';

// 1. IMPROVED SCHEMA with Conditional Validation
const schema = z.object({
  // Step 1
  fullName: z.string().min(2, 'Full name is required').max(100),
  phone: z.string().min(9, 'Phone number is required').max(20),
  
  // Step 2
  idNumber: z.string().max(20).optional().or(z.literal('')),
  
  // Step 3
  payoutMethod: z.enum(['MPESA', 'BANK']),
  mpesaPhone: z.string().optional().or(z.literal('')),
  bankName: z.string().optional().or(z.literal('')),
  bankAccountName: z.string().optional().or(z.literal('')),
  bankAccountNumber: z.string().optional().or(z.literal('')),
}).refine((data) => {
  // If BANK is selected, these fields become mandatory
  if (data.payoutMethod === 'BANK') {
    return !!data.bankName && !!data.bankAccountName && !!data.bankAccountNumber;
  }
  return true;
}, {
  message: "All bank details are required for bank transfers",
  path: ["bankName"], 
});

type FormData = z.infer<typeof schema>;

const STEPS = [
  { id: 1, label: 'Personal', icon: User, desc: 'Your name & contact' },
  { id: 2, label: 'Identity', icon: Hash, desc: 'ID verification' },
  { id: 3, label: 'Payouts', icon: CreditCard, desc: 'How you get paid' },
  { id: 4, label: 'Launch', icon: Rocket, desc: 'Ready to earn!' },
];

const SAMPLE_PRODUCTS = [
  { name: 'Electronics', price: 15000, rate: 0.08 },
  { name: 'Fashion', price: 3500, rate: 0.15 },
  { name: 'Health', price: 2500, rate: 0.12 },
];

export function AffiliateOnboardingForm() {
  const router = useRouter();
  const [step, setStep] = useState(1);
  const [serverError, setServerError] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [launched, setLaunched] = useState(false);
  const [confetti, setConfetti] = useState<Array<{
    color: string; left: string; top: string; delay: string; duration: string;
  }>>([]);

  const {
    register, handleSubmit, watch, setValue, trigger,
    formState: { errors },
  } = useForm<FormData>({
    resolver: zodResolver(schema),
    defaultValues: { 
      fullName: '',
      phone: '',
      idNumber: '',
      payoutMethod: 'MPESA',
      mpesaPhone: '',
      bankName: '',
      bankAccountName: '',
      bankAccountNumber: ''
    },
  });

  const values = watch();
  const payoutMethod = watch('payoutMethod');
  const primaryPhone = watch('phone');

  // Auto-fill M-Pesa phone if it's empty and primary phone exists
  useEffect(() => {
    if (payoutMethod === 'MPESA' && !values.mpesaPhone && primaryPhone) {
      setValue('mpesaPhone', primaryPhone);
    }
  }, [primaryPhone, payoutMethod, setValue, values.mpesaPhone]);

  useEffect(() => {
    if (launched) {
      const colors = ['#16a34a', '#f59e0b', '#3b82f6', '#ec4899', '#8b5cf6'];
      setConfetti(
        colors.flatMap((color) =>
          Array.from({ length: 6 }).map(() => ({
            color,
            left: `${Math.random() * 300 - 50}px`,
            top: `${Math.random() * -60}px`,
            delay: `${Math.random() * 0.8}s`,
            duration: `${1.2 + Math.random() * 0.8}s`,
          }))
        )
      );
      setTimeout(() => router.push('/affiliate'), 2500);
    }
  }, [launched, router]);

  const nextStep = async () => {
    const fieldMap: Record<number, (keyof FormData)[]> = {
      1: ['fullName', 'phone'],
      2: ['idNumber'],
      3: ['payoutMethod', 'mpesaPhone', 'bankName', 'bankAccountName', 'bankAccountNumber'],
    };
    
    const valid = await trigger(fieldMap[step]);
    if (valid) {
      setStep(s => s + 1);
      window.scrollTo({ top: 0, behavior: 'smooth' });
    }
  };

  const onSubmit = async (data: FormData) => {
    setServerError('');
    setIsSubmitting(true);
    const result = await submitAffiliateOnboarding(data);
    setIsSubmitting(false);

    if (result.error) {
      setServerError(result.error);
      return;
    }
    setLaunched(true);
  };

  if (launched) {
    return (
      <div style={{ minHeight: '100vh', background: '#0d1117', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <style>{`
          @keyframes pop { 0%{transform:scale(0.5);opacity:0} 70%{transform:scale(1.1)} 100%{transform:scale(1);opacity:1} }
          @keyframes float { 0%,100%{transform:translateY(0)} 50%{transform:translateY(-12px)} }
          @keyframes confetti { 0%{transform:translateY(-20px) rotate(0);opacity:1} 100%{transform:translateY(120px) rotate(720deg);opacity:0} }
          .pop { animation: pop 0.5s cubic-bezier(.34,1.56,.64,1) forwards; }
          .float { animation: float 2s ease-in-out infinite; }
          .cp { position:absolute; width:8px; height:8px; border-radius:2px; animation: confetti 1.5s ease-in forwards; }
        `}</style>
        <div style={{ textAlign: 'center', position: 'relative' }}>
          {confetti.map((p, i) => (
            <div key={i} className="cp" style={{ background: p.color, left: p.left, top: p.top, animationDelay: p.delay, animationDuration: p.duration }} />
          ))}
          <div className="pop float" style={{ fontSize: 80, marginBottom: 20 }}>🔗</div>
          <h1 style={{ fontSize: 36, fontWeight: 900, color: '#fff', margin: '0 0 8px', letterSpacing: '-0.04em' }}>
            You're an Affiliate!
          </h1>
          <p style={{ fontSize: 16, color: '#6b7280' }}>Taking you to your dashboard...</p>
        </div>
      </div>
    );
  }

  return (
    <>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Syne:wght@700;800&family=DM+Sans:wght@400;500;600;700&display=swap');
        * { box-sizing: border-box; }
        .ao-wrap { display: flex; min-height: 100vh; font-family: 'DM Sans', sans-serif; background: #f8f7f4; }
        .ao-left { width: 360px; flex-shrink: 0; background: #0d1117; display: flex; flex-direction: column; padding: 40px 32px; position: sticky; top: 0; height: 100vh; }
        .ao-brand { display: flex; align-items: center; gap: 10px; margin-bottom: 48px; }
        .ao-brand-dot { width: 10px; height: 10px; background: #16a34a; border-radius: 50%; }
        .ao-brand-name { font-family: 'Syne', sans-serif; font-weight: 800; font-size: 18px; color: #fff; }
        .ao-steps { display: flex; flex-direction: column; gap: 4px; }
        .ao-step { display: flex; align-items: center; gap: 14px; padding: 12px 14px; border-radius: 12px; }
        .ao-step.active { background: rgba(255,255,255,0.06); }
        .ao-step-num { width: 32px; height: 32px; border-radius: 9px; display: flex; align-items: center; justify-content: center; font-size: 13px; font-weight: 700; flex-shrink: 0; transition: all 0.3s; }
        .ao-step.done .ao-step-num { background: #16a34a; color: #fff; }
        .ao-step.active .ao-step-num { background: #fff; color: #111; }
        .ao-step.pending .ao-step-num { background: rgba(255,255,255,0.07); color: #4b5563; }
        .ao-step-label { font-size: 13.5px; font-weight: 700; font-family: 'Syne', sans-serif; color: #fff; }
        .ao-step.pending .ao-step-label { color: #4b5563; }
        .ao-step-desc { font-size: 11.5px; color: #6b7280; margin-top: 1px; }
        .ao-step-line { width: 1px; height: 16px; background: rgba(255,255,255,0.06); margin-left: 29px; }
        .ao-earn-card { margin-top: auto; background: linear-gradient(135deg, #1a1f2e, #111827); border: 1px solid rgba(255,255,255,0.07); border-radius: 18px; padding: 20px; }
        .ao-earn-label { font-size: 10px; font-weight: 700; letter-spacing: 0.12em; text-transform: uppercase; color: #374151; margin-bottom: 14px; }
        .ao-earn-row { display: flex; justify-content: space-between; align-items: center; margin-bottom: 10px; }
        .ao-earn-product { font-size: 12px; color: #6b7280; }
        .ao-earn-amount { font-size: 14px; font-weight: 800; color: #4ade80; font-family: 'Syne', sans-serif; }
        .ao-earn-divider { height: 1px; background: rgba(255,255,255,0.05); margin: 12px 0; }
        .ao-earn-total-label { font-size: 11px; color: #6b7280; margin-bottom: 4px; }
        .ao-earn-total { font-size: 24px; font-weight: 900; color: #fff; font-family: 'Syne', sans-serif; letter-spacing: -0.04em; }
        .ao-right { flex: 1; display: flex; align-items: center; justify-content: center; padding: 60px 48px; overflow-y: auto; }
        .ao-form-box { width: 100%; max-width: 500px; }
        .ao-progress { height: 2px; background: #e5e7eb; border-radius: 100px; margin-bottom: 40px; overflow: hidden; }
        .ao-progress-fill { height: 100%; background: linear-gradient(90deg, #16a34a, #4ade80); border-radius: 100px; transition: width 0.4s cubic-bezier(.34,1.2,.64,1); }
        .ao-eyebrow { font-size: 11px; font-weight: 700; letter-spacing: 0.12em; text-transform: uppercase; color: #16a34a; margin-bottom: 8px; }
        .ao-title { font-family: 'Syne', sans-serif; font-size: 30px; font-weight: 800; color: #111; letter-spacing: -0.04em; line-height: 1.1; }
        .ao-subtitle { font-size: 14px; color: #6b7280; margin-top: 6px; margin-bottom: 32px; }
        .ao-field { margin-bottom: 20px; }
        .ao-label { display: block; font-size: 13px; font-weight: 600; color: #374151; margin-bottom: 6px; }
        .ao-input { width: 100%; padding: 13px 16px; border: 1.5px solid #e5e7eb; border-radius: 12px; font-size: 14px; font-family: 'DM Sans', sans-serif; color: #111; background: #fff; outline: none; transition: all 0.15s; }
        .ao-input:focus { border-color: #16a34a; box-shadow: 0 0 0 3px rgba(22,163,74,0.08); }
        .ao-err { font-size: 11.5px; color: #ef4444; margin-top: 5px; }
        .ao-payout-toggle { display: grid; grid-template-columns: 1fr 1fr; gap: 10px; margin-bottom: 24px; }
        .ao-payout-opt { border: 2px solid #e5e7eb; border-radius: 12px; padding: 16px; cursor: pointer; transition: all 0.2s; background: #fff; text-align: center; }
        .ao-payout-opt.selected { border-color: #16a34a; background: #f0fdf4; }
        .ao-payout-opt-label { font-size: 13px; font-weight: 700; color: #111; }
        .ao-nav { display: flex; gap: 12px; margin-top: 36px; }
        .ao-btn-next { flex: 1; display: flex; align-items: center; justify-content: center; gap: 8px; padding: 13px 24px; background: #111; border: none; border-radius: 12px; font-size: 14px; font-weight: 700; color: #fff; cursor: pointer; transition: background 0.2s; }
        .ao-btn-launch { flex: 1; display: flex; align-items: center; justify-content: center; gap: 8px; padding: 13px 24px; background: linear-gradient(135deg, #16a34a, #15803d); border: none; border-radius: 12px; font-size: 14px; font-weight: 700; color: #fff; cursor: pointer; box-shadow: 0 4px 14px rgba(22,163,74,0.35); }
        @media (max-width: 900px) { .ao-left { display: none; } .ao-right { padding: 32px 24px; } }
      `}</style>

      <div className="ao-wrap">
        <div className="ao-left">
          <div className="ao-brand">
            <div className="ao-brand-dot" />
            <span className="ao-brand-name">AffilMarket</span>
          </div>

          <div className="ao-steps">
            {STEPS.map((s, i) => {
              const state = step === s.id ? 'active' : step > s.id ? 'done' : 'pending';
              return (
                <div key={s.id}>
                  <div className={`ao-step ${state}`}>
                    <div className="ao-step-num">
                      {state === 'done' ? '✓' : <s.icon size={14} />}
                    </div>
                    <div>
                      <div className="ao-step-label">{s.label}</div>
                      <div className="ao-step-desc">{s.desc}</div>
                    </div>
                  </div>
                  {i < STEPS.length - 1 && <div className="ao-step-line" />}
                </div>
              );
            })}
          </div>

          <div className="ao-earn-card">
            <div className="ao-earn-label">Potential Earnings Per Sale</div>
            {SAMPLE_PRODUCTS.map((p) => (
              <div key={p.name} className="ao-earn-row">
                <span className="ao-earn-product">{p.name}</span>
                <span className="ao-earn-amount">+KES {(p.price * p.rate).toLocaleString()}</span>
              </div>
            ))}
            <div className="ao-earn-divider" />
            <div className="ao-earn-total-label">Monthly referral estimate (10 sales)</div>
            <div className="ao-earn-total">
              KES {(SAMPLE_PRODUCTS.reduce((s, p) => s + p.price * p.rate, 0) * 10 / SAMPLE_PRODUCTS.length).toLocaleString('en-KE', { maximumFractionDigits: 0 })}+
            </div>
            <div style={{ fontSize: 11, color: '#6b7280', marginTop: 3 }}>Paid directly to your M-Pesa 💚</div>
          </div>
        </div>

        <div className="ao-right">
          <div className="ao-form-box">
            <div className="ao-progress">
              <div className="ao-progress-fill" style={{ width: `${(step / 4) * 100}%` }} />
            </div>

            {serverError && (
              <div style={{ background: '#fef2f2', border: '1px solid #fecaca', borderRadius: 12, padding: '12px 16px', fontSize: 13, color: '#dc2626', marginBottom: 20 }}>
                {serverError}
              </div>
            )}

            <form onSubmit={handleSubmit(onSubmit)} noValidate>
              {/* STEP 1: Personal */}
              {step === 1 && (
                <>
                  <div className="ao-eyebrow">Step 1 of 4</div>
                  <div className="ao-title">Tell us about yourself</div>
                  <div className="ao-subtitle">This is how vendors and customers will know you.</div>
                  <div className="ao-field">
                    <label className="ao-label">Full Name *</label>
                    <input {...register('fullName')} className={`ao-input ${errors.fullName ? 'error' : ''}`} placeholder="Jane Muthoni" />
                    {errors.fullName && <div className="ao-err">{errors.fullName.message}</div>}
                  </div>
                  <div className="ao-field">
                    <label className="ao-label">Phone Number *</label>
                    <input {...register('phone')} className={`ao-input ${errors.phone ? 'error' : ''}`} type="tel" placeholder="+254712345678" />
                    {errors.phone && <div className="ao-err">{errors.phone.message}</div>}
                  </div>
                </>
              )}

              {/* STEP 2: Identity */}
              {step === 2 && (
                <>
                  <div className="ao-eyebrow">Step 2 of 4</div>
                  <div className="ao-title">Verify your identity</div>
                  <div className="ao-subtitle">Required to protect vendors. Only visible to admins.</div>
                  <div className="ao-field">
                    <label className="ao-label">National ID Number</label>
                    <input {...register('idNumber')} className="ao-input" placeholder="e.g. 12345678" />
                    {errors.idNumber && <div className="ao-err">{errors.idNumber.message}</div>}
                  </div>
                  <div style={{ background: '#f0fdf4', border: '1px solid #bbf7d0', borderRadius: 12, padding: '14px 16px', fontSize: 13, color: '#15803d', display: 'flex', gap: 10 }}>
                    <span style={{ fontSize: 16 }}>🔒</span>
                    <span>Your ID is encrypted and <strong>never shared publicly</strong>.</span>
                  </div>
                </>
              )}

              {/* STEP 3: Payouts */}
              {step === 3 && (
                <>
                  <div className="ao-eyebrow">Step 3 of 4</div>
                  <div className="ao-title">How do you want to get paid?</div>
                  <div className="ao-subtitle">Commissions are released after order delivery.</div>
                  <div className="ao-payout-toggle">
                    <div className={`ao-payout-opt${payoutMethod === 'MPESA' ? ' selected' : ''}`} onClick={() => setValue('payoutMethod', 'MPESA')}>
                      <div style={{ fontSize: 28, marginBottom: 8 }}>📱</div>
                      <div className="ao-payout-opt-label">M-Pesa</div>
                      <div style={{ fontSize: 11.5, color: '#9ca3af', marginTop: 2 }}>Instant · No fee</div>
                    </div>
                    <div className={`ao-payout-opt${payoutMethod === 'BANK' ? ' selected' : ''}`} onClick={() => setValue('payoutMethod', 'BANK')}>
                      <div style={{ fontSize: 28, marginBottom: 8 }}>🏦</div>
                      <div className="ao-payout-opt-label">Bank Transfer</div>
                      <div style={{ fontSize: 11.5, color: '#9ca3af', marginTop: 2 }}>1–3 days · KES 50 fee</div>
                    </div>
                  </div>

                  {payoutMethod === 'MPESA' ? (
                    <div className="ao-field">
                      <label className="ao-label">M-Pesa Phone Number *</label>
                      <input {...register('mpesaPhone')} className="ao-input" type="tel" placeholder="+254..." />
                      {errors.mpesaPhone && <div className="ao-err">{errors.mpesaPhone.message}</div>}
                    </div>
                  ) : (
                    <>
                      <div className="ao-field">
                        <label className="ao-label">Bank Name *</label>
                        <select {...register('bankName')} className="ao-input">
                          <option value="">Select bank...</option>
                          {['KCB', 'Equity', 'Co-op', 'Absa', 'NCBA', 'Family'].map(b => <option key={b} value={b}>{b} Bank</option>)}
                        </select>
                        {errors.bankName && <div className="ao-err">{errors.bankName.message}</div>}
                      </div>
                      <div className="ao-field">
                        <label className="ao-label">Account Number *</label>
                        <input {...register('bankAccountNumber')} className="ao-input" placeholder="0123456789" />
                      </div>
                    </>
                  )}
                </>
              )}

              {/* STEP 4: Review */}
              {step === 4 && (
                <>
                  <div className="ao-eyebrow">Step 4 of 4</div>
                  <div className="ao-title">Ready to start earning 🚀</div>
                  <div className="ao-subtitle">Review your details before we set up your account.</div>
                  <div style={{ background: '#f9fafb', borderRadius: 14, padding: '4px 16px', marginBottom: 14 }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', padding: '12px 0', borderBottom: '1px solid #f3f4f6' }}>
                      <span style={{ fontSize: 12, color: '#9ca3af', fontWeight: 600 }}>NAME</span>
                      <span style={{ fontSize: 13.5, color: '#111', fontWeight: 700 }}>{values.fullName}</span>
                    </div>
                    <div style={{ display: 'flex', justifyContent: 'space-between', padding: '12px 0' }}>
                      <span style={{ fontSize: 12, color: '#9ca3af', fontWeight: 600 }}>PAYOUT</span>
                      <span style={{ fontSize: 13.5, color: '#111', fontWeight: 700 }}>{values.payoutMethod === 'MPESA' ? 'M-Pesa' : 'Bank'}</span>
                    </div>
                  </div>
                </>
              )}

              <div className="ao-nav">
                {step > 1 && (
                  <button type="button" className="ao-btn-back" onClick={() => setStep(s => s - 1)}>
                    <ChevronLeft size={15} /> Back
                  </button>
                )}
                {step < 4 ? (
                  <button type="button" className="ao-btn-next" onClick={nextStep}>
                    Continue <ChevronRight size={15} />
                  </button>
                ) : (
                  <button type="submit" className="ao-btn-launch" disabled={isSubmitting}>
                    {isSubmitting ? <><Loader2 size={15} className="animate-spin" /> Setting up...</> : <>🔗 Start Earning</>}
                  </button>
                )}
              </div>
            </form>
          </div>
        </div>
      </div>
    </>
  );
}
