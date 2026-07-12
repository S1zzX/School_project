import { useState } from 'react';
import { Link, useNavigate } from 'react-router';
import { Eye, EyeOff } from 'lucide-react';
import { apiLogin } from '../lib/api';
import {
  AuthShell,
  AuthInput,
  AuthPrimaryButton,
} from '../components/AuthShell';

export function Login() {
  const navigate = useNavigate();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [remember, setRemember] = useState(false);
  const [showPass, setShowPass] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    if (!email || !password) {
      setError('Please fill in all fields.');
      return;
    }
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
    <AuthShell
      title="Welcome back"
      subtitle="Log in to your account to unlock the full experience of our game catalog. Discover new titles, manage your library, and enjoy all the content we've prepared for you."
      footer={
        <>
          Don&apos;t have an account?{' '}
          <Link to="/register" id="go-to-register" className="text-[var(--gs-accent)] font-semibold hover:underline">
            Sign up
          </Link>
          {' or '}
          <Link to="/" className="text-[var(--gs-accent)] font-semibold hover:underline">
            Sign in Later
          </Link>
        </>
      }
    >
      <form onSubmit={handleSubmit} id="login-form" noValidate className="space-y-5 max-w-md mx-auto w-full">
        <AuthInput
          id="login-email"
          label="Email"
          type="email"
          autoComplete="email"
          value={email}
          onChange={setEmail}
          placeholder="you@example.com"
        />

        <AuthInput
          id="login-password"
          label="Password"
          type={showPass ? 'text' : 'password'}
          autoComplete="current-password"
          value={password}
          onChange={setPassword}
          placeholder="••••••••"
          rightSlot={
            <button
              type="button"
              id="login-toggle-password"
              onClick={() => setShowPass(v => !v)}
              className="absolute right-3.5 top-1/2 -translate-y-1/2 text-gs-faint hover:text-gs-muted transition-colors"
              aria-label={showPass ? 'Hide password' : 'Show password'}
            >
              {showPass ? <EyeOff className="size-4" /> : <Eye className="size-4" />}
            </button>
          }
        />

        <div className="flex items-center justify-between text-sm">
          <label className="flex items-center gap-2 cursor-pointer text-gs-muted">
            <input
              type="checkbox"
              checked={remember}
              onChange={e => setRemember(e.target.checked)}
              className="rounded border-gs-border bg-gs-surface-2 text-[var(--gs-accent)] focus:ring-[var(--gs-accent)]/40"
            />
            Remember me
          </label>
          <button type="button" className="text-gs-muted hover:text-[var(--gs-accent)] transition-colors">
            Forgot Password?
          </button>
        </div>

        {error && (
          <p className="text-red-400 text-xs px-3 py-2 rounded-lg border border-red-400/20 bg-red-400/10">
            {error}
          </p>
        )}

        <AuthPrimaryButton id="login-submit" loading={loading} loadingText="Signing in…">
          Log in
        </AuthPrimaryButton>
      </form>
    </AuthShell>
  );
}
