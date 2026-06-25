// src/app/pages/Analytics.tsx — Market Data Science dashboard
import React, { useEffect, useState } from 'react';
import { Link } from 'react-router';
import { TrendingUp, Package, Users, ShoppingBag, BarChart2, Eye, DollarSign, RefreshCw } from 'lucide-react';
import {
  apiGetAnalyticsSummary, apiGetAnalyticsByGame, apiGetAnalyticsByType,
  apiGetTopListings, apiGetPriceRanges, apiGetRecentActivity,
  type AnalyticsSummary, type GameStat, type TypeStat,
  type PriceRange, type DayActivity, type TopListing,
} from '../lib/api';

// ── Game accent colours ────────────────────────────────────────────────────────
const GAME_COLORS: Record<string, string> = {
  CS2: '#f97316', Valorant: '#ff4655', LoL: '#c9a227',
  'Apex Legends': '#fc4d00', Fortnite: '#00c2ff', PUBG: '#e2b846',
  'Dota 2': '#cc2222', 'Overwatch 2': '#f99e1a',
};
const gameColor = (g: string) => GAME_COLORS[g] ?? 'var(--gs-accent)';

const TYPE_LABEL: Record<string, string> = {
  account: 'Account', skin: 'Skin', key: 'Game Key',
  subscription: 'Subscription', giftcard: 'Gift Card', other: 'Other',
};

// ── Tiny bar built from CSS ────────────────────────────────────────────────────
function Bar({ value, max, color = 'var(--gs-accent)', height = 6 }: {
  value: number; max: number; color?: string; height?: number;
}) {
  const pct = max > 0 ? Math.round((value / max) * 100) : 0;
  return (
    <div className="w-full rounded-full overflow-hidden" style={{ height, background: 'var(--gs-border)' }}>
      <div
        className="h-full rounded-full transition-all duration-500"
        style={{ width: `${pct}%`, background: color }}
      />
    </div>
  );
}

// ── Stat card ─────────────────────────────────────────────────────────────────
function StatCard({ icon, label, value, sub }: {
  icon: React.ReactNode; label: string; value: string | number; sub?: string;
}) {
  return (
    <div className="rounded-xl border p-4 flex items-start gap-3"
      style={{ borderColor: 'var(--gs-border)', background: 'var(--gs-surface)' }}>
      <div className="w-9 h-9 rounded-lg flex items-center justify-center shrink-0"
        style={{ background: 'rgba(59,130,246,0.1)' }}>
        <span style={{ color: 'var(--gs-accent)' }}>{icon}</span>
      </div>
      <div>
        <p className="text-[11px] mb-0.5" style={{ color: 'var(--gs-faint)' }}>{label}</p>
        <p className="text-xl font-bold" style={{ color: 'var(--gs-text)' }}>{value}</p>
        {sub && <p className="text-[11px] mt-0.5" style={{ color: 'var(--gs-faint)' }}>{sub}</p>}
      </div>
    </div>
  );
}

function SectionCard({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="rounded-xl border overflow-hidden" style={{ borderColor: 'var(--gs-border)', background: 'var(--gs-surface)' }}>
      <div className="px-5 py-3.5 border-b" style={{ borderColor: 'var(--gs-border)' }}>
        <h2 className="text-sm font-semibold" style={{ color: 'var(--gs-text)' }}>{title}</h2>
      </div>
      <div className="p-5">{children}</div>
    </div>
  );
}

// ── Activity sparkline (mini bar chart) ────────────────────────────────────────
function Sparkline({ data }: { data: DayActivity[] }) {
  if (!data.length) return <p className="text-xs text-center py-4" style={{ color: 'var(--gs-faint)' }}>No recent listings</p>;
  const max = Math.max(...data.map(d => d.newListings), 1);
  const days = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
  return (
    <div className="flex items-end gap-1.5 h-20">
      {data.map(d => {
        const pct = Math.round((d.newListings / max) * 100);
        const date = new Date(d.day);
        return (
          <div key={d.day} className="flex-1 flex flex-col items-center gap-1 group relative">
            <div className="w-full rounded-t flex items-end" style={{ height: 60 }}>
              <div
                className="w-full rounded-t transition-all duration-300"
                style={{ height: `${Math.max(pct, 4)}%`, background: 'var(--gs-accent)', opacity: 0.8 }}
                title={`${d.newListings} listing${d.newListings !== 1 ? 's' : ''}`}
              />
            </div>
            <span className="text-[9px]" style={{ color: 'var(--gs-faint)' }}>{days[date.getDay()]}</span>
          </div>
        );
      })}
    </div>
  );
}

