import React, { useState, useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router';
import {
  Store,   Plus, Pencil, X, Check, TrendingUp,
  Package, RefreshCw, AlertCircle, Eye,
  ChevronDown, ScanLine, Trash2,
} from 'lucide-react';
import {
  getUser,
  apiGetShopOwnerStats, apiGetMyListings, apiUpdateMyListing, apiDeleteMyListing,
  type StoreListingAPI, type ShopOwnerStatsAPI, type VisionResult,
} from '../lib/api';
import { VisionAnalyzer } from '../components/VisionAnalyzer';

function Badge({
  children,
  variant = 'default',
}: {
  children: React.ReactNode;
  variant?: 'default' | 'success';
}) {
  const styles = {
    default: 'bg-gs-surface-2 text-gs-muted border-gs-border',
    success: 'bg-emerald-500/8 text-emerald-700 dark:text-emerald-400 border-emerald-500/20',
  };
  return (
    <span className={`inline-flex items-center px-2.5 py-0.5 rounded-md border text-[11px] font-medium capitalize ${styles[variant]}`}>
      {children}
    </span>
  );
}

function StatStrip({ items }: { items: { label: string; value: string | number; icon: React.ReactNode }[] }) {
  const colClass = items.length > 3 ? 'sm:grid-cols-3' : 'sm:grid-cols-3';
  return (
    <div className="commerce-stat-strip bg-gs-surface border border-gs-border rounded-2xl overflow-hidden">
      <div className={`grid grid-cols-1 ${colClass} divide-y sm:divide-y-0 sm:divide-x divide-gs-border`}>
        {items.map((item, i) => (
          <div key={item.label} className="commerce-stat flex items-center gap-4 px-6 py-5" style={{ animationDelay: `${i * 90}ms` }}>
            <div className="commerce-stat-icon w-11 h-11 rounded-xl flex items-center justify-center shrink-0">
              {item.icon}
            </div>
            <div className="min-w-0">
              <p className="text-2xl font-black text-gs-text tabular-nums leading-none">{item.value}</p>
              <p className="text-[10px] uppercase tracking-wider text-gs-faint font-bold mt-1.5">{item.label}</p>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

function InfoCard({
  title, icon, rows, footer,
}: {
  title: string;
  icon: React.ReactNode;
  rows: { label: string; value: string | number }[];
  footer: string;
}) {
  return (
    <div className="commerce-info-card bg-gs-surface border border-gs-border rounded-2xl p-5 space-y-3">
      <h3 className="text-sm font-semibold text-gs-text flex items-center gap-2">
        <span className="text-gs-muted">{icon}</span>
        {title}
      </h3>
      <div className="space-y-0">
        {rows.map((row) => (
          <div key={row.label} className="flex items-center justify-between py-2.5 border-b border-gs-border last:border-0">
            <span className="text-xs text-gs-muted">{row.label}</span>
            <span className="text-sm font-semibold text-gs-text tabular-nums">{row.value}</span>
          </div>
        ))}
      </div>
      <p className="text-xs text-gs-faint leading-relaxed pt-1">{footer}</p>
    </div>
  );
}

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

  const deleteListing = async (id: string) => {
    if (!confirm('Delete this listing?')) return;
    try {
      await apiDeleteMyListing(id);
      setListings(prev => prev.filter(l => l.id !== id));
    } catch { alert('Failed to delete listing.'); }
  };

  const handleVisionData = (result: VisionResult) => {
    const parts: string[] = [];
    if (result.game)        parts.push(`Game: ${result.game}`);
    if (result.rank)        parts.push(`Rank: ${result.rank}`);
    if (result.item)        parts.push(`Item: ${result.item}`);
    if (result.wear)        parts.push(`Wear: ${result.wear}`);
    if (result.marketPrice != null) {
      parts.push(`Steam: $${result.marketPrice.toFixed(2)}`);
    } else if (result.estimatedPrice != null) {
      parts.push(`Est. $${result.estimatedPrice.toFixed(2)}`);
    }
    if (result.hoursPlayed) parts.push(`Hours: ${result.hoursPlayed}h`);
    if (result.skinsOwned)  parts.push(`Skins: ${result.skinsOwned}`);
    const summary = parts.join(' · ');
    setScanFillMsg(`AI detected — ${summary || result.description}`);
    setShowScanModal(false);
    switchTab('listings');
    setTimeout(() => setScanFillMsg(''), 8000);
  };

  if (!user || (user.role !== 'shop_owner' && user.role !== 'admin')) return null;

  return (
    <>
      <div className="commerce-page max-w-6xl mx-auto px-6 py-8 space-y-7">

        {/* Header */}
        <div className="commerce-hero flex items-center justify-between gap-4 rounded-3xl border px-6 py-6 lg:px-8">
          <div className="flex items-center gap-4">
            <div className="commerce-hero-icon w-14 h-14 rounded-2xl flex items-center justify-center">
              <Store className="size-5" />
            </div>
            <div>
              <p className="commerce-eyebrow">Seller workspace</p>
              <h1 className="text-2xl lg:text-3xl font-black text-gs-text tracking-tight">Shop Owner <span className="commerce-gradient-text">Dashboard</span></h1>
              <p className="text-sm text-gs-faint mt-0.5">Manage your store listings and stock</p>
            </div>
          </div>
          <button
            onClick={loadAll}
            className="flex items-center gap-2 text-sm text-gs-muted hover:text-gs-text border border-gs-border rounded-lg px-4 py-2 transition-colors hover:bg-gs-surface-2"
          >
            <RefreshCw className="size-4" /> Refresh
          </button>
        </div>

        {error && (
          <div className="rounded-xl border border-red-500/20 bg-red-500/8 p-4 space-y-2">
            <div className="flex items-center gap-2 text-red-600 dark:text-red-400 text-sm font-medium">
              <AlertCircle className="size-4 shrink-0" />{error.split('Please')[0].trim()}
            </div>
            {error.includes('restart') && (
              <div className="bg-gs-surface-2 border border-gs-border rounded-lg px-3 py-2">
                <p className="text-xs text-gs-faint mb-1">Run this in your terminal:</p>
                <code className="text-xs text-gs-muted font-mono">cd server &amp;&amp; npm start</code>
              </div>
            )}
          </div>
        )}

        {scanFillMsg && (
          <div className="rounded-lg border border-gs-border bg-gs-surface-2 px-4 py-3 flex items-start gap-3">
            <ScanLine className="size-4 text-gs-muted shrink-0 mt-0.5" />
            <p className="text-sm text-gs-text">{scanFillMsg}</p>
          </div>
        )}

        {/* Tabs */}
        <div className="border-b border-gs-border">
          <nav className="flex gap-1">
            {([
              { id: 'overview', label: 'Overview', icon: <TrendingUp className="size-3.5" /> },
              { id: 'listings', label: `Stock & Listings (${listings.length})`, icon: <Package className="size-3.5" /> },
            ] as const).map((t) => (
              <button
                key={t.id}
                onClick={() => switchTab(t.id)}
                className={`flex items-center gap-2 px-4 py-3 text-sm font-medium border-b-2 -mb-px transition-colors ${
                  tab === t.id
                    ? 'border-gs-accent text-gs-text'
                    : 'border-transparent text-gs-faint hover:text-gs-muted'
                }`}
              >
                {t.icon}{t.label}
              </button>
            ))}
          </nav>
        </div>

        {/* ── OVERVIEW TAB ── */}
        {tab === 'overview' && (
          <div className="space-y-6">
            {stats && (
              <StatStrip items={[
                { label: 'Units In Stock', value: totalStock, icon: <Package className="size-4" /> },
                { label: 'Active Listings', value: stats.activeListings, icon: <Store className="size-4" /> },
                { label: 'Total Orders', value: stats.totalOrders, icon: <TrendingUp className="size-4" /> },
              ]} />
            )}

            {stats && (
              <div className="grid md:grid-cols-3 gap-4">
                <InfoCard
                  title="Active Listings"
                  icon={<Store className="size-4" />}
                  rows={[
                    { label: 'Available', value: stats.activeListings },
                    { label: 'Sold Out', value: stats.soldListings },
                    { label: 'Total', value: stats.totalListings },
                  ]}
                  footer={
                    stats.totalListings === 0
                      ? "You haven't posted any listings yet."
                      : `${stats.activeListings} of ${stats.totalListings} listing${stats.totalListings !== 1 ? 's' : ''} are currently active.`
                  }
                />
                <InfoCard
                  title="Units In Stock"
                  icon={<Package className="size-4" />}
                  rows={[
                    { label: 'In Stock', value: totalStock },
                    { label: 'Sold Out Items', value: stats.soldListings },
                    { label: 'Total Listings', value: stats.totalListings },
                  ]}
                  footer={
                    totalStock === 0
                      ? 'No stock available. Update your listings to add stock.'
                      : `You have ${totalStock} unit${totalStock !== 1 ? 's' : ''} ready to sell across your listings.`
                  }
                />
                <InfoCard
                  title="Total Orders"
                  icon={<TrendingUp className="size-4" />}
                  rows={[
                    { label: 'Orders Received', value: stats.totalOrders },
                    { label: 'Available', value: stats.activeListings },
                    { label: 'Sold Out', value: stats.soldListings },
                  ]}
                  footer={
                    stats.totalOrders === 0
                      ? 'No orders yet. Share your listings to start selling!'
                      : `${stats.totalOrders} order${stats.totalOrders !== 1 ? 's' : ''} placed by customers so far.`
                  }
                />
              </div>
            )}

            {/* Quick Actions */}
            <div className="commerce-actions bg-gs-surface border border-gs-border rounded-2xl p-6">
              <h3 className="text-sm font-semibold text-gs-text mb-4">Quick Actions</h3>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                {[
                  { label: 'Post New Listing', icon: <Store className="size-5" />, onClick: () => navigate('/store') },
                  { label: 'View Stock & Listings', icon: <Eye className="size-5" />, onClick: () => switchTab('listings') },
                  { label: 'Scan with AI Vision', icon: <ScanLine className="size-5" />, onClick: () => { setShowScanModal(true); setScanFillMsg(''); } },
                ].map((action, i) => (
                  <button
                    key={action.label}
                    onClick={action.onClick}
                    className="commerce-action flex flex-col items-center gap-3 p-5 rounded-2xl border border-gs-border text-gs-muted hover:text-gs-text"
                    style={{ animationDelay: `${i * 100}ms` }}
                  >
                    {action.icon}
                    <span className="text-xs font-medium text-center">{action.label}</span>
                  </button>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* ── LISTINGS TAB ── */}
        {tab === 'listings' && (
          <div className="space-y-4">
            <div className="flex items-center justify-between gap-4">
              <div>
                <h2 className="text-sm font-semibold text-gs-text">My Store Listings</h2>
                <p className="text-xs text-gs-faint mt-0.5">Edit price, stock, and availability for each item.</p>
              </div>
              <button
                onClick={() => navigate('/store')}
                className="flex items-center gap-1.5 px-4 py-2 rounded-lg text-sm font-semibold bg-gs-accent text-white hover:opacity-90 transition-opacity shrink-0"
              >
                <Plus className="size-4" /> Post New Listing
              </button>
            </div>

            {loading ? (
              <div className="flex items-center justify-center py-16 gap-2 text-gs-faint text-sm">
                <span className="w-4 h-4 rounded-full border-2 border-gs-border border-t-gs-muted animate-spin" />
                Loading listings…
              </div>
            ) : listings.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-16 gap-3 text-center bg-gs-surface border border-gs-border rounded-xl">
                <Package className="size-12 text-gs-faint opacity-40" />
                <p className="text-gs-text font-medium">No listings yet</p>
                <p className="text-gs-faint text-sm">Post your first item to the community store.</p>
                <button
                  onClick={() => navigate('/store')}
                  className="mt-1 px-4 py-2 rounded-lg text-sm font-semibold bg-gs-accent text-white hover:opacity-90 transition-opacity"
                >
                  Go to Store
                </button>
              </div>
            ) : (
              <div className="bg-gs-surface border border-gs-border rounded-xl overflow-hidden">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-gs-border">
                      {['Item', 'Game', 'Price', 'Stock', 'Orders', 'Status', 'Actions'].map((h) => (
                        <th key={h} className="px-5 py-3 text-left text-[11px] font-semibold uppercase tracking-wider text-gs-faint">{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {listings.map((l) => {
                      const isEditing = listingEdit === l.id;
                      const status = l.status || 'available';
                      return (
                        <tr key={l.id} className="border-b border-gs-border last:border-0 hover:bg-gs-surface-2/60 transition-colors">
                          <td className="px-5 py-4">
                            <p className="text-gs-text font-medium text-sm">{l.type === 'skin' ? l.item : l.highlight || `${l.game} Account`}</p>
                            <p className="text-xs text-gs-faint mt-0.5">{l.type === 'skin' ? l.wear : l.rank}</p>
                          </td>
                          <td className="px-5 py-4">
                            <Badge>{l.game}</Badge>
                          </td>
                          <td className="px-5 py-4">
                            {isEditing ? (
                              <input
                                type="number"
                                value={listingEditPrice}
                                onChange={(e) => setListingEditPrice(e.target.value)}
                                className="w-24 bg-gs-surface-2 border border-gs-border rounded-lg px-2 py-1 text-xs text-gs-text focus:outline-none focus:border-gs-accent/50"
                              />
                            ) : (
                              <span className="font-semibold text-gs-text tabular-nums">${l.price.toFixed(2)}</span>
                            )}
                          </td>
                          <td className="px-5 py-4">
                            {isEditing ? (
                              <input
                                type="number"
                                value={listingEditStock}
                                onChange={(e) => setListingEditStock(e.target.value)}
                                className="w-16 bg-gs-surface-2 border border-gs-border rounded-lg px-2 py-1 text-xs text-gs-text focus:outline-none focus:border-gs-accent/50"
                              />
                            ) : (
                              <span className="text-sm text-gs-text tabular-nums">{l.stock ?? 1}</span>
                            )}
                          </td>
                          <td className="px-5 py-4">
                            <div className="flex items-center gap-1.5 text-sm text-gs-muted tabular-nums">
                              <TrendingUp className="size-3.5 text-gs-faint" />
                              {l.order_count ?? 0}
                            </div>
                          </td>
                          <td className="px-5 py-4">
                            {isEditing ? (
                              <div className="relative">
                                <select
                                  value={listingEditStatus}
                                  onChange={(e) => setListingEditStatus(e.target.value)}
                                  className="appearance-none bg-gs-surface-2 border border-gs-border rounded-lg px-2 pr-6 py-1 text-xs text-gs-text focus:outline-none"
                                >
                                  <option value="available">Available</option>
                                  <option value="sold">Sold</option>
                                  <option value="reserved">Reserved</option>
                                </select>
                                <ChevronDown className="absolute right-1.5 top-1/2 -translate-y-1/2 size-3 text-gs-faint pointer-events-none" />
                              </div>
                            ) : (
                              <Badge variant={status === 'available' ? 'success' : 'default'}>
                                {status}
                              </Badge>
                            )}
                          </td>
                          <td className="px-5 py-4">
                            <div className="flex items-center gap-1">
                              {isEditing ? (
                                <>
                                  <button onClick={() => saveListingEdit(l.id)} className="p-1.5 rounded-lg bg-gs-accent/10 text-gs-accent hover:bg-gs-accent/20 transition-colors" title="Save">
                                    <Check className="size-3.5" />
                                  </button>
                                  <button onClick={() => setListingEdit(null)} className="p-1.5 rounded-lg hover:bg-gs-surface-2 text-gs-faint transition-colors" title="Cancel">
                                    <X className="size-3.5" />
                                  </button>
                                </>
                              ) : (
                                <>
                                  <button onClick={() => startListingEdit(l)} className="p-1.5 rounded-lg hover:bg-gs-surface-2 text-gs-faint hover:text-gs-text transition-colors" title="Edit">
                                    <Pencil className="size-3.5" />
                                  </button>
                                  <button onClick={() => deleteListing(l.id)} className="p-1.5 rounded-lg hover:bg-red-400/10 text-gs-faint hover:text-red-400 transition-colors" title="Delete">
                                    <Trash2 className="size-3.5" />
                                  </button>
                                </>
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

      {/* Vision Scanner Modal */}
      {showScanModal && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm"
          onClick={(e) => { if (e.target === e.currentTarget) setShowScanModal(false); }}
        >
          <div className="w-full max-w-xl rounded-xl border border-gs-border bg-gs-surface shadow-2xl overflow-hidden">
            <div className="flex items-center justify-between px-5 py-4 border-b border-gs-border">
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 rounded-lg bg-gs-surface-2 border border-gs-border flex items-center justify-center text-gs-muted">
                  <ScanLine className="size-4" />
                </div>
                <div>
                  <p className="text-sm font-semibold text-gs-text">AI Vision Scanner</p>
                  <p className="text-xs text-gs-faint">Upload a game screenshot to auto-detect listing data</p>
                </div>
              </div>
              <button
                onClick={() => setShowScanModal(false)}
                className="p-2 rounded-lg text-gs-faint hover:text-gs-text hover:bg-gs-surface-2 transition-colors"
              >
                <X className="size-4" />
              </button>
            </div>
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
