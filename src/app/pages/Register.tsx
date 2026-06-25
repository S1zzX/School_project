import { useState } from 'react';
import { Link, useNavigate } from 'react-router';
import { Gamepad2, Mail, Lock, Eye, EyeOff, User, ArrowRight, CheckCircle2, Store, ShieldCheck } from 'lucide-react';
import { apiRegister, SHOP_CATEGORIES, type UserRole, type ShopCategory } from '../lib/api';

const STRENGTH_LABELS = ['', 'Weak', 'Fair', 'Good', 'Strong'];
const STRENGTH_COLORS = ['', '#f87171', '#fb923c', '#facc15', '#4ade80'];

function getStrength(pw: string): number {
  if (pw.length === 0) return 0;
  let score = 0;
  if (pw.length >= 8) score++;
  if (/[A-Z]/.test(pw)) score++;
  if (/[0-9]/.test(pw)) score++;
  if (/[^A-Za-z0-9]/.test(pw)) score++;
  return score;
}

const ROLE_OPTIONS: { value: UserRole; label: string; desc: string; icon: typeof Gamepad2 }[] = [
  { value: 'gamer',      label: 'Gamer',      desc: 'Browse store, buy items, use AI guides',            icon: Gamepad2   },
  { value: 'shop_owner', label: 'Shop Owner', desc: 'Sell in-game items in one category of your choice', icon: Store      },
];

