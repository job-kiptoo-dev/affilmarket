import { AdminOrderStatus } from "@/action/AdminOrderAction";

export const STATUS_TABS: { label: string; value: AdminOrderStatus; color: string; dot: string }[] = [
  { label: "All",       value: "ALL",       color: "#7c3aed", dot: "#7c3aed" },
  { label: "Created",   value: "CREATED",   color: "#6b7280", dot: "#9ca3af" },
  { label: "Paid",      value: "PAID",      color: "#2563eb", dot: "#3b82f6" },
  { label: "Confirmed", value: "CONFIRMED", color: "#0891b2", dot: "#06b6d4" },
  { label: "Shipped",   value: "SHIPPED",   color: "#d97706", dot: "#f59e0b" },
  { label: "Delivered", value: "DELIVERED", color: "#16a34a", dot: "#22c55e" },
  { label: "Cancelled", value: "CANCELLED", color: "#dc2626", dot: "#ef4444" },
];

export const STATUS_META: Record<string, { bg: string; color: string; border: string; label: string; icon: string }> = {
  CREATED:   { bg: "#f9fafb", color: "#374151", border: "#e5e7eb", label: "Created",   icon: "🕐" },
  PAID:      { bg: "#eff6ff", color: "#1d4ed8", border: "#bfdbfe", label: "Paid",      icon: "💳" },
  CONFIRMED: { bg: "#ecfeff", color: "#0e7490", border: "#a5f3fc", label: "Confirmed", icon: "✅" },
  SHIPPED:   { bg: "#fffbeb", color: "#b45309", border: "#fde68a", label: "Shipped",   icon: "🚚" },
  DELIVERED: { bg: "#f0fdf4", color: "#15803d", border: "#bbf7d0", label: "Delivered", icon: "📦" },
  CANCELLED: { bg: "#fef2f2", color: "#b91c1c", border: "#fecaca", label: "Cancelled", icon: "✕"  },
};

export const ORDER_FLOW = ["CREATED", "PAID", "CONFIRMED", "SHIPPED", "DELIVERED"];
