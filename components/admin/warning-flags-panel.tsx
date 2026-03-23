'use client';

import Link from 'next/link';
import { AlertTriangle, TrendingDown, Zap, ChevronRight } from 'lucide-react';

interface FlaggedVendor {
  id: string;
  shopName: string;
  status: string;
  totalOrders: number;
  cancelledOrders: number;
}

interface FlaggedAffiliate {
  id: string;
  name: string;
  email: string;
  status: string;
  totalClicks: number;
  totalOrders: number;
}

interface Props {
  flaggedVendors:    FlaggedVendor[];
  flaggedAffiliates: FlaggedAffiliate[];
}

export function WarningFlagsPanel({ flaggedVendors, flaggedAffiliates }: Props) {
  const totalFlags = flaggedVendors.length + flaggedAffiliates.length;
  if (totalFlags === 0) return null;

  return (
    <div className="bg-white border border-red-100 rounded-2xl shadow-sm overflow-hidden">
      {/* Header */}
      <div className="flex items-center gap-3 px-6 py-4 bg-red-50 border-b border-red-100">
        <span className="flex items-center justify-center w-8 h-8 rounded-full bg-red-100">
          <AlertTriangle className="w-4 h-4 text-red-600" />
        </span>
        <div>
          <h2 className="text-base font-semibold text-red-900">Warning Flags</h2>
          <p className="text-xs text-red-600">
            {totalFlags} account{totalFlags > 1 ? 's' : ''} flagged for review
          </p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 divide-y lg:divide-y-0 lg:divide-x divide-gray-100">
        {/* Vendors with high cancellation rate */}
        <div className="p-6">
          <div className="flex items-center gap-2 mb-4">
            <TrendingDown className="w-4 h-4 text-orange-500" />
            <span className="text-sm font-semibold text-gray-800">
              High Cancellation Vendors
            </span>
            <span className="ml-auto text-xs font-medium px-2 py-0.5 bg-orange-100 text-orange-700 rounded-full">
              {flaggedVendors.length}
            </span>
          </div>

          {flaggedVendors.length === 0 ? (
            <p className="text-sm text-gray-400 italic">No vendors flagged</p>
          ) : (
            <ul className="space-y-3">
              {flaggedVendors.map((v) => {
                const rate = Math.round((v.cancelledOrders / v.totalOrders) * 100);
                return (
                  <li key={v.id}
                    className="flex items-center gap-3 p-3 rounded-xl bg-orange-50 border border-orange-100">
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-gray-900 truncate">{v.shopName}</p>
                      <p className="text-xs text-gray-500">
                        {v.cancelledOrders}/{v.totalOrders} orders cancelled
                      </p>
                    </div>
                    <div className="text-right shrink-0">
                      <span className={`text-sm font-bold ${rate >= 50 ? 'text-red-600' : 'text-orange-600'}`}>
                        {rate}%
                      </span>
                      <p className="text-xs text-gray-400">cancel rate</p>
                    </div>
                    <Link
                      href={`/admin/users?tab=vendors&highlight=${v.id}`}
                      className="shrink-0 p-1.5 rounded-lg hover:bg-orange-100 transition-colors">
                      <ChevronRight className="w-4 h-4 text-orange-400" />
                    </Link>
                  </li>
                );
              })}
            </ul>
          )}
        </div>

        {/* Affiliates with suspicious traffic */}
        <div className="p-6">
          <div className="flex items-center gap-2 mb-4">
            <Zap className="w-4 h-4 text-yellow-500" />
            <span className="text-sm font-semibold text-gray-800">
              Suspicious Affiliate Traffic
            </span>
            <span className="ml-auto text-xs font-medium px-2 py-0.5 bg-yellow-100 text-yellow-700 rounded-full">
              {flaggedAffiliates.length}
            </span>
          </div>

          {flaggedAffiliates.length === 0 ? (
            <p className="text-sm text-gray-400 italic">No affiliates flagged</p>
          ) : (
            <ul className="space-y-3">
              {flaggedAffiliates.map((a) => {
                const convRate = a.totalClicks > 0
                  ? ((a.totalOrders / a.totalClicks) * 100).toFixed(2)
                  : '0.00';
                return (
                  <li key={a.id}
                    className="flex items-center gap-3 p-3 rounded-xl bg-yellow-50 border border-yellow-100">
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-gray-900 truncate">{a.name}</p>
                      <p className="text-xs text-gray-500 truncate">{a.email}</p>
                    </div>
                    <div className="text-right shrink-0">
                      <span className="text-sm font-bold text-yellow-700">
                        {convRate}%
                      </span>
                      <p className="text-xs text-gray-400">
                        {a.totalOrders}/{a.totalClicks} clicks
                      </p>
                    </div>
                    <Link
                      href={`/admin/users?tab=affiliates&highlight=${a.id}`}
                      className="shrink-0 p-1.5 rounded-lg hover:bg-yellow-100 transition-colors">
                      <ChevronRight className="w-4 h-4 text-yellow-400" />
                    </Link>
                  </li>
                );
              })}
            </ul>
          )}
        </div>
      </div>
    </div>
  );
}
