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

// 1. STRICT SCHEMA
const schema = z.object({
  // Step 1: Identity (Required)
  shopName:    z.string().min(2, 'Shop name is required').max(100),
  phone:       z.string().min(10, 'Valid phone number is required').max(20),
  description: z.string().min(10, 'Description must be at least 10 characters').max(1000),
  logoUrl:     z.string().min(1, 'Please upload a shop logo'),

  // Step 2: Legal (Optional/Skippable per UI)
  legalName:   z.string().max(100).optional().or(z.literal('')),
  kraPin:      z.string().max(20).optional().or(z.literal('')),
  kraPinDoc:   z.string().optional().or(z.literal('')),

  // Step 3: Location (Required)
  city:        z.string().min(2, 'City is required').max(100),
  address:     z.string().min(5, 'Specific address/street is required').max(200),
});

type FormData = z.infer<typeof schema>;

const STEPS = [
  { id: 1, label: 'Identity',  icon: Store,    desc: 'Name, logo & bio' },
  { id: 2, label: 'Legal',     icon: FileText, desc: 'KRA & business docs' },
  { id: 3, label: 'Location',  icon: MapPin,   desc: 'Where are you based?' },
  { id: 4, label: 'Launch',    icon: Rocket,   desc: 'Review & go live' },
];

function LogoPreview({ url, name }: { url?: string | null; name?: string }) {
  if (url) {
    return <img src={url} alt="logo" className="w-full h-full object-cover" />;
  }
  const initials = (name || 'S').split(' ').map(w => w[0]).join('').toUpperCase().slice(0, 2);
  const colors = ['#16a34a', '#0891b2', '#7c3aed', '#dc2626', '#d97706'];
  const color = colors[(name?.length ?? 0) % colors.length];
  return (
    <div className="w-full h-full flex items-center justify-center text-white font-black text-2xl"
      style={{ background: color }}>
      {initials}
    </div>
  );
}

