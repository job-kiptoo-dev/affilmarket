'use client';

import { useState, useTransition } from 'react';
import {
  Plus, MessageSquare, ChevronDown, ChevronUp,
  CheckCircle2, AlertCircle, X, Loader2, Send,
} from 'lucide-react';

// ─── Types ────────────────────────────────────────────────────────────────────

interface Message {
  authorId:   string;
  authorName: string;
  body:       string;
  createdAt:  string;
}
interface Dispute {
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
interface Props {
  disputes:  Dispute[];
  adminId:   string;
  adminName: string;
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

function timeAgo(iso: string) {
  const diff = Date.now() - new Date(iso).getTime();
  const m = Math.floor(diff / 60000);
  if (m < 60)  return `${m}m ago`;
  const h = Math.floor(m / 60);
  if (h < 24)  return `${h}h ago`;
  return `${Math.floor(h / 24)}d ago`;
}

function StatusBadge({ status }: { status: string }) {
  return status === 'open' ? (
    <span className="inline-flex items-center gap-1 text-xs font-medium px-2.5 py-1 rounded-full bg-red-100 text-red-700">
      <AlertCircle className="w-3 h-3" /> Open
    </span>
  ) : (
    <span className="inline-flex items-center gap-1 text-xs font-medium px-2.5 py-1 rounded-full bg-green-100 text-green-700">
      <CheckCircle2 className="w-3 h-3" /> Resolved
    </span>
  );
}

// ─── New Dispute Modal ────────────────────────────────────────────────────────

function NewDisputeModal({
  adminId, adminName, onClose, onCreated,
}: {
  adminId: string; adminName: string;
  onClose: () => void; onCreated: (d: Dispute) => void;
}) {
  const [orderId, setOrderId]   = useState('');
  const [body, setBody]         = useState('');
  const [error, setError]       = useState('');
  const [isPending, start]      = useTransition();

  async function submit() {
    if (!orderId.trim() || !body.trim()) {
      setError('Order ID and description are required.');
      return;
    }
    start(async () => {
      const res = await fetch('/api/admin/disputes', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ orderId: orderId.trim(), body: body.trim() }),
      });
      if (!res.ok) { setError('Failed to open dispute.'); return; }
      const created = await res.json();
      onCreated(created);
    });
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" onClick={onClose} />
      <div className="relative bg-white rounded-2xl shadow-2xl w-full max-w-lg p-6 space-y-5">
        <button onClick={onClose} className="absolute top-4 right-4 text-gray-400 hover:text-gray-600">
          <X className="w-5 h-5" />
        </button>
        <div>
          <h3 className="text-lg font-semibold text-gray-900">Open New Case</h3>
          <p className="text-sm text-gray-400 mt-1">Create an internal dispute log for a complaint</p>
        </div>
        <div className="space-y-3">
          <div>
            <label className="text-sm font-medium text-gray-700">Order ID</label>
            <input
              className="mt-1 w-full border border-gray-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand-green/30"
              placeholder="Paste the order UUID…"
              value={orderId}
              onChange={(e) => setOrderId(e.target.value)}
            />
          </div>
          <div>
            <label className="text-sm font-medium text-gray-700">Initial note</label>
            <textarea
              className="mt-1 w-full border border-gray-200 rounded-xl px-3 py-2 text-sm resize-none focus:outline-none focus:ring-2 focus:ring-brand-green/30"
              rows={4}
              placeholder="Describe the complaint or issue…"
              value={body}
              onChange={(e) => setBody(e.target.value)}
            />
          </div>
        </div>
        {error && <p className="text-sm text-red-600">{error}</p>}
        <div className="flex gap-3">
          <button onClick={onClose}
            className="flex-1 px-4 py-2 rounded-xl border border-gray-200 text-sm font-medium text-gray-700 hover:bg-gray-50 transition-colors">
            Cancel
          </button>
          <button onClick={submit} disabled={isPending}
            className="flex-1 px-4 py-2 rounded-xl bg-brand-green text-white text-sm font-medium hover:opacity-90 transition-opacity flex items-center justify-center gap-2 disabled:opacity-60">
            {isPending && <Loader2 className="w-4 h-4 animate-spin" />}
            Open Case
          </button>
        </div>
      </div>
    </div>
  );
}

