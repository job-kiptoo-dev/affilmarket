'use client';

import { useState } from 'react';
import { Copy, Check } from 'lucide-react';

interface CopyLinkButtonProps {
  url: string;
}

export function CopyLinkButton({ url }: CopyLinkButtonProps) {
  const [copied, setCopied] = useState(false);

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(url);
    } catch {
      const el = document.createElement('textarea');
      el.value = url;
      document.body.appendChild(el);
      el.select();
      document.execCommand('copy');
      document.body.removeChild(el);
    }
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <button
      onClick={handleCopy}
      style={{
        width:          '100%',
        display:        'flex',
        alignItems:     'center',
        justifyContent: 'center',
        gap:            7,
        padding:        '9px 16px',
        background:     copied ? 'rgba(74,222,128,0.15)' : 'rgba(255,255,255,0.08)',
        border:         copied ? '1px solid rgba(74,222,128,0.3)' : '1px solid rgba(255,255,255,0.12)',
        borderRadius:   8,
        fontSize:       13,
        fontWeight:     600,
        color:          copied ? '#4ade80' : '#fff',
        cursor:         'pointer',
        transition:     'background 0.2s, border-color 0.2s, color 0.2s',
        fontFamily:     "'DM Sans', sans-serif",
      }}
    >
      {copied ? <Check size={13} /> : <Copy size={13} />}
      {copied ? 'Link copied!' : 'Copy link'}
    </button>
  );
}
