import type { ReactNode } from 'react';

const AUTH_HERO_IMAGE =
  'https://images.unsplash.com/photo-1542751110-97427bbecf20?auto=format&fit=crop&w=1600&q=85';

export function AuthLogo() {
  return (
    <div className="flex justify-center mb-8">
      <div
        className="w-14 h-14 rounded-full flex items-center justify-center border-2"
        style={{ borderColor: 'var(--gs-border)' }}
      >
        <img
          src="/src/assets/iconweb.png"
          alt="GameGuide"
          className="w-8 h-8 rounded-lg object-cover"
        />
      </div>
    </div>
  );
}

export function AuthInput({
  id,
  label,
  type = 'text',
  value,
  onChange,
  placeholder,
  autoComplete,
  rightSlot,
}: {
  id: string;
  label: string;
  type?: string;
  value: string;
  onChange: (v: string) => void;
  placeholder?: string;
  autoComplete?: string;
  rightSlot?: ReactNode;
}) {
  return (
    <div className="space-y-2">
      <label htmlFor={id} className="block text-sm font-medium text-gs-muted">
        {label}
      </label>
      <div className="relative">
        <input
          id={id}
          type={type}
          value={value}
          onChange={e => onChange(e.target.value)}
          placeholder={placeholder}
          autoComplete={autoComplete}
          className="auth-input w-full px-4 py-3.5 text-sm rounded-xl text-gs-text placeholder:text-gs-faint focus:outline-none focus:ring-2 focus:ring-[var(--gs-accent)]/40 transition-all"
        />
        {rightSlot}
      </div>
    </div>
  );
}

export function AuthPrimaryButton({
  children,
  loading,
  loadingText,
  id,
}: {
  children: ReactNode;
  loading?: boolean;
  loadingText?: string;
  id?: string;
}) {
  return (
    <button
      type="submit"
      id={id}
      disabled={loading}
      className="w-full py-3.5 rounded-xl text-sm font-bold transition-all hover:brightness-110 disabled:opacity-60 disabled:cursor-not-allowed"
      style={{
        background: 'var(--gs-accent)',
        color: 'var(--gs-accent-fg)',
        boxShadow: '0 8px 24px color-mix(in oklab, var(--gs-accent) 35%, transparent)',
      }}
    >
      {loading ? (
        <span className="inline-flex items-center gap-2">
          <span className="w-4 h-4 rounded-full border-2 border-white/30 border-t-white animate-spin" />
          {loadingText ?? 'Please wait...'}
        </span>
      ) : (
        children
      )}
    </button>
  );
}

export function AuthSocialButtons() {
  const btnClass =
    'w-12 h-12 rounded-xl flex items-center justify-center transition-all bg-gs-surface-2 border border-gs-border text-gs-text hover:border-[var(--gs-accent)]/40';

  return (
    <div className="flex items-center justify-center gap-3">
      <button type="button" className={btnClass} title="Google">
        <svg width="18" height="18" viewBox="0 0 24 24" aria-hidden>
          <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4" />
          <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853" />
          <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05" />
          <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335" />
        </svg>
      </button>
      <button type="button" className={btnClass} title="X">
        <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor" aria-hidden>
          <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z" />
        </svg>
      </button>
      <button type="button" className={btnClass} title="Apple">
        <svg width="16" height="16" viewBox="0 0 814 1000" fill="currentColor" aria-hidden>
          <path d="M788.1 340.9c-5.8 4.5-108.2 62.2-108.2 190.5 0 148.4 130.3 200.9 134.2 202.2-.6 3.2-20.7 71.9-68.7 141.9-42.8 61.6-87.5 123.1-155.5 123.1s-85.5-39.5-164-39.5c-76 0-103.7 40.8-165.9 40.8s-105-57.8-155.5-127.4C46 790.7 0 663 0 541.8c0-207.1 135.4-317 267.9-317 70.1 0 128.4 46.4 172.5 46.4 42.8 0 109.7-49.6 190.5-49.6z" />
          <path d="M550.1 0c-76.3 4.6-164.8 56.1-216.5 129.1-46.9 65.5-85.9 165.7-70.5 262.1 83.5 6.4 169.5-48.6 218.3-121 47.1-70 80.9-169.8 68.7-270.2z" />
        </svg>
      </button>
      <button type="button" className={btnClass} title="Discord">
        <svg width="18" height="18" viewBox="0 0 24 24" fill="#5865F2" aria-hidden>
          <path d="M20.317 4.37a19.791 19.791 0 0 0-4.885-1.515.074.074 0 0 0-.079.037c-.21.375-.444.864-.608 1.25a18.27 18.27 0 0 0-5.487 0 12.64 12.64 0 0 0-.617-1.25.077.077 0 0 0-.079-.037A19.736 19.736 0 0 0 3.677 4.37a.07.07 0 0 0-.032.027C.533 9.046-.32 13.58.099 18.057a.082.082 0 0 0 .031.057 19.9 19.9 0 0 0 5.993 3.03.078.078 0 0 0 .084-.028 14.09 14.09 0 0 0 1.226-1.994.076.076 0 0 0-.041-.106 13.107 13.107 0 0 1-1.872-.892.077.077 0 0 1-.008-.128 10.2 10.2 0 0 0 .372-.292.074.074 0 0 1 .077-.01c3.928 1.793 8.18 1.793 12.062 0a.074.074 0 0 1 .078.01c.12.098.246.198.373.292a.077.077 0 0 1-.006.127 12.299 12.299 0 0 1-1.873.892.077.077 0 0 0-.041.107c.36.698.772 1.362 1.225 1.993a.076.076 0 0 0 .084.028 19.839 19.839 0 0 0 6.002-3.03.077.077 0 0 0 .032-.054c.5-5.177-.838-9.674-3.549-13.66a.061.061 0 0 0-.031-.03zM8.02 15.33c-1.183 0-2.157-1.085-2.157-2.419 0-1.333.956-2.419 2.157-2.419 1.21 0 2.176 1.096 2.157 2.42 0 1.333-.956 2.418-2.157 2.418zm7.975 0c-1.183 0-2.157-1.085-2.157-2.419 0-1.333.955-2.419 2.157-2.419 1.21 0 2.176 1.096 2.157 2.42 0 1.333-.946 2.418-2.157 2.418z" />
        </svg>
      </button>
    </div>
  );
}

