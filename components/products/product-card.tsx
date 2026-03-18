"use client";

import Link from 'next/link';
import Image from 'next/image';
import { Star, MapPin, Tag, Check, Copy } from 'lucide-react';
import { useState } from 'react';
import { formatKES } from '@/lib/utils';

interface ProductCardProps {
  product: {
    id: string;
    title: string;
    slug: string;
    price: string | number | null;
    mainImageUrl: string | null;
    shortDescription: string | null;
    affiliateCommissionRate: string | number | null;
    vendor: {
      shopName: string;
      shopAddress?: { city?: string } | null;
    };
    category: { name: string } | null;
    _count?: { orders: number; reviews: number };
  };
  showAffiliateLink?: boolean;
  affiliateToken?: string;
}

export function ProductCard({ product, showAffiliateLink, affiliateToken }: ProductCardProps) {
  const [copied, setCopied]       = useState(false);
  const [imgBroken, setImgBroken] = useState(false);

  const price          = parseFloat(product.price?.toString() || '0') || 0;
  const commissionRate = parseFloat(product.affiliateCommissionRate?.toString() || '0') || 0;
  const commissionAmount = price * commissionRate;
  const city = product.vendor.shopAddress?.city || 'Kenya';

  const handleCopyLink = async () => {
    try {
      const link = `${window.location.origin}/products/${product.slug}?aff=${affiliateToken}`;
      await navigator.clipboard.writeText(link);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      // Clipboard API blocked (e.g. non-HTTPS) — silently ignore
    }
  };

  return (
    <div className="group bg-white rounded-2xl border border-gray-100 overflow-hidden card-hover">
      {/* Image */}
      <Link href={`/products/${product.slug}`}>
        <div className="relative aspect-square bg-gray-50 overflow-hidden">
          {product.mainImageUrl && !imgBroken ? (
            <Image
              src={product.mainImageUrl}
              alt={product.title}
              fill
              className="object-cover group-hover:scale-105 transition-transform duration-300"
              onError={() => setImgBroken(true)}  // ✅ fallback on broken URL
            />
          ) : (
            <div className="w-full h-full flex items-center justify-center text-gray-300">
              <Tag className="w-12 h-12" />
            </div>
          )}
          {commissionRate > 0 && (
            <div className="absolute top-3 left-3 bg-amber-500 text-white text-xs font-bold px-2.5 py-1 rounded-full">
              {Math.round(commissionRate * 100)}% commission
            </div>
          )}
        </div>
      </Link>

      {/* Content */}
      <div className="p-4">
        {product.category && (
          <p className="text-xs text-brand-green font-medium mb-1">{product.category.name}</p>
        )}
        <Link href={`/products/${product.slug}`}>
          <h3 className="font-semibold text-gray-900 text-sm leading-snug mb-1 line-clamp-2 hover:text-brand-green transition-colors">
            {product.title}
          </h3>
        </Link>
        <div className="flex items-center gap-1 text-xs text-gray-400 mb-3">
          <MapPin className="w-3 h-3" />
          <span>{product.vendor.shopName}</span>
          <span>·</span>
          <span>{city}</span>
        </div>

        <div className="flex items-center justify-between">
          <div>
            <p className="text-lg font-bold text-gray-900">{formatKES(price)}</p>
            {commissionAmount > 0 && (
              <p className="text-xs text-amber-600 font-medium">
                Earn {formatKES(commissionAmount)}
              </p>
            )}
          </div>
          {product._count && (
            <div className="flex items-center gap-1 text-xs text-gray-400">
              <Star className="w-3 h-3 text-amber-400 fill-amber-400" />
              <span>{product._count.orders} sold</span>
            </div>
          )}
        </div>

        {/* ✅ Copy button with feedback state */}
        {showAffiliateLink && affiliateToken && (
          <button
            onClick={handleCopyLink}
            className={`mt-3 w-full text-xs border py-2 rounded-lg transition-colors font-medium flex items-center justify-center gap-1.5
              ${copied
                ? 'bg-green-50 text-green-700 border-green-200'
                : 'bg-amber-50 text-amber-700 border-amber-200 hover:bg-amber-100'
              }`}
          >
            {copied
              ? <><Check className="w-3 h-3" /> Copied!</>
              : <><Copy className="w-3 h-3" /> Copy Affiliate Link</>
            }
          </button>
        )}
      </div>
    </div>
  );
}
