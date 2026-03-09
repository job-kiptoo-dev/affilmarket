import Link from 'next/link';
import Image from 'next/image';
import { Star, MapPin, Tag } from 'lucide-react';
import { formatKES } from '@/lib/utils';

interface ProductCardProps {
  product: {
    id: string;
    title: string;
    slug: string;
    price: any;
    mainImageUrl: string | null;
    shortDescription: string | null;
    affiliateCommissionRate: any;
    vendor: {
      shopName: string;
      shopAddress?: any;
    };
    category: { name: string } | null;
    _count?: { orders: number; reviews: number };
  };
  showAffiliateLink?: boolean;
  affiliateToken?: string;
}

export function ProductCard({ product, showAffiliateLink, affiliateToken }: ProductCardProps) {
  const price = parseFloat(product.price?.toString() || '0');
  const commissionRate = parseFloat(product.affiliateCommissionRate?.toString() || '0');
  const commissionAmount = price * commissionRate;
  const city = product.vendor.shopAddress?.city || 'Kenya';

  return (
    <div className="group bg-white rounded-2xl border border-gray-100 overflow-hidden card-hover">
      {/* Image */}
      <Link href={`/products/${product.slug}`}>
        <div className="relative aspect-square bg-gray-50 overflow-hidden">
          {product.mainImageUrl ? (
            <Image
              src={product.mainImageUrl}
              alt={product.title}
              fill
              className="object-cover group-hover:scale-105 transition-transform duration-300"
            />
          ) : (
            <div className="w-full h-full flex items-center justify-center text-gray-300">
              <Tag className="w-12 h-12" />
            </div>
          )}

          {/* Commission badge */}
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

        {showAffiliateLink && affiliateToken && (
          <button
            onClick={() => {
              const link = `${window.location.origin}/products/${product.slug}?aff=${affiliateToken}`;
              navigator.clipboard.writeText(link);
            }}
            className="mt-3 w-full text-xs bg-amber-50 text-amber-700 border border-amber-200 py-2 rounded-lg hover:bg-amber-100 transition-colors font-medium"
          >
            📋 Copy Affiliate Link
          </button>
        )}
      </div>
    </div>
  );
}
