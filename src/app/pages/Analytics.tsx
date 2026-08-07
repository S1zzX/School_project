import React, { useEffect, useState } from 'react';
import { Link } from 'react-router';
import { TrendingUp, Package, Users, ShoppingBag, BarChart2, Eye, DollarSign, RefreshCw } from 'lucide-react';
import {
  apiGetAnalyticsSummary, apiGetAnalyticsByGame, apiGetAnalyticsByType,
  apiGetTopListings, apiGetPriceRanges, apiGetRecentActivity,
  type AnalyticsSummary, type GameStat, type TypeStat,
  type PriceRange, type DayActivity, type TopListing,
} from '../lib/api';

const TYPE_LABEL: Record<string, string> = {
  account: 'Account', skin: 'Skin', key: 'Game Key',
  subscription: 'Subscription', giftcard: 'Gift Card', other: 'Other',
};

function Badge({ children }: { children: React.ReactNode }) {
  return (
    <span className="inline-flex items-center px-2 py-0.5 rounded-md border border-gs-border bg-gs-surface-2 text-[11px] font-medium text-gs-muted">
      {children}
    </span>
  );
}

function StatStrip({ items }: { items: { label: string; value: string | number; icon: React.ReactNode; sub?: string }[] }) {
  return (
    <div className="ops-stat-strip bg-gs-surface border border-gs-border rounded-2xl overflow-hidden">
      <div className="grid grid-cols-2 lg:grid-cols-4 divide-y lg:divide-y-0 lg:divide-x divide-gs-border">
        {items.map((item, i) => (
          <div key={item.label} className="ops-stat flex items-center gap-4 px-5 py-5" style={{ animationDelay: `${i * 90}ms` }}>
            <div className="ops-stat-icon w-11 h-11 rounded-xl flex items-center justify-center shrink-0">
              {item.icon}
            </div>
            <div className="min-w-0">
              <p className="text-2xl font-black text-gs-text tabular-nums leading-none">{item.value}</p>
              <p className="text-[10px] uppercase tracking-wider text-gs-faint font-bold mt-1.5">{item.label}</p>
              {item.sub && <p className="text-[10px] text-gs-faint mt-0.5">{item.sub}</p>}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

function Bar({ value, max, opacity = 1 }: { value: number; max: number; opacity?: number }) {
  const pct = max > 0 ? Math.round((value / max) * 100) : 0;
  return (
    <div className="w-full h-1.5 rounded-full overflow-hidden bg-gs-surface-2">
      <div
        className="ops-bar-fill h-full rounded-full bg-gs-accent"
        style={{ '--bar-width': `${pct}%`, width: `${pct}%`, opacity } as React.CSSProperties}
      />
    </div>
  );
}

function SectionCard({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="ops-section-card rounded-2xl border border-gs-border bg-gs-surface overflow-hidden">
      <div className="px-5 py-4 border-b border-gs-border">
        <h2 className="text-sm font-semibold text-gs-text">{title}</h2>
      </div>
      <div className="p-5">{children}</div>
    </div>
  );
}

function Sparkline({ data }: { data: DayActivity[] }) {
  if (!data.length) return <p className="text-xs text-center py-4 text-gs-faint">No recent listings</p>;
  const max = Math.max(...data.map(d => d.newListings), 1);
  const days = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
  return (
    <div className="flex items-end gap-1.5 h-20">
      {data.map((d, i) => {
        const pct = Math.round((d.newListings / max) * 100);
        const date = new Date(d.day);
        return (
          <div key={d.day} className="flex-1 flex flex-col items-center gap-1">
            <div className="w-full rounded-t flex items-end" style={{ height: 60 }}>
              <div
                className="w-full rounded-t bg-gs-accent transition-all duration-300"
                style={{ height: `${Math.max(pct, 4)}%`, opacity: 1 - i * 0.08 }}
                title={`${d.newListings} listing${d.newListings !== 1 ? 's' : ''}`}
              />
            </div>
            <span className="text-[9px] text-gs-faint">{days[date.getDay()]}</span>
          </div>
        );
      })}
    </div>
  );
}

function listingTitle(l: TopListing): string {
  if (l.type === 'skin' || l.type === 'Skin') return l.item || l.highlight || 'Skin';
  return l.highlight || l.item || `${l.game} Account`;
}

export function Analytics() {
  const [summary,  setSummary]  = useState<AnalyticsSummary | null>(null);
  const [byGame,   setByGame]   = useState<GameStat[]>([]);
  const [byType,   setByType]   = useState<TypeStat[]>([]);
  const [topList,  setTopList]  = useState<TopListing[]>([]);
  const [ranges,   setRanges]   = useState<PriceRange[]>([]);
  const [activity, setActivity] = useState<DayActivity[]>([]);
  const [loading,  setLoading]  = useState(true);
  const [error,    setError]    = useState('');
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null);

  const load = async (silent = false) => {
    if (!silent) setLoading(true);
    setError('');
    try {
      const [s, g, t, top, r, a] = await Promise.all([
        apiGetAnalyticsSummary(),
        apiGetAnalyticsByGame(),
        apiGetAnalyticsByType(),
        apiGetTopListings(),
        apiGetPriceRanges(),
        apiGetRecentActivity(),
      ]);
      setSummary(s);
      setByGame(g);
      setByType(t);
      setTopList(top);
      setRanges(r);
      setActivity(a);
      setLastUpdated(new Date());
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : 'Failed to load analytics');
    } finally {
      if (!silent) setLoading(false);
    }
  };

  useEffect(() => {
    load();
    const interval = setInterval(() => load(true), 30_000);
    return () => clearInterval(interval);
  }, []);

  const maxListings = Math.max(...byGame.map(g => g.listings), 1);
  const maxRangeCount = Math.max(...ranges.map(r => r.count), 1);

  return (
    <div className="ops-page max-w-7xl mx-auto px-6 py-8 space-y-7">

      {/* Header */}
      <div className="ops-hero flex items-start justify-between gap-4 rounded-3xl border px-7 py-7 lg:px-9">
        <div className="flex items-center gap-4">
          <div className="ops-hero-icon w-14 h-14 rounded-2xl flex items-center justify-center">
            <BarChart2 className="size-5" />
          </div>
          <div>
            <p className="ops-eyebrow">Market intelligence</p>
            <h1 className="text-2xl lg:text-3xl font-black text-gs-text tracking-tight">Market <span className="ops-gradient-text">Analytics</span></h1>
            <p className="text-sm text-gs-faint mt-0.5">
              Insights from listings, pricing, and trading activity. Refreshes every 30s.
            </p>
            {lastUpdated && (
              <p className="text-[11px] text-gs-faint mt-1">
                Last updated {lastUpdated.toLocaleTimeString()}
              </p>
            )}
          </div>
        </div>
        <button
          onClick={() => load()}
          disabled={loading}
          className="flex items-center gap-2 text-sm text-gs-muted hover:text-gs-text border border-gs-border rounded-lg px-4 py-2 transition-colors hover:bg-gs-surface-2 disabled:opacity-50"
        >
          <RefreshCw className={`size-4 ${loading ? 'animate-spin' : ''}`} />
          Refresh
        </button>
      </div>

      {error && (
        <div className="p-3 rounded-lg border border-red-500/20 bg-red-500/8 text-sm text-red-600 dark:text-red-400">
          {error}
        </div>
      )}

      {/* Summary stats */}
      {summary && (
        <StatStrip items={[
          { label: 'Active Listings', value: summary.activeListings, icon: <Package className="size-4" /> },
          { label: 'Active Sellers', value: summary.activeSellers, icon: <Users className="size-4" /> },
          { label: 'Trades Completed', value: summary.completedTrades, icon: <ShoppingBag className="size-4" /> },
          { label: 'Avg. Listing Price', value: `$${summary.avgPrice}`, icon: <DollarSign className="size-4" />, sub: 'across all games' },
        ]} />
      )}

      {loading && !summary && (
        <div className="bg-gs-surface border border-gs-border rounded-xl overflow-hidden">
          <div className="grid grid-cols-2 lg:grid-cols-4 divide-y lg:divide-y-0 lg:divide-x divide-gs-border">
            {[...Array(4)].map((_, i) => (
              <div key={i} className="h-20 animate-pulse bg-gs-surface-2 m-4 rounded-lg" />
            ))}
          </div>
        </div>
      )}

      {/* Charts grid */}
      <div className="grid lg:grid-cols-2 gap-5">

        <SectionCard title="Listings by Game">
          {byGame.length === 0 ? (
            <p className="text-xs py-4 text-center text-gs-faint">No data yet</p>
          ) : (
            <div className="space-y-4">
              {byGame.map((g, i) => (
                <div key={g.game}>
                  <div className="flex items-center justify-between text-xs mb-1.5 gap-2">
                    <span className="font-medium text-gs-text truncate">{g.game}</span>
                    <div className="flex items-center gap-3 text-gs-faint shrink-0">
                      <span>{g.listings} listing{g.listings !== 1 ? 's' : ''}</span>
                      <span className="font-medium text-gs-muted tabular-nums">avg ${g.avgPrice}</span>
                    </div>
                  </div>
                  <Bar value={g.listings} max={maxListings} opacity={1 - i * 0.12} />
                </div>
              ))}
            </div>
          )}
        </SectionCard>

        <SectionCard title="Price Distribution">
          {ranges.length === 0 ? (
            <p className="text-xs py-4 text-center text-gs-faint">No data yet</p>
          ) : (
            <div className="space-y-4">
              {ranges.map((r, i) => (
                <div key={r.range}>
                  <div className="flex items-center justify-between text-xs mb-1.5">
                    <span className="text-gs-text">{r.range}</span>
                    <span className="text-gs-faint">{r.count} listing{r.count !== 1 ? 's' : ''}</span>
                  </div>
                  <Bar value={r.count} max={maxRangeCount} opacity={1 - i * 0.1} />
                </div>
              ))}
            </div>
          )}
        </SectionCard>

        <SectionCard title="Listings by Category">
          {byType.length === 0 ? (
            <p className="text-xs py-4 text-center text-gs-faint">No data yet</p>
          ) : (
            <div className="divide-y divide-gs-border">
              {byType.map(t => (
                <div key={t.type} className="flex items-center justify-between py-3 text-sm first:pt-0 last:pb-0">
                  <span className="text-gs-text">{TYPE_LABEL[t.type] ?? t.type}</span>
                  <div className="flex items-center gap-5 text-xs text-gs-faint">
                    <span>{t.listings} listed</span>
                    <span className="font-medium text-gs-muted w-16 text-right tabular-nums">avg ${t.avgPrice}</span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </SectionCard>

        <SectionCard title="New Listings (Last 7 Days)">
          <Sparkline data={activity} />
        </SectionCard>
      </div>

      {/* Top listings table */}
      <SectionCard title="Most Viewed Listings">
        {topList.length === 0 ? (
          <p className="text-xs py-4 text-center text-gs-faint">No listings yet</p>
        ) : (
          <div className="overflow-x-auto -mx-5 px-5">
            <table className="w-full text-sm">
              <thead>
                <tr className="text-left text-[11px] uppercase tracking-wider border-b border-gs-border text-gs-faint">
                  <th className="pb-3 pr-4 font-semibold">Item</th>
                  <th className="pb-3 pr-4 font-semibold">Game</th>
                  <th className="pb-3 pr-4 font-semibold">Type</th>
                  <th className="pb-3 pr-4 font-semibold text-right">Price</th>
                  <th className="pb-3 pr-4 font-semibold text-right">
                    <span className="inline-flex items-center gap-1 justify-end"><Eye className="size-3" />Views</span>
                  </th>
                  <th className="pb-3 font-semibold text-right">
                    <span className="inline-flex items-center gap-1 justify-end"><TrendingUp className="size-3" />Sales</span>
                  </th>
                </tr>
              </thead>
              <tbody>
                {topList.map((l) => (
                  <tr key={l.id} className="border-b border-gs-border last:border-0 hover:bg-gs-surface-2/50 transition-colors">
                    <td className="py-3 pr-4">
                      <Link
                        to="/store"
                        className="hover:underline font-medium truncate block max-w-[180px] text-gs-text"
                      >
                        {listingTitle(l)}
                      </Link>
                      <span className="text-[11px] text-gs-faint">by {l.seller}</span>
                    </td>
                    <td className="py-3 pr-4">
                      <Badge>{l.game}</Badge>
                    </td>
                    <td className="py-3 pr-4">
                      <Badge>{TYPE_LABEL[l.type] ?? l.type}</Badge>
                    </td>
                    <td className="py-3 pr-4 text-right font-semibold text-gs-text tabular-nums">
                      ${l.price}
                    </td>
                    <td className="py-3 pr-4 text-right text-xs text-gs-muted tabular-nums">
                      {l.views.toLocaleString()}
                    </td>
                    <td className="py-3 text-right text-xs text-gs-muted tabular-nums">
                      {l.order_count}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </SectionCard>
    </div>
  );
}
