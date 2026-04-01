"use client";

import { useState, useTransition, useMemo } from "react";
import {
  adminCancelOrder,
  adminForceDeliver,
  adminAssignAffiliate,
  adminUpdateNotes,
  AdminOrderRow,
  AdminOrderStatus,
  VendorOption,
  AffiliateOption,
} from "@/action/AdminOrderAction";

// ─── Constants ────────────────────────────────────────────────────────────────

const STATUS_TABS: { label: string; value: AdminOrderStatus; color: string; dot: string }[] = [
  { label: "All",       value: "ALL",       color: "#7c3aed", dot: "#7c3aed" },
  { label: "Created",   value: "CREATED",   color: "#6b7280", dot: "#9ca3af" },
  { label: "Paid",      value: "PAID",      color: "#2563eb", dot: "#3b82f6" },
  { label: "Confirmed", value: "CONFIRMED", color: "#0891b2", dot: "#06b6d4" },
  { label: "Shipped",   value: "SHIPPED",   color: "#d97706", dot: "#f59e0b" },
  { label: "Delivered", value: "DELIVERED", color: "#16a34a", dot: "#22c55e" },
  { label: "Cancelled", value: "CANCELLED", color: "#dc2626", dot: "#ef4444" },
];

const STATUS_META: Record<string, { bg: string; color: string; border: string; label: string; icon: string }> = {
  CREATED:   { bg: "#f9fafb", color: "#374151", border: "#e5e7eb", label: "Created",   icon: "🕐" },
  PAID:      { bg: "#eff6ff", color: "#1d4ed8", border: "#bfdbfe", label: "Paid",      icon: "💳" },
  CONFIRMED: { bg: "#ecfeff", color: "#0e7490", border: "#a5f3fc", label: "Confirmed", icon: "✅" },
  SHIPPED:   { bg: "#fffbeb", color: "#b45309", border: "#fde68a", label: "Shipped",   icon: "🚚" },
  DELIVERED: { bg: "#f0fdf4", color: "#15803d", border: "#bbf7d0", label: "Delivered", icon: "📦" },
  CANCELLED: { bg: "#fef2f2", color: "#b91c1c", border: "#fecaca", label: "Cancelled", icon: "✕"  },
};

const ORDER_FLOW = ["CREATED", "PAID", "CONFIRMED", "SHIPPED", "DELIVERED"];

// ─── Helpers ──────────────────────────────────────────────────────────────────

