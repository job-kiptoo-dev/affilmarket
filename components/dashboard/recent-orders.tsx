import { formatKES, formatDate } from '@/lib/utils';
import { cn } from '@/lib/utils';

const statusStyles: Record<string, string> = {
  CREATED: 'bg-gray-100 text-gray-600',
  PAID: 'bg-blue-100 text-blue-700',
  CONFIRMED: 'bg-purple-100 text-purple-700',
  SHIPPED: 'bg-amber-100 text-amber-700',
  DELIVERED: 'bg-green-100 text-green-700',
  CANCELLED: 'bg-red-100 text-red-700',
};

const paymentStyles: Record<string, string> = {
  PENDING: 'bg-yellow-100 text-yellow-700',
  PAID: 'bg-green-100 text-green-700',
  FAILED: 'bg-red-100 text-red-700',
  REFUNDED: 'bg-gray-100 text-gray-600',
};

interface RecentOrdersProps {
  orders: any[];
  role: 'VENDOR' | 'AFFILIATE' | 'ADMIN';
}

export function RecentOrders({ orders, role }: RecentOrdersProps) {
  if (!orders.length) {
    return (
      <div className="text-center py-12 text-gray-400">
        <p>No orders yet. They'll appear here when customers make purchases.</p>
      </div>
    );
  }

  return (
    <div className="overflow-x-auto">
      <table className="w-full text-sm">
        <thead>
          <tr className="border-b border-gray-100">
            <th className="text-left text-xs font-medium text-gray-400 uppercase tracking-wide pb-3">Order</th>
            <th className="text-left text-xs font-medium text-gray-400 uppercase tracking-wide pb-3">Product</th>
            <th className="text-left text-xs font-medium text-gray-400 uppercase tracking-wide pb-3">Customer</th>
            <th className="text-left text-xs font-medium text-gray-400 uppercase tracking-wide pb-3">Amount</th>
            <th className="text-left text-xs font-medium text-gray-400 uppercase tracking-wide pb-3">Payment</th>
            <th className="text-left text-xs font-medium text-gray-400 uppercase tracking-wide pb-3">Status</th>
            <th className="text-left text-xs font-medium text-gray-400 uppercase tracking-wide pb-3">Date</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-gray-50">
          {orders.map((order) => (
            <tr key={order.id} className="hover:bg-gray-50 transition-colors">
              <td className="py-3 pr-4">
                <span className="font-mono text-xs text-gray-500">#{order.id.slice(0, 8)}</span>
              </td>
              <td className="py-3 pr-4">
                <span className="font-medium text-gray-900 line-clamp-1 max-w-[160px]">
                  {order.product?.title || 'N/A'}
                </span>
              </td>
              <td className="py-3 pr-4">
                <div>
                  <p className="font-medium text-gray-900">{order.customerName}</p>
                  <p className="text-xs text-gray-400">{order.customerPhone}</p>
                </div>
              </td>
              <td className="py-3 pr-4">
                <span className="font-semibold text-gray-900">{formatKES(order.totalAmount)}</span>
              </td>
              <td className="py-3 pr-4">
                <span className={cn('inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium', paymentStyles[order.paymentStatus])}>
                  {order.paymentStatus}
                </span>
              </td>
              <td className="py-3 pr-4">
                <span className={cn('inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium', statusStyles[order.orderStatus])}>
                  {order.orderStatus}
                </span>
              </td>
              <td className="py-3 text-xs text-gray-400 whitespace-nowrap">
                {formatDate(order.createdAt)}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
