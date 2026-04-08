
export interface User {
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

export interface Props {
  users:        User[];
  activeRole:   string;
  activeStatus: string;
  counts:       Record<string, number>;
}

export const ROLE_TABS = [
  { key: 'ALL',       label: 'All Users',  icon: '👥' },
  { key: 'VENDOR',    label: 'Vendors',    icon: '🏪' },
  { key: 'AFFILIATE', label: 'Affiliates', icon: '🔗' },
  { key: 'BOTH',      label: 'Both',       icon: '⚡' },
  { key: 'ADMIN',     label: 'Admins',     icon: '🛡️' },
];

export const STATUS_STYLE: Record<string, { bg: string; color: string }> = {
  active:               { bg: '#f0fdf4', color: '#16a34a' },
  suspended:            { bg: '#fef2f2', color: '#dc2626' },
  pending_verification: { bg: '#fffbeb', color: '#d97706' },
};

export const ROLE_STYLE: Record<string, { bg: string; color: string }> = {
  VENDOR:    { bg: '#f0fdf4', color: '#16a34a' },
  AFFILIATE: { bg: '#eff6ff', color: '#2563eb' },
  BOTH:      { bg: '#f5f3ff', color: '#7c3aed' },
  ADMIN:     { bg: '#fef2f2', color: '#dc2626' },
};
