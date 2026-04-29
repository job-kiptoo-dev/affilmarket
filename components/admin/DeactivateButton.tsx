'use client';

import { useState }          from 'react';
import { useRouter }         from 'next/navigation';
import { deactivateProduct } from '@/action/adminProductAction';
import { XCircle, Loader2 }  from 'lucide-react';

export function DeactivateButton({
  productId,
  productTitle,
  isOutOfStock,
}: {
  productId:    string;
  productTitle: string;
  isOutOfStock: boolean;
}) {
  const router   = useRouter();
  const [open,    setOpen]    = useState(false);
  const [note,    setNote]    = useState('');
  const [loading, setLoading] = useState(false);

  const handleDeactivate = async () => {
    setLoading(true);
    await deactivateProduct(productId, note || undefined);
    setLoading(false);
    setOpen(false);
    setNote('');
    router.refresh();
  };

  return (
    <div>
      {!open ? (
        <button
          onClick={() => setOpen(true)}
          className="w-full flex items-center justify-center gap-2 px-4 py-2 text-sm font-semibold text-red-600 bg-red-50 hover:bg-red-100 border border-red-200 rounded-xl transition-colors"
        >
          <XCircle size={14} />
          {isOutOfStock ? 'Deactivate (out of stock)' : 'Deactivate'}
        </button>
      ) : (
        <div className="bg-red-50 border border-red-200 rounded-xl p-3 space-y-2">
          <p className="text-xs font-semibold text-red-700">
            Deactivate "{productTitle}"?
          </p>
          <textarea
            className="w-full text-xs border border-red-200 rounded-lg p-2 resize-none outline-none min-h-[50px] font-sans"
            placeholder="Reason (optional)..."
            value={note}
            onChange={(e) => setNote(e.target.value)}
          />
          <div className="flex gap-2">
            <button
              onClick={() => { setOpen(false); setNote(''); }}
              className="flex-1 px-3 py-1.5 text-xs font-semibold text-gray-600 bg-white border border-gray-200 rounded-lg"
            >
              Cancel
            </button>
            <button
              onClick={handleDeactivate}
              disabled={loading}
              className="flex-1 px-3 py-1.5 text-xs font-semibold text-white bg-red-600 hover:bg-red-700 rounded-lg flex items-center justify-center gap-1 disabled:opacity-50"
            >
              {loading
                ? <><Loader2 size={11} className="animate-spin" /> Deactivating...</>
                : 'Confirm'}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
