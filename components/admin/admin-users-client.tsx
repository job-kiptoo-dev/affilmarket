'use client';

import { useState }        from 'react';
import { useRouter }       from 'next/navigation';
import { formatKES }       from '@/lib/utils';
import {
  suspendUser, activateUser, verifyUser,
} from '@/action/adminUserAction';
import {
  ChevronDown, ChevronUp, ShieldAlert,
  ShieldCheck, CheckCircle, Search,
  Store, Link2, UserCog,
} from 'lucide-react';

interface User {
  id:            string;
  name:          string;
  email:         string;
  phone:         string | null;
  role:          string;
  status:        string;
  emailVerified: boolean;
  createdAt:     string;
  shopName:      string | null;
  affiliateToken: string | null;
  idNumber:      string | null;
  kraPin:        string | null;
  orderCount:    number;
  balance:       number;
}

interface Props {
  users:        User[];
  activeRole:   string;
  activeStatus: string;
  counts:       Record<string, number>;
}

const ROLE_TABS = [
  { key: 'ALL',       label: 'All Users',  icon: '👥' },
  { key: 'VENDOR',    label: 'Vendors',    icon: '🏪' },
  { key: 'AFFILIATE', label: 'Affiliates', icon: '🔗' },
  { key: 'BOTH',      label: 'Both',       icon: '⚡' },
  { key: 'ADMIN',     label: 'Admins',     icon: '🛡️' },
];

const STATUS_STYLE: Record<string, { bg: string; color: string }> = {
  active:               { bg: '#f0fdf4', color: '#16a34a' },
  suspended:            { bg: '#fef2f2', color: '#dc2626' },
  pending_verification: { bg: '#fffbeb', color: '#d97706' },
};

const ROLE_STYLE: Record<string, { bg: string; color: string }> = {
  VENDOR:    { bg: '#f0fdf4', color: '#16a34a' },
  AFFILIATE: { bg: '#eff6ff', color: '#2563eb' },
  BOTH:      { bg: '#f5f3ff', color: '#7c3aed' },
  ADMIN:     { bg: '#fef2f2', color: '#dc2626' },
};

