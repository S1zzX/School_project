import { useState, useEffect, useRef, useCallback, type FormEvent } from 'react';
import { Outlet, NavLink, Link, useNavigate, useLocation, useSearchParams } from 'react-router';
import {
  ShoppingCart, ShoppingBag, User, Search, ChevronDown,
  LogOut, ShieldCheck, Settings, X,
  HeadphonesIcon, BarChart3, Wallet,
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
  { to: '/',          labelKey: 'nav.home' as const,             end: true },
  { to: '/store',     labelKey: 'nav.store' as const                       },
  { to: '/purchase-history', labelKey: 'nav.purchaseHistory' as const      },
  { to: '/top-up',    label: 'Add Funds'                                   },
  { to: '/community', label: 'Community'                                   },
  { to: '/vision',    labelKey: 'nav.vision' as const                       },
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
      if (userMenuRef.current && !userMenuRef.current.contains(e.target as Node)) setShowUserMenu(false);
      if (catDropdownRef.current && !catDropdownRef.current.contains(e.target as Node)) setShowCatDropdown(false);
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
    if (searchQuery.trim()) navigate(`/store?q=${encodeURIComponent(searchQuery.trim())}`);
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


  const labelFor = (item: typeof SIDEBAR_NAV[number]) => 'labelKey' in item && item.labelKey ? t(item.labelKey) : item.label;


  const dockContent = (
    <div className="gg-dock-content">
      <Link to="/" className="gg-brand-block group">
        <img src="/src/assets/iconweb.png" alt="GameGuide" className="h-11 w-11 rounded-2xl object-cover transition-transform group-hover:scale-105" />
        <div className="min-w-0">
          <p className="text-[10px] font-black uppercase tracking-[0.22em] text-gs-faint">Arena OS</p>
          <p className="truncate text-lg font-black tracking-tight text-gs-text">GameGuide</p>
        </div>
      </Link>

      <div className="space-y-2">
        <div className="flex items-center justify-between">
          <p className="text-[10px] font-black uppercase tracking-[0.18em] text-gs-faint">Navigation</p>
        </div>
        <nav className="grid gap-1.5">
          {SIDEBAR_NAV.map(item => {
            const label = labelFor(item);
            return (
              <NavLink
                key={`dock-${item.to}`}
                to={item.to}
                end={'end' in item ? item.end : false}
                className={({ isActive }) => `gg-dock-link ${isActive ? 'is-active' : ''}`}
              >
                <span className="truncate">{label}</span>
              </NavLink>
            );
          })}
          {user && (user.role === 'shop_owner' || user.role === 'admin') && (
            <NavLink to="/shop-owner" className={({ isActive }) => `gg-dock-link ${isActive ? 'is-active' : ''}`}>
              <span className="truncate">Seller Hub</span>
            </NavLink>
          )}
          {user?.role === 'admin' && (
            <NavLink to="/admin" className={({ isActive }) => `gg-dock-link ${isActive ? 'is-active' : ''}`}>
              <span className="truncate">Admin</span>
            </NavLink>
          )}
        </nav>
      </div>

      <div className="relative" ref={catDropdownRef}>
        <button type="button" onClick={() => setShowCatDropdown(open => !open)} className="gg-catalog-trigger">
          <span className="truncate">{getCatalogLabel(activeCatalog)}</span>
          <ChevronDown className={`size-4 shrink-0 transition-transform ${showCatDropdown ? 'rotate-180' : ''}`} />
        </button>
        {showCatDropdown && (
          <div className="gg-catalog-menu">
            {CATALOG_OPTIONS.map(cat => {
              const isActive = activeCatalog === cat.id;
              return (
                <button key={cat.id} type="button" onClick={() => setCatalogFilter(cat.id)} className={`gg-catalog-option ${isActive ? 'is-active' : ''}`}>
                  <span>{cat.label}</span>
                  <span>{cat.id === 'all' ? 'ALL' : cat.id.slice(0, 3).toUpperCase()}</span>
                </button>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );

  return (
    <div className="gg-app-shell min-h-screen" style={{ background: 'var(--gs-bg)', color: 'var(--gs-text)' }}>
      <aside className="gg-command-shell hidden lg:block">
        <div className="gg-dock">{dockContent}</div>
      </aside>

      {showMobileSidebar && (
        <>
          <div className="fixed inset-0 z-50 bg-slate-950/55 backdrop-blur-sm lg:hidden" onClick={() => setShowMobileSidebar(false)} />
          <aside className="gg-mobile-dock fixed left-3 top-3 bottom-3 z-50 w-[min(330px,calc(100vw-1.5rem))] overflow-y-auto lg:hidden">
            <button className="absolute right-4 top-4 rounded-xl p-2 text-gs-muted hover:text-gs-text" onClick={() => setShowMobileSidebar(false)}>
              <X className="size-5" />
            </button>
            {dockContent}
          </aside>
        </>
      )}

      <div className="min-h-screen min-w-0 lg:pl-[var(--gs-sidebar-width)]">
        <div className="sticky top-0 z-30 px-3 pt-3 lg:px-6">
          <header className="gg-topbar">

            <form onSubmit={handleSearch} className="min-w-0 flex-1">
              <div className="gg-command-search">
                <Search className="size-4 shrink-0 text-gs-faint" />
                <input
                  type="text"
                  value={searchQuery}
                  onChange={e => setSearchQuery(e.target.value)}
                  placeholder={t('nav.search')}
                  className="min-w-0 flex-1 bg-transparent text-sm font-medium text-gs-text focus:outline-none"
                />
                <span className="hidden rounded-lg border border-gs-border px-2 py-1 text-[10px] font-bold text-gs-faint md:inline">FIND</span>
              </div>
            </form>

            <div className="flex shrink-0 items-center gap-2">
              <NotificationBell user={user} />

              <Link to="/cart" className="gg-icon-button relative" title="Cart">
                <ShoppingCart className={`size-[18px] transition-transform ${cartPing ? 'scale-125' : ''}`} />
                {cartCount > 0 && <span className="gg-cart-badge">{cartCount}</span>}
              </Link>

              {user ? (
                <div className="relative" ref={userMenuRef}>
                  <button onClick={() => setShowUserMenu(u => !u)} className="gg-user-chip">
                    <div className="h-9 w-9 shrink-0 overflow-hidden rounded-xl bg-gs-accent text-[10px] font-black text-white grid place-items-center">
                      {user.avatar_url ? <img src={user.avatar_url} alt="" className="h-full w-full object-cover" /> : user.username.slice(0, 2).toUpperCase()}
                    </div>
                    <div className="hidden min-w-0 text-left sm:block">
                      <p className="max-w-[96px] truncate text-xs font-black text-gs-text">{user.username}</p>
                      <p className="flex items-center gap-1 text-[10px] font-bold text-gs-accent"><Wallet className="size-2.5" />${walletBalance.toFixed(2)}</p>
                    </div>
                    <ChevronDown className="hidden size-3 text-gs-faint sm:block" />
                  </button>

                  {showUserMenu && (
                    <div className="gg-user-menu">
                      <div className="border-b border-gs-border px-4 py-3">
                        <div className="flex items-center justify-between gap-2">
                          <p className="truncate text-sm font-bold text-gs-text">{user.username}</p>
                          <span className={`shrink-0 rounded px-1.5 py-0.5 text-[9px] font-bold uppercase ${ROLE_BADGE[user.role].style}`}>{ROLE_BADGE[user.role].label}</span>
                        </div>
                        <p className="mt-0.5 truncate text-xs text-gs-faint">{user.email}</p>
                      </div>
                      <Link to="/settings" onClick={() => setShowUserMenu(false)} className="gg-user-menu-item"><Settings className="size-3.5" /> {t('nav.settings')}</Link>
                      <Link to="/purchase-history" onClick={() => setShowUserMenu(false)} className="gg-user-menu-item"><ShoppingBag className="size-3.5" /> {t('nav.purchaseHistory')}</Link>
                      <Link to="/top-up" onClick={() => setShowUserMenu(false)} className="gg-user-menu-item"><Wallet className="size-3.5" /> Top Up Balance</Link>
                      <Link to="/analytics" onClick={() => setShowUserMenu(false)} className="gg-user-menu-item"><BarChart3 className="size-3.5" /> {t('nav.analytics')}</Link>
                      <Link to="/support" onClick={() => setShowUserMenu(false)} className="gg-user-menu-item"><HeadphonesIcon className="size-3.5" /> Support</Link>
                      {user.role === 'admin' && <Link to="/admin" onClick={() => setShowUserMenu(false)} className="gg-user-menu-item"><ShieldCheck className="size-3.5" /> {t('nav.adminPanel')}</Link>}
                      <button onClick={handleLogout} className="gg-user-menu-item w-full text-red-500"><LogOut className="size-3.5" /> {t('nav.signOut')}</button>
                    </div>
                  )}
                </div>
              ) : (
                <Link to="/login" className="gg-signin-button"><User className="size-3.5" /><span className="hidden sm:inline">{t('nav.signIn')}</span></Link>
              )}
            </div>
          </header>
        </div>

        <main key={location.pathname} className="gg-route-frame gs-page-enter flex min-h-0 flex-1 flex-col">
          <Outlet />
        </main>

        <footer className="gg-footer">
          <span>Copyright 2026 GameGuide Marketplace</span>
          <div className="flex gap-4">
            <Link to="/privacy" className="hover:text-gs-text transition-colors">Privacy</Link>
            <Link to="/terms" className="hover:text-gs-text transition-colors">Terms</Link>
            <Link to="/support" className="hover:text-gs-text transition-colors">Support</Link>
          </div>
        </footer>
      </div>

      <FloatingContact />
    </div>
  );
}