// ── Main page ─────────────────────────────────────────────────────────────────
export function Analytics() {
  const [summary,  setSummary]  = useState<AnalyticsSummary | null>(null);
  const [byGame,   setByGame]   = useState<GameStat[]>([]);
  const [byType,   setByType]   = useState<TypeStat[]>([]);
  const [topList,  setTopList]  = useState<TopListing[]>([]);
  const [ranges,   setRanges]   = useState<PriceRange[]>([]);
  const [activity, setActivity] = useState<DayActivity[]>([]);
  const [loading,  setLoading]  = useState(true);
  const [error,    setError]    = useState('');

  const load = async () => {
    setLoading(true);
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
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : 'Failed to load analytics');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { load(); }, []);

  const maxListings = Math.max(...byGame.map(g => g.listings), 1);
  const maxRangeCount = Math.max(...ranges.map(r => r.count), 1);

  return (
    <div className="max-w-6xl mx-auto px-5 py-10 space-y-6">

      {/* Header */}
      <div className="flex items-start justify-between gap-4">
        <div className="space-y-1">
          <div className="flex items-center gap-2 text-xs mb-3" style={{ color: 'var(--gs-faint)' }}>
            <BarChart2 className="size-3.5" style={{ color: 'var(--gs-accent)' }} />
            <span style={{ color: 'var(--gs-accent)' }}>Data Science</span>
            <span>/</span>
            <span>Market Analytics</span>
          </div>
          <h1 className="text-2xl font-bold" style={{ color: 'var(--gs-text)' }}>Market Analytics</h1>
          <p className="text-sm" style={{ color: 'var(--gs-faint)' }}>
            Real-time insights from listings, pricing, and trading activity across all games.
          </p>
        </div>
        <button
          onClick={load}
          disabled={loading}
          className="flex items-center gap-1.5 text-xs px-3 py-2 rounded-lg border transition-colors disabled:opacity-50"
          style={{ borderColor: 'var(--gs-border)', color: 'var(--gs-muted)', background: 'var(--gs-surface)' }}
        >
          <RefreshCw className={`size-3.5 ${loading ? 'animate-spin' : ''}`} />
          Refresh
        </button>
      </div>

      {error && (
        <div className="p-3 rounded-lg border text-sm" style={{ borderColor: 'var(--gs-border)', color: 'var(--gs-faint)' }}>
          {error}
        </div>
      )}

      {/* Summary stats */}
      {summary && (
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
          <StatCard icon={<Package className="size-4" />} label="Active Listings"  value={summary.activeListings}  />
          <StatCard icon={<Users className="size-4" />}   label="Active Sellers"   value={summary.activeSellers}   />
          <StatCard icon={<ShoppingBag className="size-4" />} label="Trades Completed" value={summary.completedTrades} />
          <StatCard icon={<DollarSign className="size-4" />}  label="Avg. Listing Price" value={`$${summary.avgPrice}`} sub="across all games" />
        </div>
      )}

      {loading && !summary && (
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
          {[...Array(4)].map((_, i) => (
            <div key={i} className="h-24 rounded-xl animate-pulse" style={{ background: 'var(--gs-border)' }} />
          ))}
        </div>
      )}

      {/* Main grid */}
      <div className="grid lg:grid-cols-2 gap-5">

        {/* By game */}
        <SectionCard title="Listings by Game">
          {byGame.length === 0
            ? <p className="text-xs py-4 text-center" style={{ color: 'var(--gs-faint)' }}>No data yet</p>
            : (
              <div className="space-y-3.5">
                {byGame.map(g => (
                  <div key={g.game}>
                    <div className="flex items-center justify-between text-xs mb-1.5">
                      <span className="font-medium" style={{ color: 'var(--gs-text)' }}>{g.game}</span>
                      <div className="flex items-center gap-3" style={{ color: 'var(--gs-faint)' }}>
                        <span>{g.listings} listing{g.listings !== 1 ? 's' : ''}</span>
                        <span className="font-semibold" style={{ color: 'var(--gs-muted)' }}>avg ${g.avgPrice}</span>
                      </div>
                    </div>
                    <Bar value={g.listings} max={maxListings} color={gameColor(g.game)} />
                  </div>
                ))}
              </div>
            )
          }
        </SectionCard>

        {/* Price distribution */}
        <SectionCard title="Price Distribution">
          {ranges.length === 0
            ? <p className="text-xs py-4 text-center" style={{ color: 'var(--gs-faint)' }}>No data yet</p>
            : (
              <div className="space-y-3.5">
                {ranges.map(r => (
                  <div key={r.range}>
                    <div className="flex items-center justify-between text-xs mb-1.5">
                      <span style={{ color: 'var(--gs-text)' }}>{r.range}</span>
                      <span style={{ color: 'var(--gs-faint)' }}>{r.count} listing{r.count !== 1 ? 's' : ''}</span>
                    </div>
                    <Bar value={r.count} max={maxRangeCount} color="var(--gs-accent)" />
                  </div>
                ))}
              </div>
            )
          }
        </SectionCard>

        {/* By type */}
        <SectionCard title="Listings by Category">
          {byType.length === 0
            ? <p className="text-xs py-4 text-center" style={{ color: 'var(--gs-faint)' }}>No data yet</p>
            : (
              <div className="divide-y" style={{ borderColor: 'var(--gs-border)' }}>
                {byType.map(t => (
                  <div key={t.type} className="flex items-center justify-between py-2.5 text-sm">
                    <span style={{ color: 'var(--gs-text)' }}>{TYPE_LABEL[t.type] ?? t.type}</span>
                    <div className="flex items-center gap-5 text-xs" style={{ color: 'var(--gs-faint)' }}>
                      <span>{t.listings} listed</span>
                      <span className="font-semibold w-16 text-right" style={{ color: 'var(--gs-muted)' }}>avg ${t.avgPrice}</span>
                    </div>
                  </div>
                ))}
              </div>
            )
          }
        </SectionCard>

        {/* Activity sparkline */}
        <SectionCard title="New Listings (Last 7 Days)">
          <Sparkline data={activity} />
        </SectionCard>
      </div>

      {/* Top listings table */}
      <SectionCard title="Most Viewed Listings">
        {topList.length === 0
          ? <p className="text-xs py-4 text-center" style={{ color: 'var(--gs-faint)' }}>No listings yet</p>
          : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="text-left text-xs border-b" style={{ borderColor: 'var(--gs-border)', color: 'var(--gs-faint)' }}>
                    <th className="pb-2 pr-4 font-medium">Item</th>
                    <th className="pb-2 pr-4 font-medium">Game</th>
                    <th className="pb-2 pr-4 font-medium">Type</th>
                    <th className="pb-2 pr-4 font-medium text-right">Price</th>
                    <th className="pb-2 pr-4 font-medium text-right">
                      <Eye className="size-3 inline mr-1" />Views
                    </th>
                    <th className="pb-2 font-medium text-right">
                      <TrendingUp className="size-3 inline mr-1" />Sales
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {topList.map((l, i) => (
                    <tr
                      key={l.id}
                      className="border-b transition-colors"
                      style={{ borderColor: i < topList.length - 1 ? 'var(--gs-border)' : 'transparent' }}
                    >
                      <td className="py-2.5 pr-4">
                        <Link
                          to={`/product/${l.id}`}
                          className="hover:underline font-medium truncate block max-w-[180px]"
                          style={{ color: 'var(--gs-text)' }}
                        >
                          {l.item ?? l.type}
                        </Link>
                        <span className="text-[11px]" style={{ color: 'var(--gs-faint)' }}>by {l.seller}</span>
                      </td>
                      <td className="py-2.5 pr-4">
                        <span className="text-xs font-semibold px-1.5 py-0.5 rounded" style={{ background: `${gameColor(l.game)}18`, color: gameColor(l.game) }}>
                          {l.game}
                        </span>
                      </td>
                      <td className="py-2.5 pr-4 text-xs" style={{ color: 'var(--gs-faint)' }}>
                        {TYPE_LABEL[l.type] ?? l.type}
                      </td>
                      <td className="py-2.5 pr-4 text-right font-semibold" style={{ color: 'var(--gs-text)' }}>
                        ${l.price}
                      </td>
                      <td className="py-2.5 pr-4 text-right text-xs" style={{ color: 'var(--gs-faint)' }}>
                        {l.views.toLocaleString()}
                      </td>
                      <td className="py-2.5 text-right text-xs" style={{ color: 'var(--gs-faint)' }}>
                        {l.order_count}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )
        }
      </SectionCard>
    </div>
  );
}
