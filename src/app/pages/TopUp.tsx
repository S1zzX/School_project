import { useEffect, useMemo, useState } from 'react';
import { Link, useNavigate } from 'react-router';
import {
  ArrowRight, CheckCircle2, Clock, Copy, Landmark, Loader2, LogIn,
  ReceiptText, Smartphone, Wallet,
} from 'lucide-react';
import {
  apiCreateWalletTopUp, apiGetWallet, getUser,
  type WalletAPI, type WalletCurrency, type WalletPaymentMethod,
  type WalletTransactionAPI,
} from '../lib/api';

const PAYMENT_METHODS: Array<{
  id: WalletPaymentMethod;
  label: string;
  shortLabel: string;
  icon: typeof Smartphone;
  qr: string;
  account: string;
  accent: string;
}> = [
  {
    id: 'momo',
    label: 'MoMo Wallet',
    shortLabel: 'MoMo',
    icon: Smartphone,
    qr: '/src/assets/payments/momo-qr.png',
    account: 'NGUYEN QUY HUNG - STK ending 559',
    accent: '#c02680',
  },
  {
    id: 'mb_bank',
    label: 'MB Bank Transfer',
    shortLabel: 'MB Bank',
    icon: Landmark,
    qr: '/src/assets/payments/mb-bank-qr.png',
    account: 'NGUYEN QUY HUNG - 0702684424',
    accent: '#1a6fd4',
  },
];

const QUICK_AMOUNTS = [5, 10, 25, 50, 100];

function formatUsd(value: number) {
  return new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(value);
}

function formatVnd(value: number) {
  return new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND', maximumFractionDigits: 0 }).format(value);
}

function formatDate(iso: string) {
  return new Date(iso).toLocaleString('en-US', {
    month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit',
  });
}

function TransactionRow({ transaction }: { transaction: WalletTransactionAPI }) {
  const isTopUp = transaction.type === 'top_up';
  return (
    <div className="flex items-center gap-3 rounded-xl border border-gs-border bg-gs-surface px-4 py-3">
      <div
        className="w-9 h-9 rounded-lg flex items-center justify-center shrink-0"
        style={{
          color: isTopUp ? '#16a34a' : 'var(--gs-accent)',
          background: isTopUp ? 'rgba(22,163,74,0.1)' : 'color-mix(in oklab, var(--gs-accent) 12%, transparent)',
          border: isTopUp ? '1px solid rgba(22,163,74,0.22)' : '1px solid color-mix(in oklab, var(--gs-accent) 22%, transparent)',
        }}
      >
        {isTopUp ? <CheckCircle2 className="size-4" /> : <ReceiptText className="size-4" />}
      </div>
      <div className="min-w-0 flex-1">
        <p className="text-sm font-semibold text-gs-text truncate">
          {isTopUp ? 'Wallet top-up' : 'Wallet checkout'}
        </p>
        <p className="text-xs text-gs-faint truncate">
          {transaction.reference} - {formatDate(transaction.created_at)}
        </p>
      </div>
      <div className="text-right shrink-0">
        <p className={`text-sm font-bold tabular-nums ${isTopUp ? 'text-emerald-500' : 'text-gs-text'}`}>
          {isTopUp ? '+' : '-'}{formatUsd(transaction.amount_usd)}
        </p>
        <p className="text-[10px] uppercase font-bold text-gs-faint">{transaction.status}</p>
      </div>
    </div>
  );
}

