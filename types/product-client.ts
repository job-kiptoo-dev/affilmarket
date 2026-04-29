interface Product {
  id: string; title: string; slug: string;
  price: number; status: string;
  mainImageUrl: string | null; shortDescription: string | null;
  stockQuantity: number;
  affiliateCommissionRate: number; adminNote: string | null;
  createdAt: string; shopName: string; categoryName: string | null;
}

export interface Props {
  products:  Product[];
  activeTab: string;
  counts:    { pending: number; active: number; rejected: number };
}

export const TABS = [
  { key: 'pending_approval', label: 'Pending Review', color: '#d97706' },
  { key: 'active',           label: 'Approved',       color: '#16a34a' },
  { key: 'rejected',         label: 'Rejected',       color: '#dc2626' },
];



// Before
// interface Product {
//   id: string; title: string; slug: string;
//   price: number; status: string;
//   mainImageUrl: string | null; shortDescription: string | null;
//   affiliateCommissionRate: number; adminNote: string | null;
//   createdAt: string; shopName: string; categoryName: string | null;
// }
//
// // After — add stockQuantity
// interface Product {
//   id: string; title: string; slug: string;
//   price: number; status: string;
//   mainImageUrl: string | null; shortDescription: string | null;
//   stockQuantity: number;
//   affiliateCommissionRate: number; adminNote: string | null;
//   createdAt: string; shopName: string; categoryName: string | null;
// }
