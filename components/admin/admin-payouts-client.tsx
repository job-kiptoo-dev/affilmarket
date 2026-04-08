'use client';

import { useState }             from 'react';
import { useRouter }            from 'next/navigation';
import { formatKES }            from '@/lib/utils';
import {
  approvePayoutRequest,
  rejectPayoutRequest,
  processPayoutViaMpesa,
  markPayoutPaid,
} from '@/action/adminPayoutAction';
import {
  CheckCircle, XCircle, Phone, Building2,
  AlertCircle, Loader2, ChevronDown, ChevronUp,
} from 'lucide-react';
import { STATUS_STYLE, TABS } from '@/types/payout-client';

interface Payout {
  id:          string;
  userId:      string;
  role:        string;
  amount:      number;
  method:      string;
  status:      string;
  adminNote:   string | null;
  createdAt:   string;
  userName:    string | null;
  userEmail:   string | null;
  payoutPhone: string | null;
  shopName:    string | null;
  bankName:    string | null;
  bankAccount: string | null;
}

interface Props {
  payouts:      Payout[];
  activeStatus: string;
  counts:       Record<string, number>;
}


export function AdminPayoutsClient({ payouts, activeStatus, counts }: Props) {
  const router  = useRouter();
  const [loading,   setLoading]   = useState<string | null>(null);
  const [expanded,  setExpanded]  = useState<string | null>(null);
  const [noteOpen,  setNoteOpen]  = useState<string | null>(null);
  const [note,      setNote]      = useState('');
  const [markOpen,  setMarkOpen]  = useState<string | null>(null);
  const [markNote,  setMarkNote]  = useState('');

  const handle = async (fn: () => Promise<any>, id: string) => {
    setLoading(id);
    await fn();
    setLoading(null);
    setNoteOpen(null);
    setMarkOpen(null);
    setNote('');
    setMarkNote('');
    router.refresh();
  };

  return (
    <>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=DM+Sans:wght@400;500;600;700;800&display=swap');
        .ap { font-family: 'DM Sans', sans-serif; }
        .ap-header { margin-bottom: 24px; }
        .ap-title  { font-size: 24px; font-weight: 800; color: #111; letter-spacing: -0.04em; }
        .ap-sub    { font-size: 14px; color: #6b7280; margin-top: 4px; }

        .ap-tabs { display: flex; gap: 4px; border-bottom: 1px solid #e5e7eb; margin-bottom: 24px; overflow-x: auto; }
        .ap-tab { padding: 10px 16px; font-size: 13px; font-weight: 600; border: none; background: none; cursor: pointer; border-bottom: 2px solid transparent; color: #6b7280; white-space: nowrap; font-family: 'DM Sans', sans-serif; transition: all 0.15s; display: flex; align-items: center; gap: 6px; }
        .ap-tab.active { color: #111; border-bottom-color: #111; }
        .ap-tab-count { display: inline-flex; align-items: center; justify-content: center; min-width: 18px; height: 18px; border-radius: 100px; font-size: 10px; font-weight: 800; padding: 0 5px; background: #f3f4f6; color: #6b7280; }
        .ap-tab.active .ap-tab-count { background: #111; color: #fff; }

        .ap-list { display: flex; flex-direction: column; gap: 10px; }

        .ap-card { background: #fff; border: 1px solid #e5e7eb; border-radius: 14px; overflow: hidden; transition: box-shadow 0.2s; }
        .ap-card:hover { box-shadow: 0 4px 16px rgba(0,0,0,0.06); }

        .ap-card-main { display: flex; align-items: center; gap: 16px; padding: 16px 20px; cursor: pointer; }

        .ap-avatar { width: 40px; height: 40px; border-radius: 10px; display: flex; align-items: center; justify-content: center; font-size: 16px; flex-shrink: 0; }

        .ap-info { flex: 1; min-width: 0; }
        .ap-name  { font-size: 14px; font-weight: 700; color: #111; margin-bottom: 2px; }
        .ap-email { font-size: 12px; color: #9ca3af; }
        .ap-meta  { display: flex; gap: 8px; margin-top: 5px; flex-wrap: wrap; }
        .ap-pill  { font-size: 11px; font-weight: 700; border-radius: 100px; padding: 2px 9px; }

        .ap-right { text-align: right; flex-shrink: 0; }
        .ap-amount { font-size: 18px; font-weight: 800; color: #111; letter-spacing: -0.03em; }
        .ap-date   { font-size: 11px; color: #9ca3af; margin-top: 2px; }

        .ap-detail { padding: 0 20px 20px; border-top: 1px solid #f3f4f6; }
        .ap-detail-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 16px; padding-top: 16px; }
        .ap-detail-label { font-size: 10.5px; font-weight: 700; text-transform: uppercase; letter-spacing: 0.08em; color: #9ca3af; margin-bottom: 6px; }
        .ap-detail-value { font-size: 13.5px; color: #111; font-weight: 600; }

        .ap-actions { display: flex; gap: 8px; padding-top: 16px; flex-wrap: wrap; }
        .ap-btn { display: inline-flex; align-items: center; gap: 6px; padding: 8px 16px; border-radius: 9px; font-size: 13px; font-weight: 700; cursor: pointer; border: none; transition: all 0.15s; font-family: 'DM Sans', sans-serif; }
        .ap-btn:disabled { opacity: 0.5; cursor: not-allowed; }
        .ap-btn-approve  { background: #16a34a; color: #fff; }
        .ap-btn-approve:hover:not(:disabled)  { background: #15803d; }
        .ap-btn-mpesa    { background: #111; color: #fff; }
        .ap-btn-mpesa:hover:not(:disabled)    { background: #16a34a; }
        .ap-btn-manual   { background: #eff6ff; color: #2563eb; border: 1px solid #bfdbfe; }
        .ap-btn-reject   { background: #fef2f2; color: #dc2626; border: 1px solid #fecaca; }
        .ap-btn-reject:hover:not(:disabled)   { background: #fee2e2; }

        .ap-note-box { background: #fef2f2; border: 1px solid #fecaca; border-radius: 10px; padding: 12px; margin-top: 4px; width: 100%; }
        .ap-note-textarea { width: 100%; border: 1px solid #fca5a5; border-radius: 7px; padding: 8px 10px; font-size: 12.5px; font-family: 'DM Sans', sans-serif; resize: none; outline: none; min-height: 60px; margin-bottom: 8px; box-sizing: border-box; }
        .ap-note-actions { display: flex; gap: 6px; }
        .ap-note-confirm { flex: 1; padding: 7px; background: #dc2626; color: #fff; border: none; border-radius: 7px; font-size: 12px; font-weight: 700; cursor: pointer; font-family: 'DM Sans', sans-serif; }
        .ap-note-cancel  { padding: 7px 12px; background: #fff; color: #6b7280; border: 1px solid #e5e7eb; border-radius: 7px; font-size: 12px; cursor: pointer; font-family: 'DM Sans', sans-serif; }

        .ap-mark-box { background: #f0fdf4; border: 1px solid #bbf7d0; border-radius: 10px; padding: 12px; margin-top: 4px; width: 100%; }
        .ap-mark-textarea { width: 100%; border: 1px solid #86efac; border-radius: 7px; padding: 8px 10px; font-size: 12.5px; font-family: 'DM Sans', sans-serif; resize: none; outline: none; min-height: 50px; margin-bottom: 8px; box-sizing: border-box; }
        .ap-mark-confirm { flex: 1; padding: 7px; background: #16a34a; color: #fff; border: none; border-radius: 7px; font-size: 12px; font-weight: 700; cursor: pointer; font-family: 'DM Sans', sans-serif; }

        .ap-admin-note { background: #fef9c3; border: 1px solid #fde047; border-radius: 8px; padding: 8px 12px; font-size: 12px; color: #854d0e; margin-top: 8px; display: flex; gap: 6px; }

        .ap-empty { text-align: center; padding: 72px 20px; background: #f9fafb; border-radius: 16px; border: 1px solid #e5e7eb; }
        .ap-empty-icon  { font-size: 48px; margin-bottom: 16px; }
        .ap-empty-title { font-size: 18px; font-weight: 700; color: #374151; margin-bottom: 6px; }
        .ap-empty-desc  { font-size: 14px; color: #9ca3af; }
      `}</style>

      <div className="ap">
        <div className="ap-header">
          <h1 className="ap-title">Payout Requests</h1>
          <p className="ap-sub">Review and process vendor and affiliate payout requests.</p>
        </div>

        {/* Tabs */}
        <div className="ap-tabs">
          {TABS.map(tab => (
            <button
              key={tab.key}
              className={`ap-tab${activeStatus === tab.key ? ' active' : ''}`}
              onClick={() => router.push(
                tab.key === 'ALL'
                  ? '/admin/payouts'
                  : `/admin/payouts?status=${tab.key}`
              )}
            >
              {tab.label}
              {counts[tab.key] > 0 && (
                <span className="ap-tab-count">{counts[tab.key]}</span>
              )}
            </button>
          ))}
        </div>

        {/* List */}
        <div className="ap-list">
          {payouts.length === 0 ? (
            <div className="ap-empty">
              <div className="ap-empty-icon">
                {activeStatus === 'REQUESTED' ? '🎉' : '📋'}
              </div>
              <div className="ap-empty-title">
                {activeStatus === 'REQUESTED' ? 'No pending requests' : `No ${activeStatus.toLowerCase()} payouts`}
              </div>
              <div className="ap-empty-desc">
                {activeStatus === 'REQUESTED' ? 'All caught up!' : 'Nothing here yet.'}
              </div>
            </div>
          ) : (
            payouts.map(p => {
              const isExpanded = expanded === p.id;
              const statusStyle = STATUS_STYLE[p.status] ?? STATUS_STYLE.REQUESTED;

              return (
                <div key={p.id} className="ap-card">
                  {/* Card header */}
                  <div
                    className="ap-card-main"
                    onClick={() => setExpanded(isExpanded ? null : p.id)}
                  >
                    <div className="ap-avatar" style={{
                      background: p.role === 'VENDOR' ? '#f0fdf4' : '#eff6ff',
                      border: `1px solid ${p.role === 'VENDOR' ? '#bbf7d0' : '#bfdbfe'}`,
                    }}>
                      {p.role === 'VENDOR' ? '🏪' : '🔗'}
                    </div>

                    <div className="ap-info">
                      <div className="ap-name">{p.userName ?? 'Unknown'}</div>
                      <div className="ap-email">{p.userEmail}</div>
                      <div className="ap-meta">
                        <span className="ap-pill" style={statusStyle}>
                          {p.status}
                        </span>
                        <span className="ap-pill" style={{ background: '#f3f4f6', color: '#374151' }}>
                          {p.role}
                        </span>
                        <span className="ap-pill" style={{ background: '#f3f4f6', color: '#374151' }}>
                          {p.method === 'MPESA' ? '📱 M-Pesa' : '🏦 Bank'}
                        </span>
                      </div>
                    </div>

                    <div className="ap-right">
                      <div className="ap-amount">{formatKES(p.amount)}</div>
                      <div className="ap-date">
                        {new Date(p.createdAt).toLocaleDateString('en-KE', {
                          day: 'numeric', month: 'short', year: 'numeric',
                        })}
                      </div>
                    </div>

                    <div style={{ color: '#9ca3af', flexShrink: 0 }}>
                      {isExpanded ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
                    </div>
                  </div>

                  {/* Expanded detail */}
                  {isExpanded && (
                    <div className="ap-detail">
                      <div className="ap-detail-grid">
                        <div>
                          <div className="ap-detail-label">Recipient</div>
                          <div className="ap-detail-value">{p.userName}</div>
                          {p.shopName && (
                            <div style={{ fontSize: 12, color: '#9ca3af', marginTop: 2 }}>{p.shopName}</div>
                          )}
                        </div>
                        <div>
                          <div className="ap-detail-label">Send to</div>
                          {p.method === 'MPESA' ? (
                            <div className="ap-detail-value" style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                              <Phone size={13} color="#16a34a" />
                              {p.payoutPhone ?? '—'}
                            </div>
                          ) : (
                            <div>
                              <div className="ap-detail-value" style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                                <Building2 size={13} color="#2563eb" />
                                {p.bankName ?? '—'}
                              </div>
                              <div style={{ fontSize: 12, color: '#6b7280', marginTop: 2 }}>
                                {p.bankAccount ?? '—'}
                              </div>
                            </div>
                          )}
                        </div>
                      </div>

                      {p.adminNote && (
                        <div className="ap-admin-note">
                          <AlertCircle size={13} style={{ flexShrink: 0, marginTop: 1 }} />
                          <span><strong>Note:</strong> {p.adminNote}</span>
                        </div>
                      )}

                      {/* Actions */}
                      <div className="ap-actions">
                        {p.status === 'REQUESTED' && (
                          <>
                            <button
                              className="ap-btn ap-btn-approve"
                              disabled={loading === p.id}
                              onClick={() => handle(() => approvePayoutRequest(p.id), p.id)}
                            >
                              <CheckCircle size={13} />
                              {loading === p.id ? 'Approving...' : 'Approve'}
                            </button>
                            <button
                              className="ap-btn ap-btn-reject"
                              onClick={() => setNoteOpen(p.id)}
                            >
                              <XCircle size={13} /> Reject
                            </button>
                          </>
                        )}

                        {p.status === 'APPROVED' && p.method === 'MPESA' && p.payoutPhone && (
                          <>
                            <button
                              className="ap-btn ap-btn-mpesa"
                              disabled={loading === p.id}
                              onClick={() => handle(
                                () => processPayoutViaMpesa(p.id, p.payoutPhone!, p.amount),
                                p.id
                              )}
                            >
                              {loading === p.id
                                ? <><Loader2 size={13} style={{ animation: 'spin 1s linear infinite' }} /> Sending...</>
                                : <>📱 Send via M-Pesa</>}
                            </button>
                            <button
                              className="ap-btn ap-btn-manual"
                              onClick={() => setMarkOpen(p.id)}
                            >
                              ✓ Mark as Paid manually
                            </button>
                          </>
                        )}

                        {p.status === 'APPROVED' && p.method === 'BANK' && (
                          <button
                            className="ap-btn ap-btn-manual"
                            onClick={() => setMarkOpen(p.id)}
                          >
                            ✓ Mark as Paid
                          </button>
                        )}
                      </div>

                      {/* Reject note box */}
                      {noteOpen === p.id && (
                        <div className="ap-note-box">
                          <textarea
                            className="ap-note-textarea"
                            placeholder="Reason for rejection..."
                            value={note}
                            onChange={e => setNote(e.target.value)}
                          />
                          <div className="ap-note-actions">
                            <button className="ap-note-cancel" onClick={() => { setNoteOpen(null); setNote(''); }}>
                              Cancel
                            </button>
                            <button
                              className="ap-note-confirm"
                              disabled={loading === p.id}
                              onClick={() => handle(() => rejectPayoutRequest(p.id, note), p.id)}
                            >
                              {loading === p.id ? 'Rejecting...' : 'Confirm Reject'}
                            </button>
                          </div>
                        </div>
                      )}

                      {/* Mark paid box */}
                      {markOpen === p.id && (
                        <div className="ap-mark-box">
                          <textarea
                            className="ap-mark-textarea"
                            placeholder="Reference / note (e.g. bank ref, receipt)..."
                            value={markNote}
                            onChange={e => setMarkNote(e.target.value)}
                          />
                          <div className="ap-note-actions">
                            <button className="ap-note-cancel" onClick={() => { setMarkOpen(null); setMarkNote(''); }}>
                              Cancel
                            </button>
                            <button
                              className="ap-mark-confirm"
                              disabled={loading === p.id}
                              onClick={() => handle(() => markPayoutPaid(p.id, markNote), p.id)}
                            >
                              {loading === p.id ? 'Saving...' : '✓ Confirm Paid'}
                            </button>
                          </div>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              );
            })
          )}
        </div>
      </div>

      <style>{`@keyframes spin { from{transform:rotate(0deg)} to{transform:rotate(360deg)} }`}</style>
    </>
  );
}
// ```
//
// ---
//
// **Commit message:**
// ```
// feat(admin): add payout management page
//
// - Add /admin/payouts page with REQUESTED/APPROVED/PAID/REJECTED tabs
// - Approve payout request with one click
// - Reject with required reason note — restores balance to user
// - Send M-Pesa payout directly via STK push for MPESA method
// - Mark as paid manually for bank transfers with reference note
// - Shows recipient name, role, payout destination (phone or bank)
// - Updates paidOutTotal on balances after successful payout
// - Tab counts show live totals per status
