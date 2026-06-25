import { useState, useEffect } from 'react';
import { ArrowRight, LogIn, SkipForward } from 'lucide-react';
import { Link } from 'react-router';

interface IntroSplashProps {
  onEnter: () => void;
}

export function IntroSplash({ onEnter }: IntroSplashProps) {
  const [leaving,  setLeaving]  = useState(false);
  const [mounted,  setMounted]  = useState(false);

  // Stagger mount
  useEffect(() => {
    const t = setTimeout(() => setMounted(true), 60);
    return () => clearTimeout(t);
  }, []);

  // ESC to skip
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.key === 'Escape') handleEnter();
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handleEnter = () => {
    if (leaving) return;
    setLeaving(true);
    setTimeout(() => onEnter(), 900);
  };

  const splitEase = 'cubic-bezier(0.77, 0, 0.175, 1)';
  const splitIn  = (side: 'left' | 'right') =>
    `splash-split-${side}-in 1.05s ${splitEase} both`;
  const splitOut = (side: 'left' | 'right') =>
    `splash-split-${side}-out 0.75s ${splitEase} forwards`;

  // ── shared transition helper (delayed until split opens)
  const fadeUp = (delay: number) => ({
    opacity:    mounted && !leaving ? 1 : 0,
    transform:  mounted && !leaving ? 'translateY(0)' : 'translateY(22px)',
    transition: leaving
      ? 'opacity 280ms ease, transform 280ms ease'
      : `opacity 650ms ease ${delay + 420}ms, transform 650ms ease ${delay + 420}ms`,
  });

  return (
    <div
      className="fixed inset-0 z-[9999] overflow-hidden"
      style={{
        userSelect: 'none',
        fontFamily: '"Space Grotesk", system-ui, sans-serif',
      }}
    >

      {/* ══ BACKGROUND — animated diagonal split ═══════════════════════════ */}
      <div className="absolute inset-0">
        {/* Light left panel + stripes */}
        <div
          className="absolute inset-0 will-change-transform"
          style={{
            background: '#c8c8c8',
            clipPath: !mounted && !leaving
              ? 'polygon(0 0, 0 0, 0 100%, 0 100%)'
              : undefined,
            animation: leaving ? splitOut('left') : mounted ? splitIn('left') : 'none',
          }}
        >
          <div
            className="absolute inset-0"
            style={{
              backgroundImage: `repeating-linear-gradient(
                -55deg,
                transparent 0px, transparent 16px,
                rgba(0,0,0,0.08) 16px, rgba(0,0,0,0.08) 18px
              )`,
              animation: mounted && !leaving ? 'splash-stripe 4s linear infinite' : 'none',
            }}
          />
        </div>

        {/* Dark right panel + stripes */}
        <div
          className="absolute inset-0 will-change-transform"
          style={{
            background: '#171717',
            clipPath: !mounted && !leaving
              ? 'polygon(100% 0, 100% 0, 100% 100%, 100% 100%)'
              : undefined,
            animation: leaving ? splitOut('right') : mounted ? splitIn('right') : 'none',
          }}
        >
          <div
            className="absolute inset-0"
            style={{
              backgroundImage: `repeating-linear-gradient(
                -55deg,
                transparent 0px, transparent 16px,
                rgba(255,255,255,0.035) 16px, rgba(255,255,255,0.035) 18px
              )`,
              animation: mounted && !leaving ? 'splash-stripe 4s linear infinite' : 'none',
            }}
          />
        </div>

        {/* Red seam — sits exactly on the light/dark panel boundary */}
        <svg
          className="absolute inset-0 w-full h-full pointer-events-none"
          viewBox="0 0 100 100"
          preserveAspectRatio="none"
          aria-hidden
        >
          <line
            x1="55"
            y1="0"
            x2="42"
            y2="100"
            className={
              leaving
                ? 'splash-split-line splash-split-line-out'
                : mounted
                  ? 'splash-split-line splash-split-line-in'
                  : 'splash-split-line splash-split-line-hidden'
            }
          />
        </svg>
      </div>

      {/* ══ TOP-RIGHT NAV ICONS ════════════════════════════════════════════ */}
      <div
        className="absolute top-5 right-5 z-20 flex items-center gap-5"
        style={fadeUp(350)}
      >
        {['◈', '▐▌', '✕'].map((sym) => (
          <span key={sym} className="text-white/35 hover:text-white/70 cursor-pointer transition-colors text-xs font-bold tracking-widest">
            {sym}
          </span>
        ))}
      </div>

      {/* ══ SKIP BUTTON ════════════════════════════════════════════════════ */}
      <button
        onClick={handleEnter}
        className="absolute top-5 left-5 z-20 flex items-center gap-1.5 text-black/30 hover:text-black/60 transition-colors text-[10px] uppercase tracking-widest"
        style={fadeUp(500)}
      >
        <SkipForward className="size-3" /> Skip intro
      </button>

      {/* ══ LEFT CONTENT ══════════════════════════════════════════════════ */}
      <div className="absolute left-0 top-0 bottom-0 flex flex-col justify-end pb-20 pl-10 pr-4 z-10" style={{ width: '52%' }}>

        {/* Sub label */}
        <div style={fadeUp(80)}>
          <p className="text-[10px] tracking-[0.35em] mb-4 uppercase" style={{ color: '#555', fontWeight: 700 }}>
            GameGuide · AI · V2
          </p>
        </div>

        {/* Main title */}
        <div style={fadeUp(130)}>
          <h1
            className="leading-none mb-7 uppercase"
            style={{
              fontFamily:   '"Arial Black", "Impact", sans-serif',
              fontSize:     'clamp(2.8rem, 8vw, 5.5rem)',
              fontWeight:   900,
              fontStyle:    'italic',
              color:        '#111',
              lineHeight:   0.88,
              letterSpacing: '-0.02em',
            }}
          >
            GAME<br />
            GUIDE<br />
            <span style={{ color: '#ff0033', WebkitTextStroke: '0px' }}>AI</span>
          </h1>
        </div>

        {/* Buttons */}
        <div className="flex flex-col gap-2.5 max-w-[260px]" style={fadeUp(220)}>

          {/* Primary — Enter */}
          <button
            onClick={handleEnter}
            className="group flex items-center justify-between border-2 border-black px-5 py-3 uppercase tracking-widest text-[11px] font-black transition-all hover:bg-black hover:text-white active:scale-[0.97]"
            style={{ fontFamily: '"Arial Black", sans-serif', color: '#111', background: 'transparent' }}
          >
            <span>ENTER NOW</span>
            <ArrowRight className="size-4 group-hover:translate-x-1 transition-transform" />
          </button>

          {/* Secondary — Login */}
          <Link
            to="/login"
            className="flex items-center justify-between border border-black/40 px-5 py-2.5 uppercase tracking-widest text-[11px] font-bold transition-all hover:border-black hover:bg-black/5 active:scale-[0.97]"
            style={{ color: '#333' }}
          >
            <span>SIGN IN</span>
            <LogIn className="size-3.5" />
          </Link>

          {/* Tertiary — Library */}
          <Link
            to="/library"
            className="flex items-center justify-between border border-black/20 px-5 py-2.5 uppercase tracking-widest text-[10px] font-semibold transition-all hover:border-black/40 hover:bg-black/5 active:scale-[0.97]"
            style={{ color: '#666' }}
          >
            <span>EXPLORE LIBRARY</span>
            <span className="text-[9px] opacity-50">→</span>
          </Link>
        </div>
      </div>



      {/* ══ BOTTOM TICKER STRIP ═══════════════════════════════════════════ */}
      <div
        className="absolute bottom-0 left-0 right-0 z-20 flex items-center overflow-hidden"
        style={{
          height:     26,
          background: '#111',
          ...fadeUp(550),
        }}
      >
        <div
          style={{
            display:     'flex',
            whiteSpace:  'nowrap',
            animation:   'ticker-scroll 22s linear infinite',
          }}
        >
          {Array.from({ length: 8 }).map((_, i) => (
            <span
              key={i}
              className="inline-flex items-center gap-5 px-5"
              style={{ color: '#4a4a4a', fontSize: '9px', fontWeight: 700, letterSpacing: '0.22em', textTransform: 'uppercase' }}
            >
              <span style={{ color: '#ff0033' }}>◆</span>
              LEAGUE OF LEGENDS
              <span style={{ color: '#ff0033' }}>◆</span>
              CS2
              <span style={{ color: '#ff0033' }}>◆</span>
              VALORANT
              <span style={{ color: '#ff0033' }}>◆</span>
              AI GAME GUIDES
              <span style={{ color: '#ff0033' }}>◆</span>
              PLAYER STORE
              <span style={{ color: '#ff0033' }}>◆</span>
              COMMUNITY FORUM
            </span>
          ))}
        </div>
      </div>
    </div>
  );
}
