'use client';
import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { toast } from 'sonner';
import { submitAffiliateOnboarding } from '@/action/affiliateOnboardingAction';
import {
  CreditCard, Rocket, Loader2, ChevronRight, ChevronLeft,
  User, Hash, Check, ShieldCheck, Smartphone, Banknote
} from 'lucide-react';

// ─── Full schema (used only for final submit) ─────────────────────────────────
const baseSchema = z.object({
  fullName: z.string().min(2, 'Full name is required'),
  phone: z.string().min(9, 'Phone number is required'),
  idNumber: z.string().min(5, 'ID number is required'),
  payoutMethod: z.enum(['MPESA', 'BANK']),
  mpesaPhone: z.string().optional(),
  bankName: z.string().optional(),
  bankAccountName: z.string().optional(),
  bankAccountNumber: z.string().optional(),
});
const schema = baseSchema.superRefine((data, ctx) => {
  if (data.payoutMethod === 'MPESA') {
    if (!data.mpesaPhone || data.mpesaPhone.length < 9) {
      ctx.addIssue({ code: z.ZodIssueCode.custom, message: 'M-Pesa number is required', path: ['mpesaPhone'] });
    }
  } else {
    if (!data.bankName) ctx.addIssue({ code: z.ZodIssueCode.custom, message: 'Bank name required', path: ['bankName'] });
    if (!data.bankAccountName) ctx.addIssue({ code: z.ZodIssueCode.custom, message: 'Account name required', path: ['bankAccountName'] });
    if (!data.bankAccountNumber) ctx.addIssue({ code: z.ZodIssueCode.custom, message: 'Account number required', path: ['bankAccountNumber'] });
  }
});

// ─── Per-step schemas (used only for step navigation) ────────────────────────
const stepSchemas = {
  1: z.object({
    fullName: z.string().min(2, 'Full name is required'),
    phone: z.string().min(9, 'Phone number is required'),
  }),
  2: z.object({
    idNumber: z.string().min(5, 'ID number is required'),
  }),
  3: {
    MPESA: z.object({
      mpesaPhone: z.string().min(9, 'M-Pesa number is required'),
    }),
    BANK: z.object({
      bankName: z.string().min(1, 'Bank name required'),
      bankAccountName: z.string().min(1, 'Account name required'),
      bankAccountNumber: z.string().min(1, 'Account number required'),
    }),
  },
};

type FormData = z.infer<typeof baseSchema>;

const STEPS = [
  { id: 1, label: 'Personal', icon: User, desc: 'Name & contact' },
  { id: 2, label: 'Identity', icon: Hash, desc: 'ID verification' },
  { id: 3, label: 'Payouts', icon: CreditCard, desc: 'Payment details' },
  { id: 4, label: 'Launch', icon: Rocket, desc: 'Review & start' },
];
const SAMPLE_PRODUCTS = [
  { name: 'Electronics', price: 15000, rate: 0.08 },
  { name: 'Fashion', price: 3500, rate: 0.15 },
  { name: 'Health', price: 2500, rate: 0.12 },
];

