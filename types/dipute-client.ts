
interface Message {
  authorId:   string;
  authorName: string;
  body:       string;
  createdAt:  string;
}
export interface Dispute {
  id:           string;
  orderId:      string;
  status:       string;            // 'open' | 'resolved'
  messages:     Message[];
  createdAt:    string;
  updatedAt:    string;
  openedByName: string;
  customerName: string | null;
  totalAmount:  string | null;
}
export interface Props {
  disputes:  Dispute[];
  adminId:   string;
  adminName: string;
}

