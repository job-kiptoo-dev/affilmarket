'use client';

import { useState, useRef, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { submitVendorOnboarding } from '@/action/vendorOnboardingAction';
import {
  Store, FileText, MapPin, Rocket, Loader2,
  ChevronRight, ChevronLeft, Upload, MapPinned,
  Phone, AlignLeft, Building2, Hash, Image as ImageIcon,
} from 'lucide-react';
import { uploadKraDoc, uploadVendorLogo } from '@/action/uploadProductImageAction';

// ─── Full schema (used only for final submit) ────────────────────────────────
const schema = z.object({
  logoUrl:     z.string().min(1,  'Shop logo is required'),
  shopName:    z.string().min(3,  'Shop name must be at least 3 characters'),
  phone:       z.string().min(9,  'Business phone is required'),
  description: z.string().min(10, 'Description must be at least 10 characters'),
  legalName:   z.string().min(3,  'Legal business name is required'),
  kraPin:      z.string().min(5,  'KRA PIN is required'),
  kraPinDoc:   z.string().min(1,  'KRA PIN certificate is required'),
  city:        z.string().min(2,  'City / town is required'),
  county:      z.string().min(2,  'County is required'),
  address:     z.string().min(5,  'Street address is required'),
  postalCode:  z.string().min(4,  'Postal code is required'),
});

type FormData = z.infer<typeof schema>;

// ─── Per-step sub-schemas ────────────────────────────────────────────────────
// safeParse on these so Zod never sees empty later-step fields during navigation
const STEP_SCHEMAS: Record<number, z.ZodTypeAny> = {
  1: schema.pick({ logoUrl: true, shopName: true, phone: true, description: true }),
  2: schema.pick({ legalName: true, kraPin: true, kraPinDoc: true }),
  3: schema.pick({ city: true, county: true, address: true, postalCode: true }),
};

// ─── Step definitions ────────────────────────────────────────────────────────
const STEPS = [
  { id: 1, label: 'Identity', icon: Store,    desc: 'Name, logo & bio' },
  { id: 2, label: 'Legal',    icon: FileText, desc: 'KRA & business docs' },
  { id: 3, label: 'Location', icon: MapPin,   desc: 'Where are you based?' },
  { id: 4, label: 'Launch',   icon: Rocket,   desc: 'Review & go live' },
];

// ─── Fields per step ─────────────────────────────────────────────────────────
const STEP_FIELDS: Record<number, (keyof FormData)[]> = {
  1: ['logoUrl', 'shopName', 'phone', 'description'],
  2: ['legalName', 'kraPin', 'kraPinDoc'],
  3: ['city', 'county', 'address', 'postalCode'],
};

// ─── Logo preview ────────────────────────────────────────────────────────────
function LogoPreview({ url, name }: { url?: string; name?: string }) {
  if (url) return <img src={url} alt="logo" className="w-full h-full object-cover" />;
  const initials = (name || 'AM').split(' ').map(w => w[0]).join('').toUpperCase().slice(0, 2);
  const colors   = ['#16a34a', '#0891b2', '#7c3aed', '#dc2626', '#d97706'];
  const bg       = colors[(name?.length ?? 0) % colors.length];
  return (
    <div className="w-full h-full flex items-center justify-center text-white font-bold text-sm"
      style={{ background: bg }}>
      {initials}
    </div>
  );
}

// ─── Component ───────────────────────────────────────────────────────────────
export function VendorOnboardingForm() {
  const router = useRouter();
  const [step, setStep]               = useState(1);
  const [serverError, setServerError] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [launched, setLaunched]       = useState(false);
  const logoInputRef = useRef<HTMLInputElement>(null);
  const docInputRef  = useRef<HTMLInputElement>(null);
  const [confetti, setConfetti] = useState<
    { color: string; left: string; delay: string; duration: string }[]
  >([]);

  const {
    register, handleSubmit, watch, setValue, getValues, setError, clearErrors,
    formState: { errors },
  } = useForm<FormData>({
    resolver: zodResolver(schema),
    defaultValues: {
      logoUrl: '', shopName: '', phone: '', description: '',
      legalName: '', kraPin: '', kraPinDoc: '',
      city: '', county: '', address: '', postalCode: '',
    },
  });

  const values = watch();

  // ── Logo upload ──────────────────────────────────────────────────────────
  const handleLogoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => setValue('logoUrl', reader.result as string);
    reader.readAsDataURL(file);

    const fd = new FormData();
    fd.append('file', file);
    const result = await uploadVendorLogo(fd);
    if (result.error) { setServerError(result.error); setValue('logoUrl', ''); return; }
    try { setValue('logoUrl', result.url!, { shouldValidate: true }); } catch { /* zod v4 */ }
  };

  // ── KRA doc upload ───────────────────────────────────────────────────────
  const handleDocUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setValue('kraPinDoc', file.name);
    const fd = new FormData();
    fd.append('file', file);
    const result = await uploadKraDoc(fd);
    if (result.error) { setServerError(result.error); setValue('kraPinDoc', ''); return; }
    try { setValue('kraPinDoc', result.url!, { shouldValidate: true }); } catch { /* zod v4 */ }
  };

  // ── Step navigation ──────────────────────────────────────────────────────
  // Uses safeParse on the per-step sub-schema so the full-schema zodResolver
  // never runs against empty later-step fields during navigation.
  const nextStep = () => {
    const fields = STEP_FIELDS[step];
    const values = getValues();
    const slice  = Object.fromEntries(fields.map(k => [k, values[k]]));
    const result = STEP_SCHEMAS[step].safeParse(slice);

    if (result.success) {
      // Clear any stale errors for this step's fields then advance
      fields.forEach(f => clearErrors(f));
      setStep(s => s + 1);
      window.scrollTo({ top: 0, behavior: 'smooth' });
    } else {
      // Push each error into RHF so inline messages render
      result.error.errors.forEach((err: { path: (string|number)[]; message: string }) => {
        setError(err.path[0] as keyof FormData, { message: err.message });
      });
    }
  };

  // ── Submit ───────────────────────────────────────────────────────────────
  const onSubmit = async (data: FormData) => {
      console.log('submitting:', JSON.stringify(data)); // 👈 add this
    setServerError('');
    setIsSubmitting(true);
    const result = await submitVendorOnboarding(data);
    setIsSubmitting(false);
    if (result.error) { setServerError(result.error); return; }
    setLaunched(true);
  };

  // ── Confetti ─────────────────────────────────────────────────────────────
  useEffect(() => {
    if (!launched) return;
    const colors = ['#16a34a', '#f59e0b', '#3b82f6', '#ec4899', '#8b5cf6'];
    setConfetti(
      colors.flatMap(color =>
        Array.from({ length: 6 }).map(() => ({
          color,
          left:     `${Math.random() * 300 - 50}px`,
          delay:    `${Math.random() * 0.8}s`,
          duration: `${1.2 + Math.random() * 0.8}s`,
        }))
      )
    );
    setTimeout(() => router.push('/vendor'), 2500);
  }, [launched, router]);

  // ── Launch screen ────────────────────────────────────────────────────────
  if (launched) {
    return (
      <div className="min-h-screen bg-gray-950 flex items-center justify-center">
        <style>{`
          @keyframes pop{0%{transform:scale(0.5);opacity:0}70%{transform:scale(1.1)}100%{transform:scale(1);opacity:1}}
          @keyframes float{0%,100%{transform:translateY(0)}50%{transform:translateY(-12px)}}
          @keyframes confetti{0%{transform:translateY(-20px) rotate(0);opacity:1}100%{transform:translateY(120px) rotate(720deg);opacity:0}}
          .vob-pop{animation:pop 0.5s cubic-bezier(.34,1.56,.64,1) forwards}
          .vob-float{animation:float 2s ease-in-out infinite}
          .vob-confetti{position:absolute;width:8px;height:8px;border-radius:2px;animation:confetti 1.5s ease-in forwards}
        `}</style>
        <div className="text-center relative">
          {confetti.map((p, i) => (
            <div key={i} className="vob-confetti"
              style={{ background: p.color, left: p.left, top: '-20px',
                animationDelay: p.delay, animationDuration: p.duration }} />
          ))}
          <div className="vob-pop vob-float text-8xl mb-6">🚀</div>
          <h1 className="text-4xl font-black text-white mb-2">You're live!</h1>
          <p className="text-gray-400 text-lg">Taking you to your dashboard...</p>
        </div>
      </div>
    );
  }

  // ── Main layout ──────────────────────────────────────────────────────────
  return (
    <>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Syne:wght@400;600;700;800&family=DM+Sans:wght@400;500;600&display=swap');
        *{box-sizing:border-box}
        .vob-wrap{display:flex;min-height:100vh;font-family:'DM Sans',sans-serif;background:#f8f7f4}
        .vob-left{width:280px;flex-shrink:0;background:#0d1117;display:flex;flex-direction:column;padding:36px 24px;position:sticky;top:0;height:100vh;overflow:hidden}
        .vob-brand{display:flex;align-items:center;gap:8px;margin-bottom:40px}
        .vob-brand-dot{width:9px;height:9px;background:#16a34a;border-radius:50%}
        .vob-brand-name{font-family:'Syne',sans-serif;font-weight:800;font-size:16px;color:#fff;letter-spacing:-0.02em}
        .vob-steps{display:flex;flex-direction:column;gap:3px;margin-bottom:auto}
        .vob-step{display:flex;align-items:center;gap:12px;padding:10px 12px;border-radius:10px;cursor:default;transition:background 0.2s}
        .vob-step.active{background:rgba(255,255,255,0.06)}
        .vob-step-num{width:28px;height:28px;border-radius:8px;display:flex;align-items:center;justify-content:center;font-size:12px;font-weight:700;flex-shrink:0;transition:all 0.3s}
        .vob-step.done .vob-step-num{background:#16a34a;color:#fff}
        .vob-step.active .vob-step-num{background:#fff;color:#111}
        .vob-step.pending .vob-step-num{background:rgba(255,255,255,0.07);color:#4b5563}
        .vob-step-label{font-size:13px;font-weight:700;color:#fff;font-family:'Syne',sans-serif}
        .vob-step.pending .vob-step-label{color:#4b5563}
        .vob-step-desc{font-size:11px;color:#6b7280;margin-top:1px}
        .vob-step-line{width:1px;height:14px;background:rgba(255,255,255,0.05);margin-left:26px}
        .vob-preview{background:#111827;border:1px solid rgba(255,255,255,0.06);border-radius:14px;padding:16px;margin-top:28px}
        .vob-preview-lbl{font-size:9px;font-weight:700;letter-spacing:0.12em;text-transform:uppercase;color:#374151;margin-bottom:12px}
        .vob-preview-logo{width:44px;height:44px;border-radius:11px;overflow:hidden;margin-bottom:10px;border:1.5px solid rgba(255,255,255,0.07)}
        .vob-preview-name{font-family:'Syne',sans-serif;font-size:15px;font-weight:800;color:#fff;letter-spacing:-0.03em;min-height:20px}
        .vob-preview-name.empty{color:#374151;font-style:italic;font-size:12px}
        .vob-preview-desc-txt{font-size:11px;color:#6b7280;margin-top:4px;line-height:1.5;min-height:28px}
        .vob-preview-meta{display:flex;gap:6px;margin-top:10px;flex-wrap:wrap}
        .vob-badge{font-size:10px;font-weight:600;border-radius:100px;padding:2px 9px;background:rgba(22,163,74,0.12);color:#4ade80;border:1px solid rgba(22,163,74,0.15)}
        .vob-badge.grey{background:rgba(255,255,255,0.04);color:#4b5563;border-color:rgba(255,255,255,0.06)}
        .vob-right{flex:1;display:flex;align-items:flex-start;justify-content:center;padding:56px 48px;overflow-y:auto}
        .vob-box{width:100%;max-width:520px}
        .vob-progress{height:2px;background:#e5e7eb;border-radius:100px;margin-bottom:36px;overflow:hidden}
        .vob-progress-fill{height:100%;background:linear-gradient(90deg,#16a34a,#4ade80);border-radius:100px;transition:width 0.4s cubic-bezier(.34,1.2,.64,1)}
        .vob-eyebrow{font-size:11px;font-weight:700;letter-spacing:0.12em;text-transform:uppercase;color:#16a34a;margin-bottom:7px}
        .vob-title{font-family:'Syne',sans-serif;font-size:28px;font-weight:800;color:#111;letter-spacing:-0.04em;line-height:1.15}
        .vob-subtitle{font-size:13px;color:#6b7280;margin-top:5px;margin-bottom:28px}
        .vob-field{margin-bottom:20px}
        .vob-label{display:block;font-size:12.5px;font-weight:600;color:#374151;margin-bottom:5px}
        .vob-label .req{color:#ef4444;margin-left:2px}
        .vob-input{width:100%;padding:11px 14px;border:1.5px solid #e5e7eb;border-radius:11px;font-size:14px;font-family:'DM Sans',sans-serif;color:#111;background:#fff;transition:all 0.15s;outline:none}
        .vob-input:focus{border-color:#16a34a;box-shadow:0 0 0 3px rgba(22,163,74,0.08)}
        .vob-input.err{border-color:#ef4444}
        .vob-textarea{resize:none;min-height:90px}
        .vob-two-col{display:grid;grid-template-columns:1fr 1fr;gap:14px}
        .vob-error{font-size:11.5px;color:#ef4444;margin-top:4px}
        .vob-upload{border:1.5px dashed #d1d5db;border-radius:11px;padding:20px;text-align:center;cursor:pointer;transition:all 0.2s;background:#fafafa}
        .vob-upload:hover{border-color:#16a34a;background:#f0fdf4}
        .vob-upload.err{border-color:#ef4444}
        .vob-upload-icon{font-size:24px;margin-bottom:6px}
        .vob-upload-text{font-size:13px;font-weight:600;color:#374151}
        .vob-upload-sub{font-size:11px;color:#9ca3af;margin-top:2px}
        .vob-upload-done{font-size:12px;color:#16a34a;font-weight:600;margin-top:5px}
        .vob-info{background:#fffbeb;border:1px solid #fde68a;border-radius:11px;padding:12px 14px;font-size:12.5px;color:#92400e;margin-bottom:20px}
        .vob-review-section{background:#f9fafb;border-radius:12px;padding:3px 14px;margin-bottom:14px}
        .vob-review-section-title{font-size:10px;font-weight:700;letter-spacing:0.1em;text-transform:uppercase;color:#9ca3af;padding:11px 0 3px}
        .vob-review-row{display:flex;justify-content:space-between;align-items:flex-start;padding:10px 0;border-bottom:1px solid #f3f4f6;gap:16px}
        .vob-review-row:last-child{border-bottom:none}
        .vob-review-key{font-size:12px;color:#9ca3af;font-weight:600;text-transform:uppercase;letter-spacing:0.06em;flex-shrink:0}
        .vob-review-val{font-size:13px;color:#111;font-weight:600;text-align:right;max-width:280px;word-break:break-word}
        .vob-server-err{margin-bottom:18px;padding:11px 14px;background:#fef2f2;border:1px solid #fecaca;color:#dc2626;border-radius:11px;font-size:13px}
        .vob-nav{display:flex;gap:10px;margin-top:32px}
        .vob-btn-back{display:inline-flex;align-items:center;gap:6px;padding:11px 18px;border:1.5px solid #e5e7eb;border-radius:11px;font-size:13.5px;font-weight:600;color:#374151;background:#fff;cursor:pointer;transition:all 0.15s;font-family:'DM Sans',sans-serif}
        .vob-btn-back:hover{background:#f9fafb}
        .vob-btn-next{flex:1;display:flex;align-items:center;justify-content:center;gap:7px;padding:11px 22px;background:#111;border:none;border-radius:11px;font-size:13.5px;font-weight:700;color:#fff;cursor:pointer;transition:all 0.2s;font-family:'DM Sans',sans-serif}
        .vob-btn-next:hover{background:#16a34a}
        .vob-btn-launch{flex:1;display:flex;align-items:center;justify-content:center;gap:7px;padding:11px 22px;background:linear-gradient(135deg,#16a34a,#15803d);border:none;border-radius:11px;font-size:13.5px;font-weight:700;color:#fff;cursor:pointer;transition:all 0.2s;font-family:'DM Sans',sans-serif;box-shadow:0 4px 14px rgba(22,163,74,0.3)}
        .vob-btn-launch:hover{box-shadow:0 6px 20px rgba(22,163,74,0.45)}
        .vob-btn-launch:disabled{opacity:0.7;cursor:not-allowed}
        @media(max-width:900px){.vob-left{display:none}.vob-right{padding:32px 20px}}
        @media(max-width:520px){.vob-two-col{grid-template-columns:1fr}}
      `}</style>

      <div className="vob-wrap">

        {/* ── Sidebar ──────────────────────────────────────────────────────── */}
        <div className="vob-left">
          <div className="vob-brand">
            <div className="vob-brand-dot" />
            <span className="vob-brand-name">AffilMarket</span>
          </div>

          <div className="vob-steps">
            {STEPS.map((s, i) => {
              const state = step === s.id ? 'active' : step > s.id ? 'done' : 'pending';
              return (
                <div key={s.id}>
                  <div className={`vob-step ${state}`}>
                    <div className="vob-step-num">
                      {state === 'done' ? '✓' : <s.icon size={13} />}
                    </div>
                    <div>
                      <div className="vob-step-label">{s.label}</div>
                      <div className="vob-step-desc">{s.desc}</div>
                    </div>
                  </div>
                  {i < STEPS.length - 1 && <div className="vob-step-line" />}
                </div>
              );
            })}
          </div>

          <div className="vob-preview">
            <div className="vob-preview-lbl">Live Preview</div>
            <div className="vob-preview-logo">
              <LogoPreview url={values.logoUrl} name={values.shopName} />
            </div>
            <div className={`vob-preview-name ${!values.shopName ? 'empty' : ''}`}>
              {values.shopName || 'Your shop name...'}
            </div>
            <div className="vob-preview-desc-txt">
              {values.description
                ? values.description.slice(0, 72) + (values.description.length > 72 ? '...' : '')
                : <span style={{ fontStyle: 'italic' }}>Your description...</span>}
            </div>
            <div className="vob-preview-meta">
              {values.city
                ? <span className="vob-badge">📍 {values.city}</span>
                : <span className="vob-badge grey">📍 Location</span>}
              {values.phone && <span className="vob-badge">📞 {values.phone}</span>}
              <span className="vob-badge grey">🟡 Pending review</span>
            </div>
          </div>
        </div>

        {/* ── Right content ─────────────────────────────────────────────────── */}
        <div className="vob-right">
          <div className="vob-box">

            <div className="vob-progress">
              <div className="vob-progress-fill" style={{ width: `${(step / 4) * 100}%` }} />
            </div>

            {serverError && (
              <div className="vob-server-err">{serverError}</div>
            )}

            <form onSubmit={handleSubmit(onSubmit)}>

              {/* ── Step 1: Identity ─────────────────────────────────────────── */}
              {step === 1 && (
                <>
                  <div className="vob-eyebrow">Step 1 of 4</div>
                  <div className="vob-title">Build your shop identity</div>
                  <div className="vob-subtitle">This is what customers and affiliates will see first.</div>

                  {/* Logo */}
                  <div className="vob-field">
                    <label className="vob-label">
                      <ImageIcon size={12} style={{ display: 'inline', marginRight: 5 }} />
                      Shop Logo <span className="req">*</span>
                    </label>
                    <input ref={logoInputRef} type="file" accept="image/*"
                      style={{ display: 'none' }} onChange={handleLogoUpload} />
                    {values.logoUrl ? (
                      <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                        <img src={values.logoUrl} alt="logo"
                          style={{ width: 56, height: 56, borderRadius: 13,
                            objectFit: 'cover', border: '2px solid #e5e7eb' }} />
                        <div>
                          <div style={{ fontSize: 13, fontWeight: 600, color: '#16a34a' }}>
                            ✓ Logo uploaded
                          </div>
                          <button type="button"
                            style={{ fontSize: 12, color: '#9ca3af', background: 'none',
                              border: 'none', cursor: 'pointer', padding: 0, marginTop: 2 }}
                            onClick={() => { try { setValue('logoUrl', '', { shouldValidate: true }); } catch { setValue('logoUrl', ''); } }}>
                            Remove
                          </button>
                        </div>
                      </div>
                    ) : (
                      <div className={`vob-upload ${errors.logoUrl ? 'err' : ''}`}
                        onClick={() => logoInputRef.current?.click()}>
                        <div className="vob-upload-icon">🖼️</div>
                        <div className="vob-upload-text">Upload your shop logo</div>
                        <div className="vob-upload-sub">PNG, JPG or WebP · Max 2MB</div>
                      </div>
                    )}
                    {errors.logoUrl && (
                      <div className="vob-error">{errors.logoUrl.message}</div>
                    )}
                  </div>

                  {/* Shop Name */}
                  <div className="vob-field">
                    <label className="vob-label">
                      <Store size={12} style={{ display: 'inline', marginRight: 5 }} />
                      Shop Name <span className="req">*</span>
                    </label>
                    <input {...register('shopName')}
                      className={`vob-input ${errors.shopName ? 'err' : ''}`}
                      placeholder="e.g. Mama Mboga Organics" />
                    {errors.shopName && (
                      <div className="vob-error">{errors.shopName.message}</div>
                    )}
                  </div>

                  {/* Business Phone */}
                  <div className="vob-field">
                    <label className="vob-label">
                      <Phone size={12} style={{ display: 'inline', marginRight: 5 }} />
                      Business Phone <span className="req">*</span>
                    </label>
                    <input {...register('phone')}
                      className={`vob-input ${errors.phone ? 'err' : ''}`}
                      placeholder="+254712345678" />
                    {errors.phone && (
                      <div className="vob-error">{errors.phone.message}</div>
                    )}
                  </div>

                  {/* Description */}
                  <div className="vob-field">
                    <label className="vob-label">
                      <AlignLeft size={12} style={{ display: 'inline', marginRight: 5 }} />
                      Shop Description <span className="req">*</span>
                    </label>
                    <textarea {...register('description')}
                      className={`vob-input vob-textarea ${errors.description ? 'err' : ''}`}
                      placeholder="What do you sell? Tell customers about your shop..." />
                    {errors.description && (
                      <div className="vob-error">{errors.description.message}</div>
                    )}
                  </div>
                </>
              )}

              {/* ── Step 2: Legal ────────────────────────────────────────────── */}
              {step === 2 && (
                <>
                  <div className="vob-eyebrow">Step 2 of 4</div>
                  <div className="vob-title">Legal & compliance</div>
                  <div className="vob-subtitle">
                    Required for payouts and tax compliance. All fields are mandatory.
                  </div>

                  <div className="vob-info">
                    🔒 All information is encrypted and used for tax compliance only.
                  </div>

                  {/* Legal Business Name */}
                  <div className="vob-field">
                    <label className="vob-label">
                      <Building2 size={12} style={{ display: 'inline', marginRight: 5 }} />
                      Legal Business Name <span className="req">*</span>
                    </label>
                    <input {...register('legalName')}
                      className={`vob-input ${errors.legalName ? 'err' : ''}`}
                      placeholder="Registered business name" />
                    {errors.legalName && (
                      <div className="vob-error">{errors.legalName.message}</div>
                    )}
                  </div>

                  {/* KRA PIN */}
                  <div className="vob-field">
                    <label className="vob-label">
                      <Hash size={12} style={{ display: 'inline', marginRight: 5 }} />
                      KRA PIN <span className="req">*</span>
                    </label>
                    <input {...register('kraPin')}
                      className={`vob-input ${errors.kraPin ? 'err' : ''}`}
                      placeholder="e.g. A000000000X"
                      style={{ textTransform: 'uppercase' }} />
                    {errors.kraPin && (
                      <div className="vob-error">{errors.kraPin.message}</div>
                    )}
                  </div>

                  {/* KRA PIN Certificate */}
                  <div className="vob-field">
                    <label className="vob-label">
                      <Upload size={12} style={{ display: 'inline', marginRight: 5 }} />
                      KRA PIN Certificate <span className="req">*</span>
                    </label>
                    <input ref={docInputRef} type="file" accept=".pdf,.jpg,.png"
                      style={{ display: 'none' }} onChange={handleDocUpload} />
                    <div className={`vob-upload ${errors.kraPinDoc ? 'err' : ''}`}
                      onClick={() => docInputRef.current?.click()}>
                      <div className="vob-upload-icon">📄</div>
                      <div className="vob-upload-text">Upload KRA PIN certificate</div>
                      <div className="vob-upload-sub">PDF, JPG or PNG · Max 5MB</div>
                      {values.kraPinDoc && (
                        <div className="vob-upload-done">✓ Document uploaded</div>
                      )}
                    </div>
                    {errors.kraPinDoc && (
                      <div className="vob-error">{errors.kraPinDoc.message}</div>
                    )}
                  </div>
                </>
              )}

              {/* ── Step 3: Location ─────────────────────────────────────────── */}
              {step === 3 && (
                <>
                  <div className="vob-eyebrow">Step 3 of 4</div>
                  <div className="vob-title">Where are you based?</div>
                  <div className="vob-subtitle">
                    Helps customers find local vendors and sets shipping expectations.
                  </div>

                  {/* City + County */}
                  <div className="vob-two-col">
                    <div className="vob-field">
                      <label className="vob-label">
                        <MapPinned size={12} style={{ display: 'inline', marginRight: 5 }} />
                        City / Town <span className="req">*</span>
                      </label>
                      <input {...register('city')}
                        className={`vob-input ${errors.city ? 'err' : ''}`}
                        placeholder="e.g. Nairobi" />
                      {errors.city && (
                        <div className="vob-error">{errors.city.message}</div>
                      )}
                    </div>

                    <div className="vob-field">
                      <label className="vob-label">
                        <MapPin size={12} style={{ display: 'inline', marginRight: 5 }} />
                        County <span className="req">*</span>
                      </label>
                      <input {...register('county')}
                        className={`vob-input ${errors.county ? 'err' : ''}`}
                        placeholder="e.g. Nairobi County" />
                      {errors.county && (
                        <div className="vob-error">{errors.county.message}</div>
                      )}
                    </div>
                  </div>

                  {/* Street address */}
                  <div className="vob-field">
                    <label className="vob-label">
                      <MapPin size={12} style={{ display: 'inline', marginRight: 5 }} />
                      Street / Building Address <span className="req">*</span>
                    </label>
                    <input {...register('address')}
                      className={`vob-input ${errors.address ? 'err' : ''}`}
                      placeholder="e.g. Tom Mboya St, CBD" />
                    {errors.address && (
                      <div className="vob-error">{errors.address.message}</div>
                    )}
                  </div>

                  {/* Postal code */}
                  <div className="vob-field">
                    <label className="vob-label">
                      <Hash size={12} style={{ display: 'inline', marginRight: 5 }} />
                      Postal / ZIP Code <span className="req">*</span>
                    </label>
                    <input {...register('postalCode')}
                      className={`vob-input ${errors.postalCode ? 'err' : ''}`}
                      placeholder="e.g. 00100" />
                    {errors.postalCode && (
                      <div className="vob-error">{errors.postalCode.message}</div>
                    )}
                  </div>
                </>
              )}

              {/* ── Step 4: Review & Launch ──────────────────────────────────── */}
              {step === 4 && (
                <>
                  <div className="vob-eyebrow">Step 4 of 4</div>
                  <div className="vob-title">Ready to launch 🚀</div>
                  <div className="vob-subtitle">Review your shop details before going live.</div>

                  <div className="vob-review-section">
                    <div className="vob-review-section-title">Shop Identity</div>
                    <div className="vob-review-row">
                      <span className="vob-review-key">Shop Name</span>
                      <span className="vob-review-val">{values.shopName}</span>
                    </div>
                    <div className="vob-review-row">
                      <span className="vob-review-key">Phone</span>
                      <span className="vob-review-val">{values.phone}</span>
                    </div>
                    <div className="vob-review-row">
                      <span className="vob-review-key">Description</span>
                      <span className="vob-review-val" style={{ fontSize: 12 }}>
                        {values.description.slice(0, 60)}
                        {values.description.length > 60 ? '...' : ''}
                      </span>
                    </div>
                    <div className="vob-review-row">
                      <span className="vob-review-key">Logo</span>
                      <span className="vob-review-val">✓ Uploaded</span>
                    </div>
                  </div>

                  <div className="vob-review-section">
                    <div className="vob-review-section-title">Legal</div>
                    <div className="vob-review-row">
                      <span className="vob-review-key">Legal Name</span>
                      <span className="vob-review-val">{values.legalName}</span>
                    </div>
                    <div className="vob-review-row">
                      <span className="vob-review-key">KRA PIN</span>
                      <span className="vob-review-val" style={{ textTransform: 'uppercase' }}>
                        {values.kraPin}
                      </span>
                    </div>
                    <div className="vob-review-row">
                      <span className="vob-review-key">KRA Doc</span>
                      <span className="vob-review-val">✓ Uploaded</span>
                    </div>
                  </div>

                  <div className="vob-review-section">
                    <div className="vob-review-section-title">Location</div>
                    <div className="vob-review-row">
                      <span className="vob-review-key">City</span>
                      <span className="vob-review-val">{values.city}</span>
                    </div>
                    <div className="vob-review-row">
                      <span className="vob-review-key">County</span>
                      <span className="vob-review-val">{values.county}</span>
                    </div>
                    <div className="vob-review-row">
                      <span className="vob-review-key">Address</span>
                      <span className="vob-review-val">{values.address}</span>
                    </div>
                    <div className="vob-review-row">
                      <span className="vob-review-key">Postal Code</span>
                      <span className="vob-review-val">{values.postalCode}</span>
                    </div>
                  </div>
                </>
              )}

              {/* ── Navigation ───────────────────────────────────────────────── */}
              <div className="vob-nav">
                {step > 1 && (
                  <button type="button" className="vob-btn-back"
                    onClick={() => setStep(s => s - 1)}>
                    <ChevronLeft size={14} /> Back
                  </button>
                )}
                {step < 4 ? (
                  <button type="button" className="vob-btn-next" onClick={nextStep}>
                    Continue <ChevronRight size={14} />
                  </button>
                ) : (
                  <button type="submit" className="vob-btn-launch" disabled={isSubmitting}>
                    {isSubmitting
                      ? <><Loader2 size={14} className="animate-spin" /> Launching...</>
                      : <>🚀 Launch My Shop</>}
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
