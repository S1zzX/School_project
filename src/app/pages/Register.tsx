import { useState } from 'react';
import { Link, useNavigate } from 'react-router';
import { Eye, EyeOff, Gamepad2, Store, ShieldCheck, CheckCircle2 } from 'lucide-react';
import { apiRegister, SHOP_CATEGORIES, type UserRole, type ShopCategory } from '../lib/api';
import {
  AuthShell,
  AuthInput,
  AuthPrimaryButton,
} from '../components/AuthShell';

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
  { value: 'gamer', label: 'Gamer', desc: 'Browse store, buy items, use AI guides', icon: Gamepad2 },
  { value: 'shop_owner', label: 'Shop Owner', desc: 'Sell in-game items in one category', icon: Store },
];

export function Register() {
  const navigate = useNavigate();
  const [username, setUsername] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [role, setRole] = useState<UserRole>('gamer');
  const [shopCategory, setShopCategory] = useState<ShopCategory | ''>('');
  const [showPass, setShowPass] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [agreed, setAgreed] = useState(false);

  const strength = getStrength(password);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    if (!username || !email || !password || !confirm) {
      setError('Please fill in all fields.');
      return;
    }
    if (password !== confirm) {
      setError('Passwords do not match.');
      return;
    }
    if (strength < 2) {
      setError('Please choose a stronger password.');
      return;
    }
    if (role === 'shop_owner' && !shopCategory) {
      setError('Please select a shop category.');
      return;
    }
    if (!agreed) {
      setError('You must agree to the Terms of Service.');
      return;
    }

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
    <AuthShell
      title="Create account"
      subtitle="Join GameGuide to browse our catalog, buy keys and skins, connect with the community, and get AI-powered game guides — all in one place."
      footer={
        <>
          Already have an account?{' '}
          <Link to="/login" id="go-to-login" className="text-[var(--gs-accent)] font-semibold hover:underline">
            Sign in
          </Link>
        </>
      }
    >
      <form onSubmit={handleSubmit} id="register-form" noValidate className="space-y-4 max-w-md mx-auto w-full">
        {/* Role selector */}
        <div className="space-y-2">
          <p className="text-sm font-medium text-gs-muted">Account type</p>
          <div className="grid grid-cols-2 gap-2">
            {ROLE_OPTIONS.map(({ value, label, desc, icon: Icon }) => (
              <button
                key={value}
                type="button"
                id={`role-${value}`}
                onClick={() => {
                  setRole(value);
                  setShopCategory('');
                }}
                className="flex flex-col items-start gap-1 p-3 rounded-xl border text-left transition-all"
                style={{
                  background: role === value
                    ? 'color-mix(in oklab, var(--gs-accent) 14%, var(--gs-surface-2))'
                    : 'var(--gs-surface-2)',
                  borderColor: role === value ? 'var(--gs-accent)' : 'var(--gs-border)',
                }}
              >
                <Icon className="size-4" style={{ color: role === value ? 'var(--gs-accent)' : 'var(--gs-faint)' }} />
                <span className="text-gs-text text-xs font-semibold">{label}</span>
                <span className="text-gs-faint text-[10px] leading-tight">{desc}</span>
              </button>
            ))}
          </div>
        </div>

        {role === 'shop_owner' && (
          <div className="space-y-2">
            <label htmlFor="reg-category" className="block text-sm font-medium text-gs-muted">
              Shop category <span className="text-[var(--gs-accent)]">*</span>
            </label>
            <div className="relative">
              <ShieldCheck className="absolute left-3.5 top-1/2 -translate-y-1/2 size-4 text-gs-faint pointer-events-none" />
              <select
                id="reg-category"
                value={shopCategory}
                onChange={e => setShopCategory(e.target.value as ShopCategory)}
                className="auth-input w-full pl-10 pr-4 py-3.5 text-sm rounded-xl text-gs-text focus:outline-none focus:ring-2 focus:ring-[var(--gs-accent)]/40 appearance-none"
                style={{ color: shopCategory ? 'var(--gs-text)' : 'var(--gs-faint)' }}
              >
                <option value="" disabled>Select your category…</option>
                {SHOP_CATEGORIES.map(c => (
                  <option key={c} value={c}>{c}</option>
                ))}
              </select>
            </div>
          </div>
        )}

        <AuthInput
          id="reg-username"
          label="Username"
          autoComplete="username"
          value={username}
          onChange={setUsername}
          placeholder="ProGamer123"
        />

        <AuthInput
          id="reg-email"
          label="Email"
          type="email"
          autoComplete="email"
          value={email}
          onChange={setEmail}
          placeholder="you@example.com"
        />

        <div className="space-y-2">
          <AuthInput
            id="reg-password"
            label="Password"
            type={showPass ? 'text' : 'password'}
            autoComplete="new-password"
            value={password}
            onChange={setPassword}
            placeholder="••••••••"
            rightSlot={
              <button
                type="button"
                id="reg-toggle-password"
                onClick={() => setShowPass(v => !v)}
                className="absolute right-3.5 top-1/2 -translate-y-1/2 text-gs-faint hover:text-gs-muted transition-colors"
                aria-label={showPass ? 'Hide password' : 'Show password'}
              >
                {showPass ? <EyeOff className="size-4" /> : <Eye className="size-4" />}
              </button>
            }
          />
          {password.length > 0 && (
            <div className="space-y-1">
              <div className="flex gap-1">
                {[1, 2, 3, 4].map(i => (
                  <div
                    key={i}
                    className="flex-1 h-1 rounded-full transition-all"
                    style={{ background: i <= strength ? STRENGTH_COLORS[strength] : 'var(--gs-border)' }}
                  />
                ))}
              </div>
              <p className="text-[11px]" style={{ color: STRENGTH_COLORS[strength] }}>
                {STRENGTH_LABELS[strength]} password
              </p>
            </div>
          )}
        </div>

        <AuthInput
          id="reg-confirm"
          label="Confirm password"
          type={showConfirm ? 'text' : 'password'}
          autoComplete="new-password"
          value={confirm}
          onChange={setConfirm}
          placeholder="••••••••"
          rightSlot={
            <>
              {confirm.length > 0 && password === confirm && (
                <CheckCircle2 className="absolute right-10 top-1/2 -translate-y-1/2 size-4 text-emerald-400 pointer-events-none" />
              )}
              <button
                type="button"
                id="reg-toggle-confirm"
                onClick={() => setShowConfirm(v => !v)}
                className="absolute right-3.5 top-1/2 -translate-y-1/2 text-gs-faint hover:text-gs-muted transition-colors"
              >
                {showConfirm ? <EyeOff className="size-4" /> : <Eye className="size-4" />}
              </button>
            </>
          }
        />

        <label htmlFor="reg-agree" className="flex items-start gap-3 cursor-pointer">
          <input
            id="reg-agree"
            type="checkbox"
            checked={agreed}
            onChange={e => setAgreed(e.target.checked)}
            className="mt-0.5 rounded border-gs-border bg-gs-surface-2 text-[var(--gs-accent)] focus:ring-[var(--gs-accent)]/40"
          />
          <span className="text-xs text-gs-faint leading-relaxed">
            I agree to the{' '}
            <span className="text-[var(--gs-accent)] hover:underline cursor-pointer">Terms of Service</span>
            {' and '}
            <span className="text-[var(--gs-accent)] hover:underline cursor-pointer">Privacy Policy</span>
          </span>
        </label>

        {error && (
          <p className="text-red-400 text-xs px-3 py-2 rounded-lg border border-red-400/20 bg-red-400/10">
            {error}
          </p>
        )}

        <AuthPrimaryButton id="register-submit" loading={loading} loadingText="Creating account…">
          Create account
        </AuthPrimaryButton>
      </form>
    </AuthShell>
  );
}
