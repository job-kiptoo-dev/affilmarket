"use client";

import { useState } from "react";
import { CheckCircle, XCircle, Loader2, ChevronDown, ChevronUp } from "lucide-react";
import { reviewProduct } from "@/action/reviewProductAction";

interface Props {
  productId: string;
  productTitle: string;
}

export function ProductReviewButtons({ productId, productTitle }: Props) {
  const [loading,     setLoading]     = useState<"approve" | "reject" | null>(null);
  const [done,        setDone]        = useState<"approved" | "rejected" | null>(null);
  const [showNote,    setShowNote]    = useState(false);
  const [adminNote,   setAdminNote]   = useState("");
  const [error,       setError]       = useState<string | null>(null);

  async function handle(action: "approve" | "reject") {
    setLoading(action);
    setError(null);

    const result = await reviewProduct({
      productId,
      action,
      adminNote: adminNote.trim() || undefined,
    });

    setLoading(null);

    if (result.error) {
      setError(result.error);
      return;
    }

    setDone(action === "approve" ? "approved" : "rejected");
  }

  if (done) {
    return (
      <div className={`flex items-center gap-2 text-sm font-semibold px-3 py-2 rounded-lg ${
        done === "approved"
          ? "bg-green-50 text-green-700 border border-green-200"
          : "bg-red-50 text-red-700 border border-red-200"
      }`}>
        {done === "approved"
          ? <><CheckCircle size={14} /> Approved</>
          : <><XCircle size={14} /> Rejected</>}
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-2">
      {/* Note toggle */}
      <button
        type="button"
        onClick={() => setShowNote((v) => !v)}
        className="flex items-center gap-1 text-xs text-gray-400 hover:text-gray-600 transition-colors self-end"
      >
        {showNote ? <ChevronUp size={12} /> : <ChevronDown size={12} />}
        {showNote ? "Hide note" : "Add note"}
      </button>

      {showNote && (
        <textarea
          value={adminNote}
          onChange={(e) => setAdminNote(e.target.value)}
          placeholder="Optional note to vendor (reason for rejection, feedback…)"
          maxLength={500}
          rows={2}
          className="w-full text-xs border border-gray-200 rounded-lg px-3 py-2 resize-none outline-none focus:border-gray-400 text-gray-700 placeholder:text-gray-300"
        />
      )}

      {error && (
        <p className="text-xs text-red-600">{error}</p>
      )}

      <div className="flex gap-2">
        <button
          type="button"
          disabled={!!loading}
          onClick={() => handle("approve")}
          className="flex-1 flex items-center justify-center gap-1.5 px-3 py-2 bg-green-600 hover:bg-green-700 disabled:opacity-60 text-white text-xs font-bold rounded-lg transition-colors cursor-pointer"
        >
          {loading === "approve"
            ? <Loader2 size={13} className="animate-spin" />
            : <CheckCircle size={13} />}
          Approve
        </button>

        <button
          type="button"
          disabled={!!loading}
          onClick={() => handle("reject")}
          className="flex-1 flex items-center justify-center gap-1.5 px-3 py-2 bg-red-500 hover:bg-red-600 disabled:opacity-60 text-white text-xs font-bold rounded-lg transition-colors cursor-pointer"
        >
          {loading === "reject"
            ? <Loader2 size={13} className="animate-spin" />
            : <XCircle size={13} />}
          Reject
        </button>
      </div>
    </div>
  );
}