export function TopUp() {
  const navigate = useNavigate();
  const user = getUser();

  const [wallet, setWallet] = useState<WalletAPI | null>(null);
  const [loading, setLoading] = useState(true);
  const [method, setMethod] = useState<WalletPaymentMethod>('momo');
  const [currency, setCurrency] = useState<WalletCurrency>('USD');
  const [amount, setAmount] = useState('10');
  const [submitting, setSubmitting] = useState(false);
  const [copied, setCopied] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!user) {
      setLoading(false);
      return;
    }
    apiGetWallet()
      .then(setWallet)
      .catch(err => setError(err instanceof Error ? err.message : 'Could not load wallet.'))
      .finally(() => setLoading(false));
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const selectedMethod = PAYMENT_METHODS.find(item => item.id === method) ?? PAYMENT_METHODS[0];
  const SelectedMethodIcon = selectedMethod.icon;
  const rate = wallet?.exchange_rate ?? 25000;
  const numericAmount = Number(amount);
  const amountUsd = useMemo(() => {
    if (!Number.isFinite(numericAmount) || numericAmount <= 0) return 0;
    return currency === 'USD' ? numericAmount : numericAmount / rate;
  }, [currency, numericAmount, rate]);
  const amountVnd = useMemo(() => {
    if (!Number.isFinite(numericAmount) || numericAmount <= 0) return 0;
    return currency === 'VND' ? numericAmount : numericAmount * rate;
  }, [currency, numericAmount, rate]);

  const copyText = (id: string, value: string) => {
    navigator.clipboard.writeText(value).catch(() => {});
    setCopied(id);
    setTimeout(() => setCopied(null), 1600);
  };

  const submitTopUp = async () => {
    setError(null);
    setMessage(null);
    if (!Number.isFinite(numericAmount) || numericAmount <= 0) {
      setError('Enter a valid amount first.');
      return;
    }
    setSubmitting(true);
    try {
      const nextWallet = await apiCreateWalletTopUp({ method, currency, amount: numericAmount });
      setWallet(nextWallet);
      const tx = nextWallet.latest_transaction;
      setMessage(tx ? `${formatUsd(tx.amount_usd)} added to your wallet. Reference ${tx.reference}.` : 'Balance added to your wallet.');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not add balance.');
    } finally {
      setSubmitting(false);
    }
  };

  if (!user) {
    return (
      <div className="max-w-2xl mx-auto px-6 py-24 flex flex-col items-center gap-5 text-center">
        <div className="w-16 h-16 rounded-xl bg-gs-surface-2 border border-gs-border flex items-center justify-center text-gs-muted">
          <LogIn className="size-7" />
        </div>
        <h1 className="text-2xl font-bold text-gs-text">Sign in to top up</h1>
        <p className="text-sm max-w-xs text-gs-faint">Your wallet balance is saved to your account.</p>
        <button
          onClick={() => navigate('/login')}
          className="flex items-center gap-2 px-6 py-3 rounded-lg text-sm font-semibold bg-gs-accent text-white hover:opacity-90 transition-opacity"
        >
          <LogIn className="size-4" /> Sign In
        </button>
      </div>
    );
  }

  return (
    <div className="commerce-page wallet-page max-w-6xl mx-auto px-6 py-8 space-y-6 min-h-[70vh]">
      <div className="commerce-hero flex items-center justify-between gap-4 flex-wrap rounded-3xl border px-6 py-6 lg:px-8">
        <div className="flex items-center gap-4">
          <div className="commerce-hero-icon w-14 h-14 rounded-2xl flex items-center justify-center">
            <Wallet className="size-5" />
          </div>
          <div>
            <p className="commerce-eyebrow">Account wallet</p>
            <h1 className="text-2xl lg:text-3xl font-black text-gs-text tracking-tight">Top Up <span className="commerce-gradient-text">Balance</span></h1>
            <p className="text-sm text-gs-faint mt-0.5">
              Signed in as <span className="text-gs-text font-medium">{user.username}</span>
            </p>
          </div>
        </div>
        <Link
          to="/cart"
          className="flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium border border-gs-border text-gs-muted hover:text-gs-text hover:bg-gs-surface-2 transition-colors"
        >
          Go to Cart <ArrowRight className="size-4" />
        </Link>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-[1fr_380px] gap-6">
        <div className="space-y-5">
          <div className="rounded-2xl border border-gs-border bg-gs-surface p-5 space-y-5">
            <div className="flex items-center justify-between gap-3 flex-wrap">
              <div>
                <p className="text-xs uppercase font-bold tracking-wider text-gs-faint">Current balance</p>
                <p className="text-3xl font-black text-gs-text tabular-nums mt-1">
                  {loading ? 'Loading...' : formatUsd(wallet?.balance_usd ?? 0)}
                </p>
                <p className="text-xs text-gs-faint mt-1">
                  Approx. {formatVnd(wallet?.balance_vnd ?? 0)} at {formatVnd(rate)} / USD
                </p>
              </div>
              <div className="rounded-xl border border-gs-border bg-gs-surface-2 px-4 py-3 text-right">
                <p className="text-[10px] uppercase font-bold tracking-wider text-gs-faint">Adding</p>
                <p className="text-lg font-black text-gs-accent tabular-nums">{formatUsd(amountUsd)}</p>
                <p className="text-xs text-gs-faint">{formatVnd(amountVnd)}</p>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
              <div className="space-y-3">
                <p className="text-sm font-semibold text-gs-text">Amount</p>
                <div className="flex rounded-xl border border-gs-border bg-gs-surface-2 p-1">
                  {(['USD', 'VND'] as WalletCurrency[]).map(value => (
                    <button
                      key={value}
                      type="button"
                      onClick={() => setCurrency(value)}
                      className="flex-1 rounded-lg px-3 py-2 text-sm font-bold transition-colors"
                      style={{
                        color: currency === value ? 'var(--gs-accent-fg)' : 'var(--gs-muted)',
                        background: currency === value ? 'var(--gs-accent)' : 'transparent',
                      }}
                    >
                      {value}
                    </button>
                  ))}
                </div>
                <input
                  id="wallet-topup-amount"
                  type="number"
                  min="0"
                  step={currency === 'USD' ? '0.01' : '1000'}
                  value={amount}
                  onChange={e => setAmount(e.target.value)}
                  className="w-full rounded-xl border border-gs-border bg-gs-surface-2 px-4 py-3 text-gs-text text-lg font-bold tabular-nums focus:outline-none focus:border-gs-accent/60"
                  placeholder={currency === 'USD' ? '10.00' : '250000'}
                />
                <div className="flex flex-wrap gap-2">
                  {QUICK_AMOUNTS.map(value => (
                    <button
                      key={value}
                      type="button"
                      onClick={() => { setCurrency('USD'); setAmount(String(value)); }}
                      className="rounded-lg border border-gs-border bg-gs-surface px-3 py-1.5 text-xs font-semibold text-gs-muted hover:text-gs-text hover:border-gs-accent/40 transition-colors"
                    >
                      {formatUsd(value)}
                    </button>
                  ))}
                </div>
              </div>

              <div className="space-y-3">
                <p className="text-sm font-semibold text-gs-text">Transfer method</p>
                <div className="space-y-2">
                  {PAYMENT_METHODS.map(item => {
                    const Icon = item.icon;
                    const active = method === item.id;
                    return (
                      <button
                        key={item.id}
                        type="button"
                        onClick={() => setMethod(item.id)}
                        className="w-full flex items-center gap-3 rounded-xl border px-4 py-3 text-left transition-all"
                        style={{
                          background: active ? 'color-mix(in oklab, var(--gs-accent) 8%, var(--gs-surface))' : 'var(--gs-surface-2)',
                          borderColor: active ? 'color-mix(in oklab, var(--gs-accent) 42%, var(--gs-border))' : 'var(--gs-border)',
                        }}
                      >
                        <span className="w-9 h-9 rounded-lg flex items-center justify-center shrink-0" style={{ color: item.accent, background: `${item.accent}18` }}>
                          <Icon className="size-4" />
                        </span>
                        <span className="min-w-0 flex-1">
                          <span className="block text-sm font-bold text-gs-text">{item.label}</span>
                          <span className="block text-xs text-gs-faint truncate">{item.account}</span>
                        </span>
                        <span className="w-4 h-4 rounded-full border-2 flex items-center justify-center shrink-0" style={{ borderColor: active ? 'var(--gs-accent)' : 'var(--gs-border)' }}>
                          {active && <span className="w-2 h-2 rounded-full bg-gs-accent" />}
                        </span>
                      </button>
                    );
                  })}
                </div>
              </div>
            </div>

            {error && <p className="rounded-xl border border-red-500/25 bg-red-500/10 px-4 py-3 text-sm font-medium text-red-500">{error}</p>}
            {message && <p className="rounded-xl border border-emerald-500/25 bg-emerald-500/10 px-4 py-3 text-sm font-medium text-emerald-500">{message}</p>}

            <button
              id="wallet-topup-submit"
              type="button"
              onClick={submitTopUp}
              disabled={submitting || amountUsd <= 0}
              className="w-full flex items-center justify-center gap-2 rounded-xl px-5 py-3.5 text-sm font-bold text-white transition-opacity accent-glow disabled:opacity-60 disabled:cursor-not-allowed"
              style={{ background: 'linear-gradient(135deg, var(--gs-accent, #1a6fd4), var(--gs-accent2, #1557b0))', color: 'var(--gs-accent-fg, #fff)' }}
            >
              {submitting ? <><Loader2 className="size-4 animate-spin" /> Adding Balance...</> : <><Wallet className="size-4" /> Confirm Transfer and Add Balance</>}
            </button>
          </div>

          <div className="rounded-2xl border border-gs-border bg-gs-surface p-5 space-y-3">
            <div className="flex items-center justify-between gap-3">
              <p className="text-sm font-semibold text-gs-text flex items-center gap-2"><Clock className="size-4 text-gs-accent" /> Recent wallet activity</p>
              <button
                type="button"
                onClick={() => apiGetWallet().then(setWallet).catch(() => {})}
                className="text-xs font-semibold text-gs-accent hover:underline"
              >
                Refresh
              </button>
            </div>
            {wallet?.transactions.length ? (
              <div className="space-y-2">
                {wallet.transactions.map(tx => <TransactionRow key={tx.id} transaction={tx} />)}
              </div>
            ) : (
              <div className="rounded-xl border border-gs-border bg-gs-surface-2 px-4 py-8 text-center text-sm text-gs-faint">
                No wallet transactions yet.
              </div>
            )}
          </div>
        </div>

        <aside className="space-y-4">
          <div className="rounded-2xl border border-gs-border bg-gs-surface p-5 space-y-4 lg:sticky lg:top-24">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl flex items-center justify-center" style={{ color: selectedMethod.accent, background: `${selectedMethod.accent}18` }}>
                <SelectedMethodIcon className="size-4" />
              </div>
              <div>
                <p className="text-sm font-bold text-gs-text">{selectedMethod.shortLabel} QR</p>
                <p className="text-xs text-gs-faint">{selectedMethod.account}</p>
              </div>
            </div>

            <div className="rounded-2xl border border-gs-border bg-white p-3 overflow-hidden">
              <img src={selectedMethod.qr} alt={`${selectedMethod.label} QR`} className="w-full rounded-xl object-contain" />
            </div>

            <div className="grid grid-cols-2 gap-2">
              <button
                type="button"
                onClick={() => copyText('amount', currency === 'USD' ? amountUsd.toFixed(2) : Math.round(amountVnd).toString())}
                className="flex items-center justify-center gap-2 rounded-xl border border-gs-border bg-gs-surface-2 px-3 py-2 text-xs font-semibold text-gs-muted hover:text-gs-text transition-colors"
              >
                {copied === 'amount' ? <CheckCircle2 className="size-3.5 text-emerald-500" /> : <Copy className="size-3.5" />}
                Copy Amount
              </button>
              <button
                type="button"
                onClick={() => copyText('account', selectedMethod.account)}
                className="flex items-center justify-center gap-2 rounded-xl border border-gs-border bg-gs-surface-2 px-3 py-2 text-xs font-semibold text-gs-muted hover:text-gs-text transition-colors"
              >
                {copied === 'account' ? <CheckCircle2 className="size-3.5 text-emerald-500" /> : <Copy className="size-3.5" />}
                Copy Account
              </button>
            </div>

            <div className="rounded-xl border border-gs-border bg-gs-surface-2 px-4 py-3 text-xs text-gs-faint space-y-1.5">
              <p><span className="font-bold text-gs-muted">Rate:</span> {formatVnd(rate)} = {formatUsd(1)}</p>
              <p><span className="font-bold text-gs-muted">Credit:</span> {formatUsd(amountUsd)} after confirmation</p>
              <p><span className="font-bold text-gs-muted">Method:</span> {selectedMethod.label}</p>
            </div>
          </div>
        </aside>
      </div>
    </div>
  );
}