function fmt(n: number) {
  return `KSh ${n.toLocaleString("en-KE", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}

function fmtK(n: number) {
  if (n >= 1_000_000) return `KSh ${(n / 1_000_000).toFixed(1)}M`;
  if (n >= 1_000) return `KSh ${(n / 1_000).toFixed(1)}k`;
  return fmt(n);
}

function fmtDate(date: Date) {
  return new Date(date).toLocaleString("en-KE", {
    day: "numeric", month: "short", year: "numeric",
    hour: "2-digit", minute: "2-digit",
  });
}

function timeAgo(date: Date) {
  const d = new Date(date);
  const diff = (Date.now() - d.getTime()) / 1000;
  if (diff < 60) return "just now";
  if (diff < 3600) return `${Math.floor(diff / 60)}m ago`;
  if (diff < 86400) return `${Math.floor(diff / 3600)}h ago`;
  if (diff < 86400 * 7) return `${Math.floor(diff / 86400)}d ago`;
  return d.toLocaleDateString("en-KE", { day: "numeric", month: "short" });
}

// ─── Order Timeline ───────────────────────────────────────────────────────────

function OrderTimeline({ status }: { status: string }) {
  const currentIdx = ORDER_FLOW.indexOf(status);
  const isCancelled = status === "CANCELLED";

  return (
    <div style={{ display: "flex", alignItems: "center", gap: 0, marginBottom: 4 }}>
      {ORDER_FLOW.map((s, i) => {
        const done = !isCancelled && currentIdx >= i;
        const active = !isCancelled && currentIdx === i;
        const meta = STATUS_META[s];
        return (
          <div key={s} style={{ display: "flex", alignItems: "center", flex: i < ORDER_FLOW.length - 1 ? 1 : "none" }}>
            <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 4 }}>
              <div style={{
                width: 28, height: 28, borderRadius: "50%",
                background: done ? (active ? "#7c3aed" : "#ede9fe") : "#f3f4f6",
                border: `2px solid ${done ? (active ? "#7c3aed" : "#c4b5fd") : "#e5e7eb"}`,
                display: "flex", alignItems: "center", justifyContent: "center",
                fontSize: 12,
                boxShadow: active ? "0 0 0 4px rgba(124,58,237,0.12)" : "none",
                transition: "all 0.2s",
              }}>
                {done ? (active ? <span style={{ color: "#fff", fontSize: 11 }}>●</span> : <span style={{ color: "#7c3aed", fontSize: 10 }}>✓</span>) : <span style={{ color: "#d1d5db", fontSize: 10 }}>○</span>}
              </div>
              <span style={{ fontSize: 10, color: done ? "#7c3aed" : "#9ca3af", fontWeight: done ? 600 : 400, whiteSpace: "nowrap" }}>
                {s.charAt(0) + s.slice(1).toLowerCase()}
              </span>
            </div>
            {i < ORDER_FLOW.length - 1 && (
              <div style={{ flex: 1, height: 2, background: done && currentIdx > i ? "#c4b5fd" : "#e5e7eb", margin: "0 2px", marginBottom: 18 }} />
            )}
          </div>
        );
      })}
      {isCancelled && (
        <div style={{ marginLeft: 8, background: "#fef2f2", color: "#b91c1c", borderRadius: 6, padding: "2px 8px", fontSize: 11, fontWeight: 600 }}>
          CANCELLED
        </div>
      )}
    </div>
  );
}

// ─── Finance Breakdown ────────────────────────────────────────────────────────

function FinanceRow({ order }: { order: AdminOrderRow }) {
  const vendor = order.vendorEarning ?? (order.totalAmount - (order.commissionAmount ?? 0) - (order.platformFee ?? 0));
  const total = order.totalAmount;
  const comm = order.commissionAmount ?? 0;
  const fee = order.platformFee ?? 0;

  const bar = (val: number, color: string, label: string) => (
    <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 6 }}>
      <div style={{ width: 80, fontSize: 11, color: "#6b7280", textAlign: "right", flexShrink: 0 }}>{label}</div>
      <div style={{ flex: 1, background: "#f3f4f6", borderRadius: 4, height: 8, overflow: "hidden" }}>
        <div style={{ width: `${total > 0 ? (val / total) * 100 : 0}%`, background: color, height: "100%", borderRadius: 4, transition: "width 0.4s" }} />
      </div>
      <div style={{ width: 90, fontSize: 11, fontWeight: 600, color: "#111827", textAlign: "right", flexShrink: 0 }}>{fmt(val)}</div>
      <div style={{ width: 36, fontSize: 10, color: "#9ca3af", textAlign: "right", flexShrink: 0 }}>
        {total > 0 ? `${((val / total) * 100).toFixed(0)}%` : "—"}
      </div>
    </div>
  );

  return (
    <div style={{ background: "#fafafa", borderRadius: 10, padding: "14px 16px", border: "1px solid #f3f4f6" }}>
      <div style={{ fontSize: 11, fontWeight: 700, color: "#6b7280", textTransform: "uppercase", letterSpacing: "0.06em", marginBottom: 12 }}>
        💰 Revenue Breakdown
      </div>
      {bar(order.totalAmount, "#7c3aed", "Customer paid")}
      {bar(vendor, "#16a34a", "Vendor earns")}
      {bar(comm, "#d97706", "Affiliate")}
      {bar(fee, "#2563eb", "Platform fee")}
    </div>
  );
}

// ─── Detail Grid ──────────────────────────────────────────────────────────────

function DetailGrid({ items }: { items: { label: string; value: string; mono?: boolean; accent?: string }[] }) {
  return (
    <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(190px, 1fr))", gap: "12px 20px" }}>
      {items.map(({ label, value, mono, accent }) => (
        <div key={label}>
          <div style={{ fontSize: 10, fontWeight: 700, color: "#9ca3af", textTransform: "uppercase", letterSpacing: "0.06em", marginBottom: 3 }}>{label}</div>
          <div style={{ fontSize: 13, color: accent ?? "#111827", fontFamily: mono ? "monospace" : undefined, fontWeight: accent ? 600 : 400 }}>
            {value || "—"}
          </div>
        </div>
      ))}
    </div>
  );
}

// ─── Order Card ───────────────────────────────────────────────────────────────

function OrderCard({
  order,
  affiliates,
  onMutate,
}: {
  order: AdminOrderRow;
  affiliates: AffiliateOption[];
  onMutate: (id: string, patch: Partial<AdminOrderRow>) => void;
}) {
  const [expanded, setExpanded] = useState(false);
  const [isPending, startTransition] = useTransition();
  const [toast, setToast] = useState<{ type: "ok" | "err"; text: string } | null>(null);
  const [showAffiliateModal, setShowAffiliateModal] = useState(false);
  const [selectedAffiliateId, setSelectedAffiliateId] = useState(order.affiliateId ?? "");
  const [noteEditing, setNoteEditing] = useState(false);
  const [noteText, setNoteText] = useState(order.notes ?? "");

  const st = STATUS_META[order.status] ?? STATUS_META.CREATED;

  const showToast = (type: "ok" | "err", text: string) => {
    setToast({ type, text });
    setTimeout(() => setToast(null), 3500);
  };

  const act = (fn: () => Promise<{ success: boolean; error?: string }>, optimistic: Partial<AdminOrderRow>) => {
    startTransition(async () => {
      const res = await fn();
      if (res.success) {
        onMutate(order.id, optimistic);
        showToast("ok", "Done!");
      } else {
        showToast("err", res.error ?? "Something went wrong");
      }
    });
  };

  const handleCancel = () => act(() => adminCancelOrder(order.id), { status: "CANCELLED" });
  const handleForceDeliver = () => act(() => adminForceDeliver(order.id), { status: "DELIVERED" });

  const handleAssignAffiliate = () => {
    const af = affiliates.find((a) => a.id === selectedAffiliateId);
    act(
      () => adminAssignAffiliate(order.id, selectedAffiliateId || null),
      { affiliateId: selectedAffiliateId || null, affiliateName: af?.name ?? null, affiliateEmail: af?.email ?? null }
    );
    setShowAffiliateModal(false);
  };

  const handleSaveNote = () => {
    act(() => adminUpdateNotes(order.id, noteText), { notes: noteText });
    setNoteEditing(false);
  };

  const canCancel = !["DELIVERED", "CANCELLED"].includes(order.status);
  const canForceDeliver = !["DELIVERED", "CANCELLED"].includes(order.status);

  return (
    <div style={{
      background: "#fff",
      border: `1px solid ${expanded ? "#c4b5fd" : "#e5e7eb"}`,
      borderRadius: 14,
      overflow: "visible",
      transition: "border-color 0.2s, box-shadow 0.2s",
      boxShadow: expanded ? "0 4px 24px rgba(124,58,237,0.08)" : "none",
      position: "relative",
    }}>
      {/* Toast */}
      {toast && (
        <div style={{
          position: "absolute", top: -36, right: 0, zIndex: 10,
          background: toast.type === "ok" ? "#16a34a" : "#dc2626",
          color: "#fff", borderRadius: 8, padding: "6px 14px",
          fontSize: 12, fontWeight: 600, whiteSpace: "nowrap",
          boxShadow: "0 2px 12px rgba(0,0,0,0.15)",
          animation: "fadeIn 0.2s ease",
        }}>
          {toast.type === "ok" ? "✓ " : "✕ "}{toast.text}
        </div>
      )}

      {/* ── Collapsed header row ── */}
      <div
        onClick={() => setExpanded(!expanded)}
        style={{
          padding: "14px 18px",
          cursor: "pointer",
          display: "flex",
          alignItems: "center",
          gap: 10,
          flexWrap: "wrap",
          userSelect: "none",
        }}
      >
        {/* Chevron */}
        <span style={{
          color: expanded ? "#7c3aed" : "#9ca3af",
          fontSize: 10,
          transition: "transform 0.2s",
          transform: expanded ? "rotate(90deg)" : "rotate(0deg)",
          display: "inline-block",
          flexShrink: 0,
        }}>▶</span>

        {/* Status badge */}
        <span style={{
          background: st.bg, color: st.color,
          border: `1px solid ${st.border}`,
          borderRadius: 20, padding: "3px 10px",
          fontSize: 11, fontWeight: 700,
          whiteSpace: "nowrap", flexShrink: 0,
        }}>
          {st.icon} {st.label}
        </span>

        {/* Order ID */}
        <span style={{
          fontFamily: "'Courier New', monospace", fontSize: 11,
          color: "#7c3aed", background: "#f5f3ff",
          padding: "2px 8px", borderRadius: 6, flexShrink: 0,
        }}>
          #{order.id.slice(0, 8).toUpperCase()}
        </span>

        {/* Product */}
        <span style={{ fontWeight: 600, color: "#111827", flex: "1 1 130px", minWidth: 0, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
          {order.productName ?? "—"}
        </span>

        {/* Customer */}
        <span style={{ color: "#6b7280", fontSize: 13, flexShrink: 0 }}>
          👤 {order.customerName}
        </span>

        {/* Vendor */}
        {order.vendorName && (
          <span style={{ color: "#6b7280", fontSize: 12, background: "#f9fafb", padding: "2px 8px", borderRadius: 6, flexShrink: 0 }}>
            🏪 {order.vendorName}
          </span>
        )}

        {/* Affiliate indicator */}
        {order.affiliateName && (
          <span style={{ color: "#d97706", fontSize: 12, background: "#fffbeb", padding: "2px 8px", borderRadius: 6, flexShrink: 0 }}>
            🔗 {order.affiliateName}
          </span>
        )}

        {/* Amount */}
        <span style={{ fontWeight: 700, color: "#111827", fontSize: 15, flexShrink: 0, marginLeft: "auto" }}>
          {fmt(order.totalAmount)}
        </span>

        {/* Time */}
        <span style={{ color: "#9ca3af", fontSize: 11, flexShrink: 0 }}>
          {timeAgo(order.createdAt)}
        </span>
      </div>

      {/* ── Expanded panel ── */}
      {expanded && (
        <div style={{ borderTop: "1px solid #f3f4f6" }}>
          {/* Order timeline */}
          <div style={{ padding: "16px 20px 8px", borderBottom: "1px solid #f9fafb" }}>
            <OrderTimeline status={order.status} />
          </div>

          <div style={{ padding: "20px", display: "flex", flexDirection: "column", gap: 20 }}>

            {/* 3-column info sections */}
            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(280px, 1fr))", gap: 16 }}>

              {/* Customer Info */}
              <Section title="👤 Customer" color="#7c3aed">
                <DetailGrid items={[
                  { label: "Name", value: order.customerName },
                  { label: "Email", value: order.customerEmail },
                  { label: "Phone", value: order.customerPhone ?? "—" },
                  { label: "Customer ID", value: order.customerId.slice(0, 12) + "…", mono: true },
                ]} />
              </Section>

              {/* Vendor Info */}
              <Section title="🏪 Vendor" color="#16a34a">
                <DetailGrid items={[
                  { label: "Business", value: order.vendorName ?? "—" },
                  { label: "M-Pesa Phone", value: order.vendorPhone ?? "—" },
                  { label: "Email", value: order.vendorEmail ?? "—" },
                ]} />
              </Section>

              {/* Product Info */}
              <Section title="📦 Product" color="#2563eb">
                <DetailGrid items={[
                  { label: "Product", value: order.productName ?? "—" },
                  { label: "Unit Price", value: order.productPrice != null ? fmt(order.productPrice) : "—" },
                  { label: "Qty", value: String(order.quantity) },
                  { label: "Product ID", value: order.productId.slice(0, 12) + "…", mono: true },
                ]} />
              </Section>

              {/* Payment Info */}
              <Section title="💳 M-Pesa Payment" color="#0891b2">
                <DetailGrid items={[
                  { label: "Receipt Code", value: order.mpesaCode ?? "Pending", mono: true, accent: order.mpesaCode ? "#0e7490" : undefined },
                  { label: "Payer Phone", value: order.mpesaPhone ?? "—" },
                  { label: "Payment Status", value: order.mpesaStatus ?? "—" },
                  { label: "Paid At", value: order.mpesaCreatedAt ? fmtDate(order.mpesaCreatedAt) : "—" },
                ]} />
              </Section>

              {/* Affiliate Info */}
              <Section title="🔗 Affiliate" color="#d97706">
                <DetailGrid items={[
                  { label: "Affiliate", value: order.affiliateName ?? "None" },
                  { label: "Email", value: order.affiliateEmail ?? "—" },
                  { label: "Commission", value: order.commissionAmount != null ? fmt(order.commissionAmount) : "—", accent: "#d97706" },
                ]} />
                <button
                  onClick={(e) => { e.stopPropagation(); setShowAffiliateModal(true); }}
                  style={{
                    marginTop: 10, background: "#fffbeb", border: "1px solid #fde68a",
                    color: "#b45309", borderRadius: 7, padding: "6px 12px",
                    fontSize: 12, fontWeight: 600, cursor: "pointer",
                  }}
                >
                  ✎ {order.affiliateId ? "Reassign" : "Assign"} Affiliate
                </button>
              </Section>

              {/* Logistics */}
              <Section title="🚚 Logistics" color="#6b7280">
                <DetailGrid items={[
                  { label: "Shipping Address", value: order.shippingAddress ?? "Not set" },
                  { label: "Order Created", value: fmtDate(order.createdAt) },
                  { label: "Last Updated", value: fmtDate(order.updatedAt) },
                  { label: "Order ID", value: order.id, mono: true },
                ]} />
              </Section>
            </div>

            {/* Finance breakdown */}
            <FinanceRow order={order} />

            {/* Notes */}
            <div style={{ background: "#fafafa", borderRadius: 10, padding: "14px 16px", border: "1px solid #f3f4f6" }}>
              <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 8 }}>
                <span style={{ fontSize: 11, fontWeight: 700, color: "#6b7280", textTransform: "uppercase", letterSpacing: "0.06em" }}>
                  📝 Admin Notes
                </span>
                {!noteEditing && (
                  <button onClick={() => setNoteEditing(true)} style={{ background: "none", border: "1px solid #e5e7eb", borderRadius: 6, padding: "3px 10px", fontSize: 11, cursor: "pointer", color: "#6b7280" }}>
                    ✎ Edit
                  </button>
                )}
              </div>
              {noteEditing ? (
                <div>
                  <textarea
                    value={noteText}
                    onChange={(e) => setNoteText(e.target.value)}
                    rows={3}
                    style={{ width: "100%", border: "1px solid #c4b5fd", borderRadius: 8, padding: "8px 10px", fontSize: 13, resize: "vertical", outline: "none", fontFamily: "inherit" }}
                    placeholder="Add internal notes about this order…"
                  />
                  <div style={{ display: "flex", gap: 8, marginTop: 8 }}>
                    <button onClick={handleSaveNote} disabled={isPending} style={{ background: "#7c3aed", color: "#fff", border: "none", borderRadius: 7, padding: "7px 16px", fontSize: 12, fontWeight: 600, cursor: "pointer" }}>
                      Save
                    </button>
                    <button onClick={() => { setNoteEditing(false); setNoteText(order.notes ?? ""); }} style={{ background: "#fff", color: "#6b7280", border: "1px solid #e5e7eb", borderRadius: 7, padding: "7px 16px", fontSize: 12, cursor: "pointer" }}>
                      Cancel
                    </button>
                  </div>
                </div>
              ) : (
                <p style={{ fontSize: 13, color: noteText ? "#374151" : "#9ca3af", lineHeight: 1.5 }}>
                  {noteText || "No notes yet. Click Edit to add internal notes."}
                </p>
              )}
            </div>

            {/* Action buttons */}
            <div style={{ display: "flex", gap: 10, flexWrap: "wrap", paddingTop: 4, borderTop: "1px solid #f3f4f6" }}>
              {canForceDeliver && (
                <ActionBtn
                  onClick={handleForceDeliver}
                  disabled={isPending}
                  bg="#16a34a" color="#fff"
                  label="✓ Force Deliver"
                />
              )}
              {canCancel && (
                <ActionBtn
                  onClick={handleCancel}
                  disabled={isPending}
                  bg="#fff" color="#dc2626" border="#fca5a5"
                  label="✕ Cancel Order"
                />
              )}
              {order.status === "DELIVERED" && (
                <span style={{ fontSize: 12, color: "#15803d", background: "#f0fdf4", padding: "8px 14px", borderRadius: 8, border: "1px solid #bbf7d0" }}>
                  ✓ Order completed
                </span>
              )}
            </div>
          </div>
        </div>
      )}

      {/* ── Affiliate assign modal ── */}
      {showAffiliateModal && (
        <div
          onClick={() => setShowAffiliateModal(false)}
          style={{
            position: "fixed", inset: 0, background: "rgba(0,0,0,0.35)",
            zIndex: 1000, display: "flex", alignItems: "center", justifyContent: "center",
          }}
        >
          <div
            onClick={(e) => e.stopPropagation()}
            style={{
              background: "#fff", borderRadius: 16, padding: 28,
              width: 420, maxWidth: "90vw",
              boxShadow: "0 20px 60px rgba(0,0,0,0.2)",
            }}
          >
            <h3 style={{ fontSize: 17, fontWeight: 700, marginBottom: 6, color: "#111827" }}>
              {order.affiliateId ? "Reassign" : "Assign"} Affiliate
            </h3>
            <p style={{ fontSize: 13, color: "#6b7280", marginBottom: 18 }}>
              Order #{order.id.slice(0, 8).toUpperCase()} · {order.productName}
            </p>
            <select
              value={selectedAffiliateId}
              onChange={(e) => setSelectedAffiliateId(e.target.value)}
              style={{
                width: "100%", border: "1px solid #e5e7eb", borderRadius: 9,
                padding: "10px 12px", fontSize: 14, marginBottom: 16,
                outline: "none", background: "#fff",
              }}
            >
              <option value="">— No affiliate —</option>
              {affiliates.map((a) => (
                <option key={a.id} value={a.id}>{a.name} ({a.email})</option>
              ))}
            </select>
            <div style={{ display: "flex", gap: 10 }}>
              <button
                onClick={handleAssignAffiliate}
                disabled={isPending}
                style={{ flex: 1, background: "#7c3aed", color: "#fff", border: "none", borderRadius: 9, padding: "11px 0", fontWeight: 700, fontSize: 14, cursor: "pointer" }}
              >
                {isPending ? "Saving…" : "Save"}
              </button>
              <button
                onClick={() => setShowAffiliateModal(false)}
                style={{ flex: 1, background: "#f9fafb", color: "#374151", border: "1px solid #e5e7eb", borderRadius: 9, padding: "11px 0", fontWeight: 600, fontSize: 14, cursor: "pointer" }}
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function Section({ title, color, children }: { title: string; color: string; children: React.ReactNode }) {
  return (
    <div style={{ background: "#fafafa", borderRadius: 10, padding: "14px 16px", border: "1px solid #f3f4f6", borderTop: `3px solid ${color}` }}>
      <div style={{ fontSize: 11, fontWeight: 700, color: "#6b7280", textTransform: "uppercase", letterSpacing: "0.06em", marginBottom: 12 }}>{title}</div>
      {children}
    </div>
  );
}

function ActionBtn({ onClick, disabled, bg, color, border, label }: {
  onClick: () => void; disabled: boolean;
  bg: string; color: string; border?: string; label: string;
}) {
  return (
    <button
      onClick={onClick}
      disabled={disabled}
      style={{
        background: bg, color, border: border ? `1px solid ${border}` : "none",
        borderRadius: 9, padding: "9px 20px", fontWeight: 700, fontSize: 13,
        cursor: disabled ? "not-allowed" : "pointer", opacity: disabled ? 0.6 : 1,
        transition: "opacity 0.15s, transform 0.1s",
      }}
      onMouseDown={(e) => { if (!disabled) (e.currentTarget as HTMLButtonElement).style.transform = "scale(0.97)"; }}
      onMouseUp={(e) => { (e.currentTarget as HTMLButtonElement).style.transform = "scale(1)"; }}
    >
      {disabled ? "Processing…" : label}
    </button>
  );
}

// ─── Stat Card ────────────────────────────────────────────────────────────────

function StatCard({ label, value, sub, color, icon }: { label: string; value: string; sub?: string; color: string; icon: string }) {
  return (
    <div style={{
      background: "#fff", border: "1px solid #e5e7eb",
      borderRadius: 14, padding: "18px 20px",
      borderTop: `3px solid ${color}`,
    }}>
      <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 8 }}>
        <span style={{ fontSize: 18 }}>{icon}</span>
        <span style={{ fontSize: 11, fontWeight: 700, color: "#9ca3af", textTransform: "uppercase", letterSpacing: "0.05em" }}>{label}</span>
      </div>
      <div style={{ fontSize: 22, fontWeight: 800, color: "#111827", lineHeight: 1 }}>{value}</div>
      {sub && <div style={{ fontSize: 12, color: "#9ca3af", marginTop: 4 }}>{sub}</div>}
    </div>
  );
}

// ─── Main Component ───────────────────────────────────────────────────────────

interface Props {
  initialOrders: AdminOrderRow[];
  initialCounts: Record<string, number>;
  totalRevenue: number;
  totalCommissions: number;
  totalPlatformFees: number;
  avgOrderValue: number;
  vendors: VendorOption[];
  affiliates: AffiliateOption[];
}

export default function AdminOrdersClient({
  initialOrders,
  initialCounts,
  totalRevenue,
  totalCommissions,
  totalPlatformFees,
  avgOrderValue,
  vendors,
  affiliates,
}: Props) {
  const [orderList, setOrderList] = useState<AdminOrderRow[]>(initialOrders);
  const [counts, setCounts] = useState<Record<string, number>>(initialCounts);

  const [activeTab, setActiveTab] = useState<AdminOrderStatus>("ALL");
  const [search, setSearch] = useState("");
  const [vendorFilter, setVendorFilter] = useState("");
  const [dateFrom, setDateFrom] = useState("");
  const [dateTo, setDateTo] = useState("");

  // Optimistic update
  const handleMutate = (id: string, patch: Partial<AdminOrderRow>) => {
    setOrderList((prev) => {
      const updated = prev.map((o) => (o.id === id ? { ...o, ...patch } : o));
      // Recount
      const newCounts: Record<string, number> = { ALL: updated.length };
      for (const r of updated) newCounts[r.status] = (newCounts[r.status] ?? 0) + 1;
      setCounts(newCounts);
      return updated;
    });
  };

  const filtered = useMemo(() => {
    let list = orderList;
    if (activeTab !== "ALL") list = list.filter((o) => o.status === activeTab);
    if (vendorFilter) list = list.filter((o) => o.vendorId === vendorFilter);
    if (dateFrom) list = list.filter((o) => new Date(o.createdAt) >= new Date(dateFrom));
    if (dateTo) list = list.filter((o) => new Date(o.createdAt) <= new Date(dateTo + "T23:59:59"));
    if (search.trim()) {
      const q = search.toLowerCase();
      list = list.filter((o) =>
        o.id.toLowerCase().includes(q) ||
        o.customerName?.toLowerCase().includes(q) ||
        o.customerEmail?.toLowerCase().includes(q) ||
        o.productName?.toLowerCase().includes(q) ||
        o.vendorName?.toLowerCase().includes(q) ||
        o.affiliateName?.toLowerCase().includes(q) ||
        o.mpesaCode?.toLowerCase().includes(q)
      );
    }
    return list;
  }, [orderList, activeTab, vendorFilter, dateFrom, dateTo, search]);

  const hasFilters = search || vendorFilter || dateFrom || dateTo || activeTab !== "ALL";

  return (
    <>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=DM+Sans:ital,opsz,wght@0,9..40,400;0,9..40,500;0,9..40,600;0,9..40,700;0,9..40,800&display=swap');
        *, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }
        body { font-family: 'DM Sans', sans-serif; }
        @keyframes fadeIn { from { opacity: 0; transform: translateY(-4px); } to { opacity: 1; transform: translateY(0); } }
        .tab-pill { background: none; border: 1px solid #e5e7eb; border-radius: 20px; padding: 6px 14px; font-size: 12px; font-weight: 600; cursor: pointer; transition: all 0.15s; white-space: nowrap; font-family: 'DM Sans', sans-serif; display: flex; align-items: center; gap: 6px; }
        .tab-pill:hover { border-color: #7c3aed; color: #7c3aed; }
        .filter-input { border: 1px solid #e5e7eb; border-radius: 9px; padding: 9px 12px; font-size: 13px; outline: none; transition: border-color 0.15s, box-shadow 0.15s; font-family: 'DM Sans', sans-serif; background: #fff; }
        .filter-input:focus { border-color: #7c3aed; box-shadow: 0 0 0 3px rgba(124,58,237,0.08); }
        ::-webkit-scrollbar { width: 5px; height: 5px; }
        ::-webkit-scrollbar-thumb { background: #e5e7eb; border-radius: 3px; }
      `}</style>

      <div style={{ padding: "28px 24px", maxWidth: 1120, margin: "0 auto", fontFamily: "'DM Sans', sans-serif" }}>

        {/* Page Header */}
        <div style={{ marginBottom: 28, display: "flex", alignItems: "flex-start", justifyContent: "space-between", flexWrap: "wrap", gap: 12 }}>
          <div>
            <h1 style={{ fontSize: 28, fontWeight: 800, color: "#111827", letterSpacing: "-0.02em" }}>Orders</h1>
            <p style={{ color: "#6b7280", fontSize: 14, marginTop: 4 }}>
              Full visibility into all orders — payments, vendors, affiliates & logistics.
            </p>
          </div>
          <div style={{ background: "#f5f3ff", border: "1px solid #e9d5ff", borderRadius: 10, padding: "8px 16px", fontSize: 13, color: "#7c3aed", fontWeight: 600 }}>
            {counts.ALL ?? 0} total orders
          </div>
        </div>

        {/* Stat cards */}
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(170px, 1fr))", gap: 14, marginBottom: 28 }}>
          <StatCard label="Total Revenue" value={fmtK(totalRevenue)} sub="Excl. cancelled" color="#7c3aed" icon="💰" />
          <StatCard label="Platform Fees" value={fmtK(totalPlatformFees)} sub="Your earnings" color="#2563eb" icon="🏦" />
          <StatCard label="Commissions" value={fmtK(totalCommissions)} sub="Paid to affiliates" color="#d97706" icon="🔗" />
          <StatCard label="Avg Order" value={fmtK(avgOrderValue)} sub="Per transaction" color="#0891b2" icon="📊" />
          <StatCard label="Delivered" value={String(counts.DELIVERED ?? 0)} sub={`of ${counts.ALL ?? 0} total`} color="#16a34a" icon="✅" />
          <StatCard label="Cancelled" value={String(counts.CANCELLED ?? 0)} sub="Need review" color="#dc2626" icon="⚠️" />
        </div>

        {/* Status tabs */}
        <div style={{ display: "flex", gap: 6, flexWrap: "wrap", marginBottom: 16 }}>
          {STATUS_TABS.map((tab) => {
            const count = tab.value === "ALL" ? (counts.ALL ?? 0) : (counts[tab.value] ?? 0);
            const isActive = activeTab === tab.value;
            return (
              <button
                key={tab.value}
                className="tab-pill"
                onClick={() => setActiveTab(tab.value)}
                style={isActive ? { background: tab.color, color: "#fff", borderColor: tab.color } : { color: "#6b7280" }}
              >
                <span style={{ width: 6, height: 6, borderRadius: "50%", background: isActive ? "rgba(255,255,255,0.6)" : tab.dot, flexShrink: 0 }} />
                {tab.label}
                <span style={{
                  background: isActive ? "rgba(255,255,255,0.25)" : "#f3f4f6",
                  color: isActive ? "#fff" : "#6b7280",
                  borderRadius: 10, padding: "1px 7px", fontSize: 10, fontWeight: 800,
                }}>
                  {count}
                </span>
              </button>
            );
          })}
        </div>

        {/* Filter bar */}
        <div style={{
          background: "#fff", border: "1px solid #e5e7eb", borderRadius: 12,
          padding: "14px 16px", marginBottom: 20,
          display: "flex", gap: 10, flexWrap: "wrap", alignItems: "center",
        }}>
          {/* Search */}
          <div style={{ position: "relative", flex: "1 1 240px" }}>
            <span style={{ position: "absolute", left: 10, top: "50%", transform: "translateY(-50%)", fontSize: 14, color: "#9ca3af" }}>🔍</span>
            <input
              className="filter-input"
              style={{ width: "100%", paddingLeft: 32 }}
              placeholder="Search order ID, customer, product, M-Pesa code…"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </div>

          {/* Vendor filter */}
          <select
            className="filter-input"
            style={{ flex: "0 1 180px" }}
            value={vendorFilter}
            onChange={(e) => setVendorFilter(e.target.value)}
          >
            <option value="">All Vendors</option>
            {vendors.map((v) => <option key={v.id} value={v.id}>{v.name}</option>)}
          </select>

          {/* Date from */}
          <input
            type="date"
            className="filter-input"
            style={{ flex: "0 1 150px" }}
            value={dateFrom}
            onChange={(e) => setDateFrom(e.target.value)}
            placeholder="From"
          />

          {/* Date to */}
          <input
            type="date"
            className="filter-input"
            style={{ flex: "0 1 150px" }}
            value={dateTo}
            onChange={(e) => setDateTo(e.target.value)}
            placeholder="To"
          />

          {/* Clear filters */}
          {hasFilters && (
            <button
              onClick={() => { setSearch(""); setVendorFilter(""); setDateFrom(""); setDateTo(""); setActiveTab("ALL"); }}
              style={{
                background: "#fef2f2", color: "#dc2626", border: "1px solid #fecaca",
                borderRadius: 8, padding: "8px 14px", fontSize: 12, fontWeight: 600, cursor: "pointer",
              }}
            >
              ✕ Clear
            </button>
          )}
        </div>

        {/* Results count */}
        <div style={{ color: "#6b7280", fontSize: 13, marginBottom: 12 }}>
          Showing <strong style={{ color: "#111827" }}>{filtered.length}</strong> order{filtered.length !== 1 ? "s" : ""}
          {hasFilters && " (filtered)"}
        </div>

        {/* Orders list */}
        {filtered.length === 0 ? (
          <div style={{ textAlign: "center", padding: "80px 0", color: "#9ca3af" }}>
            <div style={{ fontSize: 48, marginBottom: 14 }}>📭</div>
            <p style={{ fontSize: 16, fontWeight: 600, color: "#374151" }}>No orders found</p>
            <p style={{ fontSize: 13, marginTop: 6 }}>Try adjusting your filters or search query.</p>
          </div>
        ) : (
          <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
            {filtered.map((order) => (
              <OrderCard key={order.id} order={order} affiliates={affiliates} onMutate={handleMutate} />
            ))}
          </div>
        )}
      </div>
    </>
  );
}
