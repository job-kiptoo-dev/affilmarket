'use client';

import { useState, useTransition } from 'react';
import { formatKES }               from '@/lib/utils';
import {
  Wallet, Clock, CheckCircle, XCircle,
  ArrowUpRight, AlertCircle, Smartphone, Building2,
} from 'lucide-react';


import { PayoutMethod, PayoutStatus, PayoutsPageData, requestPayoutAction } from '@/action/payoutRequest';

// ─── Status config ─────────────────────────────────────────────────────────────
const STATUS_CONFIG: Record<PayoutStatus, { label: string; bg: string; color: string; dot: string }> = {
  REQUESTED: { label: 'Requested', bg: '#eff6ff', color: '#2563eb', dot: '#2563eb' },
  APPROVED:  { label: 'Approved',  bg: '#f0fdf4', color: '#16a34a', dot: '#16a34a' },
  PAID:      { label: 'Paid',      bg: '#f0fdf4', color: '#15803d', dot: '#15803d' },
  REJECTED:  { label: 'Rejected',  bg: '#fef2f2', color: '#dc2626', dot: '#dc2626' },
};

// ─── Component ─────────────────────────────────────────────────────────────────
export function PayoutsClient({ data }: { data: PayoutsPageData }) {
  const [method, setMethod]           = useState<PayoutMethod>(data.preferredMethod);
  const [amount, setAmount]           = useState('');
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [submitSuccess, setSubmitSuccess] = useState(false);
  const [isPending, startTransition]  = useTransition();

  const canRequest = data.availableBalance >= 100 && !data.hasPendingRequest;

  const handleSubmit = () => {
    setSubmitError(null);
    const parsed = parseFloat(amount);
    if (!amount || isNaN(parsed) || parsed < 100) {
      setSubmitError('Minimum withdrawal is KES 100.');
      return;
    }
    if (parsed > data.availableBalance) {
      setSubmitError('Amount exceeds your available balance.');
      return;
    }

    startTransition(async () => {
      const result = await requestPayoutAction(parsed, method);
      if (result.success) {
        setSubmitSuccess(true);
        setAmount('');
        setTimeout(() => setSubmitSuccess(false), 5000);
      } else {
        setSubmitError(result.error ?? 'Something went wrong.');
      }
    });
  };

  return (
    <>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=DM+Sans:wght@400;500;600;700;800;900&display=swap');
        .po { font-family: 'DM Sans', -apple-system, sans-serif; max-width: 860px; }
        @keyframes spin { to { transform: rotate(360deg) } }
        .po-spinner { width: 16px; height: 16px; border: 2px solid rgba(255,255,255,0.35); border-top-color: #fff; border-radius: 50%; animation: spin 0.7s linear infinite; }

        /* header */
        .po-h1  { font-size: 26px; font-weight: 800; color: #111; letter-spacing: -0.04em; margin-bottom: 4px; }
        .po-sub { font-size: 14px; color: #6b7280; margin-bottom: 28px; }

        /* balance grid */
        .po-grid { display: grid; grid-template-columns: repeat(3,1fr); gap: 14px; margin-bottom: 24px; }
        .po-bal  { background: #fff; border: 1px solid #e5e7eb; border-radius: 14px; padding: 20px 22px; }
        .po-bal.green { background: #f0fdf4; border-color: #86efac; }
        .po-bal-icon { width: 38px; height: 38px; border-radius: 10px; display: flex; align-items: center; justify-content: center; margin-bottom: 12px; }
        .po-bal-lbl  { font-size: 11px; font-weight: 700; text-transform: uppercase; letter-spacing: 0.08em; color: #9ca3af; margin-bottom: 4px; }
        .po-bal-val  { font-size: 24px; font-weight: 800; color: #111; letter-spacing: -0.04em; }
        .po-bal-val.green { color: #16a34a; }
        .po-bal-hint { font-size: 12px; color: #9ca3af; margin-top: 4px; }

        /* cards */
        .po-card { background: #fff; border: 1px solid #e5e7eb; border-radius: 14px; padding: 24px 26px; margin-bottom: 20px; }
        .po-card-title { font-size: 16px; font-weight: 700; color: #111; letter-spacing: -0.02em; margin-bottom: 4px; }
        .po-card-sub   { font-size: 13px; color: #9ca3af; margin-bottom: 22px; }

        /* method toggle */
        .po-method-row { display: flex; gap: 12px; margin-bottom: 20px; }
        .po-method-btn { flex: 1; display: flex; align-items: center; gap: 10px; padding: 14px 16px; border-radius: 10px; border: 2px solid #e5e7eb; background: #fff; cursor: pointer; transition: border-color 0.15s, background 0.15s; font-family: 'DM Sans', sans-serif; text-align: left; }
        .po-method-btn.active { border-color: #16a34a; background: #f0fdf4; }
        .po-method-btn:hover:not(.active):not(:disabled) { border-color: #d1d5db; }
        .po-method-btn:disabled { opacity: 0.5; cursor: not-allowed; }
        .po-method-label { font-size: 14px; font-weight: 700; color: #111; }
        .po-method-hint  { font-size: 12px; color: #6b7280; margin-top: 1px; }
        .po-radio { width: 16px; height: 16px; border-radius: 50%; border: 2px solid #d1d5db; margin-left: auto; flex-shrink: 0; position: relative; transition: border-color 0.15s; }
        .po-radio.on { border-color: #16a34a; }
        .po-radio.on::after { content: ''; position: absolute; top: 50%; left: 50%; transform: translate(-50%,-50%); width: 7px; height: 7px; border-radius: 50%; background: #16a34a; }

        /* destination detail box */
        .po-dest { background: #f9fafb; border: 1px solid #f3f4f6; border-radius: 10px; padding: 13px 16px; margin-bottom: 20px; display: flex; flex-direction: column; gap: 5px; }
        .po-dest-row { display: flex; align-items: center; gap: 8px; font-size: 13px; color: #374151; }

        /* amount input */
        .po-label { font-size: 13px; font-weight: 600; color: #374151; margin-bottom: 7px; display: block; }
        .po-input-wrap { position: relative; margin-bottom: 14px; }
        .po-prefix { position: absolute; left: 14px; top: 50%; transform: translateY(-50%); font-size: 13px; font-weight: 700; color: #9ca3af; pointer-events: none; }
        .po-input  { width: 100%; border: 1px solid #d1d5db; border-radius: 9px; padding: 12px 14px 12px 56px; font-size: 16px; font-weight: 700; color: #111; font-family: 'DM Sans', sans-serif; outline: none; transition: border-color 0.15s, box-shadow 0.15s; box-sizing: border-box; }
        .po-input:focus { border-color: #16a34a; box-shadow: 0 0 0 3px rgba(22,163,74,0.12); }
        .po-input:disabled { background: #f9fafb; cursor: not-allowed; }

        /* quick amounts */
        .po-quick { display: flex; gap: 8px; margin-bottom: 20px; flex-wrap: wrap; }
        .po-quick-btn { background: #f3f4f6; border: 1px solid #e5e7eb; border-radius: 7px; padding: 6px 14px; font-size: 13px; font-weight: 600; color: #374151; cursor: pointer; transition: background 0.15s; font-family: 'DM Sans', sans-serif; }
        .po-quick-btn:hover { background: #e5e7eb; }

        /* feedback boxes */
        .po-error   { background: #fef2f2; border: 1px solid #fecaca; border-radius: 9px; padding: 12px 14px; font-size: 13px; color: #dc2626; font-weight: 600; display: flex; align-items: center; gap: 8px; margin-bottom: 16px; }
        .po-success { background: #f0fdf4; border: 1px solid #86efac; border-radius: 9px; padding: 12px 14px; font-size: 13px; color: #15803d; font-weight: 600; display: flex; align-items: center; gap: 8px; margin-bottom: 16px; }
        .po-info    { background: #fffbeb; border: 1px solid #fde68a; border-radius: 9px; padding: 12px 14px; font-size: 13px; color: #b45309; font-weight: 600; display: flex; align-items: flex-start; gap: 8px; margin-bottom: 16px; }

        /* submit button */
        .po-btn { width: 100%; background: #16a34a; color: #fff; border: none; border-radius: 10px; padding: 13px; font-size: 15px; font-weight: 700; cursor: pointer; font-family: 'DM Sans', sans-serif; transition: background 0.2s; display: flex; align-items: center; justify-content: center; gap: 8px; }
        .po-btn:hover:not(:disabled) { background: #15803d; }
        .po-btn:disabled { opacity: 0.5; cursor: not-allowed; }

        /* history table */
        .po-table { width: 100%; border-collapse: collapse; }
        .po-table th { text-align: left; font-size: 11px; font-weight: 700; text-transform: uppercase; letter-spacing: 0.08em; color: #9ca3af; padding: 0 12px 12px; border-bottom: 1px solid #f3f4f6; }
        .po-table th:first-child { padding-left: 0; }
        .po-table td { padding: 14px 12px; font-size: 13.5px; color: #374151; border-bottom: 1px solid #f9fafb; vertical-align: middle; }
        .po-table td:first-child { padding-left: 0; }
        .po-table tr:last-child td { border-bottom: none; }
        .po-pill { display: inline-flex; align-items: center; gap: 5px; border-radius: 100px; padding: 3px 10px; font-size: 11.5px; font-weight: 700; }
        .po-dot  { width: 5px; height: 5px; border-radius: 50%; flex-shrink: 0; }

        /* empty state */
        .po-empty { text-align: center; padding: 52px 20px; }
        .po-empty-icon  { width: 52px; height: 52px; border-radius: 14px; background: #f3f4f6; display: flex; align-items: center; justify-content: center; font-size: 24px; margin: 0 auto 14px; }
        .po-empty-title { font-size: 15px; font-weight: 700; color: #374151; margin-bottom: 6px; }
        .po-empty-desc  { font-size: 13.5px; color: #9ca3af; }

        @media (max-width: 640px) {
          .po-grid { grid-template-columns: 1fr; }
          .po-method-row { flex-direction: column; }
        }
      `}</style>

      <div className="po">
        <h1 className="po-h1">Withdraw Earnings</h1>
        <p className="po-sub">Request a payout to your M-Pesa or bank account</p>

        {/* ── Balance cards ─────────────────────────────────────────────────── */}
        <div className="po-grid">
          <div className={`po-bal${data.availableBalance > 0 ? ' green' : ''}`}>
            <div className="po-bal-icon" style={{ background: data.availableBalance > 0 ? '#dcfce7' : '#f3f4f6', border: `1px solid ${data.availableBalance > 0 ? '#86efac' : '#e5e7eb'}` }}>
              <Wallet size={18} style={{ color: data.availableBalance > 0 ? '#16a34a' : '#9ca3af' }} />
            </div>
            <div className="po-bal-lbl">Available</div>
            <div className={`po-bal-val${data.availableBalance > 0 ? ' green' : ''}`}>{formatKES(data.availableBalance)}</div>
            <div className="po-bal-hint">{data.availableBalance > 0 ? '✓ Ready to withdraw' : 'No funds yet'}</div>
          </div>

          <div className="po-bal">
            <div className="po-bal-icon" style={{ background: '#fffbeb', border: '1px solid #fde68a' }}>
              <Clock size={18} style={{ color: '#d97706' }} />
            </div>
            <div className="po-bal-lbl">Pending</div>
            <div className="po-bal-val">{formatKES(data.pendingBalance)}</div>
            <div className="po-bal-hint">⏳ Held until delivery</div>
          </div>

          <div className="po-bal">
            <div className="po-bal-icon" style={{ background: '#f5f3ff', border: '1px solid #ddd6fe' }}>
              <ArrowUpRight size={18} style={{ color: '#7c3aed' }} />
            </div>
            <div className="po-bal-lbl">Total Paid Out</div>
            <div className="po-bal-val">{formatKES(data.paidOutTotal)}</div>
            <div className="po-bal-hint">All-time withdrawals</div>
          </div>
        </div>

        {/* ── Withdrawal form ───────────────────────────────────────────────── */}
        <div className="po-card">
          <div className="po-card-title">Request Withdrawal</div>
          <div className="po-card-sub">Minimum KES 100 · Processed within 1–2 business days</div>

          {/* Notices */}
          {data.hasPendingRequest && (
            <div className="po-info">
              <Clock size={15} style={{ flexShrink: 0, marginTop: 1 }} />
              You already have a pending payout. Wait for it to be processed before submitting another.
            </div>
          )}
          {!data.hasPendingRequest && data.availableBalance < 100 && (
            <div className="po-info">
              <AlertCircle size={15} style={{ flexShrink: 0, marginTop: 1 }} />
              You need at least KES 100 available to withdraw. Keep promoting products to earn more!
            </div>
          )}

          {/* Feedback */}
          {submitSuccess && (
            <div className="po-success">
              <CheckCircle size={15} />
              Payout requested! We'll process it within 1–2 business days.
            </div>
          )}
          {submitError && (
            <div className="po-error">
              <XCircle size={15} />
              {submitError}
            </div>
          )}

          {/* Method selector */}
          <label className="po-label">Payout Method</label>
          <div className="po-method-row">
            {(['MPESA', 'BANK'] as PayoutMethod[]).map((m) => {
              const isMpesa = m === 'MPESA';
              const hint    = isMpesa
                ? (data.mpesaPhone        ?? 'No number on file')
                : (data.bankName          ?? 'No account on file');
              return (
                <button
                  key={m}
                  className={`po-method-btn${method === m ? ' active' : ''}`}
                  onClick={() => setMethod(m)}
                  disabled={!canRequest}
                >
                  <div style={{ width: 34, height: 34, borderRadius: 8, background: isMpesa ? '#dcfce7' : '#eff6ff', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                    {isMpesa
                      ? <Smartphone size={16} style={{ color: '#16a34a' }} />
                      : <Building2  size={16} style={{ color: '#2563eb' }} />}
                  </div>
                  <div>
                    <div className="po-method-label">{isMpesa ? 'M-Pesa' : 'Bank Transfer'}</div>
                    <div className="po-method-hint">{hint}</div>
                  </div>
                  <div className={`po-radio${method === m ? ' on' : ''}`} />
                </button>
              );
            })}
          </div>

          {/* Destination detail */}
          {method === 'MPESA' && data.mpesaPhone && (
            <div className="po-dest">
              <div className="po-dest-row">
                <Smartphone size={14} style={{ color: '#16a34a' }} />
                <span>Sending to M-Pesa:</span>
                <strong style={{ color: '#16a34a' }}>{data.mpesaPhone}</strong>
              </div>
            </div>
          )}
          {method === 'BANK' && data.bankName && (
            <div className="po-dest">
              <div className="po-dest-row">
                <Building2 size={14} style={{ color: '#2563eb' }} />
                <strong>{data.bankName}</strong>
              </div>
              {data.bankAccountName && (
                <div className="po-dest-row" style={{ paddingLeft: 22 }}>
                  <span style={{ color: '#6b7280' }}>Account name:</span>
                  <strong>{data.bankAccountName}</strong>
                </div>
              )}
              {data.bankAccountNumber && (
                <div className="po-dest-row" style={{ paddingLeft: 22 }}>
                  <span style={{ color: '#6b7280' }}>Account no:</span>
                  <strong>{data.bankAccountNumber}</strong>
                </div>
              )}
            </div>
          )}

          {/* Amount */}
          <label className="po-label">Amount to Withdraw</label>
          <div className="po-input-wrap">
            <span className="po-prefix">KES</span>
            <input
              className="po-input"
              type="number"
              min={100}
              max={data.availableBalance}
              placeholder="0.00"
              value={amount}
              onChange={(e) => { setAmount(e.target.value); setSubmitError(null); }}
              disabled={!canRequest}
            />
          </div>

          {/* Quick amount shortcuts */}
          {canRequest && (
            <div className="po-quick">
              {[500, 1000, 2000, 5000]
                .filter((v) => v <= data.availableBalance)
                .map((v) => (
                  <button key={v} className="po-quick-btn" onClick={() => setAmount(String(v))}>
                    KES {v.toLocaleString()}
                  </button>
                ))}
              <button
                className="po-quick-btn"
                onClick={() => setAmount(String(Math.floor(data.availableBalance)))}
              >
                Max ({formatKES(data.availableBalance)})
              </button>
            </div>
          )}

          <button
            className="po-btn"
            onClick={handleSubmit}
            disabled={!canRequest || isPending || !amount}
          >
            {isPending ? (
              <><div className="po-spinner" /> Processing…</>
            ) : (
              <>💳 Request Payout{amount && !isNaN(parseFloat(amount)) ? ` · ${formatKES(parseFloat(amount))}` : ''}</>
            )}
          </button>
        </div>

        {/* ── Payout history ────────────────────────────────────────────────── */}
        <div className="po-card" style={{ marginBottom: 0 }}>
          <div style={{ marginBottom: 20 }}>
            <div className="po-card-title">Payout History</div>
            <div style={{ fontSize: 13, color: '#9ca3af', marginTop: 2 }}>All your withdrawal requests</div>
          </div>

          {data.payoutHistory.length === 0 ? (
            <div className="po-empty">
              <div className="po-empty-icon">📭</div>
              <div className="po-empty-title">No payouts yet</div>
              <div className="po-empty-desc">Your withdrawal history will appear here once you make your first request.</div>
            </div>
          ) : (
            <div style={{ overflowX: 'auto' }}>
              <table className="po-table">
                <thead>
                  <tr>
                    <th>Date</th>
                    <th>Amount</th>
                    <th>Method</th>
                    <th>Status</th>
                    <th>Admin Note</th>
                  </tr>
                </thead>
                <tbody>
                  {data.payoutHistory.map((p) => {
                    const s = STATUS_CONFIG[p.status];
                    return (
                      <tr key={p.id}>
                        <td style={{ fontSize: 12, color: '#9ca3af', whiteSpace: 'nowrap' }}>
                          {new Date(p.createdAt).toLocaleDateString('en-KE', {
                            day: 'numeric', month: 'short', year: 'numeric',
                          })}
                        </td>
                        <td style={{ fontWeight: 800, color: '#111', fontSize: 14, letterSpacing: '-0.03em' }}>
                          {formatKES(parseFloat(p.amount))}
                        </td>
                        <td>
                          <span style={{ display: 'inline-flex', alignItems: 'center', gap: 5, fontSize: 13, fontWeight: 600 }}>
                            {p.method === 'MPESA'
                              ? <><Smartphone size={13} style={{ color: '#16a34a' }} /> M-Pesa</>
                              : <><Building2  size={13} style={{ color: '#2563eb' }} /> Bank</>}
                          </span>
                        </td>
                        <td>
                          <span className="po-pill" style={{ background: s.bg, color: s.color }}>
                            <span className="po-dot" style={{ background: s.dot }} />
                            {s.label}
                          </span>
                        </td>
                        <td style={{ fontSize: 12, color: '#6b7280' }}>
                          {p.adminNote ?? <span style={{ color: '#d1d5db' }}>—</span>}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>
    </>
  );
}
