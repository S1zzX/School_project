import React, { useState, useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router';
import {
  Store, Plus, Pencil, X, Check, TrendingUp,
  Package, RefreshCw, AlertCircle, Eye,
  ChevronDown, Star,
} from 'lucide-react';
import {
  getUser,
  apiGetShopOwnerStats, apiGetMyListings, apiUpdateMyListing,
  type StoreListingAPI, type ShopOwnerStatsAPI, type VisionResult,
} from '../lib/api';
import { VisionAnalyzer } from '../components/VisionAnalyzer';

const GAME_COLOR: Record<string, string> = {
  'LoL':     'text-gs-accent bg-gs-accent/10 border-gs-accent/20',
  'CS2':     'text-gs-accent bg-gs-accent/10 border-gs-accent/20',
  'Valorant':'text-gs-accent bg-gs-accent/10 border-gs-accent/20',
  'Other':   'text-gs-accent bg-gs-accent/10 border-gs-accent/20',
};

const STATUS_STYLE: Record<string, string> = {
  available: 'text-gs-accent bg-gs-accent/10 border-gs-accent/20',
  sold:      'text-gs-faint bg-gs-surface-2 border-gs-border',
  reserved:  'text-gs-faint bg-gs-surface-2 border-gs-border',
};

type Tab = 'overview' | 'listings';

export function ShopOwner() {
  const navigate  = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const user      = getUser();
  const tabParam = searchParams.get('tab');
  const [tab, setTab] = useState<Tab>(
    tabParam === 'listings' || tabParam === 'overview' ? tabParam : 'overview'
  );

  const [stats, setStats]           = useState<ShopOwnerStatsAPI | null>(null);
  const [listings, setListings]     = useState<StoreListingAPI[]>([]);
  const [loading, setLoading]       = useState(false);
  const [error, setError]           = useState('');

  const [listingEdit, setListingEdit]       = useState<string | null>(null);
  const [listingEditPrice, setListingEditPrice] = useState('');
  const [listingEditStock, setListingEditStock] = useState('');
  const [listingEditStatus, setListingEditStatus] = useState('');

  // Vision scanner modal
  const [showScanModal, setShowScanModal] = useState(false);
  const [scanFillMsg, setScanFillMsg]     = useState('');

  useEffect(() => {
    if (!user || (user.role !== 'shop_owner' && user.role !== 'admin')) {
      navigate('/');
    }
  }, [user, navigate]);

  const loadAll = async () => {
    setLoading(true);
    setError('');
    const results = await Promise.allSettled([
      apiGetShopOwnerStats(),
      apiGetMyListings(),
    ]);

    const [statsResult, listingsResult] = results;

    if (statsResult.status === 'fulfilled')    setStats(statsResult.value);
    if (listingsResult.status === 'fulfilled') setListings(listingsResult.value);

    const firstFail = results.find(r => r.status === 'rejected') as PromiseRejectedResult | undefined;
    if (firstFail) {
      const msg = firstFail.reason instanceof Error ? firstFail.reason.message : String(firstFail.reason);
      if (msg.includes('404') || msg.toLowerCase().includes('not found')) {
        setError('API routes not found (HTTP 404). Please restart the backend server: cd server && npm start');
      } else {
        setError(msg);
      }
    }
    setLoading(false);
  };

  useEffect(() => { loadAll(); }, []);

  const switchTab = (next: Tab) => {
    setTab(next);
    setSearchParams(prev => {
      const params = new URLSearchParams(prev);
      params.set('tab', next);
      return params;
    }, { replace: true });
  };

  const totalStock = listings.reduce(
    (sum, l) => (l.status === 'available' ? sum + (l.stock ?? 1) : sum),
    0
  );

  const startListingEdit = (l: StoreListingAPI) => {
    setListingEdit(l.id);
    setListingEditPrice(l.price.toString());
    setListingEditStock((l.stock ?? 1).toString());
    setListingEditStatus(l.status ?? 'available');
  };

  const saveListingEdit = async (id: string) => {
    try {
      const updated = await apiUpdateMyListing(id, {
        price: parseFloat(listingEditPrice) || undefined,
        stock: parseInt(listingEditStock) || undefined,
        status: listingEditStatus as StoreListingAPI['status'],
      });
      setListings(prev => prev.map(l => l.id === id ? updated : l));
      setListingEdit(null);
    } catch { alert('Failed to update listing.'); }
  };

  // Called when user clicks "Use This Data" in the vision scanner
  const handleVisionData = (result: VisionResult) => {
    const parts: string[] = [];
    if (result.game)        parts.push(`Game: ${result.game}`);
    if (result.rank)        parts.push(`Rank: ${result.rank}`);
    if (result.item)        parts.push(`Item: ${result.item}`);
    if (result.wear)        parts.push(`Wear: ${result.wear}`);
    if (result.hoursPlayed) parts.push(`Hours: ${result.hoursPlayed}h`);
    if (result.skinsOwned)  parts.push(`Skins: ${result.skinsOwned}`);
    const summary = parts.join(' · ');
    setScanFillMsg(`✅ AI detected — ${summary || result.description}`);
    setShowScanModal(false);
    // Auto-switch to listings tab so they can use the data
    switchTab('listings');
    setTimeout(() => setScanFillMsg(''), 8000);
  };

  if (!user || (user.role !== 'shop_owner' && user.role !== 'admin')) return null;

  const statCards = stats ? [
    { label: 'Units In Stock',  value: totalStock,           icon: <Package className="size-5" />,    color: 'text-gs-accent' },
    { label: 'Active Listings', value: stats.activeListings, icon: <Store className="size-5" />,      color: 'text-gs-accent' },
    { label: 'Total Orders',    value: stats.totalOrders,    icon: <TrendingUp className="size-5" />, color: 'text-gs-accent' },
  ] : [];

  return (
    <>
    <div className="max-w-6xl mx-auto px-5 py-8 space-y-6">

      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold text-gs-text">Shop Owner Dashboard</h1>
          <p className="text-xs text-gs-faint">Manage your store listings and stock</p>
        </div>
        <button
          onClick={loadAll}
          className="flex items-center gap-1.5 text-xs text-gs-muted hover:text-gs-text border border-gs-border rounded-lg px-3 py-1.5 transition-colors"
        >
          <RefreshCw className="size-3.5" /> Refresh
        </button>
      </div>

      {error && (
        <div className="rounded-xl border border-red-400/25 bg-red-400/8 p-4 space-y-2">
          <div className="flex items-center gap-2 text-red-400 text-sm font-semibold">
            <AlertCircle className="size-4 shrink-0" />{error.split('Please')[0].trim()}
          </div>
          {error.includes('restart') && (
            <div className="bg-gs-surface-2 border border-gs-border rounded-lg px-3 py-2">
              <p className="text-xs text-gs-faint mb-1">Run this in your terminal:</p>
              <code className="text-xs text-emerald-400 font-mono">cd server &amp;&amp; npm start</code>
            </div>
          )}
        </div>
      )}

      {/* AI Scan result banner */}
      {scanFillMsg && (
        <div
          className="rounded-xl border p-3.5 flex items-start gap-3 animate-pulse"
          style={{ borderColor: 'rgba(139,92,246,0.4)', background: 'rgba(139,92,246,0.1)' }}
        >
          <span className="text-base">🔍</span>
          <p className="text-sm font-semibold" style={{ color: '#a78bfa' }}>{scanFillMsg}</p>
        </div>
      )}

      {/* Tabs */}
      <div className="flex gap-1 p-1 bg-gs-surface border border-gs-border rounded-xl">
        {([
          { id: 'overview', label: 'Overview',              icon: <TrendingUp className="size-3.5" /> },
          { id: 'listings', label: `Stock & Listings (${listings.length})`, icon: <Package className="size-3.5" /> },
        ] as const).map(t => (
          <button
            key={t.id}
            onClick={() => switchTab(t.id)}
            className={`flex-1 flex items-center justify-center gap-2 py-2 rounded-lg text-sm font-semibold transition-all ${
              tab === t.id ? 'text-white' : 'text-gs-faint hover:text-gs-muted'
            }`}
            style={tab === t.id ? { background: 'var(--gs-accent)' } : {}}
          >
            {t.icon}{t.label}
          </button>
        ))}
      </div>

      {/* ── OVERVIEW TAB ── */}
      {tab === 'overview' && (
        <div className="space-y-6">
          {/* Stat Cards */}
          <div className="grid grid-cols-3 gap-4">
            {statCards.map((s, i) => (
              <div key={i} className="bg-gs-surface border border-gs-border rounded-xl p-5 space-y-2">
                <div className={`${s.color}`}>{s.icon}</div>
                <p className="text-2xl font-bold text-gs-text">{s.value}</p>
                <p className="text-xs text-gs-faint">{s.label}</p>
              </div>
            ))}
          </div>

          {/* ── TEXT INFO CARDS ── */}
          {stats && (
            <div className="grid md:grid-cols-3 gap-4">
              {/* Card 1 — Active Listings */}
              <div className="bg-gs-surface border border-gs-border rounded-xl p-5 space-y-3">
                <h3 className="text-sm font-bold text-gs-text flex items-center gap-2">
                  <Store className="size-4 text-gs-accent" /> Active Listings
                </h3>
                <div className="space-y-2">
                  {[
                    { label: 'Available',  value: stats.activeListings, color: 'text-gs-accent' },
                    { label: 'Sold Out',   value: stats.soldListings,   color: 'text-gs-text' },
                    { label: 'Total',      value: stats.totalListings,  color: 'text-gs-text' },
                  ].map(row => (
                    <div key={row.label} className="flex items-center justify-between py-1 border-b border-gs-border last:border-0">
                      <span className="text-xs text-gs-muted">{row.label}</span>
                      <span className={`text-sm font-bold ${row.color}`}>{row.value}</span>
                    </div>
                  ))}
                </div>
                <p className="text-xs text-gs-faint leading-relaxed">
                  {stats.totalListings === 0
                    ? "You haven't posted any listings yet."
                    : `${stats.activeListings} of ${stats.totalListings} listing${stats.totalListings !== 1 ? 's' : ''} are currently active.`}
                </p>
              </div>

              {/* Card 2 — Units In Stock */}
              <div className="bg-gs-surface border border-gs-border rounded-xl p-5 space-y-3">
                <h3 className="text-sm font-bold text-gs-text flex items-center gap-2">
                  <Package className="size-4 text-gs-accent" /> Units In Stock
                </h3>
                <div className="space-y-2">
                  {[
                    { label: 'In Stock',        value: totalStock,             color: 'text-gs-accent' },
                    { label: 'Sold Out Items',   value: stats.soldListings,     color: 'text-gs-text' },
                    { label: 'Total Listings',   value: stats.totalListings,    color: 'text-gs-text' },
                  ].map(row => (
                    <div key={row.label} className="flex items-center justify-between py-1 border-b border-gs-border last:border-0">
                      <span className="text-xs text-gs-muted">{row.label}</span>
                      <span className={`text-sm font-bold ${row.color}`}>{row.value}</span>
                    </div>
                  ))}
                </div>
                <p className="text-xs text-gs-faint leading-relaxed">
                  {totalStock === 0
                    ? 'No stock available. Update your listings to add stock.'
                    : `You have ${totalStock} unit${totalStock !== 1 ? 's' : ''} ready to sell across your listings.`}
                </p>
              </div>

              {/* Card 3 — Total Orders */}
              <div className="bg-gs-surface border border-gs-border rounded-xl p-5 space-y-3">
                <h3 className="text-sm font-bold text-gs-text flex items-center gap-2">
                  <TrendingUp className="size-4 text-gs-accent" /> Total Orders
                </h3>
                <div className="space-y-2">
                  {[
                    { label: 'Orders Received', value: stats.totalOrders,    color: 'text-gs-accent' },
                    { label: 'Available',        value: stats.activeListings, color: 'text-gs-text' },
                    { label: 'Sold Out',         value: stats.soldListings,   color: 'text-gs-text' },
                  ].map(row => (
                    <div key={row.label} className="flex items-center justify-between py-1 border-b border-gs-border last:border-0">
                      <span className="text-xs text-gs-muted">{row.label}</span>
                      <span className={`text-sm font-bold ${row.color}`}>{row.value}</span>
                    </div>
                  ))}
                </div>
                <p className="text-xs text-gs-faint leading-relaxed">
                  {stats.totalOrders === 0
                    ? 'No orders yet. Share your listings to start selling!'
                    : `${stats.totalOrders} order${stats.totalOrders !== 1 ? 's' : ''} placed by customers so far.`}
                </p>
              </div>
            </div>
          )}

          {/* Quick Actions */}
          <div className="bg-gs-surface border border-gs-border rounded-xl p-5">
            <h3 className="text-sm font-bold text-gs-text mb-3 flex items-center gap-2"><Star className="size-4 text-amber-400" /> Quick Actions</h3>
            <div className="grid grid-cols-2 gap-3">
              <button onClick={() => navigate('/store')} className="flex items-center gap-2 p-3 rounded-lg border border-gs-border hover:bg-gs-surface-2 text-sm text-gs-muted hover:text-gs-text transition-all">
                <Store className="size-4 text-gs-accent" /> Post New Listing
              </button>
              <button onClick={() => switchTab('listings')} className="flex items-center gap-2 p-3 rounded-lg border border-gs-border hover:bg-gs-surface-2 text-sm text-gs-muted hover:text-gs-text transition-all">
                <Eye className="size-4 text-sky-400" /> View Stock & Listings
              </button>
              <button
                onClick={() => { setShowScanModal(true); setScanFillMsg(''); }}
                className="col-span-2 flex items-center justify-center gap-2 p-3 rounded-lg border text-sm font-semibold transition-all hover:opacity-90"
                style={{ borderColor: 'rgba(139,92,246,0.4)', background: 'rgba(139,92,246,0.1)', color: '#a78bfa' }}
              >
                <span>🔍</span> Scan Screenshot with AI Vision
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── LISTINGS TAB ── */}
      {tab === 'listings' && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-sm font-bold text-gs-text">My Store Listings</h2>
              <p className="text-xs text-gs-faint mt-0.5">Edit price, stock, and availability for each item.</p>
            </div>
            <button onClick={() => navigate('/store')} className="flex items-center gap-1.5 px-4 py-2 rounded-lg text-sm font-semibold text-white hover:opacity-90 transition-opacity" style={{ background: 'var(--gs-accent)' }}>
              <Plus className="size-4" /> Post New Listing
            </button>
          </div>

          {loading ? (
            <div className="flex items-center justify-center py-16 gap-2 text-gs-faint text-sm">
              <span className="w-4 h-4 rounded-full border-2 border-gs-border border-t-gs-muted animate-spin" />
              Loading listings…
            </div>
          ) : listings.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-16 gap-3 text-center">
              <Package className="size-12 text-gs-faint opacity-40" />
              <p className="text-gs-text font-semibold">No listings yet</p>
              <p className="text-gs-faint text-sm">Post your first item to the community store.</p>
              <button onClick={() => navigate('/store')} className="mt-1 px-4 py-2 rounded-lg text-sm font-semibold text-white transition-opacity hover:opacity-90" style={{ background: 'var(--gs-accent)' }}>
                Go to Store
              </button>
            </div>
          ) : (
            <div className="bg-gs-surface border border-gs-border rounded-xl overflow-hidden">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-gs-border">
                    {['Item', 'Game', 'Price', 'Stock', 'Orders', 'Status', 'Actions'].map(h => (
                      <th key={h} className="px-4 py-3 text-left text-[10px] font-semibold uppercase tracking-wider text-gs-faint">{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {listings.map(l => {
                    const isEditing = listingEdit === l.id;
                    return (
                      <tr key={l.id} className="border-b border-gs-border last:border-0 hover:bg-gs-surface-2 transition-colors">
                        <td className="px-4 py-3">
                          <p className="text-gs-text font-medium text-xs">{l.type === 'skin' ? l.item : l.highlight || `${l.game} Account`}</p>
                          <p className="text-[10px] text-gs-faint">{l.type === 'skin' ? l.wear : l.rank}</p>
                        </td>
                        <td className="px-4 py-3">
                          <span className={`text-[9px] px-2 py-0.5 rounded-full border font-semibold ${GAME_COLOR[l.game] ?? ''}`}>{l.game}</span>
                        </td>
                        <td className="px-4 py-3">
                          {isEditing ? (
                            <input type="number" value={listingEditPrice} onChange={e => setListingEditPrice(e.target.value)} className="w-20 bg-gs-surface-2 border border-gs-border rounded px-2 py-1 text-xs text-gs-text focus:outline-none" />
                          ) : (
                            <span className="font-bold text-gs-text">${l.price.toFixed(2)}</span>
                          )}
                        </td>
                        <td className="px-4 py-3">
                          {isEditing ? (
                            <input type="number" value={listingEditStock} onChange={e => setListingEditStock(e.target.value)} className="w-16 bg-gs-surface-2 border border-gs-border rounded px-2 py-1 text-xs text-gs-text focus:outline-none" />
                          ) : (
                            <span className="text-xs font-semibold text-gs-accent">{l.stock ?? 1}</span>
                          )}
                        </td>
                        <td className="px-4 py-3">
                          <div className="flex items-center gap-1 text-xs text-gs-muted">
                            <TrendingUp className="size-3 text-gs-accent" />
                            {l.order_count ?? 0}
                          </div>
                        </td>
                        <td className="px-4 py-3">
                          {isEditing ? (
                            <div className="relative">
                              <select
                                value={listingEditStatus}
                                onChange={e => setListingEditStatus(e.target.value)}
                                className="appearance-none bg-gs-surface-2 border border-gs-border rounded px-2 pr-6 py-1 text-xs text-gs-text focus:outline-none"
                              >
                                <option value="available">Available</option>
                                <option value="sold">Sold</option>
                                <option value="reserved">Reserved</option>
                              </select>
                              <ChevronDown className="absolute right-1.5 top-1/2 -translate-y-1/2 size-3 text-gs-faint pointer-events-none" />
                            </div>
                          ) : (
                            <span className={`text-[10px] px-2 py-0.5 rounded-full border font-semibold ${STATUS_STYLE[l.status || 'available']}`}>
                              {l.status || 'available'}
                            </span>
                          )}
                        </td>
                        <td className="px-4 py-3">
                          <div className="flex items-center gap-1">
                            {isEditing ? (
                              <>
                                <button onClick={() => saveListingEdit(l.id)} className="p-1.5 rounded bg-gs-accent/15 text-gs-accent hover:bg-gs-accent/25 transition-colors" title="Save">
                                  <Check className="size-3.5" />
                                </button>
                                <button onClick={() => setListingEdit(null)} className="p-1.5 rounded hover:bg-gs-surface-2 text-gs-faint transition-colors" title="Cancel">
                                  <X className="size-3.5" />
                                </button>
                              </>
                            ) : (
                              <button onClick={() => startListingEdit(l)} className="p-1.5 rounded hover:bg-gs-surface-2 text-gs-faint hover:text-gs-text transition-colors" title="Edit">
                                <Pencil className="size-3.5" />
                              </button>
                            )}
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}
    </div>

      {/* ── Vision Scanner Modal ── */}
      {showScanModal && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-4"
          style={{ background: 'rgba(0,0,0,0.7)', backdropFilter: 'blur(8px)' }}
          onClick={e => { if (e.target === e.currentTarget) setShowScanModal(false); }}
        >
          <div
            className="w-full max-w-xl rounded-2xl border shadow-2xl overflow-hidden"
            style={{ background: 'var(--gs-surface)', borderColor: 'rgba(139,92,246,0.4)' }}
          >
            {/* Modal header */}
            <div
              className="flex items-center justify-between px-5 py-4 border-b"
              style={{
                borderColor: 'rgba(139,92,246,0.3)',
                background: 'linear-gradient(90deg, rgba(139,92,246,0.12), transparent)',
              }}
            >
              <div className="flex items-center gap-3">
                <div
                  className="w-8 h-8 rounded-lg flex items-center justify-center text-sm"
                  style={{ background: 'rgba(139,92,246,0.25)' }}
                >
                  🔍
                </div>
                <div>
                  <p className="text-sm font-bold" style={{ color: 'var(--gs-text)' }}>AI Vision Scanner</p>
                  <p className="text-xs" style={{ color: 'var(--gs-faint)' }}>Upload a game screenshot to auto-detect listing data</p>
                </div>
              </div>
              <button
                onClick={() => setShowScanModal(false)}
                className="w-8 h-8 flex items-center justify-center rounded-lg transition-colors hover:bg-gs-surface-2"
                style={{ color: 'var(--gs-faint)' }}
              >
                <X className="size-4" />
              </button>
            </div>

            {/* Modal body */}
            <div className="p-5">
              <VisionAnalyzer
                compact
                showUseButton
                onUseData={handleVisionData}
                context="game account or skin listing for a gaming marketplace"
              />
            </div>
          </div>
        </div>
      )}
    </>
  );
}