export function VendorOnboardingForm() {
  const router = useRouter();
  const [step, setStep] = useState(1);
  const [serverError, setServerError] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [launched, setLaunched] = useState(false);
  const logoInputRef = useRef<HTMLInputElement>(null);
  const docInputRef = useRef<HTMLInputElement>(null);
  const [confettiPieces, setConfettiPieces] = useState<Array<{
    color: string; left: string; top: string; delay: string; duration: string;
  }>>([]);

  const { register, handleSubmit, watch, setValue, trigger, formState: { errors } } = useForm<FormData>({
    resolver: zodResolver(schema),
    // Initialize EVERYTHING so trigger() knows what to look for
    defaultValues: { 
      shopName: '', 
      phone: '',
      description: '', 
      logoUrl: '',
      legalName: '',
      kraPin: '',
      kraPinDoc: '',
      city: '',
      address: ''
    },
  });

  const values = watch();

  const handleLogoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = () => setValue('logoUrl', reader.result as string);
    reader.readAsDataURL(file);

    const formData = new FormData();
    formData.append('file', file);
    const result = await uploadVendorLogo(formData);

    if (result.error) {
      setServerError(result.error);
      setValue('logoUrl', '');
      return;
    }
    setValue('logoUrl', result.url!, { shouldValidate: true });
  };

  const handleDocUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setValue('kraPinDoc', file.name);
    const formData = new FormData();
    formData.append('file', file);
    const result = await uploadKraDoc(formData);

    if (result.error) {
      setServerError(result.error);
      setValue('kraPinDoc', '');
      return;
    }
    setValue('kraPinDoc', result.url!, { shouldValidate: true });
  };

  const nextStep = async () => {
    const fieldMap: Record<number, (keyof FormData)[]> = {
      1: ['shopName', 'phone', 'description', 'logoUrl'],
      2: ['legalName', 'kraPin'], // Optional, but trigger will check constraints
      3: ['city', 'address'],
    };

    const fieldsToValidate = fieldMap[step];
    
    // Validate current step fields
    const isValid = await trigger(fieldsToValidate);

    if (isValid) {
      setStep((s) => s + 1);
      window.scrollTo({ top: 0, behavior: 'smooth' });
    }
  };

  const onSubmit = async (data: FormData) => {
    setServerError('');
    setIsSubmitting(true);
    const result = await submitVendorOnboarding(data);
    setIsSubmitting(false);
    if (result.error) { setServerError(result.error); return; }
    setLaunched(true);
  };

  useEffect(() => {
    if (launched) {
      const colors = ['#16a34a', '#f59e0b', '#3b82f6', '#ec4899', '#8b5cf6'];
      setConfettiPieces(
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
      setTimeout(() => router.push('/vendor'), 2500);
    }
  }, [launched, router]);

  if (launched) {
    return (
      <div className="min-h-screen bg-gray-950 flex items-center justify-center">
        <style>{`
          @keyframes pop { 0%{transform:scale(0.5);opacity:0} 70%{transform:scale(1.1)} 100%{transform:scale(1);opacity:1} }
          @keyframes float { 0%,100%{transform:translateY(0)} 50%{transform:translateY(-12px)} }
          .pop { animation: pop 0.5s cubic-bezier(.34,1.56,.64,1) forwards; }
          .float { animation: float 2s ease-in-out infinite; }
          @keyframes confetti { 0%{transform:translateY(-20px) rotate(0);opacity:1} 100%{transform:translateY(120px) rotate(720deg);opacity:0} }
          .confetti-piece { position:absolute; width:8px; height:8px; border-radius:2px; animation: confetti 1.5s ease-in forwards; }
        `}</style>
        <div className="text-center relative">
          {confettiPieces.map((p, i) => (
            <div key={i} className="confetti-piece" style={{
              background: p.color,
              left: p.left,
              top: p.top,
              animationDelay: p.delay,
              animationDuration: p.duration,
            }} />
          ))}
          <div className="pop float text-8xl mb-6">🚀</div>
          <h1 className="text-4xl font-black text-white mb-2">You're live!</h1>
          <p className="text-gray-400 text-lg">Taking you to your dashboard...</p>
        </div>
      </div>
    );
  }

  return (
    <>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Syne:wght@400;600;700;800&family=DM+Sans:wght@400;500;600&display=swap');
        * { box-sizing: border-box; }
        .ob-wrap { display:flex; min-height:100vh; font-family:'DM Sans',sans-serif; background:#f8f7f4; }
        .ob-left { width: 380px; flex-shrink:0; background: #0d1117; display:flex; flex-direction:column; padding: 40px 32px; position: sticky; top:0; height:100vh; overflow:hidden; }
        .ob-brand { display:flex; align-items:center; gap:10px; margin-bottom:48px; }
        .ob-brand-dot { width:10px; height:10px; background:#16a34a; border-radius:50%; }
        .ob-brand-name { font-family:'Syne',sans-serif; font-weight:800; font-size:18px; color:#fff; letter-spacing:-0.02em; }
        .ob-steps { display:flex; flex-direction:column; gap:4px; margin-bottom:auto; }
        .ob-step { display:flex; align-items:center; gap:14px; padding:12px 14px; border-radius:12px; cursor:default; transition:background 0.2s; }
        .ob-step.active { background:rgba(255,255,255,0.06); }
        .ob-step-num { width:32px; height:32px; border-radius:9px; display:flex; align-items:center; justify-content:center; font-size:13px; font-weight:700; flex-shrink:0; transition:all 0.3s; }
        .ob-step.done .ob-step-num { background:#16a34a; color:#fff; }
        .ob-step.active .ob-step-num { background:#fff; color:#111; }
        .ob-step.pending .ob-step-num { background:rgba(255,255,255,0.07); color:#4b5563; }
        .ob-step-label { font-size:13.5px; font-weight:700; color:#fff; font-family:'Syne',sans-serif; transition:opacity 0.2s; }
        .ob-step.pending .ob-step-label { color:#4b5563; }
        .ob-step-desc { font-size:11.5px; color:#6b7280; margin-top:1px; }
        .ob-step-line { width:1px; height:16px; background:rgba(255,255,255,0.06); margin-left:29px; }
        .ob-preview-card { background: linear-gradient(135deg, #1a1f2e, #111827); border: 1px solid rgba(255,255,255,0.07); border-radius:18px; padding:20px; margin-top:32px; transition: all 0.3s; }
        .ob-preview-label { font-size:10px; font-weight:700; letter-spacing:0.12em; text-transform:uppercase; color:#374151; margin-bottom:14px; }
        .ob-preview-logo { width:52px; height:52px; border-radius:14px; overflow:hidden; margin-bottom:12px; flex-shrink:0; border:2px solid rgba(255,255,255,0.08); }
        .ob-preview-shop-name { font-family:'Syne',sans-serif; font-size:17px; font-weight:800; color:#fff; letter-spacing:-0.03em; min-height:24px; }
        .ob-preview-desc { font-size:12px; color:#6b7280; margin-top:5px; line-height:1.5; min-height:32px; }
        .ob-preview-meta { display:flex; gap:8px; margin-top:12px; flex-wrap:wrap; }
        .ob-preview-badge { font-size:10.5px; font-weight:600; border-radius:100px; padding:3px 10px; background:rgba(22,163,74,0.12); color:#4ade80; border:1px solid rgba(22,163,74,0.15); }
        .ob-preview-badge.grey { background:rgba(255,255,255,0.04); color:#4b5563; border-color:rgba(255,255,255,0.06); }
        .ob-right { flex:1; display:flex; align-items:center; justify-content:center; padding:60px 48px; overflow-y:auto; }
        .ob-form-box { width:100%; max-width:520px; }
        .ob-step-header { margin-bottom:36px; }
        .ob-step-eyebrow { font-size:11px; font-weight:700; letter-spacing:0.12em; text-transform:uppercase; color:#16a34a; margin-bottom:8px; }
        .ob-step-title { font-family:'Syne',sans-serif; font-size:30px; font-weight:800; color:#111; letter-spacing:-0.04em; line-height:1.1; }
        .ob-step-subtitle { font-size:14px; color:#6b7280; margin-top:6px; }
        .ob-field { margin-bottom:22px; }
        .ob-label { display:block; font-size:13px; font-weight:600; color:#374151; margin-bottom:6px; }
        .ob-label .req { color:#ef4444; }
        .ob-input { width:100%; padding:13px 16px; border: 1.5px solid #e5e7eb; border-radius:12px; font-size:14px; font-family:'DM Sans',sans-serif; color:#111; background:#fff; transition:all 0.15s; outline:none; }
        .ob-input:focus { border-color:#16a34a; box-shadow:0 0 0 3px rgba(22,163,74,0.08); }
        .ob-input.error { border-color:#ef4444; }
        .ob-textarea { resize:none; min-height:100px; }
        .ob-err { font-size:11.5px; color:#ef4444; margin-top:5px; }
        .ob-upload { border: 1.5px dashed #d1d5db; border-radius:12px; padding:24px; text-align:center; cursor:pointer; transition:all 0.2s; background:#fafafa; }
        .ob-upload:hover { border-color:#16a34a; background:#f0fdf4; }
        .ob-upload.error { border-color:#ef4444; }
        .ob-upload-icon { font-size:28px; margin-bottom:8px; }
        .ob-upload-text { font-size:13px; font-weight:600; color:#374151; }
        .ob-upload-sub { font-size:11.5px; color:#9ca3af; margin-top:3px; }
        .ob-upload-done { font-size:12px; color:#16a34a; font-weight:600; margin-top:6px; }
        .ob-info { background:#fffbeb; border:1px solid #fde68a; border-radius:12px; padding:14px 16px; font-size:13px; color:#92400e; margin-bottom:22px; }
        .ob-review-row { display:flex; justify-content:space-between; align-items:flex-start; padding:12px 0; border-bottom:1px solid #f3f4f6; gap:16px; }
        .ob-review-key { font-size:12.5px; color:#9ca3af; font-weight:600; text-transform:uppercase; letter-spacing:0.06em; flex-shrink:0; }
        .ob-review-val { font-size:13.5px; color:#111; font-weight:600; text-align:right; max-width:280px; }
        .ob-review-section { background:#f9fafb; border-radius:14px; padding:4px 16px; margin-bottom:16px; }
        .ob-review-section-title { font-size:10.5px; font-weight:700; letter-spacing:0.1em; text-transform:uppercase; color:#6b7280; padding:12px 0 4px; }
        .ob-nav { display:flex; gap:12px; margin-top:36px; }
        .ob-btn-back { display:inline-flex; align-items:center; gap:8px; padding:13px 20px; border:1.5px solid #e5e7eb; border-radius:12px; font-size:14px; font-weight:600; color:#374151; background:#fff; cursor:pointer; transition:all 0.15s; font-family:'DM Sans',sans-serif; }
        .ob-btn-next { flex:1; display:flex; align-items:center; justify-content:center; gap:8px; padding:13px 24px; background:#111; border:none; border-radius:12px; font-size:14px; font-weight:700; color:#fff; cursor:pointer; transition:all 0.2s; font-family:'DM Sans',sans-serif; }
        .ob-btn-next:hover { background:#16a34a; }
        .ob-btn-launch { flex:1; display:flex; align-items:center; justify-content:center; gap:8px; padding:13px 24px; background:linear-gradient(135deg,#16a34a,#15803d); border:none; border-radius:12px; font-size:14px; font-weight:700; color:#fff; cursor:pointer; transition:all 0.2s; font-family:'DM Sans',sans-serif; box-shadow: 0 4px 14px rgba(22,163,74,0.35); }
        .ob-progress { height:2px; background:#e5e7eb; border-radius:100px; margin-bottom:40px; overflow:hidden; }
        .ob-progress-fill { height:100%; background:linear-gradient(90deg,#16a34a,#4ade80); border-radius:100px; transition:width 0.4s cubic-bezier(.34,1.2,.64,1); }
        @media (max-width: 900px) { .ob-left { display:none; } .ob-right { padding:32px 24px; } }
      `}</style>

      <div className="ob-wrap">
        <div className="ob-left">
          <div className="ob-brand">
            <div className="ob-brand-dot" />
            <span className="ob-brand-name">AffilMarket</span>
          </div>

          <div className="ob-steps">
            {STEPS.map((s, i) => {
              const state = step === s.id ? 'active' : step > s.id ? 'done' : 'pending';
              return (
                <div key={s.id}>
                  <div className={`ob-step ${state}`}>
                    <div className="ob-step-num">
                      {state === 'done' ? '✓' : <s.icon size={14} />}
                    </div>
                    <div className="ob-step-text">
                      <div className="ob-step-label">{s.label}</div>
                      <div className="ob-step-desc">{s.desc}</div>
                    </div>
                  </div>
                  {i < STEPS.length - 1 && <div className="ob-step-line" />}
                </div>
              );
            })}
          </div>

          <div className="ob-preview-card">
            <div className="ob-preview-label">Live Preview</div>
            <div className="ob-preview-logo">
              <LogoPreview url={values.logoUrl} name={values.shopName} />
            </div>
            <div className="ob-preview-shop-name">
              {values.shopName || <span style={{ color: '#374151', fontStyle: 'italic', fontSize: 14 }}>Your shop name...</span>}
            </div>
            <div className="ob-preview-desc">
              {values.description
                ? values.description.slice(0, 80) + (values.description.length > 80 ? '...' : '')
                : <span style={{ color: '#374151', fontStyle: 'italic' }}>Your description...</span>}
            </div>
            <div className="ob-preview-meta">
              {values.city
                ? <span className="ob-preview-badge">📍 {values.city}</span>
                : <span className="ob-preview-badge grey">📍 Location</span>}
              {values.phone && <span className="ob-preview-badge">📞 {values.phone}</span>}
              <span className="ob-preview-badge grey">🟡 Pending review</span>
            </div>
          </div>
        </div>

        <div className="ob-right">
          <div className="ob-form-box">
            <div className="ob-progress">
              <div className="ob-progress-fill" style={{ width: `${(step / 4) * 100}%` }} />
            </div>

            {serverError && (
              <div style={{ marginBottom: 20, padding: '12px 16px', background: '#fef2f2', border: '1px solid #fecaca', color: '#dc2626', borderRadius: 12, fontSize: 13 }}>
                {serverError}
              </div>
            )}

            <form onSubmit={handleSubmit(onSubmit)}>
              {/* STEP 1: Identity */}
              {step === 1 && (
                <>
                  <div className="ob-step-header">
                    <div className="ob-step-eyebrow">Step 1 of 4</div>
                    <div className="ob-step-title">Let's build your shop identity</div>
                    <div className="ob-step-subtitle">This is what customers and affiliates will see first.</div>
                  </div>

                  <div className="ob-field">
                    <label className="ob-label"><ImageIcon size={13} style={{ display:'inline', marginRight:5 }} />Shop Logo <span className="req">*</span></label>
                    <input ref={logoInputRef} type="file" accept="image/*" style={{ display:'none' }} onChange={handleLogoUpload} />
                    {values.logoUrl ? (
                      <div style={{ display:'flex', alignItems:'center', gap:14 }}>
                        <img src={values.logoUrl} alt="logo" style={{ width:60, height:60, borderRadius:14, objectFit:'cover', border:'2px solid #e5e7eb' }} />
                        <div>
                          <div style={{ fontSize:13, fontWeight:600, color:'#16a34a' }}>✓ Logo uploaded</div>
                          <button type="button" onClick={() => setValue('logoUrl', '')} style={{ fontSize:12, color:'#9ca3af', background:'none', border:'none', cursor:'pointer', padding:0, marginTop:2 }}>Remove</button>
                        </div>
                      </div>
                    ) : (
                      <div className={`ob-upload ${errors.logoUrl ? 'error' : ''}`} onClick={() => logoInputRef.current?.click()}>
                        <div className="ob-upload-icon">🖼️</div>
                        <div className="ob-upload-text">Upload your shop logo</div>
                        <div className="ob-upload-sub">PNG, JPG or WebP · Max 2MB</div>
                      </div>
                    )}
                    {errors.logoUrl && <div className="ob-err">{errors.logoUrl.message}</div>}
                  </div>

                  <div className="ob-field">
                    <label className="ob-label"><Store size={13} style={{ display:'inline', marginRight:5 }} />Shop Name <span className="req">*</span></label>
                    <input {...register('shopName')} className={`ob-input ${errors.shopName ? 'error' : ''}`} placeholder="e.g. Mama Mboga Organics" />
                    {errors.shopName && <div className="ob-err">{errors.shopName.message}</div>}
                  </div>

                  <div className="ob-field">
                    <label className="ob-label"><Phone size={13} style={{ display:'inline', marginRight:5 }} />Business Phone <span className="req">*</span></label>
                    <input {...register('phone')} className={`ob-input ${errors.phone ? 'error' : ''}`} placeholder="+254712345678" />
                    {errors.phone && <div className="ob-err">{errors.phone.message}</div>}
                  </div>

                  <div className="ob-field">
                    <label className="ob-label"><AlignLeft size={13} style={{ display:'inline', marginRight:5 }} />Shop Description <span className="req">*</span></label>
                    <textarea {...register('description')} className={`ob-input ob-textarea ${errors.description ? 'error' : ''}`} placeholder="What do you sell?" />
                    {errors.description && <div className="ob-err">{errors.description.message}</div>}
                  </div>
                </>
              )}

              {/* STEP 2: Legal */}
              {step === 2 && (
                <>
                  <div className="ob-step-header">
                    <div className="ob-step-eyebrow">Step 2 of 4</div>
                    <div className="ob-step-title">Legal & compliance</div>
                    <div className="ob-step-subtitle">Required for high-volume payouts. You can skip and add later.</div>
                  </div>
                  <div className="ob-info">💡 All information is encrypted and used for tax compliance only.</div>
                  <div className="ob-field">
                    <label className="ob-label"><Building2 size={13} style={{ display:'inline', marginRight:5 }} />Legal Business Name</label>
                    <input {...register('legalName')} className="ob-input" placeholder="Registered business name" />
                  </div>
                  <div className="ob-field">
                    <label className="ob-label"><Hash size={13} style={{ display:'inline', marginRight:5 }} />KRA PIN</label>
                    <input {...register('kraPin')} className="ob-input" placeholder="e.g. A000000000X" style={{ textTransform: 'uppercase' }} />
                  </div>
                  <div className="ob-field">
                    <label className="ob-label"><Upload size={13} style={{ display:'inline', marginRight:5 }} />KRA PIN Certificate</label>
                    <input ref={docInputRef} type="file" accept=".pdf,.jpg,.png" style={{ display:'none' }} onChange={handleDocUpload} />
                    <div className="ob-upload" onClick={() => docInputRef.current?.click()}>
                      <div className="ob-upload-icon">📄</div>
                      <div className="ob-upload-text">Upload KRA PIN certificate</div>
                      {values.kraPinDoc && <div className="ob-upload-done">✓ {values.kraPinDoc}</div>}
                    </div>
                  </div>
                </>
              )}

              {/* STEP 3: Location */}
              {step === 3 && (
                <>
                  <div className="ob-step-header">
                    <div className="ob-step-eyebrow">Step 3 of 4</div>
                    <div className="ob-step-title">Where are you based?</div>
                    <div className="ob-step-subtitle">Helps customers find local vendors and sets shipping expectations.</div>
                  </div>
                  <div className="ob-field">
                    <label className="ob-label"><MapPinned size={13} style={{ display:'inline', marginRight:5 }} />City / Town <span className="req">*</span></label>
                    <input {...register('city')} className={`ob-input ${errors.city ? 'error' : ''}`} placeholder="e.g. Nairobi" />
                    {errors.city && <div className="ob-err">{errors.city.message}</div>}
                  </div>
                  <div className="ob-field">
                    <label className="ob-label"><MapPin size={13} style={{ display:'inline', marginRight:5 }} />Street / Building Address <span className="req">*</span></label>
                    <input {...register('address')} className={`ob-input ${errors.address ? 'error' : ''}`} placeholder="e.g. Tom Mboya St" />
                    {errors.address && <div className="ob-err">{errors.address.message}</div>}
                  </div>
                </>
              )}

              {/* STEP 4: Review */}
              {step === 4 && (
                <>
                  <div className="ob-step-header">
                    <div className="ob-step-eyebrow">Step 4 of 4</div>
                    <div className="ob-step-title">Ready to launch 🚀</div>
                    <div className="ob-step-subtitle">Review your shop details before going live.</div>
                  </div>
                  <div className="ob-review-section">
                    <div className="ob-review-section-title">Shop Identity</div>
                    <div className="ob-review-row"><span className="ob-review-key">Shop Name</span><span className="ob-review-val">{values.shopName}</span></div>
                    <div className="ob-review-row"><span className="ob-review-key">Phone</span><span className="ob-review-val">{values.phone}</span></div>
                    <div className="ob-review-row"><span className="ob-review-key">Logo</span><span className="ob-review-val">{values.logoUrl ? '✓ Uploaded' : '—'}</span></div>
                  </div>
                  <div className="ob-review-section">
                    <div className="ob-review-section-title">Location</div>
                    <div className="ob-review-row"><span className="ob-review-key">City</span><span className="ob-review-val">{values.city}</span></div>
                    <div className="ob-review-row"><span className="ob-review-key">Address</span><span className="ob-review-val">{values.address}</span></div>
                  </div>
                </>
              )}

              {/* Navigation */}
              <div className="ob-nav">
                {step > 1 && (
                  <button type="button" className="ob-btn-back" onClick={() => setStep(s => s - 1)}>
                    <ChevronLeft size={15} /> Back
                  </button>
                )}
                {step < 4 ? (
                  <button type="button" className="ob-btn-next" onClick={nextStep}>
                    Continue <ChevronRight size={15} />
                  </button>
                ) : (
                  <button type="submit" className="ob-btn-launch" disabled={isSubmitting}>
                    {isSubmitting ? <><Loader2 size={15} className="animate-spin" /> Launching...</> : <>🚀 Launch My Shop</>}
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
