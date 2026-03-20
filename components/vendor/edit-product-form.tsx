'use client';

import { useState, useCallback, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import { updateProduct } from '@/action/updateProductAction';
import {
  ArrowLeft, Save, X, Plus, Info, Package,
  DollarSign, Image as ImageIcon, FileText,
  AlertCircle, CheckCircle, Loader2, WifiOff,
} from 'lucide-react';

interface Category { id: string; name: string; slug: string; children: { id: string; name: string; slug: string }[]; }

interface ProductData {
  id: string; title: string; shortDescription: string; description: string;
  categoryId: string; subcategoryId: string; sku: string;
  price: number; stockQuantity: number; mainImageUrl: string;
  galleryImages: string[]; affiliateCommissionRate: number;
  country: string; status: string;
}

interface Props { product: ProductData; categories: Category[]; }

function commissionToDecimal(pct: string) {
  const n = parseFloat(pct);
  return isNaN(n) ? 0.1 : Math.min(Math.max(n / 100, 0), 1);
}

function isValidHttpUrl(str: string) {
  try { return /^https?:\/\/.+/.test(new URL(str).href); } catch { return false; }
}

export function EditProductForm({ product, categories }: Props) {
  const router = useRouter();
  const [form, setForm] = useState({
    title:                   product.title,
    shortDescription:        product.shortDescription,
    description:             product.description,
    categoryId:              product.categoryId,
    subcategoryId:           product.subcategoryId,
    sku:                     product.sku,
    price:                   String(product.price),
    stockQuantity:           String(product.stockQuantity),
    mainImageUrl:            product.mainImageUrl,
    galleryImages:           product.galleryImages,
    affiliateCommissionRate: String(product.affiliateCommissionRate),
    country:                 product.country,
  });
  const [errors,     setErrors]     = useState<Record<string, string>>({});
  const [saving,     setSaving]     = useState(false);
  const [saveState,  setSaveState]  = useState<'idle' | 'success' | 'error'>('idle');
  const [newGallery, setNewGallery] = useState('');

  const selectedCategory = useMemo(
    () => categories.find((c) => c.id === form.categoryId),
    [categories, form.categoryId]
  );

  const set = useCallback((key: string, value: any) => {
    setForm((prev) => ({ ...prev, [key]: value }));
    setErrors((prev) => { const n = { ...prev }; delete n[key]; return n; });
  }, []);

  const addGallery = () => {
    const url = newGallery.trim();
    if (!url || !isValidHttpUrl(url)) return;
    if (form.galleryImages.includes(url)) return;
    if (form.galleryImages.length >= 8) return;
    setForm((p) => ({ ...p, galleryImages: [...p.galleryImages, url] }));
    setNewGallery('');
  };

  const removeGallery = (i: number) => {
    setForm((p) => ({ ...p, galleryImages: p.galleryImages.filter((_, idx) => idx !== i) }));
  };

  const commPreview = form.price && !isNaN(Number(form.price)) && Number(form.price) > 0
    ? (Number(form.price) * commissionToDecimal(form.affiliateCommissionRate)).toFixed(2)
    : null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    setSaveState('idle');

    const result = await updateProduct(product.id, {
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
    });

    setSaving(false);

    if (result.error) {
      setErrors({ _form: result.error });
      setSaveState('error');
      return;
    }

    setSaveState('success');
    setTimeout(() => router.push('/vendor/products'), 1200);
  };

  const inputStyle = (hasError?: boolean): React.CSSProperties => ({
    width: '100%', border: `1px solid ${hasError ? '#fca5a5' : '#e5e7eb'}`,
    borderRadius: 8, padding: '10px 14px', fontSize: 14, color: '#111',
    outline: 'none', fontFamily: "'DM Sans', sans-serif",
    background: hasError ? '#fff5f5' : '#fff', boxSizing: 'border-box',
  });

  const selectStyle = (): React.CSSProperties => ({
    ...inputStyle(), cursor: 'pointer', appearance: 'none',
    backgroundImage: `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='12' height='12' viewBox='0 0 24 24' fill='none' stroke='%239ca3af' stroke-width='2'%3E%3Cpath d='M6 9l6 6 6-6'/%3E%3C/svg%3E")`,
    backgroundRepeat: 'no-repeat', backgroundPosition: 'right 12px center', paddingRight: 36,
  });

  return (
    <>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=DM+Sans:wght@400;500;600;700;800&display=swap');
        .ep { font-family: 'DM Sans', sans-serif; max-width: 900px; }
        .ep input:focus, .ep textarea:focus, .ep select:focus { border-color: #16a34a !important; box-shadow: 0 0 0 3px rgba(22,163,74,0.1) !important; outline: none; }
        .ep-section { background: #fff; border: 1px solid #e5e7eb; border-radius: 14px; overflow: hidden; margin-bottom: 20px; }
        .ep-section-head { padding: 16px 24px; border-bottom: 1px solid #f3f4f6; background: #fafafa; display: flex; align-items: center; gap: 10px; }
        .ep-section-icon { width: 32px; height: 32px; border-radius: 8px; background: #f0fdf4; border: 1px solid #bbf7d0; display: flex; align-items: center; justify-content: center; color: #16a34a; flex-shrink: 0; }
        .ep-section-title { font-size: 14px; font-weight: 700; color: #111; }
        .ep-section-body { padding: 20px 24px; }
        .ep-field { margin-bottom: 20px; }
        .ep-label { display: block; font-size: 13px; font-weight: 700; color: #374151; margin-bottom: 6px; }
        .ep-grid2 { display: grid; grid-template-columns: 1fr 1fr; gap: 20px; }
        .ep-grid3 { display: grid; grid-template-columns: 1fr 1fr 1fr; gap: 20px; }
        .ep-bar { position: sticky; bottom: 0; background: #fff; border-top: 1px solid #e5e7eb; padding: 16px 24px; display: flex; align-items: center; justify-content: space-between; gap: 12px; margin: 0 -32px -28px; box-shadow: 0 -4px 20px rgba(0,0,0,0.06); z-index: 40; }
        .ep-btn-back { display: inline-flex; align-items: center; gap: 7px; background: transparent; border: 1px solid #e5e7eb; border-radius: 8px; padding: 9px 16px; font-size: 13.5px; font-weight: 600; color: #374151; cursor: pointer; font-family: 'DM Sans', sans-serif; text-decoration: none; }
        .ep-btn-save { display: inline-flex; align-items: center; gap: 8px; background: #16a34a; border: none; border-radius: 8px; padding: 10px 24px; font-size: 14px; font-weight: 700; color: #fff; cursor: pointer; font-family: 'DM Sans', sans-serif; min-width: 160px; justify-content: center; }
        .ep-btn-save:disabled { opacity: 0.7; cursor: not-allowed; }
        .ep-status-badge { display: inline-flex; align-items: center; gap: 6px; border-radius: 100px; padding: 4px 12px; font-size: 12px; font-weight: 700; }
        .ep-gallery-grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(80px, 1fr)); gap: 10px; margin-bottom: 12px; }
        .ep-thumb { position: relative; aspect-ratio: 1; border-radius: 8px; overflow: hidden; border: 1px solid #e5e7eb; }
        .ep-thumb img { width: 100%; height: 100%; object-fit: cover; }
        .ep-thumb-remove { position: absolute; top: 4px; right: 4px; width: 20px; height: 20px; border-radius: 50%; background: rgba(0,0,0,0.6); border: none; display: flex; align-items: center; justify-content: center; cursor: pointer; color: #fff; }
        .ep-comm-preview { background: #f0fdf4; border: 1px solid #bbf7d0; border-radius: 8px; padding: 12px 16px; display: flex; align-items: center; gap: 10px; margin-top: 12px; }
        @media (max-width: 700px) { .ep-grid2, .ep-grid3 { grid-template-columns: 1fr; } .ep-bar { margin: 0 -16px -20px; } }
      `}</style>

      <form className="ep" onSubmit={handleSubmit} noValidate>

        {/* Header */}
        <div style={{ marginBottom: 28 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 6 }}>
            <a href="/vendor/products" style={{ display: 'flex', alignItems: 'center', gap: 5, fontSize: 13, color: '#9ca3af', textDecoration: 'none' }}>
              <ArrowLeft size={14} /> Products
            </a>
            <span style={{ color: '#d1d5db' }}>›</span>
            <span style={{ fontSize: 13, color: '#374151', fontWeight: 600 }}>Edit Product</span>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
            <h1 style={{ fontSize: 26, fontWeight: 800, color: '#111', letterSpacing: '-0.04em' }}>
              Edit Product
            </h1>
            <span className="ep-status-badge" style={{
              background: product.status === 'active' ? '#f0fdf4' : product.status === 'rejected' ? '#fef2f2' : '#fffbeb',
              color:      product.status === 'active' ? '#16a34a' : product.status === 'rejected' ? '#dc2626' : '#d97706',
            }}>
              {product.status === 'active' ? '✓ Active' : product.status === 'rejected' ? '✗ Rejected' : '⏳ Pending Review'}
            </span>
          </div>
          <p style={{ fontSize: 14, color: '#6b7280', marginTop: 4 }}>
            Editing will re-submit the product for admin review.
          </p>
        </div>

        {errors._form && (
          <div style={{ display: 'flex', alignItems: 'center', gap: 10, background: '#fef2f2', border: '1px solid #fecaca', borderRadius: 10, padding: '12px 16px', fontSize: 13, color: '#991b1b', marginBottom: 20 }}>
            <AlertCircle size={16} /> {errors._form}
          </div>
        )}

        {/* Basic Info */}
        <div className="ep-section">
          <div className="ep-section-head">
            <div className="ep-section-icon"><FileText size={15} /></div>
            <span className="ep-section-title">Basic Information</span>
          </div>
          <div className="ep-section-body">
            <div className="ep-field">
              <label className="ep-label">Product Title *</label>
              <input style={inputStyle()} value={form.title} onChange={(e) => set('title', e.target.value)} placeholder="Product title" />
            </div>
            <div className="ep-field">
              <label className="ep-label">Short Description</label>
              <textarea style={{ ...inputStyle(), minHeight: 80, resize: 'vertical' } as any} value={form.shortDescription} onChange={(e) => set('shortDescription', e.target.value)} placeholder="Brief summary..." rows={3} />
            </div>
            <div className="ep-field">
              <label className="ep-label">Full Description</label>
              <textarea style={{ ...inputStyle(), minHeight: 120, resize: 'vertical' } as any} value={form.description} onChange={(e) => set('description', e.target.value)} placeholder="Detailed description..." rows={5} />
            </div>
            <div className="ep-grid2">
              <div className="ep-field">
                <label className="ep-label">Category</label>
                <select style={selectStyle()} value={form.categoryId} onChange={(e) => set('categoryId', e.target.value)}>
                  <option value="">Select category...</option>
                  {categories.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
                </select>
              </div>
              <div className="ep-field">
                <label className="ep-label">Subcategory</label>
                <select style={selectStyle()} value={form.subcategoryId} onChange={(e) => set('subcategoryId', e.target.value)} disabled={!selectedCategory?.children.length}>
                  <option value="">Select subcategory...</option>
                  {selectedCategory?.children.map((s) => <option key={s.id} value={s.id}>{s.name}</option>)}
                </select>
              </div>
            </div>
            <div className="ep-grid2">
              <div className="ep-field">
                <label className="ep-label">SKU</label>
                <input style={inputStyle()} value={form.sku} onChange={(e) => set('sku', e.target.value)} placeholder="Optional SKU" />
              </div>
              <div className="ep-field">
                <label className="ep-label">Country</label>
                <select style={selectStyle()} value={form.country} onChange={(e) => set('country', e.target.value)}>
                  <option value="KE">🇰🇪 Kenya (KE)</option>
                  <option value="UG">🇺🇬 Uganda (UG)</option>
                  <option value="TZ">🇹🇿 Tanzania (TZ)</option>
                  <option value="RW">🇷🇼 Rwanda (RW)</option>
                  <option value="NG">🇳🇬 Nigeria (NG)</option>
                  <option value="GH">🇬🇭 Ghana (GH)</option>
                </select>
              </div>
            </div>
          </div>
        </div>

        {/* Pricing */}
        <div className="ep-section">
          <div className="ep-section-head">
            <div className="ep-section-icon"><DollarSign size={15} /></div>
            <span className="ep-section-title">Pricing & Stock</span>
          </div>
          <div className="ep-section-body">
            <div className="ep-grid3">
              <div className="ep-field">
                <label className="ep-label">Price (KES) *</label>
                <div style={{ position: 'relative' }}>
                  <span style={{ position: 'absolute', left: 12, top: '50%', transform: 'translateY(-50%)', fontSize: 13, fontWeight: 700, color: '#6b7280' }}>KES</span>
                  <input style={{ ...inputStyle(), paddingLeft: 44 }} type="number" min="1" value={form.price} onChange={(e) => set('price', e.target.value)} placeholder="2500" />
                </div>
              </div>
              <div className="ep-field">
                <label className="ep-label">Stock Quantity *</label>
                <input style={inputStyle()} type="number" min="0" value={form.stockQuantity} onChange={(e) => set('stockQuantity', e.target.value)} />
              </div>
              <div className="ep-field">
                <label className="ep-label">Commission (%)</label>
                <div style={{ position: 'relative' }}>
                  <input style={{ ...inputStyle(), paddingRight: 36 }} type="number" min="0" max="100" step="0.5" value={form.affiliateCommissionRate} onChange={(e) => set('affiliateCommissionRate', e.target.value)} />
                  <span style={{ position: 'absolute', right: 12, top: '50%', transform: 'translateY(-50%)', fontSize: 13, fontWeight: 700, color: '#6b7280' }}>%</span>
                </div>
              </div>
            </div>
            {commPreview && (
              <div className="ep-comm-preview">
                <span style={{ fontSize: 20 }}>💰</span>
                <span style={{ fontSize: 13, color: '#15803d' }}>
                  Affiliates earn <strong>KES {parseFloat(commPreview).toLocaleString()}</strong> per sale
                </span>
              </div>
            )}
            <input type="range" min="0" max="50" step="0.5" value={form.affiliateCommissionRate}
              onChange={(e) => set('affiliateCommissionRate', e.target.value)}
              style={{ width: '100%', accentColor: '#16a34a', cursor: 'pointer', marginTop: 12 }} />
          </div>
        </div>

        {/* Images */}
        <div className="ep-section">
          <div className="ep-section-head">
            <div className="ep-section-icon"><ImageIcon size={15} /></div>
            <span className="ep-section-title">Product Images</span>
          </div>
          <div className="ep-section-body">
            <div className="ep-field">
              <label className="ep-label">Main Image URL</label>
              <input style={inputStyle()} type="url" value={form.mainImageUrl} onChange={(e) => set('mainImageUrl', e.target.value)} placeholder="https://..." />
              {form.mainImageUrl && isValidHttpUrl(form.mainImageUrl) && (
                <img src={form.mainImageUrl} alt="preview" style={{ width: 80, height: 80, borderRadius: 10, objectFit: 'cover', marginTop: 10, border: '1px solid #e5e7eb' }} />
              )}
            </div>
            <div className="ep-field">
              <label className="ep-label">Gallery Images ({form.galleryImages.length}/8)</label>
              {form.galleryImages.length > 0 && (
                <div className="ep-gallery-grid">
                  {form.galleryImages.map((url, i) => (
                    <div key={url} className="ep-thumb">
                      <img src={url} alt={`Gallery ${i + 1}`} />
                      <button type="button" className="ep-thumb-remove" onClick={() => removeGallery(i)}>
                        <X size={11} />
                      </button>
                    </div>
                  ))}
                </div>
              )}
              {form.galleryImages.length < 8 && (
                <div style={{ display: 'flex', gap: 8 }}>
                  <input style={{ ...inputStyle(), flex: 1 }} type="url" placeholder="https://..." value={newGallery}
                    onChange={(e) => setNewGallery(e.target.value)}
                    onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); addGallery(); } }} />
                  <button type="button" onClick={addGallery} style={{ display: 'flex', alignItems: 'center', gap: 6, background: '#f0fdf4', border: '1px solid #bbf7d0', borderRadius: 8, padding: '10px 16px', fontSize: 13, fontWeight: 600, color: '#16a34a', cursor: 'pointer' }}>
                    <Plus size={13} /> Add
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Sticky bar */}
        <div className="ep-bar">
          <a href="/vendor/products" className="ep-btn-back">
            <ArrowLeft size={14} /> Cancel
          </a>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            {saveState === 'success' && (
              <span style={{ fontSize: 13, color: '#16a34a', display: 'flex', alignItems: 'center', gap: 5 }}>
                <CheckCircle size={14} /> Saved! Redirecting...
              </span>
            )}
            <button type="submit" className="ep-btn-save" disabled={saving || saveState === 'success'}>
              {saving ? <><Loader2 size={15} style={{ animation: 'spin 1s linear infinite' }} /> Saving...</>
                : saveState === 'success' ? <><CheckCircle size={15} /> Saved!</>
                : <><Save size={15} /> Save Changes</>}
            </button>
          </div>
        </div>
      </form>
    </>
  );
}
