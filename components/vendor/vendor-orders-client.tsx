'use client';

import { useState }          from 'react';
import { useRouter }         from 'next/navigation';
import { updateOrderStatus } from '@/action/updateOrderAction';
import { formatKES }         from '@/lib/utils';
import {
  Package, Phone, MapPin, Clock,
  CheckCircle, Truck, XCircle,
  ChevronDown, ChevronUp, Banknote,
  AlertCircle,
} from 'lucide-react';

interface Order {
  id:            string;
  orderStatus:   string;
  paymentStatus: string;
  totalAmount:   number;
  vendorEarnings: number;
  quantity:      number;
  customerName:  string;
  customerPhone: string;
  customerEmail: string | null;
  city:          string | null;
  address:       string | null;
  notes:         string | null;
  createdAt:     string;
  productTitle:  string;
  productImage:  string | null;
  productSlug:   string;
}

interface Props {
  orders:       Order[];
  activeStatus: string;
}

const TABS = [
  { key: 'ALL',       label: 'All Orders' },
  { key: 'CREATED',   label: 'Pending Payment' },
  { key: 'CONFIRMED', label: 'Confirmed' },
  { key: 'SHIPPED',   label: 'Shipped' },
  { key: 'DELIVERED', label: 'Delivered' },
  { key: 'CANCELLED', label: 'Cancelled' },
];

const STATUS_STYLES: Record<string, { bg: string; color: string; label: string }> = {
  CREATED:   { bg: '#fffbeb', color: '#d97706', label: 'Awaiting Payment' },
  CONFIRMED: { bg: '#eff6ff', color: '#2563eb', label: 'Confirmed' },
  SHIPPED:   { bg: '#f5f3ff', color: '#7c3aed', label: 'Shipped' },
  DELIVERED: { bg: '#f0fdf4', color: '#16a34a', label: 'Delivered' },
  CANCELLED: { bg: '#fef2f2', color: '#dc2626', label: 'Cancelled' },
};

const PAYMENT_STYLES: Record<string, { bg: string; color: string }> = {
  PENDING:  { bg: '#fffbeb', color: '#d97706' },
  PAID:     { bg: '#f0fdf4', color: '#16a34a' },
  FAILED:   { bg: '#fef2f2', color: '#dc2626' },
  REFUNDED: { bg: '#f5f3ff', color: '#7c3aed' },
};