export function AdminUsersClient({ users, activeRole, activeStatus, counts }: Props) {
  const router   = useRouter();
  const [search,   setSearch]   = useState('');
  const [expanded, setExpanded] = useState<string | null>(null);
  const [loading,  setLoading]  = useState<string | null>(null);

  const handle = async (fn: () => Promise<any>, id: string) => {
    setLoading(id);
    await fn();
    setLoading(null);
    router.refresh();
  };

  const filtered = users.filter(u => {
    if (!search) return true;
    const q = search.toLowerCase();
    return (
      u.name.toLowerCase().includes(q)  ||
      u.email.toLowerCase().includes(q) ||
      u.phone?.toLowerCase().includes(q) ||
      u.shopName?.toLowerCase().includes(q) ||
      u.affiliateToken?.toLowerCase().includes(q)
    );
  });

  return (
    <>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=DM+Sans:wght@400;500;600;700;800&display=swap');
        .au { font-family: 'DM Sans', sans-serif; }
        .au-header { margin-bottom: 24px; }
        .au-title  { font-size: 24px; font-weight: 800; color: #111; letter-spacing: -0.04em; }
        .au-sub    { font-size: 14px; color: #6b7280; margin-top: 4px; }

        .au-controls { display: flex; gap: 12px; align-items: center; margin-bottom: 20px; flex-wrap: wrap; }
        .au-search-wrap { position: relative; flex: 1; min-width: 240px; }
        .au-search-icon { position: absolute; left: 14px; top: 50%; transform: translateY(-50%); color: #9ca3af; pointer-events: none; }
        .au-search { width: 100%; padding: 10px 14px 10px 40px; border: 1.5px solid #e5e7eb; border-radius: 10px; font-size: 14px; font-family: 'DM Sans', sans-serif; outline: none; transition: border-color 0.15s; box-sizing: border-box; }
        .au-search:focus { border-color: #16a34a; }

        .au-select { padding: 10px 32px 10px 14px; border: 1.5px solid #e5e7eb; border-radius: 10px; font-size: 13px; font-weight: 600; font-family: 'DM Sans', sans-serif; color: #374151; background: #fff; appearance: none; outline: none; cursor: pointer; background-image: url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='12' height='12' viewBox='0 0 24 24' fill='none' stroke='%239ca3af' stroke-width='2'%3E%3Cpath d='M6 9l6 6 6-6'/%3E%3C/svg%3E"); background-repeat: no-repeat; background-position: right 10px center; }

        .au-tabs { display: flex; gap: 4px; border-bottom: 1px solid #e5e7eb; margin-bottom: 20px; overflow-x: auto; }
        .au-tab { padding: 9px 14px; font-size: 13px; font-weight: 600; border: none; background: none; cursor: pointer; border-bottom: 2px solid transparent; color: #6b7280; white-space: nowrap; font-family: 'DM Sans', sans-serif; transition: all 0.15s; display: flex; align-items: center; gap: 6px; }
        .au-tab.active { color: #111; border-bottom-color: #111; }
        .au-tab-count { display: inline-flex; align-items: center; justify-content: center; min-width: 18px; height: 18px; border-radius: 100px; font-size: 10px; font-weight: 800; padding: 0 5px; background: #f3f4f6; color: #6b7280; }
        .au-tab.active .au-tab-count { background: #111; color: #fff; }

        .au-count { font-size: 13px; color: #9ca3af; font-weight: 600; }

        .au-list { display: flex; flex-direction: column; gap: 10px; }

        .au-card { background: #fff; border: 1px solid #e5e7eb; border-radius: 14px; overflow: hidden; transition: box-shadow 0.2s; }
        .au-card:hover { box-shadow: 0 4px 16px rgba(0,0,0,0.06); }
        .au-card.suspended { border-color: #fecaca; background: #fffafa; }

        .au-card-main { display: flex; align-items: center; gap: 14px; padding: 14px 20px; cursor: pointer; }

        .au-avatar { width: 40px; height: 40px; border-radius: 10px; display: flex; align-items: center; justify-content: center; font-size: 16px; font-weight: 800; color: #fff; flex-shrink: 0; }

        .au-info { flex: 1; min-width: 0; }
        .au-name  { font-size: 14px; font-weight: 700; color: #111; margin-bottom: 2px; display: flex; align-items: center; gap: 6px; }
        .au-email { font-size: 12px; color: #9ca3af; }
        .au-meta  { display: flex; gap: 6px; margin-top: 5px; flex-wrap: wrap; align-items: center; }
        .au-pill  { font-size: 11px; font-weight: 700; border-radius: 100px; padding: 2px 8px; }

        .au-right { text-align: right; flex-shrink: 0; }
        .au-joined { font-size: 11px; color: #9ca3af; }
        .au-balance { font-size: 13px; font-weight: 700; color: #16a34a; margin-top: 2px; }

        /* Expanded */
        .au-detail { padding: 0 20px 20px; border-top: 1px solid #f3f4f6; }
        .au-detail-grid { display: grid; grid-template-columns: repeat(3, 1fr); gap: 16px; padding-top: 16px; margin-bottom: 16px; }
        .au-detail-section {}
        .au-detail-label { font-size: 10.5px; font-weight: 700; text-transform: uppercase; letter-spacing: 0.08em; color: #9ca3af; margin-bottom: 4px; }
        .au-detail-value { font-size: 13.5px; color: #111; font-weight: 600; }
        .au-detail-value.mono { font-family: monospace; letter-spacing: 0.06em; font-size: 12.5px; }

        /* KYC box */
        .au-kyc { background: #f9fafb; border: 1px solid #e5e7eb; border-radius: 10px; padding: 14px 16px; margin-bottom: 14px; }
        .au-kyc-title { font-size: 11px; font-weight: 700; text-transform: uppercase; letter-spacing: 0.08em; color: #6b7280; margin-bottom: 10px; }
        .au-kyc-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 12px; }
        .au-kyc-row {}
        .au-kyc-label { font-size: 11px; color: #9ca3af; font-weight: 600; margin-bottom: 2px; }
        .au-kyc-value { font-size: 13px; color: #111; font-weight: 700; font-family: monospace; }
        .au-kyc-empty { font-size: 12px; color: #d1d5db; font-style: italic; }

        /* Actions */
        .au-actions { display: flex; gap: 8px; flex-wrap: wrap; }
        .au-btn { display: inline-flex; align-items: center; gap: 6px; padding: 8px 14px; border-radius: 9px; font-size: 12.5px; font-weight: 700; cursor: pointer; border: none; transition: all 0.15s; font-family: 'DM Sans', sans-serif; }
        .au-btn:disabled { opacity: 0.5; cursor: not-allowed; }
        .au-btn-suspend  { background: #fef2f2; color: #dc2626; border: 1px solid #fecaca; }
        .au-btn-suspend:hover:not(:disabled)  { background: #fee2e2; }
        .au-btn-activate { background: #f0fdf4; color: #16a34a; border: 1px solid #bbf7d0; }
        .au-btn-activate:hover:not(:disabled) { background: #dcfce7; }
        .au-btn-verify   { background: #eff6ff; color: #2563eb; border: 1px solid #bfdbfe; }
        .au-btn-verify:hover:not(:disabled)   { background: #dbeafe; }

        /* Empty */
        .au-empty { text-align: center; padding: 72px 20px; background: #f9fafb; border-radius: 16px; border: 1px solid #e5e7eb; }
        .au-empty-icon  { font-size: 48px; margin-bottom: 16px; }
        .au-empty-title { font-size: 18px; font-weight: 700; color: #374151; margin-bottom: 6px; }
        .au-empty-desc  { font-size: 14px; color: #9ca3af; }

        @media (max-width: 640px) { .au-detail-grid { grid-template-columns: 1fr 1fr; } .au-kyc-grid { grid-template-columns: 1fr; } }
      `}</style>

      <div className="au">
        <div className="au-header">
          <h1 className="au-title">Users</h1>
          <p className="au-sub">Manage vendors, affiliates and platform users.</p>
        </div>

        {/* Role tabs */}
        <div className="au-tabs">
          {ROLE_TABS.map(tab => (
            <button
              key={tab.key}
              className={`au-tab${activeRole === tab.key ? ' active' : ''}`}
              onClick={() => router.push(
                `/admin/users?role=${tab.key}&status=${activeStatus}`
              )}
            >
              {tab.icon} {tab.label}
              {counts[tab.key] > 0 && (
                <span className="au-tab-count">{counts[tab.key]}</span>
              )}
            </button>
          ))}
        </div>

        {/* Controls */}
        <div className="au-controls">
          <div className="au-search-wrap">
            <Search size={15} className="au-search-icon" />
            <input
              className="au-search"
              placeholder="Search by name, email, phone, shop..."
              value={search}
              onChange={e => setSearch(e.target.value)}
            />
          </div>
          <select
            className="au-select"
            value={activeStatus}
            onChange={e => router.push(`/admin/users?role=${activeRole}&status=${e.target.value}`)}
          >
            <option value="ALL">All Status</option>
            <option value="active">Active</option>
            <option value="suspended">Suspended</option>
            <option value="pending_verification">Pending</option>
          </select>
          <span className="au-count">{filtered.length} users</span>
        </div>

        {/* List */}
        <div className="au-list">
          {filtered.length === 0 ? (
            <div className="au-empty">
              <div className="au-empty-icon">👥</div>
              <div className="au-empty-title">No users found</div>
              <div className="au-empty-desc">Try adjusting your search or filters.</div>
            </div>
          ) : (
            filtered.map(u => {
              const isExpanded  = expanded === u.id;
              const statusStyle = STATUS_STYLE[u.status] ?? STATUS_STYLE.pending_verification;
              const roleStyle   = ROLE_STYLE[u.role]     ?? ROLE_STYLE.ADMIN;
              const initials    = u.name.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2);
              const avatarColors: Record<string, string> = {
                VENDOR: '#16a34a', AFFILIATE: '#2563eb',
                BOTH: '#7c3aed', ADMIN: '#dc2626',
              };

              return (
                <div
                  key={u.id}
                  className={`au-card${u.status === 'suspended' ? ' suspended' : ''}`}
                >
                  <div
                    className="au-card-main"
                    onClick={() => setExpanded(isExpanded ? null : u.id)}
                  >
                    {/* Avatar */}
                    <div
                      className="au-avatar"
                      style={{ background: avatarColors[u.role] ?? '#6b7280' }}
                    >
                      {initials}
                    </div>

                    {/* Info */}
                    <div className="au-info">
                      <div className="au-name">
                        {u.name}
                        {!u.emailVerified && (
                          <span style={{ fontSize: 10, background: '#fef9c3', color: '#d97706', border: '1px solid #fde68a', borderRadius: 4, padding: '1px 5px', fontWeight: 700 }}>
                            unverified
                          </span>
                        )}
                      </div>
                      <div className="au-email">{u.email}</div>
                      <div className="au-meta">
                        <span className="au-pill" style={roleStyle}>{u.role}</span>
                        <span className="au-pill" style={statusStyle}>{u.status}</span>
                        {u.shopName && (
                          <span style={{ fontSize: 11.5, color: '#6b7280' }}>
                            🏪 {u.shopName}
                          </span>
                        )}
                        {u.orderCount > 0 && (
                          <span style={{ fontSize: 11.5, color: '#9ca3af' }}>
                            {u.orderCount} orders
                          </span>
                        )}
                      </div>
                    </div>

                    {/* Right */}
                    <div className="au-right">
                      <div className="au-joined">
                        {new Date(u.createdAt).toLocaleDateString('en-KE', {
                          day: 'numeric', month: 'short', year: 'numeric',
                        })}
                      </div>
                      {u.balance > 0 && (
                        <div className="au-balance">{formatKES(u.balance)}</div>
                      )}
                    </div>

                    <div style={{ color: '#9ca3af', flexShrink: 0 }}>
                      {isExpanded ? <ChevronUp size={15} /> : <ChevronDown size={15} />}
                    </div>
                  </div>

                  {/* Expanded */}
                  {isExpanded && (
                    <div className="au-detail">
                      {/* Stats */}
                      <div className="au-detail-grid">
                        <div className="au-detail-section">
                          <div className="au-detail-label">Phone</div>
                          <div className="au-detail-value">{u.phone ?? '—'}</div>
                        </div>
                        <div className="au-detail-section">
                          <div className="au-detail-label">Orders</div>
                          <div className="au-detail-value">{u.orderCount}</div>
                        </div>
                        <div className="au-detail-section">
                          <div className="au-detail-label">Available Balance</div>
                          <div className="au-detail-value" style={{ color: '#16a34a' }}>
                            {formatKES(u.balance)}
                          </div>
                        </div>
                        {u.affiliateToken && (
                          <div className="au-detail-section">
                            <div className="au-detail-label">Affiliate Token</div>
                            <div className="au-detail-value mono">{u.affiliateToken}</div>
                          </div>
                        )}
                        <div className="au-detail-section">
                          <div className="au-detail-label">Joined</div>
                          <div className="au-detail-value">
                            {new Date(u.createdAt).toLocaleDateString('en-KE', {
                              day: 'numeric', month: 'long', year: 'numeric',
                            })}
                          </div>
                        </div>
                        <div className="au-detail-section">
                          <div className="au-detail-label">Email Verified</div>
                          <div className="au-detail-value" style={{ color: u.emailVerified ? '#16a34a' : '#d97706' }}>
                            {u.emailVerified ? '✓ Yes' : '✗ No'}
                          </div>
                        </div>
                      </div>

                      {/* KYC — admin only */}
                      {(u.kraPin || u.idNumber) && (
                        <div className="au-kyc">
                          <div className="au-kyc-title">🔒 KYC Information (Admin Only)</div>
                          <div className="au-kyc-grid">
                            {u.kraPin && (
                              <div className="au-kyc-row">
                                <div className="au-kyc-label">KRA PIN</div>
                                <div className="au-kyc-value">{u.kraPin}</div>
                              </div>
                            )}
                            {u.idNumber && (
                              <div className="au-kyc-row">
                                <div className="au-kyc-label">ID Number</div>
                                <div className="au-kyc-value">{u.idNumber}</div>
                              </div>
                            )}
                          </div>
                        </div>
                      )}

                      {/* Actions */}
                      <div className="au-actions">
                        {u.status === 'active' && u.role !== 'ADMIN' && (
                          <button
                            className="au-btn au-btn-suspend"
                            disabled={loading === u.id}
                            onClick={() => handle(() => suspendUser(u.id), u.id)}
                          >
                            <ShieldAlert size={13} />
                            {loading === u.id ? 'Suspending...' : 'Suspend User'}
                          </button>
                        )}

                        {u.status === 'suspended' && (
                          <button
                            className="au-btn au-btn-activate"
                            disabled={loading === u.id}
                            onClick={() => handle(() => activateUser(u.id), u.id)}
                          >
                            <ShieldCheck size={13} />
                            {loading === u.id ? 'Activating...' : 'Activate User'}
                          </button>
                        )}

                        {!u.emailVerified && (
                          <button
                            className="au-btn au-btn-verify"
                            disabled={loading === u.id}
                            onClick={() => handle(() => verifyUser(u.id), u.id)}
                          >
                            <CheckCircle size={13} />
                            {loading === u.id ? 'Verifying...' : 'Mark Verified'}
                          </button>
                        )}

                        {u.status === 'pending_verification' && (
                          <button
                            className="au-btn au-btn-activate"
                            disabled={loading === u.id}
                            onClick={() => handle(() => activateUser(u.id), u.id)}
                          >
                            <CheckCircle size={13} />
                            {loading === u.id ? 'Approving...' : 'Approve Account'}
                          </button>
                        )}
                      </div>
                    </div>
                  )}
                </div>
              );
            })
          )}
        </div>
      </div>
    </>
  );
}
