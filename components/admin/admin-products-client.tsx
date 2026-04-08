'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { reviewProduct } from '@/action/adminProductAction';
import { formatKES }     from '@/lib/utils';
import { CheckCircle, XCircle, Eye, Clock, Package, AlertCircle } from 'lucide-react';
import { TABS,Props } from '@/types/product-client';

export function AdminProductsClient({ products, activeTab, counts }: Props) {
  const router = useRouter();
  const [loading,  setLoading]  = useState<string | null>(null);
  const [noteOpen, setNoteOpen] = useState<string | null>(null);
  const [note,     setNote]     = useState('');

  const handle = async (id: string, action: 'approve' | 'reject', adminNote?: string) => {
    setLoading(id);
    await reviewProduct(id, action, adminNote);
    setLoading(null);
    setNoteOpen(null);
    setNote('');
    router.refresh();
  };

  return (
    <>
      <style>{`
        .ap-page { font-family: 'DM Sans', sans-serif; }
        .ap-header { margin-bottom: 24px; }
        .ap-title { font-size: 24px; font-weight: 800; color: #111; letter-spacing: -0.04em; }
        .ap-tabs { display: flex; gap: 8px; margin-bottom: 24px; border-bottom: 1px solid #e5e7eb; }
        .ap-tab {
          padding: 10px 20px; font-size: 13.5px; font-weight: 600;
          border: none; background: none; cursor: pointer;
          border-bottom: 2px solid transparent; color: #6b7280;
          transition: all 0.15s; white-space: nowrap;
          font-family: 'DM Sans', sans-serif;
        }
        .ap-tab.active { color: #111; border-bottom-color: #111; }
        .ap-tab:hover:not(.active) { color: #374151; }
        .ap-tab-count {
          display: inline-flex; align-items: center; justify-content: center;
          min-width: 20px; height: 20px; border-radius: 100px;
          font-size: 11px; font-weight: 800; padding: 0 6px;
          margin-left: 6px;
        }

        .ap-grid { display: flex; flex-direction: column; gap: 12px; }

        .ap-card {
          background: #fff; border: 1px solid #e5e7eb;
          border-radius: 14px; overflow: hidden;
          display: flex; gap: 0; transition: box-shadow 0.2s;
        }
        .ap-card:hover { box-shadow: 0 4px 16px rgba(0,0,0,0.06); }

        .ap-card-img {
          width: 120px; flex-shrink: 0;
          background: #f3f4f6; overflow: hidden;
        }
        .ap-card-img img { width: 100%; height: 100%; object-fit: cover; }
        .ap-card-img-placeholder {
          width: 100%; height: 100%; min-height: 120px;
          display: flex; align-items: center; justify-content: center;
          font-size: 32px; background: linear-gradient(135deg, #f0fdf4, #dcfce7);
        }

        .ap-card-body {
          flex: 1; padding: 16px 20px;
          display: flex; gap: 20px; align-items: flex-start;
        }
        .ap-card-info { flex: 1; min-width: 0; }

        .ap-card-meta {
          display: flex; align-items: center; gap: 8px;
          margin-bottom: 6px; flex-wrap: wrap;
        }
        .ap-card-vendor {
          font-size: 11.5px; font-weight: 700; color: #16a34a;
          text-transform: uppercase; letter-spacing: 0.06em;
        }
        .ap-card-dot { color: #d1d5db; font-size: 10px; }
        .ap-card-category { font-size: 11.5px; color: #9ca3af; }
        .ap-card-date { font-size: 11px; color: #9ca3af; margin-left: auto; }

        .ap-card-title {
          font-size: 15px; font-weight: 700; color: #111;
          letter-spacing: -0.02em; margin-bottom: 5px;
          white-space: nowrap; overflow: hidden; text-overflow: ellipsis;
        }
        .ap-card-desc {
          font-size: 12.5px; color: #6b7280; line-height: 1.5;
          margin-bottom: 10px;
          display: -webkit-box; -webkit-line-clamp: 2;
          -webkit-box-orient: vertical; overflow: hidden;
        }
        .ap-card-pills { display: flex; gap: 8px; flex-wrap: wrap; }
        .ap-pill {
          font-size: 12px; font-weight: 600; border-radius: 100px;
          padding: 3px 10px; border: 1px solid;
        }

        .ap-card-actions {
          display: flex; flex-direction: column; gap: 8px;
          align-items: flex-end; flex-shrink: 0; min-width: 140px;
        }
        .ap-btn {
          display: flex; align-items: center; gap: 6px;
          padding: 8px 16px; border-radius: 9px;
          font-size: 13px; font-weight: 700; cursor: pointer;
          border: none; transition: all 0.15s; width: 100%;
          justify-content: center; font-family: 'DM Sans', sans-serif;
        }
        .ap-btn-approve { background: #16a34a; color: #fff; }
        .ap-btn-approve:hover { background: #15803d; }
        .ap-btn-reject { background: #fef2f2; color: #dc2626; border: 1px solid #fecaca; }
        .ap-btn-reject:hover { background: #fee2e2; }
        .ap-btn-preview { background: #f9fafb; color: #374151; border: 1px solid #e5e7eb; }
        .ap-btn-preview:hover { background: #f3f4f6; }
        .ap-btn:disabled { opacity: 0.5; cursor: not-allowed; }

        .ap-note-box {
          background: #fef2f2; border: 1px solid #fecaca;
          border-radius: 10px; padding: 12px; margin-top: 4px;
          width: 100%;
        }
        .ap-note-textarea {
          width: 100%; border: 1px solid #fca5a5; border-radius: 7px;
          padding: 8px 10px; font-size: 12.5px; font-family: 'DM Sans', sans-serif;
          resize: none; outline: none; min-height: 60px; margin-bottom: 8px;
          box-sizing: border-box;
        }
        .ap-note-actions { display: flex; gap: 6px; }
        .ap-note-confirm {
          flex: 1; padding: 7px; background: #dc2626; color: #fff;
          border: none; border-radius: 7px; font-size: 12px; font-weight: 700;
          cursor: pointer; font-family: 'DM Sans', sans-serif;
        }
        .ap-note-cancel {
          padding: 7px 12px; background: #fff; color: #6b7280;
          border: 1px solid #e5e7eb; border-radius: 7px; font-size: 12px;
          cursor: pointer; font-family: 'DM Sans', sans-serif;
        }

        .ap-admin-note {
          background: #fef9c3; border: 1px solid #fde047;
          border-radius: 8px; padding: 8px 12px;
          font-size: 12px; color: #854d0e; margin-top: 8px;
          display: flex; gap: 6px; align-items: flex-start;
        }

        .ap-empty {
          text-align: center; padding: 80px 20px;
          background: #f9fafb; border-radius: 16px;
          border: 1px solid #e5e7eb;
        }
        .ap-empty-icon { font-size: 48px; margin-bottom: 16px; }
        .ap-empty-title { font-size: 18px; font-weight: 700; color: #374151; margin-bottom: 6px; }
        .ap-empty-desc { font-size: 14px; color: #9ca3af; }
      `}</style>

      <div className="ap-page">
        <div className="ap-header">
          <h1 className="ap-title">Product Review</h1>
          <p style={{ fontSize: 14, color: '#6b7280', marginTop: 4 }}>
            Review and approve vendor products before they go live on the marketplace.
          </p>
        </div>

        {/* Tabs */}
        <div className="ap-tabs">
          {TABS.map((tab) => (
            <button
              key={tab.key}
              className={`ap-tab${activeTab === tab.key ? ' active' : ''}`}
              onClick={() => router.push(`/admin/products?status=${tab.key}`)}
            >
              {tab.label}
              <span className="ap-tab-count" style={{
                background: activeTab === tab.key ? '#111' : '#f3f4f6',
                color:      activeTab === tab.key ? '#fff' : '#6b7280',
              }}>
                {tab.key === 'pending_approval' ? counts.pending
                  : tab.key === 'active' ? counts.active
                  : counts.rejected}
              </span>
            </button>
          ))}
        </div>

        {/* Products */}
        <div className="ap-grid">
          {products.length === 0 ? (
            <div className="ap-empty">
              <div className="ap-empty-icon">
                {activeTab === 'pending_approval' ? '🎉' : activeTab === 'active' ? '✅' : '❌'}
              </div>
              <div className="ap-empty-title">
                {activeTab === 'pending_approval' ? 'No products pending review'
                  : activeTab === 'active' ? 'No approved products yet'
                  : 'No rejected products'}
              </div>
              <div className="ap-empty-desc">
                {activeTab === 'pending_approval' ? 'All caught up! New submissions will appear here.'
                  : 'Products will appear here once approved.'}
              </div>
            </div>
          ) : (
            products.map((p) => (
              <div key={p.id} className="ap-card">
                <div className="ap-card-img">
                  {p.mainImageUrl
                    ? <img src={p.mainImageUrl} alt={p.title} />
                    : <div className="ap-card-img-placeholder">🛍️</div>}
                </div>

                <div className="ap-card-body">
                  <div className="ap-card-info">
                    <div className="ap-card-meta">
                      <span className="ap-card-vendor">{p.shopName}</span>
                      {p.categoryName && (
                        <>
                          <span className="ap-card-dot">•</span>
                          <span className="ap-card-category">{p.categoryName}</span>
                        </>
                      )}
                      <span className="ap-card-date">
                        {new Date(p.createdAt).toLocaleDateString('en-KE', { day: 'numeric', month: 'short', year: 'numeric' })}
                      </span>
                    </div>

                    <div className="ap-card-title">{p.title}</div>
                    {p.shortDescription && (
                      <div className="ap-card-desc">{p.shortDescription}</div>
                    )}

                    <div className="ap-card-pills">
                      <span className="ap-pill" style={{ background: '#f0fdf4', color: '#16a34a', borderColor: '#bbf7d0' }}>
                        {formatKES(p.price)}
                      </span>
                      <span className="ap-pill" style={{ background: '#eff6ff', color: '#2563eb', borderColor: '#bfdbfe' }}>
                        {(p.affiliateCommissionRate * 100).toFixed(0)}% commission
                      </span>
                    </div>

                    {p.adminNote && (
                      <div className="ap-admin-note">
                        <AlertCircle size={13} style={{ flexShrink: 0, marginTop: 1 }} />
                        <span><strong>Admin note:</strong> {p.adminNote}</span>
                      </div>
                    )}
                  </div>

                  {/* Actions */}
                  <div className="ap-card-actions">
                    <a href={`/products/${p.slug}`} target="_blank" className="ap-btn ap-btn-preview">
                      <Eye size={13} /> Preview
                    </a>

                    {activeTab === 'pending_approval' && (
                      <>
                        <button
                          className="ap-btn ap-btn-approve"
                          disabled={loading === p.id}
                          onClick={() => handle(p.id, 'approve')}
                        >
                          <CheckCircle size={13} />
                          {loading === p.id ? 'Approving...' : 'Approve'}
                        </button>

                        {noteOpen === p.id ? (
                          <div className="ap-note-box">
                            <textarea
                              className="ap-note-textarea"
                              placeholder="Reason for rejection (optional)..."
                              value={note}
                              onChange={(e) => setNote(e.target.value)}
                            />
                            <div className="ap-note-actions">
                              <button className="ap-note-cancel" onClick={() => { setNoteOpen(null); setNote(''); }}>
                                Cancel
                              </button>
                              <button
                                className="ap-note-confirm"
                                disabled={loading === p.id}
                                onClick={() => handle(p.id, 'reject', note)}
                              >
                                {loading === p.id ? 'Rejecting...' : 'Confirm Reject'}
                              </button>
                            </div>
                          </div>
                        ) : (
                          <button
                            className="ap-btn ap-btn-reject"
                            onClick={() => setNoteOpen(p.id)}
                          >
                            <XCircle size={13} /> Reject
                          </button>
                        )}
                      </>
                    )}

                    {activeTab === 'active' && (
                      <button
                        className="ap-btn ap-btn-reject"
                        onClick={() => setNoteOpen(p.id)}
                        disabled={loading === p.id}
                      >
                        <XCircle size={13} /> Deactivate
                      </button>
                    )}

                    {activeTab === 'rejected' && (
                      <button
                        className="ap-btn ap-btn-approve"
                        disabled={loading === p.id}
                        onClick={() => handle(p.id, 'approve')}
                      >
                        <CheckCircle size={13} /> Re-approve
                      </button>
                    )}

                    {/* Reject note box for active tab */}
                    {activeTab !== 'pending_approval' && noteOpen === p.id && (
                      <div className="ap-note-box">
                        <textarea
                          className="ap-note-textarea"
                          placeholder="Reason (optional)..."
                          value={note}
                          onChange={(e) => setNote(e.target.value)}
                        />
                        <div className="ap-note-actions">
                          <button className="ap-note-cancel" onClick={() => { setNoteOpen(null); setNote(''); }}>
                            Cancel
                          </button>
                          <button
                            className="ap-note-confirm"
                            disabled={loading === p.id}
                            onClick={() => handle(p.id, 'reject', note)}
                          >
                            Confirm
                          </button>
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            ))
          )}
        </div>
      </div>
    </>
  );
}
