
export const TABS = [
  { key: 'REQUESTED', label: 'Pending',  color: '#d97706' },
  { key: 'APPROVED',  label: 'Approved', color: '#2563eb' },
  { key: 'PAID',      label: 'Paid',     color: '#16a34a' },
  { key: 'REJECTED',  label: 'Rejected', color: '#dc2626' },
  { key: 'ALL',       label: 'All',      color: '#6b7280' },
];

export const STATUS_STYLE: Record<string, { bg: string; color: string }> = {
  REQUESTED: { bg: '#fffbeb', color: '#d97706' },
  APPROVED:  { bg: '#eff6ff', color: '#2563eb' },
  PAID:      { bg: '#f0fdf4', color: '#16a34a' },
  REJECTED:  { bg: '#fef2f2', color: '#dc2626' },
};