export function Register() {
  const navigate = useNavigate();
  const [username,      setUsername]      = useState('');
  const [email,         setEmail]         = useState('');
  const [password,      setPassword]      = useState('');
  const [confirm,       setConfirm]       = useState('');
  const [role,          setRole]          = useState<UserRole>('gamer');
  const [shopCategory,  setShopCategory]  = useState<ShopCategory | ''>('');
  const [showPass,      setShowPass]      = useState(false);
  const [showConfirm,   setShowConfirm]   = useState(false);
  const [loading,       setLoading]       = useState(false);
  const [error,         setError]         = useState('');
  const [agreed,        setAgreed]        = useState(false);

  const strength = getStrength(password);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    if (!username || !email || !password || !confirm) { setError('Please fill in all fields.'); return; }
    if (password !== confirm) { setError('Passwords do not match.'); return; }
    if (strength < 2) { setError('Please choose a stronger password.'); return; }
    if (role === 'shop_owner' && !shopCategory) { setError('Please select a shop category.'); return; }
    if (!agreed) { setError('You must agree to the Terms of Service.'); return; }

    setLoading(true);
    try {
      await apiRegister(username, email, password, role, shopCategory as ShopCategory || undefined);
      navigate('/login');
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Registration failed. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gs-bg flex items-center justify-center p-4 relative overflow-hidden">
      <div className="pointer-events-none absolute inset-0" aria-hidden="true">
        <div style={{ position: 'absolute', top: '-15%', right: '-8%', width: '55vw', height: '55vw', borderRadius: '50%', background: 'radial-gradient(circle, color-mix(in oklab, #e879f9 16%, transparent), transparent 70%)', filter: 'blur(60px)' }} />
        <div style={{ position: 'absolute', bottom: '-10%', left: '-5%', width: '45vw', height: '45vw', borderRadius: '50%', background: 'radial-gradient(circle, color-mix(in oklab, var(--gs-accent) 15%, transparent), transparent 70%)', filter: 'blur(60px)' }} />
      </div>

      <div className="relative w-full max-w-md">
        <div className="flex flex-col items-center mb-8">
          <div className="w-14 h-14 rounded-2xl flex items-center justify-center mb-4 shadow-lg" style={{ background: 'linear-gradient(135deg, color-mix(in oklab, var(--gs-accent) 60%, #e879f9), var(--gs-accent))', boxShadow: '0 0 32px var(--gs-glow)' }}>
            <Gamepad2 className="size-7 text-white" />
          </div>
          <h1 className="text-gs-text text-2xl" style={{ fontWeight: 800, letterSpacing: '-0.02em' }}>Create account</h1>
          <p className="text-gs-faint text-sm mt-1">Join GameStore and start playing today</p>
        </div>

        <div className="rounded-2xl border border-gs-border p-8 space-y-5" style={{ background: 'color-mix(in oklab, var(--gs-surface) 80%, transparent)', backdropFilter: 'blur(20px)', WebkitBackdropFilter: 'blur(20px)', boxShadow: '0 8px 40px rgba(0,0,0,0.18), 0 0 0 1px color-mix(in oklab, #e879f9 10%, transparent)' }}>

          <form onSubmit={handleSubmit} className="space-y-4" id="register-form" noValidate>

            {/* ── Role selector ────────────────────────────────────────── */}
            <div className="space-y-1.5">
              <p className="text-gs-muted text-xs" style={{ fontWeight: 600, letterSpacing: '0.04em', textTransform: 'uppercase' }}>Account Type</p>
              <div className="grid grid-cols-2 gap-2">
                {ROLE_OPTIONS.map(({ value, label, desc, icon: Icon }) => (
                  <button
                    key={value}
                    type="button"
                    id={`role-${value}`}
                    onClick={() => { setRole(value); setShopCategory(''); }}
                    className="flex flex-col items-start gap-1 p-3 rounded-xl border text-left transition-all"
                    style={{
                      background: role === value ? 'color-mix(in oklab, var(--gs-accent) 12%, var(--gs-surface))' : 'var(--gs-surface-2)',
                      borderColor: role === value ? 'var(--gs-accent)' : 'var(--gs-border)',
                      boxShadow: role === value ? '0 0 0 1px var(--gs-accent)' : 'none',
                    }}
                  >
                    <Icon className="size-4" style={{ color: role === value ? 'var(--gs-accent)' : 'var(--gs-faint)' }} />
                    <span className="text-gs-text text-xs font-semibold">{label}</span>
                    <span className="text-gs-faint text-[10px] leading-tight">{desc}</span>
                  </button>
                ))}
              </div>
            </div>

            {/* ── Shop category (only for shop_owner) ──────────────────── */}
            {role === 'shop_owner' && (
              <div className="space-y-1.5">
                <label htmlFor="reg-category" className="text-gs-muted text-xs block" style={{ fontWeight: 600, letterSpacing: '0.04em', textTransform: 'uppercase' }}>
                  Shop Category <span className="text-gs-accent">*</span>
                </label>
                <div className="relative">
                  <ShieldCheck className="absolute left-3.5 top-1/2 -translate-y-1/2 size-4 text-gs-faint pointer-events-none" />
                  <select
                    id="reg-category"
                    value={shopCategory}
                    onChange={(e) => setShopCategory(e.target.value as ShopCategory)}
                    className="w-full bg-gs-surface-2 border border-gs-border rounded-xl pl-10 pr-4 py-3 text-gs-text focus:outline-none focus:border-gs-accent/60 focus:ring-2 focus:ring-gs-accent/15 text-sm transition-all appearance-none"
                    style={{ color: shopCategory ? 'var(--gs-text)' : 'var(--gs-faint)' }}
                  >
                    <option value="" disabled>Select your category…</option>
                    {SHOP_CATEGORIES.map((c) => (
                      <option key={c} value={c}>{c}</option>
                    ))}
                  </select>
                </div>
                <p className="text-gs-faint text-[11px] pl-1">You can only sell items in this category. Contact an Admin to change it.</p>
              </div>
            )}

            {/* Username */}
            <div className="space-y-1.5">
              <label htmlFor="reg-username" className="text-gs-muted text-xs block" style={{ fontWeight: 600, letterSpacing: '0.04em', textTransform: 'uppercase' }}>Username</label>
              <div className="relative">
                <User className="absolute left-3.5 top-1/2 -translate-y-1/2 size-4 text-gs-faint pointer-events-none" />
                <input id="reg-username" type="text" autoComplete="username" value={username} onChange={(e) => setUsername(e.target.value)} placeholder="ProGamer123" className="w-full bg-gs-surface-2 border border-gs-border rounded-xl pl-10 pr-4 py-3 text-gs-text placeholder-gs-faint focus:outline-none focus:border-gs-accent/60 focus:ring-2 focus:ring-gs-accent/15 text-sm transition-all" />
              </div>
            </div>

            {/* Email */}
            <div className="space-y-1.5">
              <label htmlFor="reg-email" className="text-gs-muted text-xs block" style={{ fontWeight: 600, letterSpacing: '0.04em', textTransform: 'uppercase' }}>Email</label>
              <div className="relative">
                <Mail className="absolute left-3.5 top-1/2 -translate-y-1/2 size-4 text-gs-faint pointer-events-none" />
                <input id="reg-email" type="email" autoComplete="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="you@example.com" className="w-full bg-gs-surface-2 border border-gs-border rounded-xl pl-10 pr-4 py-3 text-gs-text placeholder-gs-faint focus:outline-none focus:border-gs-accent/60 focus:ring-2 focus:ring-gs-accent/15 text-sm transition-all" />
              </div>
            </div>

            {/* Password */}
            <div className="space-y-1.5">
              <label htmlFor="reg-password" className="text-gs-muted text-xs block" style={{ fontWeight: 600, letterSpacing: '0.04em', textTransform: 'uppercase' }}>Password</label>
              <div className="relative">
                <Lock className="absolute left-3.5 top-1/2 -translate-y-1/2 size-4 text-gs-faint pointer-events-none" />
                <input id="reg-password" type={showPass ? 'text' : 'password'} autoComplete="new-password" value={password} onChange={(e) => setPassword(e.target.value)} placeholder="••••••••" className="w-full bg-gs-surface-2 border border-gs-border rounded-xl pl-10 pr-11 py-3 text-gs-text placeholder-gs-faint focus:outline-none focus:border-gs-accent/60 focus:ring-2 focus:ring-gs-accent/15 text-sm transition-all" />
                <button type="button" id="reg-toggle-password" onClick={() => setShowPass(!showPass)} className="absolute right-3.5 top-1/2 -translate-y-1/2 text-gs-faint hover:text-gs-muted transition-colors" aria-label={showPass ? 'Hide password' : 'Show password'}>
                  {showPass ? <EyeOff className="size-4" /> : <Eye className="size-4" />}
                </button>
              </div>
              {password.length > 0 && (
                <div className="space-y-1 pt-0.5">
                  <div className="flex gap-1">
                    {[1, 2, 3, 4].map((i) => (
                      <div key={i} className="flex-1 h-1 rounded-full transition-all duration-300" style={{ background: i <= strength ? STRENGTH_COLORS[strength] : 'var(--gs-border)' }} />
                    ))}
                  </div>
                  <p className="text-[11px]" style={{ color: STRENGTH_COLORS[strength] }}>{STRENGTH_LABELS[strength]} password</p>
                </div>
              )}
            </div>

            {/* Confirm Password */}
            <div className="space-y-1.5">
              <label htmlFor="reg-confirm" className="text-gs-muted text-xs block" style={{ fontWeight: 600, letterSpacing: '0.04em', textTransform: 'uppercase' }}>Confirm Password</label>
              <div className="relative">
                <Lock className="absolute left-3.5 top-1/2 -translate-y-1/2 size-4 text-gs-faint pointer-events-none" />
                <input id="reg-confirm" type={showConfirm ? 'text' : 'password'} autoComplete="new-password" value={confirm} onChange={(e) => setConfirm(e.target.value)} placeholder="••••••••" className="w-full bg-gs-surface-2 border border-gs-border rounded-xl pl-10 pr-11 py-3 text-gs-text placeholder-gs-faint focus:outline-none focus:border-gs-accent/60 focus:ring-2 focus:ring-gs-accent/15 text-sm transition-all" />
                <button type="button" id="reg-toggle-confirm" onClick={() => setShowConfirm(!showConfirm)} className="absolute right-3.5 top-1/2 -translate-y-1/2 text-gs-faint hover:text-gs-muted transition-colors">
                  {showConfirm ? <EyeOff className="size-4" /> : <Eye className="size-4" />}
                </button>
                {confirm.length > 0 && password === confirm && (
                  <CheckCircle2 className="absolute right-10 top-1/2 -translate-y-1/2 size-4 text-emerald-400 pointer-events-none" />
                )}
              </div>
            </div>

            {/* Terms */}
            <label htmlFor="reg-agree" className="flex items-start gap-3 cursor-pointer">
              <div className="relative mt-0.5 shrink-0">
                <input id="reg-agree" type="checkbox" className="sr-only" checked={agreed} onChange={(e) => setAgreed(e.target.checked)} />
                <div className="w-4 h-4 rounded border transition-all flex items-center justify-center" style={{ background: agreed ? 'var(--gs-accent)' : 'var(--gs-surface-2)', borderColor: agreed ? 'var(--gs-accent)' : 'var(--gs-border)' }}>
                  {agreed && <svg width="10" height="8" viewBox="0 0 10 8" fill="none"><path d="M1 4l2.5 2.5L9 1" stroke="var(--gs-accent-fg)" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" /></svg>}
                </div>
              </div>
              <span className="text-xs text-gs-faint leading-relaxed">
                I agree to the <span className="text-gs-accent hover:underline cursor-pointer">Terms of Service</span> and <span className="text-gs-accent hover:underline cursor-pointer">Privacy Policy</span>
              </span>
            </label>

            {/* Error */}
            {error && <p className="text-red-400 text-xs rounded-lg px-3 py-2 border border-red-400/20 bg-red-400/8">{error}</p>}

            {/* Submit */}
            <button type="submit" id="register-submit" disabled={loading} className="w-full flex items-center justify-center gap-2 py-3 rounded-xl text-sm transition-all" style={{ background: 'linear-gradient(135deg, color-mix(in oklab, var(--gs-accent) 60%, #e879f9), var(--gs-accent))', color: 'var(--gs-accent-fg)', fontWeight: 700, opacity: loading ? 0.7 : 1, cursor: loading ? 'not-allowed' : 'pointer', boxShadow: '0 0 20px var(--gs-glow)' }}>
              {loading ? (
                <><span className="w-4 h-4 rounded-full border-2 border-white/30 border-t-white animate-spin" style={{ display: 'inline-block' }} />Creating account…</>
              ) : (
                <>Create Account <ArrowRight className="size-4" /></>
              )}
            </button>
          </form>

          <div className="flex items-center gap-3">
            <div className="flex-1 h-px bg-gs-border" />
            <span className="text-gs-faint text-xs">or</span>
            <div className="flex-1 h-px bg-gs-border" />
          </div>

          <p className="text-center text-sm text-gs-faint">
            Already have an account?{' '}
            <Link to="/login" id="go-to-login" className="text-gs-accent hover:underline" style={{ fontWeight: 600 }}>Sign in</Link>
          </p>
        </div>
      </div>
    </div>
  );
}
