'use client';

import { useState, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import {
  ArrowLeft, Save, Eye, Upload, X, Plus, Info,
  Package, DollarSign, Image as ImageIcon, Tag,
  FileText, AlertCircle, CheckCircle, Loader2,
} from 'lucide-react';

// ── TYPES ─────────────────────────────────────────────────────────────────────
interface SubCategory { id: string; name: string; slug: string; }
interface Category    { id: string; name: string; slug: string; children: SubCategory[]; }

interface Props { categories: Category[]; }

interface FormData {
  title:                   string;
  shortDescription:        string;
  description:             string;
  categoryId:              string;
  subcategoryId:           string;
  sku:                     string;
  price:                   string;
  stockQuantity:           string;
  mainImageUrl:            string;
  galleryImages:           string[];
  affiliateCommissionRate: string;
  country:                 string;
}

interface FieldError { [key: string]: string; }

const INITIAL: FormData = {
  title:                   '',
  shortDescription:        '',
  description:             '',
  categoryId:              '',
  subcategoryId:           '',
  sku:                     '',
  price:                   '',
  stockQuantity:           '0',
  mainImageUrl:            '',
  galleryImages:           [],
  affiliateCommissionRate: '10',
  country:                 'KE',
};

// ── HELPERS ────────────────────────────────────────────────────────────────────
function commissionToDecimal(pct: string): number {
  const n = parseFloat(pct);
  return isNaN(n) ? 0.1 : Math.min(Math.max(n / 100, 0), 1);
}

// ── SECTION WRAPPER ────────────────────────────────────────────────────────────
function Section({ title, icon, children, hint }: {
  title: string; icon: React.ReactNode;
  children: React.ReactNode; hint?: string;
}) {
  return (
    <div style={{
      background: '#fff', border: '1px solid #e5e7eb',
      borderRadius: 14, overflow: 'hidden', marginBottom: 20,
    }}>
      <div style={{
        padding: '16px 24px', borderBottom: '1px solid #f3f4f6',
        display: 'flex', alignItems: 'center', gap: 10,
        background: '#fafafa',
      }}>
        <div style={{
          width: 32, height: 32, borderRadius: 8,
          background: '#f0fdf4', border: '1px solid #bbf7d0',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          color: '#16a34a', flexShrink: 0,
        }}>{icon}</div>
        <div>
          <div style={{ fontSize: 14, fontWeight: 700, color: '#111', letterSpacing: '-0.01em' }}>{title}</div>
          {hint && <div style={{ fontSize: 12, color: '#9ca3af', marginTop: 1 }}>{hint}</div>}
        </div>
      </div>
      <div style={{ padding: '20px 24px' }}>{children}</div>
    </div>
  );
}

// ── FIELD WRAPPER ──────────────────────────────────────────────────────────────
function Field({ label, required, error, hint, children }: {
  label: string; required?: boolean; error?: string;
  hint?: string; children: React.ReactNode;
}) {
  return (
    <div style={{ marginBottom: 20 }}>
      <label style={{
        display: 'block', fontSize: 13, fontWeight: 700,
        color: '#374151', marginBottom: 6, letterSpacing: '-0.01em',
      }}>
        {label}
        {required && <span style={{ color: '#dc2626', marginLeft: 3 }}>*</span>}
      </label>
      {children}
      {hint && !error && (
        <p style={{ fontSize: 12, color: '#9ca3af', marginTop: 5 }}>{hint}</p>
      )}
      {error && (
        <p style={{ fontSize: 12, color: '#dc2626', marginTop: 5, display: 'flex', alignItems: 'center', gap: 4 }}>
          <AlertCircle size={11} /> {error}
        </p>
      )}
    </div>
  );
}

// ── INPUT STYLES ───────────────────────────────────────────────────────────────
const inputStyle = (hasError?: boolean): React.CSSProperties => ({
  width: '100%', border: `1px solid ${hasError ? '#fca5a5' : '#e5e7eb'}`,
  borderRadius: 8, padding: '10px 14px',
  fontSize: 14, color: '#111', outline: 'none',
  fontFamily: "'DM Sans', sans-serif",
  background: hasError ? '#fff5f5' : '#fff',
  transition: 'border-color 0.15s, box-shadow 0.15s',
});

const selectStyle = (hasError?: boolean): React.CSSProperties => ({
  ...inputStyle(hasError),
  cursor: 'pointer', appearance: 'none',
  backgroundImage: `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='12' height='12' viewBox='0 0 24 24' fill='none' stroke='%239ca3af' stroke-width='2'%3E%3Cpath d='M6 9l6 6 6-6'/%3E%3C/svg%3E")`,
  backgroundRepeat: 'no-repeat', backgroundPosition: 'right 12px center',
  paddingRight: 36,
});

// ── MAIN COMPONENT ─────────────────────────────────────────────────────────────
export function NewProductForm({ categories }: Props) {
  const router = useRouter();
  const [form,      setForm]      = useState<FormData>(INITIAL);
  const [errors,    setErrors]    = useState<FieldError>({});
  const [saving,    setSaving]    = useState(false);
  const [saveState, setSaveState] = useState<'idle' | 'success' | 'error'>('idle');
  const [newGallery, setNewGallery] = useState('');
  const [charCount,  setCharCount]  = useState(0);

  const selectedCategory = categories.find((c) => c.id === form.categoryId);
  const subCategories    = selectedCategory?.children ?? [];

  // ── Handlers ────────────────────────────────────────────────────────────────
  const set = (key: keyof FormData, value: string) => {
    setForm((prev) => ({ ...prev, [key]: value }));
    if (errors[key]) setErrors((prev) => { const e = { ...prev }; delete e[key]; return e; });
  };

  const addGalleryUrl = () => {
    const url = newGallery.trim();
    if (!url) return;
    try { new URL(url); } catch { setErrors((e) => ({ ...e, gallery: 'Invalid URL' })); return; }
    if (form.galleryImages.length >= 8) { setErrors((e) => ({ ...e, gallery: 'Maximum 8 gallery images' })); return; }
    setForm((p) => ({ ...p, galleryImages: [...p.galleryImages, url] }));
    setNewGallery('');
    setErrors((e) => { const n = { ...e }; delete n.gallery; return n; });
  };

  const removeGallery = (i: number) => {
    setForm((p) => ({ ...p, galleryImages: p.galleryImages.filter((_, idx) => idx !== i) }));
  };

  // ── Validation ──────────────────────────────────────────────────────────────
  const validate = (): boolean => {
    const e: FieldError = {};
    if (!form.title.trim() || form.title.length < 3) e.title = 'Title must be at least 3 characters';
    if (form.title.length > 200) e.title = 'Title must be under 200 characters';
    if (form.shortDescription.length > 300) e.shortDescription = 'Max 300 characters';
    if (!form.price || isNaN(Number(form.price)) || Number(form.price) <= 0) e.price = 'Enter a valid price greater than 0';
    if (isNaN(Number(form.stockQuantity)) || Number(form.stockQuantity) < 0) e.stockQuantity = 'Stock must be 0 or more';
    const comm = Number(form.affiliateCommissionRate);
    if (isNaN(comm) || comm < 0 || comm > 100) e.affiliateCommissionRate = 'Enter a value between 0 and 100';
    if (form.mainImageUrl && !/^https?:\/\//.test(form.mainImageUrl)) e.mainImageUrl = 'Must be a valid URL (https://...)';
    setErrors(e);
    return Object.keys(e).length === 0;
  };

  // ── Submit ──────────────────────────────────────────────────────────────────
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!validate()) return;

    setSaving(true);
    setSaveState('idle');

    try {
      const payload = {
        title:                   form.title.trim(),
        shortDescription:        form.shortDescription.trim() || null,
        description:             form.description.trim() || null,
        categoryId:              form.categoryId || null,
        subcategoryId:           form.subcategoryId || null,
        sku:                     form.sku.trim() || null,
        price:                   Number(form.price),
        stockQuantity:           Number(form.stockQuantity),
        mainImageUrl:            form.mainImageUrl.trim() || null,
        galleryImages:           form.galleryImages.length > 0 ? form.galleryImages : null,
        affiliateCommissionRate: commissionToDecimal(form.affiliateCommissionRate),
        country:                 form.country,
      };

      const res = await fetch('/api/vendor/products', {
        method:  'POST',
        headers: { 'Content-Type': 'application/json' },
        body:    JSON.stringify(payload),
      });

      const data = await res.json();

      if (!res.ok) {
        if (data.issues) setErrors(Object.fromEntries(
          Object.entries(data.issues).map(([k, v]) => [k, (v as string[])[0]])
        ));
        setSaveState('error');
        return;
      }

      setSaveState('success');
      setTimeout(() => router.push('/vendor/products'), 1200);
    } catch {
      setSaveState('error');
    } finally {
      setSaving(false);
    }
  };

  // ── Commission preview ───────────────────────────────────────────────────────
  const commPreview = form.price && !isNaN(Number(form.price)) && Number(form.price) > 0
    ? (Number(form.price) * commissionToDecimal(form.affiliateCommissionRate)).toFixed(2)
    : null;

  return (
    <>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=DM+Sans:wght@400;500;600;700;800;900&display=swap');
        .np-page { font-family: 'DM Sans', -apple-system, sans-serif; max-width: 900px; }

        .np-input:focus {
          border-color: #16a34a !important;
          box-shadow: 0 0 0 3px rgba(22,163,74,0.1) !important;
          outline: none;
        }
        .np-textarea {
          resize: vertical; min-height: 100px; line-height: 1.65;
        }
        .np-grid-2 { display: grid; grid-template-columns: 1fr 1fr; gap: 20px; }
        .np-grid-3 { display: grid; grid-template-columns: 1fr 1fr 1fr; gap: 20px; }

        .np-comm-preview {
          background: #f0fdf4; border: 1px solid #bbf7d0;
          border-radius: 8px; padding: 12px 16px;
          display: flex; align-items: center; gap: 10px;
          margin-top: 12px;
        }

        .np-gallery-grid {
          display: grid; grid-template-columns: repeat(auto-fill, minmax(80px, 1fr));
          gap: 10px; margin-bottom: 12px;
        }
        .np-gallery-thumb {
          position: relative; aspect-ratio: 1;
          border-radius: 8px; overflow: hidden;
          border: 1px solid #e5e7eb;
          background: #f9fafb;
        }
        .np-gallery-remove {
          position: absolute; top: 4px; right: 4px;
          width: 20px; height: 20px; border-radius: 50%;
          background: rgba(0,0,0,0.6); border: none;
          display: flex; align-items: center; justify-content: center;
          cursor: pointer; color: #fff;
        }

        .np-submit-bar {
          position: sticky; bottom: 0;
          background: #fff; border-top: 1px solid #e5e7eb;
          padding: 16px 24px;
          display: flex; align-items: center; justify-content: space-between;
          gap: 12px; flex-wrap: wrap;
          margin: 0 -32px -28px;
          box-shadow: 0 -4px 20px rgba(0,0,0,0.06);
          z-index: 40;
        }

        .np-btn-back {
          display: inline-flex; align-items: center; gap: 7px;
          background: transparent; border: 1px solid #e5e7eb;
          border-radius: 8px; padding: 9px 16px;
          font-size: 13.5px; font-weight: 600; color: #374151;
          cursor: pointer; text-decoration: none;
          transition: all 0.15s; font-family: 'DM Sans', sans-serif;
        }
        .np-btn-back:hover { border-color: #d1d5db; background: #f9fafb; }

        .np-btn-save {
          display: inline-flex; align-items: center; gap: 8px;
          background: #16a34a; border: none; border-radius: 8px;
          padding: 10px 24px; font-size: 14px; font-weight: 700;
          color: #fff; cursor: pointer; transition: background 0.2s;
          font-family: 'DM Sans', sans-serif; min-width: 160px;
          justify-content: center;
        }
        .np-btn-save:hover:not(:disabled) { background: #15803d; }
        .np-btn-save:disabled { opacity: 0.7; cursor: not-allowed; }
        .np-btn-save.success { background: #16a34a; }
        .np-btn-save.error   { background: #dc2626; }

        .np-status-note {
          display: flex; align-items: flex-start; gap: 10px;
          background: #fffbeb; border: 1px solid #fde68a;
          border-radius: 10px; padding: 12px 16px;
          font-size: 13px; color: #92400e; margin-bottom: 20px;
          line-height: 1.6;
        }

        .np-char-counter {
          font-size: 11px; color: #9ca3af; text-align: right; margin-top: 4px;
        }
        .np-char-counter.warn { color: #d97706; }
        .np-char-counter.over { color: #dc2626; }

        @media (max-width: 700px) {
          .np-grid-2, .np-grid-3 { grid-template-columns: 1fr; }
          .np-submit-bar { margin: 0 -16px -20px; }
        }
      `}</style>

      <form className="np-page" onSubmit={handleSubmit} noValidate>

        {/* ── HEADER ── */}
        <div style={{
          display: 'flex', alignItems: 'flex-start',
          justifyContent: 'space-between', flexWrap: 'wrap',
          gap: 16, marginBottom: 28,
        }}>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 6 }}>
              <a href="/vendor/products" style={{
                display: 'flex', alignItems: 'center', gap: 5,
                fontSize: 13, color: '#9ca3af', textDecoration: 'none',
                transition: 'color 0.15s',
              }}>
                <ArrowLeft size={14} /> Products
              </a>
              <span style={{ color: '#d1d5db', fontSize: 12 }}>›</span>
              <span style={{ fontSize: 13, color: '#374151', fontWeight: 600 }}>New Product</span>
            </div>
            <h1 style={{ fontSize: 26, fontWeight: 800, color: '#111', letterSpacing: '-0.04em', lineHeight: 1.1 }}>
              Add New Product
            </h1>
            <p style={{ fontSize: 14, color: '#6b7280', marginTop: 4 }}>
              Fill in the details below. Your product will go to admin review before going live.
            </p>
          </div>
        </div>

        {/* Admin review note */}
        <div className="np-status-note">
          <Info size={16} style={{ flexShrink: 0, marginTop: 1 }} />
          <span>
            New products are submitted as <strong>Pending Review</strong>. Our team typically reviews within 24 hours.
            You'll be notified once it's approved and live on the marketplace.
          </span>
        </div>

        {/* ── SECTION 1: Basic Info ── */}
        <Section title="Basic Information" icon={<FileText size={15} />} hint="Product name, description and categorisation">

          <Field label="Product Title" required error={errors.title}>
            <input
              className="np-input"
              style={inputStyle(!!errors.title)}
              type="text"
              placeholder="e.g. Digital Marketing Masterclass 2026"
              value={form.title}
              maxLength={200}
              onChange={(e) => set('title', e.target.value)}
            />
          </Field>

          <Field
            label="Short Description"
            error={errors.shortDescription}
            hint="Shown on product cards and search results (max 300 characters)"
          >
            <textarea
              className="np-input np-textarea"
              style={{ ...inputStyle(!!errors.shortDescription), minHeight: 80 }}
              placeholder="A brief summary of what this product offers…"
              value={form.shortDescription}
              maxLength={300}
              rows={3}
              onChange={(e) => {
                set('shortDescription', e.target.value);
                setCharCount(e.target.value.length);
              }}
            />
            <div className={`np-char-counter${charCount > 260 ? charCount > 300 ? ' over' : ' warn' : ''}`}>
              {charCount}/300
            </div>
          </Field>

          <Field label="Full Description" hint="Detailed product description shown on the product page. Supports plain text.">
            <textarea
              className="np-input np-textarea"
              style={{ ...inputStyle(), minHeight: 140 }}
              placeholder="Describe your product in detail — what's included, who it's for, key benefits…"
              value={form.description}
              rows={6}
              onChange={(e) => set('description', e.target.value)}
            />
          </Field>

          <div className="np-grid-2">
            <Field label="Category" error={errors.categoryId}>
              <select
                className="np-input"
                style={selectStyle(!!errors.categoryId)}
                value={form.categoryId}
                onChange={(e) => {
                  set('categoryId', e.target.value);
                  set('subcategoryId', ''); // reset subcategory
                }}
              >
                <option value="">Select category…</option>
                {categories.map((c) => (
                  <option key={c.id} value={c.id}>{c.name}</option>
                ))}
              </select>
            </Field>

            <Field label="Subcategory" hint={subCategories.length === 0 ? 'Select a category first' : undefined}>
              <select
                className="np-input"
                style={selectStyle()}
                value={form.subcategoryId}
                onChange={(e) => set('subcategoryId', e.target.value)}
                disabled={subCategories.length === 0}
              >
                <option value="">Select subcategory…</option>
                {subCategories.map((s) => (
                  <option key={s.id} value={s.id}>{s.name}</option>
                ))}
              </select>
            </Field>
          </div>

          <div className="np-grid-2">
            <Field label="SKU (Stock Keeping Unit)" hint="Optional internal product code">
              <input
                className="np-input"
                style={inputStyle()}
                type="text"
                placeholder="e.g. COURSE-DMK-2026"
                value={form.sku}
                onChange={(e) => set('sku', e.target.value)}
              />
            </Field>
            <Field label="Country" hint="Primary market for this product">
              <select
                className="np-input"
                style={selectStyle()}
                value={form.country}
                onChange={(e) => set('country', e.target.value)}
              >
                <option value="KE">🇰🇪 Kenya (KE)</option>
                <option value="UG">🇺🇬 Uganda (UG)</option>
                <option value="TZ">🇹🇿 Tanzania (TZ)</option>
                <option value="RW">🇷🇼 Rwanda (RW)</option>
                <option value="NG">🇳🇬 Nigeria (NG)</option>
                <option value="GH">🇬🇭 Ghana (GH)</option>
              </select>
            </Field>
          </div>
        </Section>

        {/* ── SECTION 2: Pricing ── */}
        <Section title="Pricing & Stock" icon={<DollarSign size={15} />} hint="Set your price, stock and affiliate commission">

          <div className="np-grid-3">
            <Field label="Price (KES)" required error={errors.price}>
              <div style={{ position: 'relative' }}>
                <span style={{
                  position: 'absolute', left: 12, top: '50%', transform: 'translateY(-50%)',
                  fontSize: 13, fontWeight: 700, color: '#6b7280',
                }}>KES</span>
                <input
                  className="np-input"
                  style={{ ...inputStyle(!!errors.price), paddingLeft: 44 }}
                  type="number"
                  min="1"
                  step="1"
                  placeholder="2500"
                  value={form.price}
                  onChange={(e) => set('price', e.target.value)}
                />
              </div>
            </Field>

            <Field label="Stock Quantity" required error={errors.stockQuantity}>
              <input
                className="np-input"
                style={inputStyle(!!errors.stockQuantity)}
                type="number"
                min="0"
                step="1"
                placeholder="100"
                value={form.stockQuantity}
                onChange={(e) => set('stockQuantity', e.target.value)}
              />
            </Field>

            <Field
              label="Affiliate Commission (%)"
              required
              error={errors.affiliateCommissionRate}
              hint="% of sale price affiliates earn"
            >
              <div style={{ position: 'relative' }}>
                <input
                  className="np-input"
                  style={{ ...inputStyle(!!errors.affiliateCommissionRate), paddingRight: 36 }}
                  type="number"
                  min="0"
                  max="100"
                  step="0.5"
                  placeholder="10"
                  value={form.affiliateCommissionRate}
                  onChange={(e) => set('affiliateCommissionRate', e.target.value)}
                />
                <span style={{
                  position: 'absolute', right: 12, top: '50%', transform: 'translateY(-50%)',
                  fontSize: 13, fontWeight: 700, color: '#6b7280',
                }}>%</span>
              </div>
            </Field>
          </div>

          {/* Commission preview */}
          {commPreview && (
            <div className="np-comm-preview">
              <div style={{
                width: 32, height: 32, borderRadius: 8,
                background: '#dcfce7', display: 'flex', alignItems: 'center',
                justifyContent: 'center', flexShrink: 0,
              }}>
                💰
              </div>
              <div style={{ fontSize: 13, color: '#15803d' }}>
                Affiliates earn <strong>KES {parseFloat(commPreview).toLocaleString()}</strong> per sale ·
                You keep <strong>KES {(Number(form.price) - parseFloat(commPreview)).toLocaleString()}</strong> (before platform fee)
              </div>
            </div>
          )}

          {/* Slider for commission */}
          <div style={{ marginTop: 16 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 6 }}>
              <span style={{ fontSize: 12, color: '#9ca3af' }}>0% (no commission)</span>
              <span style={{ fontSize: 12, fontWeight: 700, color: '#16a34a' }}>
                {form.affiliateCommissionRate}% commission
              </span>
              <span style={{ fontSize: 12, color: '#9ca3af' }}>50% max</span>
            </div>
            <input
              type="range" min="0" max="50" step="0.5"
              value={form.affiliateCommissionRate}
              onChange={(e) => set('affiliateCommissionRate', e.target.value)}
              style={{ width: '100%', accentColor: '#16a34a', cursor: 'pointer' }}
            />
          </div>
        </Section>

        {/* ── SECTION 3: Images ── */}
        <Section title="Product Images" icon={<ImageIcon size={15} />} hint="Main image and up to 8 gallery photos (paste URLs)">

          <Field label="Main Product Image URL" error={errors.mainImageUrl} hint="The primary image shown on product cards and at the top of the product page">
            <input
              className="np-input"
              style={inputStyle(!!errors.mainImageUrl)}
              type="url"
              placeholder="https://res.cloudinary.com/yourcloud/image/upload/..."
              value={form.mainImageUrl}
              onChange={(e) => set('mainImageUrl', e.target.value)}
            />
            {/* Preview */}
            {form.mainImageUrl && /^https?:\/\//.test(form.mainImageUrl) && (
              <div style={{ marginTop: 10, display: 'flex', gap: 12, alignItems: 'center' }}>
                <img
                  src={form.mainImageUrl}
                  alt="Preview"
                  style={{
                    width: 80, height: 80, borderRadius: 10,
                    objectFit: 'cover', border: '1px solid #e5e7eb',
                  }}
                  onError={(e) => { (e.target as HTMLImageElement).style.display = 'none'; }}
                />
                <span style={{ fontSize: 12, color: '#16a34a', fontWeight: 600 }}>✓ Image preview</span>
              </div>
            )}
          </Field>

          <Field
            label="Gallery Images"
            error={errors.gallery}
            hint={`Add up to 8 additional product images (${form.galleryImages.length}/8 added)`}
          >
            {/* Existing gallery */}
            {form.galleryImages.length > 0 && (
              <div className="np-gallery-grid" style={{ marginBottom: 12 }}>
                {form.galleryImages.map((url, i) => (
                  <div key={i} className="np-gallery-thumb">
                    <img
                      src={url} alt={`Gallery ${i + 1}`}
                      style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                      onError={(e) => { (e.target as HTMLImageElement).src = ''; }}
                    />
                    <button
                      type="button"
                      className="np-gallery-remove"
                      onClick={() => removeGallery(i)}
                    >
                      <X size={11} />
                    </button>
                  </div>
                ))}
              </div>
            )}

            {/* Add URL */}
            {form.galleryImages.length < 8 && (
              <div style={{ display: 'flex', gap: 8 }}>
                <input
                  className="np-input"
                  style={{ ...inputStyle(!!errors.gallery), flex: 1 }}
                  type="url"
                  placeholder="https://res.cloudinary.com/..."
                  value={newGallery}
                  onChange={(e) => setNewGallery(e.target.value)}
                  onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); addGalleryUrl(); } }}
                />
                <button
                  type="button"
                  onClick={addGalleryUrl}
                  style={{
                    display: 'flex', alignItems: 'center', gap: 6,
                    background: '#f0fdf4', border: '1px solid #bbf7d0',
                    borderRadius: 8, padding: '10px 16px',
                    fontSize: 13, fontWeight: 600, color: '#16a34a',
                    cursor: 'pointer', whiteSpace: 'nowrap',
                    fontFamily: "'DM Sans', sans-serif",
                  }}
                >
                  <Plus size={13} /> Add
                </button>
              </div>
            )}
          </Field>

          <div style={{
            background: '#f9fafb', border: '1px solid #e5e7eb',
            borderRadius: 10, padding: '12px 16px',
            display: 'flex', alignItems: 'flex-start', gap: 10,
            fontSize: 13, color: '#6b7280',
          }}>
            <Upload size={14} style={{ flexShrink: 0, marginTop: 1 }} />
            <span>
              Upload images to <strong>Cloudinary</strong> first, then paste the CDN URL here.
              Recommended size: 800×800px, square format works best for product cards.
            </span>
          </div>
        </Section>

        {/* ── SECTION 4: Summary ── */}
        <Section title="Review & Submit" icon={<Package size={15} />} hint="Check your product details before submitting">
          <div style={{
            display: 'grid', gridTemplateColumns: '1fr 1fr',
            gap: 12, marginBottom: 4,
          }}>
            {[
              { label: 'Title',       value: form.title || '—' },
              { label: 'Price',       value: form.price ? `KES ${Number(form.price).toLocaleString()}` : '—' },
              { label: 'Category',    value: categories.find(c => c.id === form.categoryId)?.name || '—' },
              { label: 'Commission',  value: form.affiliateCommissionRate ? `${form.affiliateCommissionRate}%` : '0%' },
              { label: 'Stock',       value: form.stockQuantity ? `${form.stockQuantity} units` : '0 units' },
              { label: 'Status',      value: 'Pending Review' },
            ].map(({ label, value }) => (
              <div key={label} style={{
                background: '#f9fafb', border: '1px solid #e5e7eb',
                borderRadius: 8, padding: '10px 14px',
              }}>
                <div style={{ fontSize: 11, fontWeight: 700, color: '#9ca3af', textTransform: 'uppercase', letterSpacing: '0.07em', marginBottom: 3 }}>{label}</div>
                <div style={{ fontSize: 14, fontWeight: 600, color: '#111', wordBreak: 'break-word' }}>{value}</div>
              </div>
            ))}
          </div>
        </Section>

        {/* ── STICKY SUBMIT BAR ── */}
        <div className="np-submit-bar">
          <a href="/vendor/products" className="np-btn-back">
            <ArrowLeft size={14} /> Cancel
          </a>

          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            {saveState === 'error' && (
              <span style={{ fontSize: 13, color: '#dc2626', display: 'flex', alignItems: 'center', gap: 5 }}>
                <AlertCircle size={14} /> Please fix the errors above
              </span>
            )}
            {saveState === 'success' && (
              <span style={{ fontSize: 13, color: '#16a34a', display: 'flex', alignItems: 'center', gap: 5 }}>
                <CheckCircle size={14} /> Product submitted! Redirecting…
              </span>
            )}
            <button
              type="submit"
              className={`np-btn-save${saveState === 'success' ? ' success' : saveState === 'error' ? ' error' : ''}`}
              disabled={saving || saveState === 'success'}
            >
              {saving ? (
                <><Loader2 size={15} style={{ animation: 'spin 1s linear infinite' }} /> Saving…</>
              ) : saveState === 'success' ? (
                <><CheckCircle size={15} /> Submitted!</>
              ) : saveState === 'error' ? (
                <><AlertCircle size={15} /> Fix errors</>
              ) : (
                <><Save size={15} /> Submit for Review</>
              )}
            </button>
          </div>
        </div>

        <style>{`
          @keyframes spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }
        `}</style>

      </form>
    </>
  );
}
