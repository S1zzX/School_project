import { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router';
import {
  ShoppingCart, Trash2, Tag, ShieldCheck, ChevronRight,
  Gamepad2, Gift, CreditCard, Zap, X, CheckCircle2, Copy, LogIn, Key,
  ArrowLeftRight, Clock, AlertCircle, Wallet,
} from 'lucide-react';
import { ImageWithFallback } from '../components/figma/ImageWithFallback';
import {
  apiGetCart, apiRemoveFromCart, apiClearCart,
  apiPurchaseItems, apiGetWallet, apiDebitWallet, PurchaseItem,
  CartItemAPI, getUser,
} from '../lib/api';
import { savePurchaseOrder, generateOrderId } from '../lib/purchaseHistory';

const PAYMENT_METHODS = [
  { id: 'wallet', label: 'GameGuide Wallet',      icon: Wallet },
  { id: 'card',   label: 'Credit / Debit Card',  icon: CreditCard },
  { id: 'crypto', label: 'Crypto (USDT/ETH)',     icon: Zap },
  { id: 'gift',   label: 'Gift Card',             icon: Gift },
];

// ── Steam-format key generator ───────────────────────────────────────────────
function generateSteamKey(): string {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'; // Steam avoids 0/O/1/I
  const seg = () => Array.from({ length: 5 }, () => chars[Math.floor(Math.random() * chars.length)]).join('');
  return `${seg()}-${seg()}-${seg()}`;
}

// ── Account credentials generator ────────────────────────────────────────────
function generateAccountCredentials(): string {
  const adjectives = ['Shadow', 'Mystic', 'Iron', 'Golden', 'Silent', 'Dark', 'Light', 'Epic', 'Pro'];
  const nouns = ['Player', 'Hunter', 'Wolf', 'Dragon', 'Knight', 'Mage', 'Sniper', 'Ninja'];
  const randomUser = `${adjectives[Math.floor(Math.random() * adjectives.length)]}${nouns[Math.floor(Math.random() * nouns.length)]}${Math.floor(Math.random() * 9999)}`;
  const chars = 'abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789!@#$%';
  const randomPass = Array.from({ length: 10 }, () => chars[Math.floor(Math.random() * chars.length)]).join('');
  return `${randomUser}:${randomPass}`;
}

// ── Purchased key entry ──────────────────────────────────────────────────────
interface PurchasedKey {
  name: string;
  platform: string;
  image: string;
  key: string;
  type?: string;
}

// ── Steam-style keys reveal modal ────────────────────────────────────────────
function KeysRevealModal({ keys, orderId, onClose }: { keys: PurchasedKey[]; orderId: string; onClose: () => void }) {
  const [copied, setCopied] = useState<Record<number, boolean>>({});

  const handleCopy = (idx: number, code: string) => {
    navigator.clipboard.writeText(code).catch(() => {});
    setCopied(prev => ({ ...prev, [idx]: true }));
    setTimeout(() => setCopied(prev => ({ ...prev, [idx]: false })), 2000);
  };

  const handleCopyAll = () => {
    const text = keys.map(k => `${k.name}: ${k.key}`).join('\n');
    navigator.clipboard.writeText(text).catch(() => {});
  };

  return (
    <div
      className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-4"
      onClick={onClose}
    >
      <div
        className="relative w-full max-w-lg rounded-2xl border overflow-hidden"
        style={{
          background: 'var(--gs-surface)',
          borderColor: 'var(--gs-border)',
          boxShadow: '0 0 80px var(--gs-glow), 0 25px 60px rgba(0,0,0,0.5)',
          maxHeight: '90vh',
          overflowY: 'auto',
        }}
        onClick={e => e.stopPropagation()}
      >
        {/* Header */}
        <div
          className="sticky top-0 flex items-center justify-between px-6 py-4 border-b"
          style={{ background: 'var(--gs-surface)', borderColor: 'var(--gs-border)', zIndex: 1 }}
        >
          <div className="flex items-center gap-3">
            <div
              className="w-9 h-9 rounded-xl flex items-center justify-center"
              style={{ background: 'rgba(34,197,94,0.15)', border: '1px solid rgba(34,197,94,0.3)' }}
            >
              <CheckCircle2 className="size-5 text-emerald-400" />
            </div>
            <div>
              <h2 className="font-bold text-base" style={{ color: 'var(--gs-text)' }}>
                Purchase Complete!
              </h2>
              <p className="text-xs" style={{ color: 'var(--gs-faint)' }}>
                Order <span className="font-mono" style={{ color: 'var(--gs-accent)' }}>{orderId}</span> · {keys.length} key{keys.length !== 1 ? 's' : ''} ready
              </p>
            </div>
          </div>
          <button
            id="key-modal-close"
            onClick={onClose}
            className="w-8 h-8 flex items-center justify-center rounded-lg transition-colors hover:bg-gs-surface-2"
            style={{ color: 'var(--gs-faint)' }}
          >
            <X className="size-4" />
          </button>
        </div>

        {/* Steam instructions */}
        {keys.some(k => k.type !== 'Account') && (
          <div className="px-6 pt-4 pb-2">
            <div
              className="rounded-xl p-4 text-sm"
              style={{ background: 'var(--gs-surface-2)', border: '1px solid var(--gs-border)' }}
            >
              <p className="font-bold text-xs uppercase tracking-wider mb-2" style={{ color: 'var(--gs-muted)' }}>
                How to redeem on Steam
              </p>
              <ol className="space-y-1 text-xs" style={{ color: 'var(--gs-faint)' }}>
                <li>1. Open <span style={{ color: 'var(--gs-text)' }}>Steam</span> → click your username → <span style={{ color: 'var(--gs-text)' }}>Activate a Product on Steam</span></li>
                <li>2. Enter your product key below and click <span style={{ color: 'var(--gs-text)' }}>Confirm</span></li>
                <li>3. The game will be added to your library instantly</li>
              </ol>
            </div>
          </div>
        )}

        {/* Key cards */}
        <div className="px-6 py-3 space-y-3">
          {keys.map((item, idx) => (
            <div
              key={idx}
              className="rounded-xl border overflow-hidden"
              style={{ borderColor: 'var(--gs-border)' }}
            >
              {/* Game thumbnail row */}
              <div className="flex items-center gap-3 p-3" style={{ background: 'var(--gs-surface-2)' }}>
                <div className="w-14 h-10 rounded-lg overflow-hidden shrink-0">
                  <ImageWithFallback
                    src={item.image}
                    alt={item.name}
                    className="w-full h-full object-cover"
                  />
                </div>
                <div className="min-w-0">
                  <p className="text-sm font-semibold truncate" style={{ color: 'var(--gs-text)' }}>{item.name}</p>
                  <p className="text-xs" style={{ color: 'var(--gs-faint)' }}>{item.platform}</p>
                </div>
                <Key className="size-4 ml-auto shrink-0" style={{ color: 'var(--gs-accent)' }} />
              </div>

              {/* Key display */}
              <div className="p-3 space-y-2">
                <p className="text-[10px] uppercase tracking-wider font-semibold" style={{ color: 'var(--gs-faint)' }}>
                  {item.type === 'Account' ? 'Account Credentials (User:Pass)' : (item.type === 'Skin' ? 'Skin Redemption Code' : 'Your Product Key')}
                </p>
                <div
                  id={`game-code-${idx}`}
                  className="rounded-lg px-4 py-3 font-mono text-center text-base tracking-[0.18em] cursor-pointer select-all transition-all hover:opacity-80"
                  style={{
                    background: 'var(--gs-surface-dark, #050508)',
                    border: `1px solid var(--gs-accent)`,
                    color: 'var(--gs-accent)',
                    letterSpacing: '0.18em',
                    fontSize: '1.05rem',
                    fontWeight: 700,
                  }}
                  onClick={() => handleCopy(idx, item.key)}
                  title="Click to copy"
                >
                  {item.key}
                </div>
                <button
                  id={`copy-key-btn-${idx}`}
                  onClick={() => handleCopy(idx, item.key)}
                  className="w-full flex items-center justify-center gap-2 py-2 rounded-lg text-sm font-semibold transition-all"
                  style={{
                    background: copied[idx] ? 'rgba(34,197,94,0.15)' : 'rgba(249,115,22,0.12)',
                    color: copied[idx] ? '#22c55e' : 'var(--gs-accent)',
                    border: `1px solid ${copied[idx] ? 'rgba(34,197,94,0.3)' : 'rgba(249,115,22,0.3)'}`,
                  }}
                >
                  {copied[idx]
                    ? <><CheckCircle2 className="size-4" /> Copied!</>
                    : <><Copy className="size-4" /> Copy Key</>
                  }
                </button>
              </div>
            </div>
          ))}
        </div>

        {/* Footer actions */}
        <div className="px-6 pb-6 space-y-3">
          {keys.length > 1 && (
            <button
              onClick={handleCopyAll}
              className="w-full flex items-center justify-center gap-2 py-2.5 rounded-xl text-sm font-semibold border transition-all hover:opacity-90"
              style={{ borderColor: 'var(--gs-border)', color: 'var(--gs-muted)' }}
            >
              <Copy className="size-4" /> Copy All Keys
            </button>
          )}
          <Link
            to="/purchase-history"
            onClick={onClose}
            className="w-full flex items-center justify-center gap-2 py-2.5 rounded-xl text-sm font-semibold border transition-all hover:opacity-90"
            style={{ borderColor: 'var(--gs-border)', color: 'var(--gs-muted)' }}
          >
            <ShoppingCart className="size-4" /> View Purchase History
          </Link>
          <p className="text-center text-xs" style={{ color: 'var(--gs-faint)' }}>
            🔒 Keys are unique and single-use. Keep them safe and do not share them.
          </p>
          <button
            onClick={onClose}
            className="w-full py-2.5 rounded-xl text-sm font-bold transition-all hover:opacity-90"
            style={{ background: 'var(--gs-accent)', color: '#fff' }}
          >
            Done
          </button>
        </div>
      </div>
    </div>
  );
}

// ── Trade pending modal ──────────────────────────────────────────────────────
interface TradePendingItem { name: string; game: string; price: number; image: string; }
function TradePendingModal({ trades, orderId, onClose }: { trades: TradePendingItem[]; orderId: string; onClose: () => void }) {
  return (
    <div
      className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-4"
      onClick={onClose}
    >
      <div
        className="relative w-full max-w-lg rounded-2xl border overflow-hidden"
        style={{
          background: 'var(--gs-surface)',
          borderColor: 'var(--gs-border)',
          boxShadow: '0 0 80px rgba(249,115,22,0.15), 0 25px 60px rgba(0,0,0,0.5)',
          maxHeight: '90vh',
          overflowY: 'auto',
        }}
        onClick={e => e.stopPropagation()}
      >
        {/* Header */}
        <div className="sticky top-0 flex items-center justify-between px-6 py-4 border-b" style={{ background: 'var(--gs-surface)', borderColor: 'var(--gs-border)', zIndex: 1 }}>
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl flex items-center justify-center" style={{ background: 'rgba(249,115,22,0.15)', border: '1px solid rgba(249,115,22,0.3)' }}>
              <ArrowLeftRight className="size-5" style={{ color: 'var(--gs-accent)' }} />
            </div>
            <div>
              <h2 className="font-bold text-base" style={{ color: 'var(--gs-text)' }}>Trade Request Submitted</h2>
              <p className="text-xs" style={{ color: 'var(--gs-faint)' }}>Order <span className="font-mono" style={{ color: 'var(--gs-accent)' }}>{orderId}</span> · pending verification</p>
            </div>
          </div>
          <button onClick={onClose} className="w-8 h-8 flex items-center justify-center rounded-lg hover:bg-gs-surface-2 transition-colors" style={{ color: 'var(--gs-faint)' }}>
            <X className="size-4" />
          </button>
        </div>

        {/* Status banner */}
        <div className="mx-6 mt-5 rounded-xl px-4 py-3 flex items-start gap-3" style={{ background: 'rgba(249,115,22,0.08)', border: '1px solid rgba(249,115,22,0.25)' }}>
          <Clock className="size-4 mt-0.5 shrink-0" style={{ color: 'var(--gs-accent)' }} />
          <div>
            <p className="text-sm font-semibold" style={{ color: 'var(--gs-accent)' }}>Awaiting Admin Verification</p>
            <p className="text-xs mt-0.5" style={{ color: 'var(--gs-faint)' }}>
              Skin trades are held in escrow until an admin confirms delivery. This protects you from scammers.
              You'll be notified once the trade is verified.
            </p>
          </div>
        </div>

        {/* Warning */}
        <div className="mx-6 mt-3 rounded-xl px-4 py-3 flex items-start gap-3" style={{ background: 'rgba(239,68,68,0.06)', border: '1px solid rgba(239,68,68,0.2)' }}>
          <AlertCircle className="size-4 mt-0.5 shrink-0 text-red-400" />
          <p className="text-xs" style={{ color: 'var(--gs-faint)' }}>
            <span className="font-semibold text-red-400">Do not send payment</span> until the admin marks your trade as "Verified".
            Never trade outside the platform — use the Support page to report issues.
          </p>
        </div>

        {/* Skin items */}
        <div className="px-6 py-4 space-y-3">
          {trades.map((t, i) => (
            <div key={i} className="flex items-center gap-3 rounded-xl p-3 border" style={{ background: 'var(--gs-surface-2)', borderColor: 'var(--gs-border)' }}>
              <div className="w-14 h-10 rounded-lg overflow-hidden shrink-0">
                <ImageWithFallback src={t.image} alt={t.name} className="w-full h-full object-cover" />
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-semibold truncate" style={{ color: 'var(--gs-text)' }}>{t.name}</p>
                <p className="text-xs" style={{ color: 'var(--gs-faint)' }}>{t.game}</p>
              </div>
              <div className="shrink-0 text-right">
                <p className="text-sm font-bold" style={{ color: 'var(--gs-accent)' }}>${t.price.toFixed(2)}</p>
                <span className="text-[10px] px-1.5 py-0.5 rounded-full font-semibold" style={{ background: 'rgba(249,115,22,0.15)', color: 'var(--gs-accent)' }}>Pending</span>
              </div>
            </div>
          ))}
        </div>

        <div className="px-6 pb-6 space-y-3">
          <Link to="/support?tab=trades" onClick={onClose} className="w-full flex items-center justify-center gap-2 py-2.5 rounded-xl text-sm font-semibold border transition-all hover:opacity-90" style={{ borderColor: 'var(--gs-border)', color: 'var(--gs-muted)' }}>
            <ArrowLeftRight className="size-4" /> Track My Trade Status
          </Link>
          <button onClick={onClose} className="w-full py-2.5 rounded-xl text-sm font-bold transition-all hover:opacity-90" style={{ background: 'var(--gs-accent)', color: '#fff' }}>
            Got it
          </button>
        </div>
      </div>
    </div>
  );
}

// ── Main Cart component ──────────────────────────────────────────────────────
export function Cart() {
  const navigate = useNavigate();
  const user = getUser();

  const [items, setItems]               = useState<CartItemAPI[]>([]);
  const [loading, setLoading]           = useState(true);
  const [promoCode, setPromoCode]       = useState('');
  const [promoApplied, setPromoApplied] = useState(false);
  const [promoError, setPromoError]     = useState('');
  const [paymentMethod, setPaymentMethod] = useState('wallet');
  const [purchasing, setPurchasing]       = useState(false);
  const [purchasedKeys, setPurchasedKeys] = useState<PurchasedKey[] | null>(null);
  const [purchasedOrderId, setPurchasedOrderId] = useState<string>('');
  const [tradePending, setTradePending]   = useState<TradePendingItem[] | null>(null);
  const [walletBalance, setWalletBalance] = useState(0);
  const [checkoutError, setCheckoutError] = useState('');

  useEffect(() => {
    if (!user) { setLoading(false); return; }
    apiGetCart()
      .then(setItems)
      .catch(console.error)
      .finally(() => setLoading(false));
    apiGetWallet()
      .then(wallet => setWalletBalance(wallet.balance_usd ?? 0))
      .catch(() => setWalletBalance(0));
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    const refreshWallet = () => {
      if (!user) return;
      apiGetWallet()
        .then(wallet => setWalletBalance(wallet.balance_usd ?? 0))
        .catch(() => setWalletBalance(0));
    };
    window.addEventListener('wallet_updated', refreshWallet);
    return () => window.removeEventListener('wallet_updated', refreshWallet);
  }, [user]);

  const removeItem = async (id: number) => {
    await apiRemoveFromCart(id).catch(console.error);
    setItems(prev => prev.filter(i => i.id !== id));
  };

  const subtotal = items.reduce((s, i) => s + i.price, 0);
  const discount = promoApplied ? subtotal * 0.1 : 0;
  const total    = subtotal - discount;
  const savings  = items.reduce((s, i) => i.original_price ? s + (i.original_price - i.price) : s, 0) + discount;
  const walletCanPay = paymentMethod !== 'wallet' || walletBalance + 0.0001 >= total;

  const applyPromo = () => {
    setPromoError('');
    if (promoCode.trim().toUpperCase() === 'GAME10') { setPromoApplied(true); }
    else { setPromoError('Invalid promo code. Try GAME10'); }
  };

  const handleCheckout = async () => {
    if (!items.length) return;
    setCheckoutError('');
    if (paymentMethod === 'wallet' && walletBalance + 0.0001 < total) {
      setCheckoutError('Your wallet balance is too low. Top up first, then try checkout again.');
      return;
    }
    setPurchasing(true);
    try {
      const orderId = generateOrderId();

      // Separate skin items (need trade escrow) from instant items
      const skinItems   = items.filter(i => i.type === 'Skin' || i.type === 'CS2 Skin' || i.type === 'Valorant Skin');
      const instantItems = items.filter(i => !skinItems.includes(i));

      // For store listings (item_id is numeric or "store_N"), call the purchase
      // endpoint so stock updates and skin trade_requests are created in the DB.
      const extractListingId = (itemId: string | number): string | null => {
        const s = String(itemId);
        if (/^\d+$/.test(s)) return s;                         // plain number
        const m = s.match(/^store_(\d+)$/);                    // "store_5" format
        return m ? m[1] : null;
      };

      const storeItems: PurchaseItem[] = items
        .map(i => {
          const lid = extractListingId(i.item_id);
          if (!lid) return null;
          return { listing_id: lid, name: i.name, game: i.game, price: i.price, type: i.type };
        })
        .filter((x): x is PurchaseItem => x !== null);

      if (storeItems.length > 0) {
        await apiPurchaseItems(storeItems).catch(console.error);
        window.dispatchEvent(new Event('notifications_updated'));
      }

      if (paymentMethod === 'wallet') {
        const nextWallet = await apiDebitWallet(total, `Order ${orderId}`);
        setWalletBalance(nextWallet.balance_usd ?? 0);
      }

      await apiClearCart();

      // If any skin items → show trade pending modal (no key reveal)
      if (skinItems.length > 0) {
        setTradePending(skinItems.map(i => ({
          name: i.name, game: i.game, price: i.price, image: i.image,
        })));
        setPurchasedOrderId(orderId);
        setItems([]);
        setPurchasing(false);
        return;
      }

      // Instant items — generate keys as before
      const keys: PurchasedKey[] = instantItems.map(item => ({
        name:     item.name,
        platform: item.platform,
        image:    item.image,
        key:      item.type === 'Account' ? generateAccountCredentials() : generateSteamKey(),
        type:     item.type,
      }));

      if (user) {
        savePurchaseOrder(user.id, {
          orderId,
          purchasedAt: new Date().toISOString(),
          items: keys.map((k, idx) => ({
            name:          k.name,
            platform:      k.platform,
            image:         k.image,
            price:         instantItems[idx]?.price ?? 0,
            originalPrice: instantItems[idx]?.original_price ?? null,
            key:           k.key,
          })),
          total,
          paymentMethod,
          promoApplied,
        });
      }
      setItems([]);
      setPurchasedOrderId(orderId);
      setPurchasedKeys(keys);
    } catch (e) {
      console.error(e);
      setCheckoutError(e instanceof Error ? e.message : 'Checkout failed. Please try again.');
    } finally {
      setPurchasing(false);
    }
  };

  // ── Not logged in ─────────────────────────────────────────────────────────
  if (!user) {
    return (
      <div className="max-w-7xl mx-auto px-5 py-20 flex flex-col items-center gap-5 text-center">
        <div
          className="w-20 h-20 rounded-2xl flex items-center justify-center"
          style={{ background: 'color-mix(in oklab, var(--gs-accent) 12%, transparent)', border: '1px solid color-mix(in oklab, var(--gs-accent) 20%, transparent)' }}
        >
          <LogIn className="size-9 text-gs-accent opacity-70" />
        </div>
        <h1 className="text-gs-text text-xl" style={{ fontWeight: 700 }}>Sign in to view your cart</h1>
        <p className="text-gs-faint text-sm max-w-xs">Your cart is saved to your account. Log in to see your items.</p>
        <button
          onClick={() => navigate('/login')}
          id="cart-login-btn"
          className="flex items-center gap-2 px-6 py-2.5 rounded-xl text-sm accent-glow"
          style={{ background: 'linear-gradient(135deg, var(--gs-accent), color-mix(in oklab, var(--gs-accent) 70%, #e879f9))', color: 'var(--gs-accent-fg)', fontWeight: 700 }}
        >
          <LogIn className="size-4" /> Sign In
        </button>
      </div>
    );
  }

  // ── Loading ───────────────────────────────────────────────────────────────
  if (loading) {
    return (
      <div className="max-w-7xl mx-auto px-5 py-20 flex flex-col items-center gap-4">
        <div className="w-8 h-8 rounded-full border-2 border-gs-accent/30 border-t-gs-accent animate-spin" />
        <p className="text-gs-faint text-sm">Loading your cart…</p>
      </div>
    );
  }

  // ── Empty cart ────────────────────────────────────────────────────────────
  if (items.length === 0 && !purchasedKeys) {
    return (
      <div className="max-w-7xl mx-auto px-5 py-16 flex flex-col items-center gap-5">
        <div
          className="w-20 h-20 rounded-2xl flex items-center justify-center"
          style={{ background: 'color-mix(in oklab, var(--gs-accent) 12%, transparent)', border: '1px solid color-mix(in oklab, var(--gs-accent) 20%, transparent)' }}
        >
          <ShoppingCart className="size-9 text-gs-accent opacity-60" />
        </div>
        <h1 className="text-gs-text text-xl" style={{ fontWeight: 700 }}>Your cart is empty</h1>
        <p className="text-gs-faint text-sm text-center max-w-xs">
          Browse the dashboard and click <strong>Add to Cart</strong> on any Random Key or Hot Deal.
        </p>
        <Link
          to="/"
          id="go-to-store-empty"
          className="flex items-center gap-2 px-6 py-2.5 rounded-xl text-sm transition-all accent-glow"
          style={{ background: 'linear-gradient(135deg, var(--gs-accent), color-mix(in oklab, var(--gs-accent) 70%, #e879f9))', color: 'var(--gs-accent-fg)', fontWeight: 700 }}
        >
          Browse Games <ChevronRight className="size-4" />
        </Link>
      </div>
    );
  }

  // ── Cart with items ───────────────────────────────────────────────────────
  return (
    <div className="max-w-7xl mx-auto px-5 py-8">
      {/* Header */}
      <div className="flex items-center gap-3 mb-8">
        <div
          className="w-9 h-9 rounded-xl flex items-center justify-center shrink-0"
          style={{ background: 'color-mix(in oklab, var(--gs-accent) 14%, transparent)', border: '1px solid color-mix(in oklab, var(--gs-accent) 25%, transparent)' }}
        >
          <ShoppingCart className="size-4 text-gs-accent" />
        </div>
        <div>
          <h1 className="text-gs-text" style={{ fontWeight: 700, fontSize: '1.25rem' }}>Your Cart</h1>
          <p className="text-gs-faint text-xs mt-0.5">
            {items.length} item{items.length !== 1 ? 's' : ''} · signed in as{' '}
            <span className="text-gs-accent">{user.username}</span>
          </p>
        </div>
        <Link
          to="/"
          id="continue-shopping-link"
          className="ml-auto text-xs text-gs-accent hover:underline flex items-center gap-1"
          style={{ fontWeight: 500 }}
        >
          Continue Shopping <ChevronRight className="size-3" />
        </Link>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Items list */}
        <div className="lg:col-span-2 space-y-3">
          {items.map(item => (
            <div
              key={item.id}
              className="rounded-xl border border-gs-border overflow-hidden card-hover group"
              style={{ background: 'var(--gs-surface)' }}
            >
              <div className="flex gap-0">
                <div className="relative w-28 shrink-0 overflow-hidden">
                  <ImageWithFallback
                    src={item.image}
                    alt={item.name}
                    className="w-full h-full object-cover group-hover:scale-[1.05] transition-transform duration-500"
                    style={{ minHeight: '100px' }}
                  />
                  <div className="absolute inset-0 bg-gradient-to-r from-transparent to-black/30" />
                  <div className="absolute left-0 top-0 bottom-0 w-0.5" style={{ background: item.game_color }} />
                </div>
                <div className="flex-1 p-4 flex flex-col gap-2 min-w-0">
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <div className="flex items-center gap-2 mb-1">
                        <span
                          className="text-[9px] px-2 py-0.5 rounded-full border"
                          style={{ color: item.game_color, background: `${item.game_color}15`, borderColor: `${item.game_color}30`, fontWeight: 600 }}
                        >
                          {item.type}
                        </span>
                        <span className="text-gs-faint text-[10px]">{item.platform}</span>
                      </div>
                      <p className="text-gs-text text-sm truncate" style={{ fontWeight: 600 }}>{item.name}</p>
                      <div className="flex items-center gap-1.5 mt-0.5">
                        <Gamepad2 className="size-3 text-gs-faint" />
                        <span className="text-gs-faint text-xs">{item.game}</span>
                      </div>
                    </div>
                    <button
                      id={`remove-item-${item.id}`}
                      onClick={() => removeItem(item.id)}
                      className="shrink-0 text-gs-faint hover:text-red-400 w-7 h-7 flex items-center justify-center rounded-lg hover:bg-red-400/10 transition-all"
                      aria-label={`Remove ${item.name}`}
                    >
                      <Trash2 className="size-3.5" />
                    </button>
                  </div>
                  <div className="flex items-center justify-between mt-auto pt-1 border-t border-gs-border">
                    <div className="flex items-center gap-2">
                      <span className="text-gs-text" style={{ fontWeight: 700 }}>${item.price.toLocaleString()}</span>
                      {item.original_price && (
                        <span className="text-gs-faint text-xs line-through">${item.original_price}</span>
                      )}
                      {item.original_price && (
                        <span
                          className="text-emerald-400 text-[10px] px-1.5 py-0.5 bg-emerald-400/10 rounded-full border border-emerald-400/20"
                          style={{ fontWeight: 600 }}
                        >
                          -{Math.round((1 - item.price / item.original_price) * 100)}%
                        </span>
                      )}
                    </div>
                    <div className="flex items-center gap-1 text-gs-faint text-[10px]">
                      <Key className="size-3" /> Steam Key · <ShieldCheck className="size-3" /> Verified
                    </div>
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>

        {/* Sidebar */}
        <div className="space-y-4">
          {/* Promo */}
          <div className="rounded-xl border border-gs-border p-5 space-y-3" style={{ background: 'var(--gs-surface)' }}>
            <p className="text-gs-text text-sm flex items-center gap-2" style={{ fontWeight: 600 }}>
              <Tag className="size-4 text-gs-accent" /> Promo Code
            </p>
            {promoApplied ? (
              <div className="flex items-center gap-2 text-emerald-400 text-sm bg-emerald-400/10 border border-emerald-400/20 rounded-lg px-3 py-2.5">
                <CheckCircle2 className="size-4 shrink-0" />
                <span style={{ fontWeight: 600 }}>GAME10 applied — 10% off!</span>
              </div>
            ) : (
              <div className="flex gap-2">
                <input
                  id="promo-input"
                  type="text"
                  value={promoCode}
                  onChange={e => { setPromoCode(e.target.value); setPromoError(''); }}
                  placeholder="Try GAME10"
                  className="flex-1 min-w-0 bg-gs-surface-2 border border-gs-border rounded-lg px-3 py-2 text-gs-text placeholder-gs-faint focus:outline-none focus:border-gs-accent/50 text-sm"
                />
                <button
                  id="apply-promo-btn"
                  onClick={applyPromo}
                  className="shrink-0 px-3 py-2 rounded-lg text-xs"
                  style={{ background: 'var(--gs-accent)', color: 'var(--gs-accent-fg)', fontWeight: 600 }}
                >
                  Apply
                </button>
              </div>
            )}
            {promoError && <p className="text-red-400 text-xs">{promoError}</p>}
          </div>

          {/* Payment */}
          <div className="rounded-xl border border-gs-border p-5 space-y-3" style={{ background: 'var(--gs-surface)' }}>
            <p className="text-gs-text text-sm flex items-center gap-2" style={{ fontWeight: 600 }}>
              <CreditCard className="size-4 text-gs-accent" /> Payment Method
            </p>
            <div className="space-y-2">
              {PAYMENT_METHODS.map(({ id, label, icon: Icon }) => {
                const isWallet = id === 'wallet';
                const isActive = paymentMethod === id;
                return (
                  <label
                    key={id}
                    htmlFor={`payment-${id}`}
                    className="flex items-center gap-3 cursor-pointer rounded-lg px-3 py-2.5 border transition-all"
                    style={{
                      background: isActive ? 'color-mix(in oklab, var(--gs-accent) 8%, transparent)' : 'var(--gs-surface-2)',
                      borderColor: isActive ? 'color-mix(in oklab, var(--gs-accent) 45%, transparent)' : 'var(--gs-border)',
                    }}
                  >
                    <input
                      id={`payment-${id}`}
                      type="radio"
                      name="payment"
                      value={id}
                      checked={isActive}
                      onChange={() => setPaymentMethod(id)}
                      className="sr-only"
                    />
                    <div
                      className="w-4 h-4 rounded-full border-2 flex items-center justify-center shrink-0"
                      style={{ borderColor: isActive ? 'var(--gs-accent)' : 'var(--gs-border)' }}
                    >
                      {isActive && <div className="w-2 h-2 rounded-full" style={{ background: 'var(--gs-accent)' }} />}
                    </div>
                    <Icon className="size-4 text-gs-muted shrink-0" />
                    <span className="min-w-0 flex-1">
                      <span className="block text-gs-text text-sm" style={{ fontWeight: 600 }}>{label}</span>
                      {isWallet && (
                        <span className={`block text-xs ${walletCanPay ? 'text-gs-faint' : 'text-red-400'}`}>
                          Balance ${walletBalance.toFixed(2)} {walletCanPay ? 'available' : 'is not enough'}
                        </span>
                      )}
                    </span>
                    {isWallet && !walletCanPay && (
                      <Link to="/top-up" className="shrink-0 text-xs font-bold text-gs-accent hover:underline">
                        Top Up
                      </Link>
                    )}
                  </label>
                );
              })}
            </div>
          </div>

          {/* Summary */}
          <div className="rounded-xl border border-gs-border p-5 space-y-4" style={{ background: 'var(--gs-surface)' }}>
            <p className="text-gs-text text-sm" style={{ fontWeight: 600 }}>Order Summary</p>
            <div className="space-y-2 text-sm">
              <div className="flex justify-between text-gs-muted">
                <span>Subtotal ({items.length} items)</span>
                <span>${subtotal.toFixed(2)}</span>
              </div>
              {discount > 0 && (
                <div className="flex justify-between text-emerald-400">
                  <span>Promo (10%)</span><span>−${discount.toFixed(2)}</span>
                </div>
              )}
              {savings > 0 && (
                <div className="flex justify-between text-emerald-400">
                  <span>Sale savings</span><span>−${(savings - discount).toFixed(2)}</span>
                </div>
              )}
              <div className="h-px bg-gs-border" />
              <div className="flex justify-between text-gs-text" style={{ fontWeight: 700, fontSize: '1rem' }}>
                <span>Total</span><span>${total.toFixed(2)}</span>
              </div>
              {savings > 0 && (
                <p className="text-emerald-400 text-xs text-center bg-emerald-400/8 border border-emerald-400/20 rounded-lg py-1.5" style={{ fontWeight: 600 }}>
                  You save ${savings.toFixed(2)} 🎉
                </p>
              )}
            </div>

            {checkoutError && (
              <div className="flex items-start gap-2 rounded-lg border border-red-500/25 bg-red-500/10 px-3 py-2 text-xs font-medium text-red-400">
                <AlertCircle className="size-3.5 mt-0.5 shrink-0" />
                <span>{checkoutError}</span>
              </div>
            )}

            {/* Checkout button */}
            <button
              id="checkout-btn"
              onClick={handleCheckout}
              disabled={purchasing || items.length === 0 || !walletCanPay}
              className="w-full flex items-center justify-center gap-2 py-3.5 rounded-xl text-sm transition-all accent-glow"
              style={{
                background: 'linear-gradient(135deg, var(--gs-accent), color-mix(in oklab, var(--gs-accent) 70%, #e879f9))',
                color: 'var(--gs-accent-fg)',
                fontWeight: 700,
                opacity: (purchasing || items.length === 0 || !walletCanPay) ? 0.7 : 1,
                cursor: (purchasing || items.length === 0 || !walletCanPay) ? 'not-allowed' : 'pointer',
              }}
            >
              {purchasing
                ? <><span className="w-4 h-4 rounded-full border-2 border-white/30 border-t-white animate-spin" style={{ display: 'inline-block' }} />Processing…</>
                : <><Key className="size-4" />{paymentMethod === 'wallet' ? 'Pay from Wallet' : `Pay $${total.toFixed(2)} & Checkout`}</>
              }
            </button>
            <div className="flex items-center justify-center gap-1.5 text-gs-faint text-xs">
              <ShieldCheck className="size-3.5" /> Secure checkout · Instant delivery
            </div>
          </div>

          {/* Trust badges */}
          <div className="rounded-xl border border-gs-border p-4 grid grid-cols-3 gap-3" style={{ background: 'var(--gs-surface)' }}>
            {[
              { icon: ShieldCheck, label: 'Buyer\nProtection' },
              { icon: Key,         label: 'Instant\nKey' },
              { icon: Gift,        label: '24/7\nSupport' },
            ].map(({ icon: Icon, label }) => (
              <div key={label} className="flex flex-col items-center gap-1 text-center">
                <div
                  className="w-8 h-8 rounded-lg flex items-center justify-center"
                  style={{ background: 'color-mix(in oklab, var(--gs-accent) 10%, transparent)', border: '1px solid color-mix(in oklab, var(--gs-accent) 20%, transparent)' }}
                >
                  <Icon className="size-4 text-gs-accent" />
                </div>
                <span className="text-gs-faint text-[10px] leading-tight whitespace-pre-line">{label}</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Steam-style key reveal modal */}
      {purchasedKeys && (
        <KeysRevealModal
          keys={purchasedKeys}
          orderId={purchasedOrderId}
          onClose={() => setPurchasedKeys(null)}
        />
      )}

      {/* Skin trade pending modal */}
      {tradePending && (
        <TradePendingModal
          trades={tradePending}
          orderId={purchasedOrderId}
          onClose={() => setTradePending(null)}
        />
      )}
    </div>
  );
}
