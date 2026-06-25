import { useState, useEffect, useRef, useCallback } from 'react';
import { Outlet, NavLink, Link, useNavigate, useSearchParams } from 'react-router';
import {
  ShoppingCart, User,
  Search, ChevronDown, Heart,
  LogOut, ShieldCheck, Settings,
  Menu, X, ShoppingBag, HeadphonesIcon, Store, Scan,
} from 'lucide-react';
import { getUser, apiLogout, apiGetCart, type AuthUser, type UserRole } from '../lib/api';
import { useAppSettings } from '../lib/AppContext';
import { useT } from '../lib/i18n';
import { NotificationBell } from './NotificationBell';
import { FloatingContact } from './FloatingContact';
import { CATALOG_OPTIONS, getCatalogById, getCatalogLabel } from '../lib/catalog';

const ROLE_BADGE: Record<UserRole, { label: string; style: string }> = {
  admin:      { label: 'Admin', style: 'bg-orange-400/20 text-orange-400' },
  shop_owner: { label: 'Shop',  style: 'bg-amber-400/20 text-amber-400' },
  gamer:      { label: 'Gamer', style: 'bg-zinc-700 text-zinc-300'  },
};

const NAV_KEYS = [
  { to: '/',          labelKey: 'nav.home'      as const, end: true },
  { to: '/store',     labelKey: 'nav.store'     as const },
  { to: '/community', labelKey: 'nav.community' as const },
  { to: '/vision',      labelKey: 'nav.vision'     as const },
  { to: '/analytics',   labelKey: 'nav.analytics'  as const },
  { to: '/cart',        labelKey: 'nav.cart'        as const },
  { to: '/support',     labelKey: 'nav.support'     as const },
];

