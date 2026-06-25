import { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router';
import { Mail, Lock, Eye, EyeOff, ArrowRight } from 'lucide-react';
import { apiLogin } from '../lib/api';

const LOGIN_SLIDES = [
  {
    image: 'https://images.unsplash.com/photo-1542751371-adc38448a05e?w=900&q=80',
    badge: 'Platform of the year',
    tagline: 'GameGuide AI',
    title: 'Your gaming hub.',
    highlight: 'AI-powered',
    suffix: ', always on.',
    desc: 'Guides, marketplace, community — everything for the serious gamer in one place.',
  },
  {
    image: 'https://images.unsplash.com/photo-1538481199705-c710c4e965fc?w=900&q=80',
    badge: 'Trusted marketplace',
    tagline: 'Player Store',
    title: 'Buy keys, skins &',
    highlight: 'accounts',
    suffix: ' safely.',
    desc: 'Verified sellers, admin escrow on skin trades, and real-time order tracking.',
  },
  {
    image: 'https://images.unsplash.com/photo-1511512578047-dfb367046420?w=900&q=80',
    badge: 'Community driven',
    tagline: 'GameGuide Community',
    title: 'Learn, trade &',
    highlight: 'connect',
    suffix: ' with gamers.',
    desc: 'Forum discussions, AI game guides, and support when you need help.',
  },
];

export function Login() {
  const navigate = useNavigate();
  const [email, setEmail]       = useState('');
  const [password, setPassword] = useState('');
  const [showPass, setShowPass] = useState(false);
  const [loading, setLoading]   = useState(false);
  const [error, setError]       = useState('');
  const [slide, setSlide]       = useState(0);

  useEffect(() => {
    const t = setInterval(() => setSlide(s => (s + 1) % LOGIN_SLIDES.length), 5000);
    return () => clearInterval(t);
  }, []);

  const active = LOGIN_SLIDES[slide];

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    if (!email || !password) { setError('Please fill in all fields.'); return; }
    setLoading(true);
    try {
      await apiLogin(email, password);
      navigate('/');
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Login failed. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div
      className="min-h-screen flex items-center justify-center p-6"
      style={{ background: '#f0ede8' }}
    >
      {/* ── Outer card ─────────────────────────────────────────────────── */}
      <div
        className="w-full flex overflow-hidden"
        style={{
          maxWidth: 980,
          borderRadius: 28,
          background: '#ffffff',
          boxShadow: '0 24px 80px rgba(0,0,0,0.13)',
          minHeight: 560,
        }}
      >
        {/* ── LEFT — form ────────────────────────────────────────────── */}
        <div className="flex flex-col justify-center px-12 py-12 flex-1" style={{ minWidth: 0 }}>

          {/* Logo mark */}
          <div className="mb-8">
            <img
              src="/src/assets/iconweb.png"
              alt="GameGuide"
              className="w-11 h-11 rounded-xl mb-6"
            />

            <h1 className="font-black text-3xl tracking-tight mb-1" style={{ color: '#111118' }}>
              Welcome Back!
            </h1>
            <p className="text-sm" style={{ color: '#9ca3af' }}>
              Sign in to your <span style={{ color: 'var(--gs-accent)', fontWeight: 600 }}>GameGuide</span> account
            </p>
          </div>

          {/* Form */}
          <form onSubmit={handleSubmit} id="login-form" noValidate className="space-y-4">

            {/* Email */}
            <div>
              <label htmlFor="login-email" className="block text-xs font-semibold mb-1.5" style={{ color: '#6b7280' }}>
                Email
              </label>
              <div className="relative">
                <Mail className="absolute left-4 top-1/2 -translate-y-1/2 size-4 pointer-events-none" style={{ color: '#d1d5db' }} />
                <input
                  id="login-email"
                  type="email"
                  autoComplete="email"
                  value={email}
                  onChange={e => setEmail(e.target.value)}
                  placeholder="you@example.com"
                  className="w-full pl-11 pr-4 py-3 text-sm rounded-xl focus:outline-none transition-all"
                  style={{
                    background: '#f9fafb',
                    border: '1.5px solid #e5e7eb',
                    color: '#111118',
                  }}
                  onFocus={e => { e.currentTarget.style.borderColor = 'var(--gs-accent)'; e.currentTarget.style.boxShadow = '0 0 0 3px color-mix(in oklab, var(--gs-accent) 15%, transparent)'; }}
                  onBlur={e => { e.currentTarget.style.borderColor = '#e5e7eb'; e.currentTarget.style.boxShadow = 'none'; }}
                />
              </div>
            </div>

            {/* Password */}
            <div>
              <div className="flex items-center justify-between mb-1.5">
                <label htmlFor="login-password" className="text-xs font-semibold" style={{ color: '#6b7280' }}>
                  Password
                </label>
                <button type="button" className="text-xs font-medium hover:underline" style={{ color: 'var(--gs-accent)' }}>
                  Recovery Password
                </button>
              </div>
              <div className="relative">
                <Lock className="absolute left-4 top-1/2 -translate-y-1/2 size-4 pointer-events-none" style={{ color: '#d1d5db' }} />
                <input
                  id="login-password"
                  type={showPass ? 'text' : 'password'}
                  autoComplete="current-password"
                  value={password}
                  onChange={e => setPassword(e.target.value)}
                  placeholder="••••••••"
                  className="w-full pl-11 pr-11 py-3 text-sm rounded-xl focus:outline-none transition-all"
                  style={{
                    background: '#f9fafb',
                    border: '1.5px solid #e5e7eb',
                    color: '#111118',
                  }}
                  onFocus={e => { e.currentTarget.style.borderColor = 'var(--gs-accent)'; e.currentTarget.style.boxShadow = '0 0 0 3px color-mix(in oklab, var(--gs-accent) 15%, transparent)'; }}
                  onBlur={e => { e.currentTarget.style.borderColor = '#e5e7eb'; e.currentTarget.style.boxShadow = 'none'; }}
                />
                <button
                  type="button"
                  id="login-toggle-password"
                  onClick={() => setShowPass(!showPass)}
                  className="absolute right-4 top-1/2 -translate-y-1/2 transition-colors"
                  style={{ color: '#9ca3af' }}
                  aria-label={showPass ? 'Hide password' : 'Show password'}
                >
                  {showPass ? <EyeOff className="size-4" /> : <Eye className="size-4" />}
                </button>
              </div>
            </div>

            {/* Error */}
            {error && (
              <p className="text-red-500 text-xs px-3 py-2 rounded-lg" style={{ background: '#fef2f2', border: '1px solid #fecaca' }}>
                {error}
              </p>
            )}

            {/* Submit */}
            <button
              type="submit"
              id="login-submit"
              disabled={loading}
              className="w-full flex items-center justify-center gap-2 py-3.5 rounded-xl text-sm font-bold transition-all mt-2"
              style={{
                background: loading ? 'color-mix(in oklab, var(--gs-accent) 60%, white)' : 'var(--gs-accent)',
                color: '#fff',
                boxShadow: '0 4px 20px color-mix(in oklab, var(--gs-accent) 35%, transparent)',
                cursor: loading ? 'not-allowed' : 'pointer',
              }}
              onMouseEnter={e => { if (!loading) e.currentTarget.style.filter = 'brightness(1.1)'; }}
              onMouseLeave={e => { e.currentTarget.style.filter = 'none'; }}
            >
              {loading
                ? <><span className="w-4 h-4 rounded-full border-2 border-white/30 border-t-white animate-spin inline-block" /> Signing in…</>
                : <>Sign In <ArrowRight className="size-4" /></>
              }
            </button>
          </form>

          {/* Divider */}
          <div className="flex items-center gap-3 my-5">
            <div className="flex-1 h-px" style={{ background: '#e5e7eb' }} />
            <span className="text-xs" style={{ color: '#9ca3af' }}>Or continue with</span>
            <div className="flex-1 h-px" style={{ background: '#e5e7eb' }} />
          </div>

          {/* Social buttons */}
          <div className="flex items-center justify-center gap-3">
            {/* Google */}
            <button
              className="w-12 h-12 rounded-full flex items-center justify-center transition-all hover:scale-105"
              style={{ background: '#f9fafb', border: '1.5px solid #e5e7eb', boxShadow: '0 2px 8px rgba(0,0,0,0.06)' }}
              title="Continue with Google"
            >
              <svg width="18" height="18" viewBox="0 0 24 24">
                <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4"/>
                <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/>
                <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05"/>
                <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335"/>
              </svg>
            </button>
            {/* Apple */}
            <button
              className="w-12 h-12 rounded-full flex items-center justify-center transition-all hover:scale-105"
              style={{ background: '#ffffff', border: '1.5px solid #e5e7eb', boxShadow: '0 2px 8px rgba(0,0,0,0.06)' }}
              title="Continue with Apple"
            >
              <svg width="16" height="16" viewBox="0 0 814 1000" fill="#000">
                <path d="M788.1 340.9c-5.8 4.5-108.2 62.2-108.2 190.5 0 148.4 130.3 200.9 134.2 202.2-.6 3.2-20.7 71.9-68.7 141.9-42.8 61.6-87.5 123.1-155.5 123.1s-85.5-39.5-164-39.5c-76 0-103.7 40.8-165.9 40.8s-105-57.8-155.5-127.4C46 790.7 0 663 0 541.8c0-207.1 135.4-317 267.9-317 70.1 0 128.4 46.4 172.5 46.4 42.8 0 109.7-49.6 190.5-49.6z"/>
                <path d="M550.1 0c-76.3 4.6-164.8 56.1-216.5 129.1-46.9 65.5-85.9 165.7-70.5 262.1 83.5 6.4 169.5-48.6 218.3-121 47.1-70 80.9-169.8 68.7-270.2z"/>
              </svg>
            </button>
            {/* Facebook */}
            <button
              className="w-12 h-12 rounded-full flex items-center justify-center transition-all hover:scale-105"
              style={{ background: '#f9fafb', border: '1.5px solid #e5e7eb', boxShadow: '0 2px 8px rgba(0,0,0,0.06)' }}
              title="Continue with Facebook"
            >
              <svg width="18" height="18" viewBox="0 0 24 24" fill="#1877F2">
                <path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z"/>
              </svg>
            </button>
          </div>

          {/* Footer */}
          <p className="text-center text-xs mt-6" style={{ color: '#9ca3af' }}>
            Don't have an account?{' '}
            <Link to="/register" id="go-to-register" className="font-bold hover:underline" style={{ color: 'var(--gs-accent)' }}>
              Create one free
            </Link>
          </p>

          <p className="text-center text-[10px] mt-3" style={{ color: '#d1d5db' }}>
            By signing in you agree to our{' '}
            <span className="cursor-pointer hover:underline" style={{ color: 'var(--gs-accent)' }}>Terms of Service</span>
            {' & '}
            <span className="cursor-pointer hover:underline" style={{ color: 'var(--gs-accent)' }}>Privacy Policy</span>
          </p>
        </div>

        {/* ── RIGHT — rotating image panel ─────────────────────────────── */}
        <div
          className="relative hidden md:flex flex-col justify-end overflow-hidden"
          style={{
            width: '46%',
            minWidth: 320,
            borderRadius: '0 28px 28px 0',
            background: '#0d0d1a',
          }}
        >
          {/* Slides */}
          {LOGIN_SLIDES.map((s, i) => (
            <img
              key={i}
              src={s.image}
              alt=""
              className="absolute inset-0 w-full h-full object-cover transition-opacity duration-1000 ease-in-out"
              style={{
                opacity: i === slide ? 0.55 : 0,
                mixBlendMode: 'luminosity',
              }}
            />
          ))}

          {/* Gradient overlay */}
          <div
            className="absolute inset-0 pointer-events-none"
            style={{
              background: 'linear-gradient(180deg, rgba(26,111,212,0.12) 0%, rgba(0,0,0,0.0) 40%, rgba(0,0,0,0.78) 100%)',
            }}
          />

          {/* Top badge */}
          <div className="absolute top-6 left-6 right-6 z-10">
            <span
              key={slide}
              className="inline-block text-[10px] font-black uppercase tracking-widest px-3 py-1.5 rounded-full"
              style={{
                background: 'color-mix(in oklab, var(--gs-accent) 20%, transparent)',
                border: '1px solid color-mix(in oklab, var(--gs-accent) 40%, transparent)',
                color: 'var(--gs-accent)',
              }}
            >
              ★ {active.badge}
            </span>
          </div>

          {/* Bottom content — updates with slide */}
          <div className="relative z-10 p-8" key={slide}>
            <p className="text-white/50 text-xs uppercase tracking-widest mb-2">{active.tagline}</p>
            <h2 className="text-white font-black text-2xl leading-tight mb-3">
              {active.title}<br />
              <span style={{ color: 'var(--gs-accent)' }}>{active.highlight}</span>{active.suffix}
            </h2>
            <p className="text-white/55 text-sm leading-relaxed mb-5">{active.desc}</p>

            {/* Carousel dots */}
            <div className="flex items-center gap-2">
              {LOGIN_SLIDES.map((_, i) => (
                <button
                  key={i}
                  type="button"
                  onClick={() => setSlide(i)}
                  aria-label={`Slide ${i + 1}`}
                  className="h-1.5 rounded-full transition-all"
                  style={{
                    width: i === slide ? 24 : 8,
                    background: i === slide ? 'var(--gs-accent)' : 'rgba(255,255,255,0.3)',
                  }}
                />
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