export function AffiliateOnboardingForm() {
  const router = useRouter();
  const [step, setStep] = useState(1);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [launched, setLaunched] = useState(false);

  const {
    register, handleSubmit, watch, setValue, setError, clearErrors,
    formState: { errors },
  } = useForm<FormData>({
    resolver: zodResolver(schema),
    defaultValues: {
      fullName: '', phone: '', idNumber: '',
      payoutMethod: 'MPESA',
      mpesaPhone: '', bankName: '', bankAccountName: '', bankAccountNumber: '',
    },
  });

  const values = watch();
  const payoutMethod = watch('payoutMethod');
  const primaryPhone = watch('phone');

  useEffect(() => {
    if (payoutMethod === 'MPESA' && !values.mpesaPhone && primaryPhone) {
      setValue('mpesaPhone', primaryPhone);
    }
  }, [primaryPhone, payoutMethod, setValue, values.mpesaPhone]);

  // ── Validate current step using its own isolated schema ──────────────────
  const nextStep = () => {
    const vals = values;

    let stepSchema: z.ZodTypeAny;
    let slice: Record<string, unknown>;

    if (step === 1) {
      stepSchema = stepSchemas[1];
      slice = { fullName: vals.fullName, phone: vals.phone };
    } else if (step === 2) {
      stepSchema = stepSchemas[2];
      slice = { idNumber: vals.idNumber };
    } else if (step === 3) {
      stepSchema = payoutMethod === 'MPESA' ? stepSchemas[3].MPESA : stepSchemas[3].BANK;
      slice = payoutMethod === 'MPESA'
        ? { mpesaPhone: vals.mpesaPhone }
        : { bankName: vals.bankName, bankAccountName: vals.bankAccountName, bankAccountNumber: vals.bankAccountNumber };
    } else {
      setStep(s => s + 1);
      return;
    }

    const result = stepSchema.safeParse(slice);

    if (result.success) {
      // Clear any stale errors for fields in this step
      Object.keys(slice).forEach(k => clearErrors(k as keyof FormData));
      setStep(s => s + 1);
      window.scrollTo({ top: 0, behavior: 'smooth' });
    } else {
      // Push each validation error into RHF so fields turn red
      result.error.issues.forEach((err: z.ZodIssue) => {
        setError(err.path[0] as keyof FormData, { message: err.message });
      });
      toast.error("Please fix the errors before continuing");
    }
  };

  const onSubmit = async (data: FormData) => {
    setIsSubmitting(true);
    const result = await submitAffiliateOnboarding(data);
    setIsSubmitting(false);
    if (result.error) {
      toast.error(result.error);
      return;
    }
    toast.success("Welcome aboard! Redirecting...");
    setLaunched(true);
    setTimeout(() => router.push('/affiliate'), 2500);
  };

  if (launched) {
    return (
      <div className="min-h-screen bg-[#0d1117] flex items-center justify-center flex-col gap-4 text-center animate-in fade-in zoom-in duration-500">
        <div className="text-8xl animate-bounce">🔗</div>
        <h1 className="text-4xl font-black text-white tracking-tight">You're an Affiliate!</h1>
        <p className="text-gray-500">Setting up your personal dashboard...</p>
      </div>
    );
  }

  return (
    <div className="flex min-h-screen font-sans bg-[#f8f7f4]">
      <aside className="hidden lg:flex w-90 shrink-0 bg-[#0d1117] flex-col p-10 sticky top-0 h-screen">
        <div className="flex items-center gap-2.5 mb-12">
          <div className="w-2.5 h-2.5 bg-green-600 rounded-full" />
          <span className="font-bold text-lg text-white">AffilMarket</span>
        </div>
        <nav className="flex flex-col gap-1">
          {STEPS.map((s, i) => {
            const isActive = step === s.id;
            const isDone = step > s.id;
            return (
              <div key={s.id}>
                <div className={`flex items-center gap-4 p-3 rounded-xl transition-colors ${isActive ? 'bg-white/10' : ''}`}>
                  <div className={`w-8 h-8 rounded-lg flex items-center justify-center text-xs font-bold shrink-0 transition-all ${
                    isDone ? 'bg-green-600 text-white' : isActive ? 'bg-white text-black' : 'bg-white/5 text-gray-600'
                  }`}>
                    {isDone ? <Check size={14} /> : <s.icon size={14} />}
                  </div>
                  <div>
                    <div className={`text-sm font-bold ${isActive || isDone ? 'text-white' : 'text-gray-600'}`}>{s.label}</div>
                    <div className="text-[11px] text-gray-500">{s.desc}</div>
                  </div>
                </div>
                {i < STEPS.length - 1 && <div className="w-px h-4 bg-white/5 ml-7" />}
              </div>
            );
          })}
        </nav>
        <div className="mt-auto bg-gradient-to-br from-gray-900 to-black border border-white/10 rounded-2xl p-5">
          <div className="text-[10px] font-bold uppercase tracking-widest text-gray-500 mb-4">Potential Earnings</div>
          {SAMPLE_PRODUCTS.map(p => (
            <div key={p.name} className="flex justify-between items-center mb-2">
              <span className="text-xs text-gray-400">{p.name}</span>
              <span className="text-sm font-bold text-green-400">+KES {(p.price * p.rate).toLocaleString()}</span>
            </div>
          ))}
          <div className="h-px bg-white/5 my-3" />
          <div className="text-xs text-gray-500 mb-1">Estimated Monthly (10 sales)</div>
          <div className="text-2xl font-black text-white">
            KES {(SAMPLE_PRODUCTS.reduce((s, p) => s + p.price * p.rate, 0) * 10 / SAMPLE_PRODUCTS.length).toLocaleString()}+
          </div>
        </div>
      </aside>

      <main className="flex-1 flex items-center justify-center p-6 lg:p-12 overflow-y-auto">
        <div className="w-full max-w-md">
          <div className="h-0.5 bg-gray-200 rounded-full mb-10 overflow-hidden">
            <div
              className="h-full bg-gradient-to-r from-green-600 to-green-400 transition-all duration-500"
              style={{ width: `${(step / 4) * 100}%` }}
            />
          </div>

          <form onSubmit={handleSubmit(onSubmit)} noValidate className="space-y-8">

            {step === 1 && (
              <div className="animate-in slide-in-from-right-4 duration-300">
                <div className="text-xs font-bold text-green-600 uppercase tracking-widest mb-2">Step 1 of 4</div>
                <h2 className="text-3xl font-extrabold text-gray-900 leading-tight">Tell us about yourself</h2>
                <p className="text-sm text-gray-500 mt-2 mb-8">This is how vendors and customers will identify you.</p>
                <div className="space-y-4">
                  <div>
                    <label className="block text-xs font-bold text-gray-700 mb-1.5 uppercase">Full Name</label>
                    <input {...register('fullName')}
                      className={`w-full p-3 border-2 rounded-xl text-sm transition-all outline-none ${errors.fullName ? 'border-red-500 bg-red-50' : 'border-gray-200 focus:border-green-600 focus:ring-4 focus:ring-green-600/5'}`}
                      placeholder="Jane Muthoni" />
                    {errors.fullName && <p className="text-xs text-red-500 mt-1.5">{errors.fullName.message}</p>}
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-gray-700 mb-1.5 uppercase">Phone Number</label>
                    <input {...register('phone')} type="tel"
                      className={`w-full p-3 border-2 rounded-xl text-sm transition-all outline-none ${errors.phone ? 'border-red-500 bg-red-50' : 'border-gray-200 focus:border-green-600'}`}
                      placeholder="+254..." />
                    {errors.phone && <p className="text-xs text-red-500 mt-1.5">{errors.phone.message}</p>}
                  </div>
                </div>
              </div>
            )}

            {step === 2 && (
              <div className="animate-in slide-in-from-right-4 duration-300">
                <div className="text-xs font-bold text-green-600 uppercase tracking-widest mb-2">Step 2 of 4</div>
                <h2 className="text-3xl font-extrabold text-gray-900 leading-tight">Identity Verification</h2>
                <p className="text-sm text-gray-500 mt-2 mb-8">Required to maintain platform trust.</p>
                <div className="space-y-6">
                  <div>
                    <label className="block text-xs font-bold text-gray-700 mb-1.5 uppercase">National ID Number</label>
                    <input {...register('idNumber')}
                      className={`w-full p-3 border-2 rounded-xl text-sm outline-none ${errors.idNumber ? 'border-red-500 bg-red-50' : 'border-gray-200 focus:border-green-600'}`}
                      placeholder="e.g. 12345678" />
                    {errors.idNumber && <p className="text-xs text-red-500 mt-1.5">{errors.idNumber.message}</p>}
                  </div>
                  <div className="bg-green-50 border border-green-100 rounded-xl p-4 flex gap-3">
                    <ShieldCheck className="text-green-600 shrink-0" size={20} />
                    <p className="text-[13px] text-green-800">Your ID is encrypted and <strong>never shared publicly</strong>.</p>
                  </div>
                </div>
              </div>
            )}

            {step === 3 && (
              <div className="animate-in slide-in-from-right-4 duration-300">
                <div className="text-xs font-bold text-green-600 uppercase tracking-widest mb-2">Step 3 of 4</div>
                <h2 className="text-3xl font-extrabold text-gray-900 leading-tight">Payout Preferences</h2>
                <p className="text-sm text-gray-500 mt-2 mb-8">How would you like to receive your commissions?</p>
                <div className="grid grid-cols-2 gap-3 mb-6">
                  <button type="button" onClick={() => setValue('payoutMethod', 'MPESA')}
                    className={`p-4 rounded-xl border-2 transition-all flex flex-col items-center gap-2 ${payoutMethod === 'MPESA' ? 'border-green-600 bg-green-50' : 'border-gray-100 bg-white'}`}>
                    <Smartphone className={payoutMethod === 'MPESA' ? 'text-green-600' : 'text-gray-400'} />
                    <span className="text-sm font-bold">M-Pesa</span>
                  </button>
                  <button type="button" onClick={() => setValue('payoutMethod', 'BANK')}
                    className={`p-4 rounded-xl border-2 transition-all flex flex-col items-center gap-2 ${payoutMethod === 'BANK' ? 'border-green-600 bg-green-50' : 'border-gray-100 bg-white'}`}>
                    <Banknote className={payoutMethod === 'BANK' ? 'text-green-600' : 'text-gray-400'} />
                    <span className="text-sm font-bold">Bank</span>
                  </button>
                </div>

                {payoutMethod === 'MPESA' ? (
                  <div>
                    <label className="block text-xs font-bold text-gray-700 mb-1.5 uppercase">M-Pesa Number</label>
                    <input {...register('mpesaPhone')}
                      className={`w-full p-3 border-2 rounded-xl text-sm outline-none ${errors.mpesaPhone ? 'border-red-500 bg-red-50' : 'border-gray-200 focus:border-green-600'}`} />
                    {errors.mpesaPhone && <p className="text-xs text-red-500 mt-1.5">{errors.mpesaPhone.message}</p>}
                  </div>
                ) : (
                  <div className="space-y-4">
                    <div>
                      <select {...register('bankName')}
                        className={`w-full p-3 border-2 rounded-xl text-sm outline-none ${errors.bankName ? 'border-red-500 bg-red-50' : 'border-gray-200 focus:border-green-600'}`}>
                        <option value="">Select Bank...</option>
                        {['KCB', 'Equity', 'Co-op', 'Absa'].map(b => <option key={b} value={b}>{b}</option>)}
                      </select>
                      {errors.bankName && <p className="text-xs text-red-500 mt-1.5">{errors.bankName.message}</p>}
                    </div>
                    <div>
                      <input {...register('bankAccountName')} placeholder="Account Name"
                        className={`w-full p-3 border-2 rounded-xl text-sm outline-none ${errors.bankAccountName ? 'border-red-500 bg-red-50' : 'border-gray-200 focus:border-green-600'}`} />
                      {errors.bankAccountName && <p className="text-xs text-red-500 mt-1.5">{errors.bankAccountName.message}</p>}
                    </div>
                    <div>
                      <input {...register('bankAccountNumber')} placeholder="Account Number"
                        className={`w-full p-3 border-2 rounded-xl text-sm outline-none ${errors.bankAccountNumber ? 'border-red-500 bg-red-50' : 'border-gray-200 focus:border-green-600'}`} />
                      {errors.bankAccountNumber && <p className="text-xs text-red-500 mt-1.5">{errors.bankAccountNumber.message}</p>}
                    </div>
                  </div>
                )}
              </div>
            )}

            {step === 4 && (
              <div className="animate-in slide-in-from-right-4 duration-300">
                <div className="text-xs font-bold text-green-600 uppercase tracking-widest mb-2">Final Step</div>
                <h2 className="text-3xl font-extrabold text-gray-900 leading-tight">Ready to earn? 🚀</h2>
                <p className="text-sm text-gray-500 mt-2 mb-8">Quick review of your setup.</p>
                <div className="bg-gray-50 rounded-2xl p-6 space-y-4">
                  <div className="flex justify-between text-sm">
                    <span className="text-gray-400">Account Name</span>
                    <span className="font-bold">{values.fullName}</span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-gray-400">Payout Via</span>
                    <span className="font-bold text-green-600">{values.payoutMethod}</span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-gray-400">ID Verification</span>
                    <span className="font-mono">***{values.idNumber.slice(-3)}</span>
                  </div>
                </div>
              </div>
            )}

            <div className="flex gap-3 pt-4">
              {step > 1 && (
                <button type="button" onClick={() => setStep(s => s - 1)}
                  className="px-6 py-3 border-2 border-gray-200 rounded-xl font-bold text-gray-600 hover:bg-gray-50 flex items-center gap-2">
                  <ChevronLeft size={18} />
                </button>
              )}
              {step < 4 ? (
                <button type="button" onClick={nextStep}
                  className="flex-1 bg-black text-white py-3 rounded-xl font-bold flex items-center justify-center gap-2 hover:bg-green-600 transition-all">
                  Continue <ChevronRight size={18} />
                </button>
              ) : (
                <button type="submit" disabled={isSubmitting}
                  className="flex-1 bg-green-600 text-white py-3 rounded-xl font-bold flex items-center justify-center gap-2 hover:bg-green-700 transition-all disabled:opacity-50">
                  {isSubmitting ? <Loader2 className="animate-spin" /> : 'Start Earning'}
                </button>
              )}
            </div>

          </form>
        </div>
      </main>
    </div>
  );
}
