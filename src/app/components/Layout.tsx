import { useState, useEffect, useRef, useCallback, type FormEvent } from 'react';
import { Outlet, NavLink, Link, useNavigate, useLocation, useSearchParams } from 'react-router';
import {
  ShoppingCart, User, Search, ChevronDown,
  LogOut, ShieldCheck, Settings, Menu, X, ShoppingBag,
  HeadphonesIcon, Store, BarChart3, Home, Library,
  Users, Sparkles, Wallet,
} from 'lucide-react';
import { getUser, apiLogout, apiGetCart, apiGetWallet, ensureSlimToken, type AuthUser, type UserRole } from '../lib/api';
import { useAppSettings } from '../lib/AppContext';
import { useT } from '../lib/i18n';
import { NotificationBell } from './NotificationBell';
import { FloatingContact } from './FloatingContact';
import { CATALOG_OPTIONS, getCatalogById, getCatalogLabel, type CatalogId } from '../lib/catalog';

const ROLE_BADGE: Record<UserRole, { label: string; style: string }> = {
  admin:      { label: 'Admin', style: 'bg-gs-surface-2 text-gs-muted border border-gs-border' },
  shop_owner: { label: 'Shop',  style: 'bg-gs-surface-2 text-gs-muted border border-gs-border' },
  gamer:      { label: 'Gamer', style: 'bg-gs-surface-2 text-gs-muted border border-gs-border' },
};

const SIDEBAR_NAV = [
  { to: '/',          labelKey: 'nav.home' as const,      icon: Home,      end: true },
  { to: '/store',     labelKey: 'nav.store' as const,     icon: Store },
  { to: '/purchase-history', labelKey: 'nav.purchaseHistory' as const, icon: Library },
  { to: '/top-up',    label: 'Top Up',                   icon: Wallet },
  { to: '/community', label: 'Community',                icon: Users },
  { to: '/vision',    labelKey: 'nav.vision' as const,    icon: Sparkles },
];