interface AuthShellProps {
  title: string;
  subtitle: string;
  children: ReactNode;
  footer: ReactNode;
}

export function AuthShell({ title, subtitle, children, footer }: AuthShellProps) {
  return (
    <div
      className="auth-page min-h-screen flex items-center justify-center p-4 sm:p-6 text-gs-text"
    >
      <div className="auth-ambient auth-ambient-one" />
      <div className="auth-ambient auth-ambient-two" />
      <div
        className="auth-card relative z-10 w-full flex overflow-hidden border border-gs-border"
        style={{
          maxWidth: 1040,
          minHeight: 620,
          borderRadius: 24,
        }}
      >
        {/* Left form */}
        <div className="flex-1 flex flex-col justify-center px-8 sm:px-12 py-10 sm:py-12 overflow-y-auto bg-gs-surface min-w-0">
          <AuthLogo />

          <div className="text-center mb-8">
            <h1 className="text-3xl sm:text-4xl font-bold text-gs-text tracking-tight mb-3">
              {title}
            </h1>
            <p className="text-sm leading-relaxed text-gs-muted max-w-sm mx-auto">
              {subtitle}
            </p>
          </div>

          {children}

          <div className="mt-8">
            <AuthSocialButtons />
          </div>

          <div className="mt-6 text-center text-sm text-gs-faint">{footer}</div>
        </div>

        {/* Right hero art */}
        <div className="hidden md:block relative flex-1 bg-gs-surface-2" style={{ minWidth: 380 }}>
          <img
            src={AUTH_HERO_IMAGE}
            alt=""
            className="absolute inset-0 w-full h-full object-cover"
          />
          <div
            className="absolute inset-0"
            style={{
              background:
                'linear-gradient(180deg, rgba(7,18,38,.06) 15%, rgba(7,18,38,.18) 55%, rgba(7,18,38,.78) 100%)',
            }}
          />
          <div className="absolute left-8 right-8 bottom-8 text-white">
            <span className="inline-flex items-center gap-2 rounded-full border border-white/25 bg-white/10 px-3 py-1 text-[10px] font-bold uppercase tracking-[0.2em] backdrop-blur-md">
              Arena access
            </span>
            <h2 className="mt-4 text-3xl font-black tracking-tight">Enter the<br />player deck.</h2>
            <p className="mt-2 max-w-xs text-sm leading-relaxed text-white/75">Sign in to trade, scan, top up, and control your gaming catalog.</p>
          </div>
        </div>
      </div>

      <style>{`
        .auth-input {
          background: var(--gs-surface-2);
          border: 1px solid var(--gs-border);
        }
        .auth-input:focus {
          border-color: color-mix(in oklab, var(--gs-accent) 50%, transparent);
        }
        .auth-card {
          box-shadow: 0 28px 80px rgba(48, 83, 132, 0.18);
          animation: auth-card-in 650ms cubic-bezier(.22,1,.36,1) both;
        }
        .auth-page {
          position: relative;
          overflow: hidden;
          background:
            radial-gradient(circle at 16% 18%, rgba(96,165,250,.20), transparent 28%),
            radial-gradient(circle at 86% 82%, rgba(167,139,250,.18), transparent 30%),
            linear-gradient(135deg, #f7fbff 0%, #eaf3ff 48%, #f3efff 100%);
        }
        .auth-ambient {
          position: absolute;
          width: 22rem;
          height: 22rem;
          border-radius: 999px;
          filter: blur(42px);
          opacity: .28;
          pointer-events: none;
          animation: auth-drift 9s ease-in-out infinite;
        }
        .auth-ambient-one { left: -8rem; top: -8rem; background: #60a5fa; }
        .auth-ambient-two { right: -7rem; bottom: -9rem; background: #a78bfa; animation-delay: -4s; }
        @keyframes auth-card-in {
          from { opacity: 0; transform: translateY(20px) scale(.985); }
          to { opacity: 1; transform: translateY(0) scale(1); }
        }
        @keyframes auth-drift {
          0%, 100% { transform: translate3d(0,0,0) scale(1); }
          50% { transform: translate3d(28px,18px,0) scale(1.08); }
        }
        @media (prefers-reduced-motion: reduce) {
          .auth-card, .auth-ambient { animation: none; }
        }
      `}</style>
    </div>
  );
}