// ─── Dispute Card ─────────────────────────────────────────────────────────────

function DisputeCard({
  dispute, adminId, adminName,
}: { dispute: Dispute; adminId: string; adminName: string }) {
  const [expanded, setExpanded]   = useState(false);
  const [messages, setMessages]   = useState(dispute.messages);
  const [status, setStatus]       = useState(dispute.status);
  const [note, setNote]           = useState('');
  const [isPending, start]        = useTransition();

  async function addMessage() {
    if (!note.trim()) return;
    start(async () => {
      const res = await fetch(`/api/admin/disputes/${dispute.id}/messages`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ body: note.trim(), authorId: adminId, authorName: adminName }),
      });
      if (res.ok) {
        const updated = await res.json();
        setMessages(updated.messages);
        setNote('');
      }
    });
  }

  async function toggleStatus() {
    const next = status === 'open' ? 'resolved' : 'open';
    start(async () => {
      await fetch(`/api/admin/disputes/${dispute.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: next }),
      });
      setStatus(next);
    });
  }

  const firstMessage = messages[0];

  return (
    <div className={`bg-white border rounded-2xl overflow-hidden shadow-sm ${
      status === 'open' ? 'border-red-100' : 'border-gray-100'
    }`}>
      {/* Header row */}
      <div
        className="flex items-start gap-4 px-5 py-4 cursor-pointer hover:bg-gray-50/60 transition-colors"
        onClick={() => setExpanded((e) => !e)}>
        <div className="flex-1 min-w-0 space-y-1.5">
          <div className="flex items-center gap-3 flex-wrap">
            <StatusBadge status={status} />
            <span className="text-xs text-gray-400 font-mono">
              Order #{dispute.orderId.slice(0, 8)}…
            </span>
            {dispute.customerName && (
              <span className="text-xs text-gray-400">· {dispute.customerName}</span>
            )}
            {dispute.totalAmount && (
              <span className="text-xs text-gray-400">
                · KES {parseFloat(dispute.totalAmount).toLocaleString()}
              </span>
            )}
            <span className="text-xs text-gray-300">·</span>
            <span className="text-xs text-gray-400">{timeAgo(dispute.createdAt)}</span>
            {messages.length > 0 && (
              <span className="flex items-center gap-1 text-xs text-gray-400">
                <MessageSquare className="w-3 h-3" /> {messages.length}
              </span>
            )}
          </div>
          {firstMessage && (
            <p className="text-sm text-gray-700 line-clamp-1">{firstMessage.body}</p>
          )}
          <p className="text-xs text-gray-400">Opened by {dispute.openedByName}</p>
        </div>
        {expanded
          ? <ChevronUp className="w-4 h-4 text-gray-400 shrink-0 mt-1" />
          : <ChevronDown className="w-4 h-4 text-gray-400 shrink-0 mt-1" />}
      </div>

      {/* Expanded */}
      {expanded && (
        <div className="border-t border-gray-100 px-5 py-4 space-y-5">
          {/* Status toggle */}
          <div className="flex items-center gap-3">
            <span className="text-xs text-gray-500">Mark as:</span>
            <button
              onClick={toggleStatus}
              disabled={isPending}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-colors ${
                status === 'open'
                  ? 'bg-green-50 text-green-700 hover:bg-green-100'
                  : 'bg-red-50 text-red-700 hover:bg-red-100'
              }`}>
              {status === 'open' ? <CheckCircle2 className="w-3.5 h-3.5" /> : <AlertCircle className="w-3.5 h-3.5" />}
              {status === 'open' ? 'Resolve' : 'Reopen'}
            </button>
          </div>

          {/* Message thread */}
          <div>
            <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-3">
              Notes ({messages.length})
            </p>
            {messages.length === 0 && (
              <p className="text-xs text-gray-400 italic mb-4">No notes yet.</p>
            )}
            <div className="space-y-3 mb-4 max-h-72 overflow-y-auto">
              {messages.map((m, i) => (
                <div key={i} className="flex gap-3">
                  <div className="w-7 h-7 rounded-full bg-brand-green/10 flex items-center justify-center text-xs font-bold text-brand-green shrink-0">
                    {m.authorName?.[0] ?? 'A'}
                  </div>
                  <div className="flex-1 bg-gray-50 rounded-xl px-3 py-2">
                    <div className="flex items-center gap-2 mb-1">
                      <span className="text-xs font-medium text-gray-700">{m.authorName}</span>
                      <span className="text-xs text-gray-400">{timeAgo(m.createdAt)}</span>
                    </div>
                    <p className="text-sm text-gray-700 whitespace-pre-wrap">{m.body}</p>
                  </div>
                </div>
              ))}
            </div>

            {/* Add note */}
            <div className="flex gap-2">
              <textarea
                rows={2}
                value={note}
                onChange={(e) => setNote(e.target.value)}
                placeholder="Write an internal note…"
                className="flex-1 border border-gray-200 rounded-xl px-3 py-2 text-sm resize-none focus:outline-none focus:ring-2 focus:ring-brand-green/30"
              />
              <button
                onClick={addMessage}
                disabled={!note.trim() || isPending}
                className="self-end px-3 py-2 bg-brand-green text-white rounded-xl hover:opacity-90 disabled:opacity-50 transition-opacity">
                {isPending
                  ? <Loader2 className="w-4 h-4 animate-spin" />
                  : <Send className="w-4 h-4" />}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// ─── Main ─────────────────────────────────────────────────────────────────────

export function AdminDisputesClient({ disputes: initial, adminId, adminName }: Props) {
  const [items, setItems]   = useState(initial);
  const [filter, setFilter] = useState<'all' | 'open' | 'resolved'>('all');
  const [showNew, setShowNew] = useState(false);

  const filtered = filter === 'all' ? items : items.filter((d) => d.status === filter);
  const openCount     = items.filter((d) => d.status === 'open').length;
  const resolvedCount = items.filter((d) => d.status === 'resolved').length;

  return (
    <>
      {showNew && (
        <NewDisputeModal
          adminId={adminId}
          adminName={adminName}
          onClose={() => setShowNew(false)}
          onCreated={(d) => { setItems((prev) => [d, ...prev]); setShowNew(false); }}
        />
      )}

      <div className="flex flex-col sm:flex-row sm:items-center gap-4">
        <div className="flex gap-2">
          {(['all', 'open', 'resolved'] as const).map((f) => (
            <button key={f}
              onClick={() => setFilter(f)}
              className={`px-3 py-1.5 rounded-xl text-xs font-medium transition-colors capitalize ${
                filter === f
                  ? 'bg-gray-900 text-white'
                  : 'bg-gray-100 text-gray-500 hover:bg-gray-200'
              }`}>
              {f === 'all' ? `All (${items.length})`
                : f === 'open' ? `Open (${openCount})`
                : `Resolved (${resolvedCount})`}
            </button>
          ))}
        </div>

        <button
          onClick={() => setShowNew(true)}
          className="sm:ml-auto flex items-center gap-2 px-4 py-2 bg-brand-green text-white rounded-xl text-sm font-medium hover:opacity-90 transition-opacity">
          <Plus className="w-4 h-4" />
          Open New Case
        </button>
      </div>

      {filtered.length === 0 ? (
        <div className="bg-white border border-gray-100 rounded-2xl py-20 text-center">
          <MessageSquare className="w-8 h-8 text-gray-200 mx-auto mb-3" />
          <p className="text-sm font-medium text-gray-400">No disputes here</p>
        </div>
      ) : (
        <div className="space-y-3">
          {filtered.map((d) => (
            <DisputeCard key={d.id} dispute={d} adminId={adminId} adminName={adminName} />
          ))}
        </div>
      )}
    </>
  );
}