export function Layout() {
  const navigate = useNavigate();
  const location = useLocation();
  const [searchParams, setSearchParams] = useSearchParams();
  const activeCatalog = getCatalogById(location.pathname === '/' ? searchParams.get('cat') : null);
  useAppSettings();
  const t = useT();

  const [user, setUser] = useState<AuthUser | null>(null);
  const [showUserMenu, setShowUserMenu] = useState(false);
  const [showMobileSidebar, setShowMobileSidebar] = useState(false);
  const [showCatDropdown, setShowCatDropdown] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [cartCount, setCartCount] = useState(0);
  const [walletBalance, setWalletBalance] = useState(0);
  const [cartPing, setCartPing] = useState(false);

  const userMenuRef = useRef<HTMLDivElement>(null);
  const catDropdownRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    ensureSlimToken().finally(() => setUser(getUser()));
  }, []);
  useEffect(() => {
    const refreshUser = () => setUser(getUser());
    window.addEventListener('user_updated', refreshUser);
    return () => window.removeEventListener('user_updated', refreshUser);
  }, []);

  const fetchCart = useCallback(async () => {
    if (!user) {
      setCartCount(0);
      return;
    }
    try {
      const items = await apiGetCart();
      setCartCount(prev => {
        if (items.length > prev) {
          setCartPing(true);
          setTimeout(() => setCartPing(false), 500);
        }
        return items.length;
      });
    } catch {
      setCartCount(0);
    }
  }, [user]);

  useEffect(() => {
    if (user) fetchCart();
    window.addEventListener('cart_updated', fetchCart);
    return () => window.removeEventListener('cart_updated', fetchCart);
  }, [user, fetchCart]);

  const fetchWallet = useCallback(async () => {
    if (!user) {
      setWalletBalance(0);
      return;
    }
    try {
      const data = await apiGetWallet();
      setWalletBalance(data.balance_usd ?? 0);
    } catch {
      setWalletBalance(0);
    }
  }, [user]);

  useEffect(() => {
    if (user) fetchWallet();
    window.addEventListener('wallet_updated', fetchWallet);
    return () => window.removeEventListener('wallet_updated', fetchWallet);
  }, [user, fetchWallet]);

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (userMenuRef.current && !userMenuRef.current.contains(e.target as Node)) {
        setShowUserMenu(false);
      }
      if (catDropdownRef.current && !catDropdownRef.current.contains(e.target as Node)) {
        setShowCatDropdown(false);
      }
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  useEffect(() => {
    setShowMobileSidebar(false);
  }, [location.pathname]);

  const handleLogout = () => {
    apiLogout();
    setUser(null);
    setShowUserMenu(false);
    navigate('/login');
  };

  const handleSearch = (e: FormEvent) => {
    e.preventDefault();
    if (searchQuery.trim()) {
      navigate(`/store?q=${encodeURIComponent(searchQuery.trim())}`);
    }
  };

  const setCatalogFilter = (cat: CatalogId) => {
    setShowCatDropdown(false);
    setShowMobileSidebar(false);
    if (location.pathname !== '/') {
      navigate(cat === 'all' ? '/' : `/?cat=${cat}`);
      return;
    }
    if (cat === 'all') setSearchParams({});
    else setSearchParams({ cat });
  };

  const sidebarContent = (
    <>
      {/* Logo */}
      <Link to="/" className="flex items-center gap-3 px-2 mb-8 group">
        <img
          src="/src/assets/iconweb.png"
          alt="GameGuide"
          className="w-9 h-9 rounded-xl shrink-0 transition-transform group-hover:scale-105"
        />
        <span className="font-extrabold text-base tracking-tight" style={{ color: 'var(--gs-text)' }}>
          Game<span style={{ color: 'var(--gs-accent)' }}>Guide</span>
        </span>
      </Link>

      {/* Nav links */}
      <nav className="flex-1 space-y-1 overflow-y-auto scrollbar-none">
        {SIDEBAR_NAV.map((item, idx) => {
          const Icon = item.icon;
          const label = 'labelKey' in item && item.labelKey ? t(item.labelKey) : item.label;
          const isHome = item.to === '/' && 'end' in item && item.end;

          if (isHome) {
            return (
              <div key="home-section" className="space-y-1">
                <NavLink
                  to="/"
                  end
                  className={({ isActive }) =>
                    `gs-nav-link flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium ${
                      isActive ? 'text-white' : 'text-gs-muted hover:text-gs-text'
                    }`
                  }
                  style={({ isActive }) => ({
                    background: isActive ? 'rgba(124, 58, 237, 0.18)' : 'transparent',
                  })}
                >
                  {({ isActive }) => (
                    <>
                      <Icon className="size-[18px] shrink-0" style={{ color: isActive ? 'var(--gs-accent)' : undefined }} />
                      {label}
                    </>
                  )}
                </NavLink>

                <div className="relative px-1" ref={catDropdownRef}>
                  <button
                    type="button"
                    onClick={() => setShowCatDropdown(open => !open)}
                    className="w-full flex items-center justify-between gap-2 px-3 py-2 rounded-xl border text-xs font-semibold transition-all hover:border-[var(--gs-accent)]"
                    style={{
                      background: 'var(--gs-surface)',
                      borderColor: showCatDropdown ? 'var(--gs-accent)' : 'var(--gs-border)',
                      color: 'var(--gs-text)',
                    }}
                  >
                    <span className="truncate" style={{ color: activeCatalog === 'all' ? 'var(--gs-accent)' : 'var(--gs-text)' }}>
                      {getCatalogLabel(activeCatalog)}
                    </span>
                    <ChevronDown
                      className={`size-3.5 shrink-0 transition-transform ${showCatDropdown ? 'rotate-180' : ''}`}
                      style={{ color: 'var(--gs-muted)' }}
                    />
                  </button>

                  {showCatDropdown && (
                    <div
                      className="gs-dropdown absolute top-full left-1 right-1 mt-1 rounded-xl border shadow-2xl overflow-hidden z-50 py-1 max-h-64 overflow-y-auto"
                      style={{ background: 'var(--gs-surface)', borderColor: 'var(--gs-border)' }}
                    >
                      {CATALOG_OPTIONS.map(cat => {
                        const isActive = activeCatalog === cat.id;
                        return (
                          <button
                            key={cat.id}
                            type="button"
                            onClick={() => setCatalogFilter(cat.id)}
                            className="w-full text-left px-3 py-2 text-xs font-medium transition-colors"
                            style={{
                              color: isActive ? 'var(--gs-accent)' : 'var(--gs-muted)',
                              fontWeight: isActive ? 600 : 500,
                              background: isActive ? 'rgba(139, 92, 246, 0.08)' : 'transparent',
                            }}
                          >
                            {cat.label}
                          </button>
                        );
                      })}
                    </div>
                  )}
                </div>
              </div>
            );
          }

          return (
            <NavLink
              key={`${item.to}-${idx}`}
              to={item.to}
              end={'end' in item ? item.end : false}
              className={({ isActive }) =>
                `gs-nav-link flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium ${
                  isActive ? 'text-white' : 'text-gs-muted hover:text-gs-text'
                }`
              }
              style={({ isActive }) => ({
                background: isActive ? 'rgba(124, 58, 237, 0.18)' : 'transparent',
              })}
            >
              {({ isActive }) => (
                <>
                  <Icon className="size-[18px] shrink-0" style={{ color: isActive ? 'var(--gs-accent)' : undefined }} />
                  {label}
                </>
              )}
            </NavLink>
          );
        })}

        {user && (user.role === 'shop_owner' || user.role === 'admin') && (
          <NavLink
            to="/shop-owner"
            className={({ isActive }) =>
              `gs-nav-link flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium mt-2 ${
                isActive ? 'text-white' : 'text-gs-muted hover:text-gs-text'
              }`
            }
            style={({ isActive }) => ({
              background: isActive ? 'rgba(124, 58, 237, 0.18)' : 'transparent',
            })}
          >
            {({ isActive }) => (
              <>
                <Store className="size-[18px] shrink-0" style={{ color: isActive ? 'var(--gs-accent)' : undefined }} />
                Shop Dashboard
              </>
            )}
          </NavLink>
        )}
      </nav>
    </>
  );

  return (
    <div className="min-h-screen flex" style={{ background: 'var(--gs-bg)', color: 'var(--gs-text)' }}>

      {/* ══ DESKTOP SIDEBAR ════════════════════════════════════════════════ */}
      <aside
        className="hidden lg:flex flex-col fixed left-0 top-0 bottom-0 z-40 p-3"
        style={{ width: 'var(--gs-sidebar-width)' }}
      >
        <div
          className="gs-sidebar-panel flex flex-col flex-1 p-4 overflow-hidden"
          style={{
            borderRadius: 'var(--gs-topbar-radius)',
            background: 'var(--gs-sidebar-bg)',
            backdropFilter: 'blur(20px)',
            WebkitBackdropFilter: 'blur(20px)',
            border: '1px solid var(--gs-sidebar-border)',
            boxShadow: '0 4px 24px rgba(0, 0, 0, 0.06)',
          }}
        >
          {sidebarContent}
        </div>
      </aside>

      {/* ══ MOBILE SIDEBAR OVERLAY ═════════════════════════════════════════ */}
      {showMobileSidebar && (
        <>
          <div className="gs-mobile-overlay fixed inset-0 z-50 bg-black/60 lg:hidden" onClick={() => setShowMobileSidebar(false)} />
          <aside
            className="gs-mobile-sidebar fixed left-3 top-3 bottom-3 z-50 flex flex-col p-5 w-[280px] lg:hidden"
            style={{
              borderRadius: 'var(--gs-topbar-radius)',
              background: 'var(--gs-sidebar-bg)',
              backdropFilter: 'blur(20px)',
              border: '1px solid var(--gs-sidebar-border)',
              boxShadow: '0 16px 48px rgba(0, 0, 0, 0.2)',
            }}
          >
            <button
              className="absolute top-4 right-4 p-1.5 rounded-lg text-gs-muted hover:text-gs-text"
              onClick={() => setShowMobileSidebar(false)}
            >
              <X className="size-5" />
            </button>
            {sidebarContent}
          </aside>
        </>
      )}

      {/* ══ MAIN COLUMN ════════════════════════════════════════════════════ */}
      <div
        className="flex-1 flex flex-col min-h-screen min-w-0"
        style={{ marginLeft: undefined }}
      >
        <div className="lg:pl-[var(--gs-sidebar-width)] flex flex-col flex-1 min-h-screen">

          {/* ── Top bar ─────────────────────────────────────────────────── */}
          <div className="sticky top-0 z-30 px-4 lg:px-6 pt-3 pb-1">
            <header
              className="gs-topbar flex items-center gap-3 px-4 lg:px-5 h-[var(--gs-topbar-height)] border"
              style={{
                borderRadius: 'var(--gs-topbar-radius)',
                background: 'color-mix(in oklab, var(--gs-surface) 94%, transparent)',
                backdropFilter: 'blur(16px)',
                WebkitBackdropFilter: 'blur(16px)',
                borderColor: 'var(--gs-border)',
                boxShadow: '0 4px 20px rgba(0, 0, 0, 0.06)',
              }}
            >
            <button
              className="gs-icon-btn lg:hidden flex items-center justify-center w-9 h-9 rounded-xl shrink-0"
              style={{ color: 'var(--gs-muted)' }}
              onClick={() => setShowMobileSidebar(true)}
            >
              <Menu className="size-5" />
            </button>

            {/* Centered search */}
            <form onSubmit={handleSearch} className="flex-1 max-w-xl mx-auto">
              <div
                className="flex items-center gap-2 h-10 px-4 rounded-full border transition-colors focus-within:border-[var(--gs-accent)]"
                style={{ background: 'var(--gs-surface)', borderColor: 'var(--gs-border)' }}
              >
                <Search className="size-4 shrink-0" style={{ color: 'var(--gs-faint)' }} />
                <input
                  type="text"
                  value={searchQuery}
                  onChange={e => setSearchQuery(e.target.value)}
                  placeholder={t('nav.search')}
                  className="flex-1 bg-transparent text-sm focus:outline-none min-w-0"
                  style={{ color: 'var(--gs-text)' }}
                />
              </div>
            </form>

            {/* Right cluster */}
            <div className="flex items-center gap-2 shrink-0">
              <NotificationBell user={user} />

              <Link
                to="/cart"
                className="gs-icon-btn relative flex items-center justify-center w-9 h-9 rounded-xl"
                style={{ color: 'var(--gs-muted)' }}
                title="Cart"
              >
                <ShoppingCart className={`size-[18px] transition-transform ${cartPing ? 'scale-125' : ''}`} />
                {cartCount > 0 && (
                  <span
                    className="absolute -top-0.5 -right-0.5 text-[9px] font-bold w-4 h-4 flex items-center justify-center rounded-full"
                    style={{ background: 'var(--gs-accent)', color: '#fff' }}
                  >
                    {cartCount}
                  </span>
                )}
              </Link>

              {/* User pill */}
              {user ? (
                <div className="relative" ref={userMenuRef}>
                  <button
                    onClick={() => setShowUserMenu(u => !u)}
                    className="flex items-center gap-2 pl-1.5 pr-3 py-1 rounded-full border transition-all hover:border-[var(--gs-accent)]"
                    style={{ background: 'var(--gs-surface)', borderColor: 'var(--gs-border)' }}
                  >
                    <div
                      className="w-8 h-8 rounded-full flex items-center justify-center text-[10px] font-bold overflow-hidden shrink-0"
                      style={{ background: user.avatar_url ? 'transparent' : 'var(--gs-accent)', color: '#fff' }}
                    >
                      {user.avatar_url ? (
                        <img src={user.avatar_url} alt="" className="w-full h-full object-cover" />
                      ) : (
                        user.username.slice(0, 2).toUpperCase()
                      )}
                    </div>
                    <div className="hidden sm:block text-left">
                      <p className="text-xs font-bold leading-tight truncate max-w-[80px]" style={{ color: 'var(--gs-text)' }}>
                        {user.username}
                      </p>
                      <p className="text-[10px] font-semibold flex items-center gap-0.5" style={{ color: 'var(--gs-accent)' }}>
                        <Wallet className="size-2.5" />
                        ${walletBalance.toFixed(2)}
                      </p>
                    </div>
                    <ChevronDown className="size-3 hidden sm:block" style={{ color: 'var(--gs-faint)' }} />
                  </button>

                  {showUserMenu && (
                    <div
                      className="gs-dropdown absolute right-0 top-full mt-2 w-52 rounded-xl border shadow-2xl overflow-hidden z-50"
                      style={{ background: 'var(--gs-surface)', borderColor: 'var(--gs-border)' }}
                    >
                      <div className="px-4 py-3 border-b" style={{ borderColor: 'var(--gs-border)' }}>
                        <div className="flex items-center justify-between gap-2">
                          <p className="text-sm font-semibold truncate" style={{ color: 'var(--gs-text)' }}>{user.username}</p>
                          <span className={`shrink-0 text-[9px] px-1.5 py-0.5 rounded font-bold uppercase ${ROLE_BADGE[user.role].style}`}>
                            {ROLE_BADGE[user.role].label}
                          </span>
                        </div>
                        <p className="text-xs truncate mt-0.5" style={{ color: 'var(--gs-faint)' }}>{user.email}</p>
                      </div>
                      <Link to="/settings" onClick={() => setShowUserMenu(false)} className="flex items-center gap-2.5 px-4 py-2.5 text-sm transition-colors hover:bg-gs-surface-2" style={{ color: 'var(--gs-muted)' }}>
                        <Settings className="size-3.5" /> {t('nav.settings')}
                      </Link>
                      <Link to="/purchase-history" onClick={() => setShowUserMenu(false)} className="flex items-center gap-2.5 px-4 py-2.5 text-sm transition-colors hover:bg-gs-surface-2" style={{ color: 'var(--gs-muted)' }}>
                        <ShoppingBag className="size-3.5" /> {t('nav.purchaseHistory')}
                      </Link>
                      <Link to="/top-up" onClick={() => setShowUserMenu(false)} className="flex items-center gap-2.5 px-4 py-2.5 text-sm transition-colors hover:bg-gs-surface-2" style={{ color: 'var(--gs-muted)' }}>
                        <Wallet className="size-3.5" /> Top Up Balance
                      </Link>
                      <Link to="/analytics" onClick={() => setShowUserMenu(false)} className="flex items-center gap-2.5 px-4 py-2.5 text-sm transition-colors hover:bg-gs-surface-2" style={{ color: 'var(--gs-muted)' }}>
                        <BarChart3 className="size-3.5" /> {t('nav.analytics')}
                      </Link>
                      <Link to="/support" onClick={() => setShowUserMenu(false)} className="flex items-center gap-2.5 px-4 py-2.5 text-sm transition-colors hover:bg-gs-surface-2" style={{ color: 'var(--gs-muted)' }}>
                        <HeadphonesIcon className="size-3.5" /> Support
                      </Link>
                      {user.role === 'admin' && (
                        <Link to="/admin" onClick={() => setShowUserMenu(false)} className="flex items-center gap-2.5 px-4 py-2.5 text-sm transition-colors hover:bg-gs-surface-2" style={{ color: 'var(--gs-muted)' }}>
                          <ShieldCheck className="size-3.5" /> {t('nav.adminPanel')}
                        </Link>
                      )}
                      <button onClick={handleLogout} className="w-full flex items-center gap-2.5 px-4 py-2.5 text-sm transition-colors hover:bg-red-500/10 text-red-400">
                        <LogOut className="size-3.5" /> {t('nav.signOut')}
                      </button>
                    </div>
                  )}
                </div>
              ) : (
                <Link
                  to="/login"
                  className="gs-icon-btn flex items-center gap-2 px-4 py-2 rounded-full text-xs font-bold transition-all hover:opacity-90"
                  style={{ background: 'var(--gs-accent)', color: '#fff' }}
                >
                  <User className="size-3.5" />
                  <span className="hidden sm:inline">{t('nav.signIn')}</span>
                </Link>
              )}
            </div>
          </header>
          </div>

          {/* ── Page content ────────────────────────────────────────────── */}
          <main key={location.pathname} className="gs-page-enter flex-1 flex flex-col min-h-0">
            <Outlet />
          </main>

          {/* ── Minimal footer ──────────────────────────────────────────── */}
          <footer className="px-6 py-4 border-t" style={{ borderColor: 'var(--gs-border)' }}>
            <div className="flex flex-wrap items-center justify-between gap-3 text-[11px]" style={{ color: 'var(--gs-faint)' }}>
              <span>© 2026 GameGuide Marketplace</span>
              <div className="flex gap-4">
                <Link to="/privacy" className="hover:text-gs-text transition-colors">Privacy</Link>
                <Link to="/terms" className="hover:text-gs-text transition-colors">Terms</Link>
                <Link to="/support" className="hover:text-gs-text transition-colors">Support</Link>
              </div>
            </div>
          </footer>
        </div>
      </div>

      <FloatingContact />
    </div>
  );
}