export function VendorOrdersClient({ orders, activeStatus }: Props) {
  const router    = useRouter();
  const [expanded, setExpanded] = useState<string | null>(null);
  const [loading,  setLoading]  = useState<string | null>(null);

  const handleStatus = async (orderId: string, status: any) => {
    setLoading(orderId);
    await updateOrderStatus(orderId, status);
    setLoading(null);
    router.refresh();
  };

  const counts = TABS.reduce((acc, tab) => {
    acc[tab.key] = tab.key === 'ALL'
      ? orders.length
      : orders.filter(o => o.orderStatus === tab.key).length;
    return acc;
  }, {} as Record<string, number>);

  return (
    <>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=DM+Sans:wght@400;500;600;700;800&display=swap');
        .vo { font-family: 'DM Sans', sans-serif; }
        .vo-header { margin-bottom: 24px; }
        .vo-title  { font-size: 24px; font-weight: 800; color: #111; letter-spacing: -0.04em; }
        .vo-sub    { font-size: 14px; color: #6b7280; margin-top: 4px; }

        /* Tabs */
        .vo-tabs { display: flex; gap: 4px; border-bottom: 1px solid #e5e7eb; margin-bottom: 24px; overflow-x: auto; padding-bottom: 0; }
        .vo-tab {
          padding: 10px 16px; font-size: 13px; font-weight: 600;
          border: none; background: none; cursor: pointer;
          border-bottom: 2px solid transparent; color: #6b7280;
          white-space: nowrap; font-family: 'DM Sans', sans-serif;
          transition: all 0.15s; display: flex; align-items: center; gap: 6px;
        }
        .vo-tab.active { color: #111; border-bottom-color: #111; }
        .vo-tab:hover:not(.active) { color: #374151; }
        .vo-tab-count {
          display: inline-flex; align-items: center; justify-content: center;
          min-width: 18px; height: 18px; border-radius: 100px;
          font-size: 10px; font-weight: 800; padding: 0 5px;
          background: #f3f4f6; color: #6b7280;
        }
        .vo-tab.active .vo-tab-count { background: #111; color: #fff; }

        /* Cards */
        .vo-list { display: flex; flex-direction: column; gap: 12px; }
        .vo-card { background: #fff; border: 1px solid #e5e7eb; border-radius: 14px; overflow: hidden; transition: box-shadow 0.2s; }
        .vo-card:hover { box-shadow: 0 4px 16px rgba(0,0,0,0.06); }

        .vo-card-main { display: flex; align-items: center; gap: 16px; padding: 16px 20px; cursor: pointer; }
        .vo-card-img { width: 56px; height: 56px; border-radius: 10px; background: #f3f4f6; overflow: hidden; flex-shrink: 0; border: 1px solid #e5e7eb; }
        .vo-card-img img { width: 100%; height: 100%; object-fit: cover; }
        .vo-card-img-placeholder { width: 100%; height: 100%; display: flex; align-items: center; justify-content: center; font-size: 22px; }

        .vo-card-info { flex: 1; min-width: 0; }
        .vo-card-product { font-size: 14px; font-weight: 700; color: #111; letter-spacing: -0.02em; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; margin-bottom: 3px; }
        .vo-card-customer { font-size: 12.5px; color: #6b7280; }
        .vo-card-meta { display: flex; align-items: center; gap: 8px; margin-top: 5px; flex-wrap: wrap; }
        .vo-pill { display: inline-flex; align-items: center; font-size: 11px; font-weight: 700; border-radius: 100px; padding: 2px 9px; }

        .vo-card-right { display: flex; flex-direction: column; align-items: flex-end; gap: 4px; flex-shrink: 0; }
        .vo-card-amount { font-size: 16px; font-weight: 800; color: #111; letter-spacing: -0.03em; }
        .vo-card-earn { font-size: 11.5px; color: #16a34a; font-weight: 600; }
        .vo-card-date { font-size: 11px; color: #9ca3af; }
        .vo-expand-icon { color: #9ca3af; flex-shrink: 0; }

        /* Expanded detail */
        .vo-detail { padding: 0 20px 20px; border-top: 1px solid #f3f4f6; }
        .vo-detail-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 16px; padding-top: 16px; }
        .vo-detail-section {}
        .vo-detail-label { font-size: 10.5px; font-weight: 700; text-transform: uppercase; letter-spacing: 0.08em; color: #9ca3af; margin-bottom: 8px; }
        .vo-detail-row { display: flex; align-items: flex-start; gap: 7px; font-size: 13px; color: #374151; margin-bottom: 6px; }
        .vo-detail-row svg { flex-shrink: 0; margin-top: 1px; }

        /* Notes */
        .vo-notes { background: #fffbeb; border: 1px solid #fde68a; border-radius: 8px; padding: 10px 12px; font-size: 12.5px; color: #92400e; margin-top: 12px; }

        /* Actions */
        .vo-actions { display: flex; gap: 8px; padding-top: 16px; flex-wrap: wrap; }
        .vo-btn { display: inline-flex; align-items: center; gap: 6px; padding: 8px 16px; border-radius: 9px; font-size: 13px; font-weight: 700; cursor: pointer; border: none; transition: all 0.15s; font-family: 'DM Sans', sans-serif; }
        .vo-btn-confirm  { background: #2563eb; color: #fff; }
        .vo-btn-confirm:hover  { background: #1d4ed8; }
        .vo-btn-ship     { background: #7c3aed; color: #fff; }
        .vo-btn-ship:hover     { background: #6d28d9; }
        .vo-btn-deliver  { background: #16a34a; color: #fff; }
        .vo-btn-deliver:hover  { background: #15803d; }
        .vo-btn-cancel   { background: #fef2f2; color: #dc2626; border: 1px solid #fecaca; }
        .vo-btn-cancel:hover   { background: #fee2e2; }
        .vo-btn:disabled { opacity: 0.5; cursor: not-allowed; }

        /* Empty */
        .vo-empty { text-align: center; padding: 72px 20px; background: #f9fafb; border-radius: 16px; border: 1px solid #e5e7eb; }
        .vo-empty-icon  { font-size: 48px; margin-bottom: 16px; }
        .vo-empty-title { font-size: 18px; font-weight: 700; color: #374151; margin-bottom: 6px; }
        .vo-empty-desc  { font-size: 14px; color: #9ca3af; }

        @media (max-width: 640px) {
          .vo-detail-grid { grid-template-columns: 1fr; }
          .vo-card-main { flex-wrap: wrap; }
        }
      `}</style>

      <div className="vo">
        <div className="vo-header">
          <h1 className="vo-title">Orders</h1>
          <p className="vo-sub">Manage and fulfill customer orders</p>
        </div>

        {/* Tabs */}
        <div className="vo-tabs">
          {TABS.map((tab) => (
            <button
              key={tab.key}
              className={`vo-tab${activeStatus === tab.key ? ' active' : ''}`}
              onClick={() => router.push(
                tab.key === 'ALL'
                  ? '/vendor/orders'
                  : `/vendor/orders?status=${tab.key}`
              )}
            >
              {tab.label}
              {counts[tab.key] > 0 && (
                <span className="vo-tab-count">{counts[tab.key]}</span>
              )}
            </button>
          ))}
        </div>

        {/* Orders */}
        <div className="vo-list">
          {orders.length === 0 ? (
            <div className="vo-empty">
              <div className="vo-empty-icon">📦</div>
              <div className="vo-empty-title">No orders yet</div>
              <div className="vo-empty-desc">
                {activeStatus === 'ALL'
                  ? 'Orders will appear here when customers buy your products.'
                  : `No ${activeStatus.toLowerCase()} orders.`}
              </div>
            </div>
          ) : (
            orders.map((order) => {
              const isExpanded = expanded === order.id;
              const orderStyle  = STATUS_STYLES[order.orderStatus]  ?? STATUS_STYLES.CREATED;
              const payStyle    = PAYMENT_STYLES[order.paymentStatus] ?? PAYMENT_STYLES.PENDING;

              return (
                <div key={order.id} className="vo-card">
                  {/* ── Card header ── */}
                  <div
                    className="vo-card-main"
                    onClick={() => setExpanded(isExpanded ? null : order.id)}
                  >
                    <div className="vo-card-img">
                      {order.productImage
                        ? <img src={order.productImage} alt={order.productTitle} />
                        : <div className="vo-card-img-placeholder">🛍️</div>}
                    </div>

                    <div className="vo-card-info">
                      <div className="vo-card-product">{order.productTitle}</div>
                      <div className="vo-card-customer">
                        {order.customerName} · {order.customerPhone}
                      </div>
                      <div className="vo-card-meta">
                        <span className="vo-pill" style={{ background: orderStyle.bg, color: orderStyle.color }}>
                          {orderStyle.label}
                        </span>
                        <span className="vo-pill" style={{ background: payStyle.bg, color: payStyle.color }}>
                          {order.paymentStatus}
                        </span>
                        <span style={{ fontSize: 11, color: '#9ca3af' }}>
                          Qty: {order.quantity}
                        </span>
                      </div>
                    </div>

                    <div className="vo-card-right">
                      <div className="vo-card-amount">{formatKES(order.totalAmount)}</div>
                      <div className="vo-card-earn">You earn: {formatKES(order.vendorEarnings)}</div>
                      <div className="vo-card-date">
                        {new Date(order.createdAt).toLocaleDateString('en-KE', {
                          day: 'numeric', month: 'short', year: 'numeric',
                        })}
                      </div>
                    </div>

                    <div className="vo-expand-icon">
                      {isExpanded ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
                    </div>
                  </div>

                  {/* ── Expanded detail ── */}
                  {isExpanded && (
                    <div className="vo-detail">
                      <div className="vo-detail-grid">

                        {/* Customer info */}
                        <div className="vo-detail-section">
                          <div className="vo-detail-label">Customer</div>
                          <div className="vo-detail-row">
                            <Package size={13} color="#9ca3af" />
                            <span>{order.customerName}</span>
                          </div>
                          <div className="vo-detail-row">
                            <Phone size={13} color="#9ca3af" />
                            <span>{order.customerPhone}</span>
                          </div>
                          {order.customerEmail && (
                            <div className="vo-detail-row">
                              <span style={{ fontSize: 13 }}>✉️</span>
                              <span>{order.customerEmail}</span>
                            </div>
                          )}
                        </div>

                        {/* Delivery info */}
                        <div className="vo-detail-section">
                          <div className="vo-detail-label">Delivery</div>
                          {(order.city || order.address) ? (
                            <div className="vo-detail-row">
                              <MapPin size={13} color="#9ca3af" />
                              <span>{[order.address, order.city].filter(Boolean).join(', ')}</span>
                            </div>
                          ) : (
                            <div className="vo-detail-row" style={{ color: '#9ca3af' }}>
                              No address provided
                            </div>
                          )}
                          <div className="vo-detail-row">
                            <Clock size={13} color="#9ca3af" />
                            <span>
                              {new Date(order.createdAt).toLocaleString('en-KE', {
                                day: 'numeric', month: 'short',
                                hour: '2-digit', minute: '2-digit',
                              })}
                            </span>
                          </div>
                        </div>
                      </div>

                      {/* Notes */}
                      {order.notes && (
                        <div className="vo-notes">
                          <strong>Customer note:</strong> {order.notes}
                        </div>
                      )}

                      {/* Actions */}
                      {order.paymentStatus === 'PAID' && (
                        <div className="vo-actions">
                          {order.orderStatus === 'CONFIRMED' && (
                            <button
                              className="vo-btn vo-btn-ship"
                              disabled={loading === order.id}
                              onClick={() => handleStatus(order.id, 'SHIPPED')}
                            >
                              <Truck size={13} />
                              {loading === order.id ? 'Updating...' : 'Mark as Shipped'}
                            </button>
                          )}

                          {order.orderStatus === 'SHIPPED' && (
                            <button
                              className="vo-btn vo-btn-deliver"
                              disabled={loading === order.id}
                              onClick={() => handleStatus(order.id, 'DELIVERED')}
                            >
                              <CheckCircle size={13} />
                              {loading === order.id ? 'Updating...' : 'Mark as Delivered'}
                            </button>
                          )}

                          {['CONFIRMED', 'SHIPPED'].includes(order.orderStatus) && (
                            <button
                              className="vo-btn vo-btn-cancel"
                              disabled={loading === order.id}
                              onClick={() => handleStatus(order.id, 'CANCELLED')}
                            >
                              <XCircle size={13} /> Cancel
                            </button>
                          )}

                          {order.orderStatus === 'DELIVERED' && (
                            <div style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 13, color: '#16a34a', fontWeight: 600 }}>
                              <CheckCircle size={14} /> Order complete — earnings released
                            </div>
                          )}
                        </div>
                      )}

                      {order.paymentStatus === 'PENDING' && (
                        <div style={{ display: 'flex', alignItems: 'center', gap: 8, paddingTop: 12, fontSize: 13, color: '#d97706' }}>
                          <AlertCircle size={14} /> Waiting for M-Pesa payment
                        </div>
                      )}

                      {order.paymentStatus === 'FAILED' && (
                        <div style={{ display: 'flex', alignItems: 'center', gap: 8, paddingTop: 12, fontSize: 13, color: '#dc2626' }}>
                          <XCircle size={14} /> Payment failed — order not charged
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
    </>
  );
}
// ```
//
// ---
//
// **Commit message:**
// ```
// feat(vendor): add orders management page + fix stock race condition
//
// - Add vendor orders page at /vendor/orders with status tabs
// - Expandable order cards showing customer details, delivery address, notes
// - Vendor can mark orders: Shipped → Delivered (or Cancel)
// - On Delivered: release pendingBalance → availableBalance for vendor + affiliate
// - Fix createOrder: atomic stock decrement using SQL WHERE stockQuantity >= quantity
// - Prevents overselling when two customers buy last item simultaneously  
// - Dedup check prevents ghost orders on M-Pesa retry (10 min window)
// - Stock restored automatically if order insert fails after decrement
// - Specific error messages: "out of stock" vs "only N left" vs "not available"