export function Layout() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  useAppSettings();
  const t = useT();

  const activeCatalog = getCatalogById(searchParams.get('cat'));
  const activeCatalogLabel = activeCatalog === 'all' ? t('nav.allCategories') : getCatalogLabel(activeCatalog);

  const [user, setUser] = useState<AuthUser | null>(null);
  const [showUserMenu, setShowUserMenu] = useState(false);
  const [showCatMenu, setShowCatMenu] = useState(false);
  const [showMobileMenu, setShowMobileMenu] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [cartCount, setCartCount] = useState(0);
  const [cartPing, setCartPing] = useState(false);
  const [chatGame, setChatGame] = useState<string | null>(null);

  const userMenuRef = useRef<HTMLDivElement>(null);

  // Fetch user on mount + when profile updates
  useEffect(() => { setUser(getUser()); }, []);
  useEffect(() => {
    const refreshUser = () => setUser(getUser());
    window.addEventListener('user_updated', refreshUser);
    return () => window.removeEventListener('user_updated', refreshUser);
  }, []);

  // Fetch cart
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

  // Initial cart fetch and event listener
  useEffect(() => {
    if (user) fetchCart();
    window.addEventListener('cart_updated', fetchCart);
    return () => window.removeEventListener('cart_updated', fetchCart);
  }, [user, fetchCart]);

  // Close menus on outside click
  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (userMenuRef.current && !userMenuRef.current.contains(e.target as Node)) {
        setShowUserMenu(false);
      }
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  const handleLogout = () => {
    apiLogout();
    setUser(null);
    setShowUserMenu(false);
    navigate('/login');
  };

  return (
    <div className="min-h-screen flex flex-col" style={{ background: 'var(--gs-bg)', color: 'var(--gs-text)' }}>

      {/* ══ TOP NAV ══════════════════════════════════════════════════════════ */}
      <header
        className="sticky top-0 z-50 border-b"
        style={{
          background: 'var(--gs-header-bg)',
          borderColor: 'var(--gs-header-border)',
          backdropFilter: 'blur(16px)',
          WebkitBackdropFilter: 'blur(16px)',
          boxShadow: 'var(--gs-header-shadow)',
        }}
      >
        {/* Primary row */}
        <div className="max-w-screen-2xl mx-auto px-4 h-14 flex items-center gap-4">

          {/* Logo */}
          <Link to="/" className="flex items-center gap-2.5 shrink-0 mr-2 group">
            <img
              src="/src/assets/iconweb.png"
              alt="GameGuide"
              className="w-8 h-8 rounded-lg shrink-0 transition-transform duration-200 group-hover:scale-105"
            />
            <span className="font-extrabold text-lg tracking-tight" style={{ color: '#ffffff' }}>
              Game<span style={{ color: 'var(--gs-accent)' }}>Guide</span>
            </span>
          </Link>

          {/* Search bar with category dropdown */}
          <div className="flex-1 max-w-2xl flex items-stretch h-9">
            {/* Category selector */}
            <div className="relative">
              <button
                id="cat-dropdown-btn"
                onClick={() => setShowCatMenu(c => !c)}
                className="flex items-center gap-1.5 px-3 h-full text-xs font-medium rounded-l-lg border border-r-0 whitespace-nowrap transition-colors"
                style={{
                  background: 'rgba(255,255,255,0.08)',
                  borderColor: 'rgba(255,255,255,0.14)',
                  color: 'rgba(255,255,255,0.75)',
                }}
              >
                {activeCatalogLabel}
                <ChevronDown className="size-3" />
              </button>
              {showCatMenu && (
                <>
                  <div className="fixed inset-0 z-40" onClick={() => setShowCatMenu(false)} />
                  <div
                    className="absolute top-full left-0 mt-1 z-50 w-52 rounded-lg border shadow-2xl overflow-hidden"
                    style={{ background: '#1a1a2e', borderColor: 'rgba(255,255,255,0.1)' }}
                  >
                    {CATALOG_OPTIONS.map(cat => (
                      <button
                        key={cat.id}
                        onClick={() => {
                          setShowCatMenu(false);
                          navigate(cat.id === 'all' ? '/' : `/?cat=${cat.id}`);
                        }}
                        className="w-full text-left px-4 py-2.5 text-sm transition-colors"
                        style={{
                          color: cat.id === activeCatalog ? '#fff' : 'rgba(255,255,255,0.75)',
                          background: cat.id === activeCatalog ? 'rgba(26,111,212,0.35)' : 'transparent',
                        }}
                        onMouseEnter={e => {
                          if (cat.id !== activeCatalog) e.currentTarget.style.background = 'rgba(255,255,255,0.08)';
                        }}
                        onMouseLeave={e => {
                          if (cat.id !== activeCatalog) e.currentTarget.style.background = 'transparent';
                        }}
                      >
                        {cat.label}
                      </button>
                    ))}
                  </div>
                </>
              )}
            </div>

            {/* Search input */}
            <input
              type="text"
              value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
              placeholder={t('nav.search')}
              className="flex-1 border-y px-4 text-sm focus:outline-none"
              style={{
                background: 'rgba(255,255,255,0.08)',
                borderColor: 'rgba(255,255,255,0.14)',
                color: '#ffffff',
              }}
            />

            {/* Search button */}
            <button
              className="flex items-center justify-center px-4 rounded-r-lg transition-all hover:opacity-90"
              style={{ background: 'var(--gs-accent)', color: '#fff' }}
            >
              <Search className="size-4" />
            </button>
          </div>

          {/* Right actions */}
          <div className="flex items-center gap-2 ml-auto shrink-0">

            {/* Currency / Language */}
            <button
              className="hidden lg:flex items-center gap-1 text-xs px-2 py-1 rounded border transition-colors"
              style={{ color: 'rgba(255,255,255,0.65)', borderColor: 'rgba(255,255,255,0.2)', background: 'transparent' }}
            >
              {t('nav.currency')}
            </button>

            {/* Wishlist */}
            <button
              className="hidden md:flex items-center justify-center w-9 h-9 rounded-lg transition-colors"
              style={{ color: 'rgba(255,255,255,0.65)' }}
              title={t('nav.wishlist')}
              onMouseEnter={e => (e.currentTarget.style.background = 'rgba(255,255,255,0.08)')}
              onMouseLeave={e => (e.currentTarget.style.background = 'transparent')}
            >
              <Heart className="size-4" />
            </button>

            {/* User area */}
            {user ? (
              <div className="relative" ref={userMenuRef}>
                <button
                  id="user-menu-btn"
                  onClick={() => setShowUserMenu(u => !u)}
                  className="flex items-center gap-2 px-3 py-1.5 rounded-lg text-sm transition-all"
                  style={{ color: '#ffffff' }}
                  onMouseEnter={e => (e.currentTarget.style.background = 'rgba(255,255,255,0.08)')}
                  onMouseLeave={e => (e.currentTarget.style.background = 'transparent')}
                >
                  <div
                    className="w-7 h-7 rounded-full flex items-center justify-center text-[10px] font-bold overflow-hidden"
                    style={{ background: user.avatar_url ? 'transparent' : 'var(--gs-accent)', color: '#fff' }}
                  >
                    {user.avatar_url ? (
                      <img src={user.avatar_url} alt="" className="w-full h-full object-cover" />
                    ) : (
                      user.username.slice(0, 2).toUpperCase()
                    )}
                  </div>
                  <span className="hidden md:block font-semibold">{user.username}</span>
                  <ChevronDown className="size-3 hidden md:block" style={{ color: 'rgba(255,255,255,0.45)' }} />
                </button>

                {showUserMenu && (
                  <div
                    className="absolute right-0 top-full mt-2 w-52 rounded-xl border shadow-2xl overflow-hidden z-50"
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
                    <Link
                      to="/settings"
                      onClick={() => setShowUserMenu(false)}
                      className="flex items-center gap-2.5 px-4 py-2.5 text-sm transition-colors hover:bg-gs-surface-2"
                      style={{ color: 'var(--gs-muted)' }}
                    >
                      <Settings className="size-3.5" /> {t('nav.settings')}
                    </Link>
                    <Link
                      to="/purchase-history"
                      onClick={() => setShowUserMenu(false)}
                      className="flex items-center gap-2.5 px-4 py-2.5 text-sm transition-colors hover:bg-gs-surface-2"
                      style={{ color: 'var(--gs-muted)' }}
                    >
                      <ShoppingBag className="size-3.5" /> {t('nav.purchaseHistory')}
                    </Link>
                    <Link
                      to="/support"
                      onClick={() => setShowUserMenu(false)}
                      className="flex items-center gap-2.5 px-4 py-2.5 text-sm transition-colors hover:bg-gs-surface-2"
                      style={{ color: 'var(--gs-muted)' }}
                    >
                      <HeadphonesIcon className="size-3.5" /> Support
                    </Link>
                    {(user.role === 'shop_owner' || user.role === 'admin') && (
                      <Link
                        to="/shop-owner"
                        onClick={() => setShowUserMenu(false)}
                        className="flex items-center gap-2.5 px-4 py-2.5 text-sm transition-colors hover:bg-gs-surface-2"
                        style={{ color: '#f59e0b' }}
                      >
                        <Store className="size-3.5" /> Shop Dashboard
                      </Link>
                    )}
                    {user.role === 'admin' && (
                      <Link
                        to="/admin"
                        onClick={() => setShowUserMenu(false)}
                        className="flex items-center gap-2.5 px-4 py-2.5 text-sm transition-colors hover:bg-gs-surface-2"
                        style={{ color: 'var(--gs-accent)' }}
                      >
                        <ShieldCheck className="size-3.5" /> {t('nav.adminPanel')}
                      </Link>
                    )}
                    <button
                      id="logout-btn"
                      onClick={handleLogout}
                      className="w-full flex items-center gap-2.5 px-4 py-2.5 text-sm transition-colors hover:bg-red-500/10 text-red-400"
                    >
                      <LogOut className="size-3.5" /> {t('nav.signOut')}
                    </button>
                  </div>
                )}
              </div>
            ) : (
              <div className="flex items-center gap-2">
                <Link
                  to="/login"
                  id="header-login-link"
                  className="flex flex-col items-center px-3 py-1 rounded-lg text-xs transition-all"
                  style={{ color: 'rgba(255,255,255,0.65)' }}
                  onMouseEnter={e => (e.currentTarget.style.background = 'rgba(255,255,255,0.08)')}
                  onMouseLeave={e => (e.currentTarget.style.background = 'transparent')}
                >
                  <User className="size-4 mb-0.5" />
                  <span>{t('nav.signIn')}</span>
                  <span className="font-bold" style={{ color: '#ffffff', fontSize: '10px' }}>{t('nav.register')}</span>
                </Link>
              </div>
            )}

            {/* Notifications */}
            <NotificationBell user={user} />

            <Link
              to="/cart"
              className="flex items-center justify-center w-9 h-9 rounded-lg transition-colors relative"
              style={{ color: 'rgba(255,255,255,0.65)' }}
              title="Cart"
              onMouseEnter={e => (e.currentTarget.style.color = '#ffffff')}
              onMouseLeave={e => (e.currentTarget.style.color = 'rgba(255,255,255,0.65)')}
            >
              <ShoppingCart className={`size-4 transition-transform duration-200 ${cartPing ? 'scale-125' : ''}`} />
              {cartCount > 0 && (
                <span
                  key={cartCount}
                  className={`absolute -top-1 -right-1 text-[9px] font-bold w-4 h-4 flex items-center justify-center rounded-full ${cartPing ? 'animate-bounce' : ''}`}
                  style={{ background: 'var(--gs-accent)', color: '#fff' }}
                >
                  {cartCount}
                </span>
              )}
            </Link>

            {/* Mobile menu toggle */}
            <button
              className="md:hidden flex items-center justify-center w-9 h-9 rounded-lg"
              style={{ color: 'rgba(255,255,255,0.75)' }}
              onClick={() => setShowMobileMenu(m => !m)}
            >
              {showMobileMenu ? <X className="size-5" /> : <Menu className="size-5" />}
            </button>
          </div>
        </div>

        {/* Secondary nav bar */}
        <nav
          className="border-t hidden md:block"
          style={{
            background: 'var(--gs-subnav-bg)',
            borderColor: 'var(--gs-subnav-border)',
          }}
        >
          <div className="max-w-screen-2xl mx-auto px-4 flex items-center gap-0.5 h-10 overflow-x-auto scrollbar-none">
            {NAV_KEYS.map(({ to, labelKey, end }) => (
              <NavLink
                key={to}
                to={to}
                end={end}
                className={({ isActive }) =>
                  `relative px-4 py-2 text-sm font-semibold rounded-md whitespace-nowrap transition-all duration-150 ${
                    isActive
                      ? 'text-[var(--gs-subnav-text-active)]'
                      : 'text-[var(--gs-subnav-text)] hover:text-slate-900 hover:bg-slate-100'
                  }`
                }
                style={({ isActive }) => ({
                  background: isActive ? 'color-mix(in oklab, var(--gs-accent) 12%, transparent)' : undefined,
                })}
              >
                {({ isActive }) => (
                  <>
                    {t(labelKey)}
                    {isActive && (
                      <span
                        className="absolute bottom-0 left-2 right-2 h-0.5 rounded-full"
                        style={{
                          background: 'linear-gradient(90deg, transparent, var(--gs-accent), transparent)',
                          boxShadow: '0 0 8px var(--gs-accent)',
                        }}
                      />
                    )}
                  </>
                )}
              </NavLink>
            ))}
          </div>
        </nav>

        {/* Mobile menu drawer */}
        {showMobileMenu && (
          <div
            className="md:hidden border-t py-3 px-4 flex flex-col gap-1"
            style={{ background: 'var(--gs-surface)', borderColor: 'var(--gs-border)' }}
          >
            {NAV_KEYS.map(({ to, labelKey, end }) => (
              <NavLink
                key={to}
                to={to}
                end={end}
                onClick={() => setShowMobileMenu(false)}
                className={({ isActive }) =>
                  `px-3 py-2.5 rounded-lg text-sm font-medium transition-all ${
                    isActive
                      ? 'bg-gs-accent/10 text-gs-accent'
                      : 'text-gs-muted hover:text-gs-text hover:bg-gs-surface-2'
                  }`
                }
              >
                {t(labelKey)}
              </NavLink>
            ))}
          </div>
        )}
      </header>

      {/* ══ PAGE CONTENT ══════════════════════════════════════════════════════ */}
      <main className="flex-1">
        <Outlet context={{ setChatGame }} />
      </main>

      {/* ══ FOOTER ════════════════════════════════════════════════════════════ */}
      <footer
        className="border-t mt-16 py-10"
        style={{ background: 'var(--gs-surface)', borderColor: 'var(--gs-border)' }}
      >
        <div className="max-w-screen-2xl mx-auto px-4">
          <div className="flex flex-col md:flex-row items-center justify-between gap-4">
            <div className="flex items-center gap-2">
              <img
                src="/src/assets/iconweb.png"
                alt="GameGuide"
                className="w-6 h-6 rounded"
              />
              <span className="font-bold text-sm" style={{ color: 'var(--gs-text)' }}>
                Game<span style={{ color: 'var(--gs-accent)' }}>Guide</span> AI Assistant
              </span>
            </div>
            <p className="text-xs" style={{ color: 'var(--gs-faint)' }}>
              © 2026 GameGuide AI · AI-powered gaming hub
            </p>
          </div>
        </div>
      </footer>

      {/* ══ FLOATING CONTACT ════════════════════════════════════════════════ */}
      <FloatingContact />
    </div>
  );
}
