// src/app/components/FloatingContact.tsx
// Floating contact icons — Gmail, Zalo, SMS — fixed to bottom-right
import { useState } from 'react';
import { MessageCircle, X, Mail, Phone } from 'lucide-react';

// ── Config — update these to real contact details ──────────────────────────
const GMAIL   = 'mailto:gameguideai.support@gmail.com';
const ZALO    = 'https://zalo.me/0901234567';   // replace with real Zalo number
const SMS     = 'sms:+84901234567';             // replace with real phone number
// ──────────────────────────────────────────────────────────────────────────

// Zalo SVG logo (official brand color #0068ff)
function ZaloIcon({ size = 18 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 48 48" fill="none">
      <rect width="48" height="48" rx="10" fill="#0068ff" />
      <text x="5" y="34" fontSize="22" fontWeight="900" fill="white" fontFamily="Arial, sans-serif">Za</text>
    </svg>
  );
}

interface ContactBtn {
  key: string;
  label: string;
  href: string;
  icon: React.ReactNode;
  bg: string;
  hoverBg: string;
}

const CONTACTS: ContactBtn[] = [
  {
    key: 'gmail',
    label: 'Email us',
    href: GMAIL,
    icon: <Mail size={18} />,
    bg: '#ea4335',
    hoverBg: '#c5221f',
  },
  {
    key: 'zalo',
    label: 'Chat on Zalo',
    href: ZALO,
    icon: <ZaloIcon size={18} />,
    bg: '#0068ff',
    hoverBg: '#0054cc',
  },
  {
    key: 'sms',
    label: 'Send a message',
    href: SMS,
    icon: <Phone size={18} />,
    bg: '#22c55e',
    hoverBg: '#16a34a',
  },
];

export function FloatingContact() {
  const [open, setOpen] = useState(false);

  return (
    <div
      className="fixed z-50 flex flex-col items-end gap-2"
      style={{ bottom: '5rem', right: '1.25rem' }}
    >
      {/* Contact buttons — shown when open */}
      <div
        className="flex flex-col items-end gap-2 transition-all duration-200 overflow-hidden"
        style={{
          maxHeight: open ? '200px' : '0px',
          opacity: open ? 1 : 0,
          pointerEvents: open ? 'auto' : 'none',
        }}
      >
        {CONTACTS.map(c => (
          <a
            key={c.key}
            href={c.href}
            target={c.key !== 'sms' ? '_blank' : undefined}
            rel="noopener noreferrer"
            title={c.label}
            className="flex items-center gap-2.5 rounded-full px-3.5 py-2 text-xs font-semibold text-white shadow-lg transition-all duration-150 hover:scale-105 active:scale-95 select-none"
            style={{ background: c.bg, whiteSpace: 'nowrap' }}
            onMouseEnter={e => (e.currentTarget.style.background = c.hoverBg)}
            onMouseLeave={e => (e.currentTarget.style.background = c.bg)}
          >
            <span className="shrink-0">{c.icon}</span>
            {c.label}
          </a>
        ))}
      </div>

      {/* Toggle button */}
      <button
        onClick={() => setOpen(v => !v)}
        title={open ? 'Close' : 'Contact us'}
        className="w-12 h-12 rounded-full flex items-center justify-center text-white shadow-lg transition-all duration-200 hover:scale-110 active:scale-95"
        style={{
          background: open ? '#64748b' : 'var(--gs-accent)',
          boxShadow: '0 4px 16px rgba(0,0,0,0.25)',
        }}
      >
        <span
          className="transition-transform duration-200"
          style={{ transform: open ? 'rotate(90deg)' : 'rotate(0deg)', display: 'flex' }}
        >
          {open ? <X size={20} /> : <MessageCircle size={20} />}
        </span>
      </button>
    </div>
  );
}
