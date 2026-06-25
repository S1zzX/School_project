import React, { useEffect, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router';
import {
  ShieldCheck, Trash2, Pencil, Check, X, Users, RefreshCw,
  Ticket, MessageSquare, BarChart3, Clock, AlertCircle,
  CheckCircle2, ChevronDown, Package, Send, Filter, ArrowLeftRight, ImageIcon,
} from 'lucide-react';
import {
  getUser,
  apiAdminGetUsers, apiAdminUpdateUser, apiAdminDeleteUser,
  apiAdminGetUserContent, apiAdminDeleteForumPost, apiAdminDeleteStoreListing,
  apiAdminGetTickets, apiAdminGetTicketStats, apiAdminUpdateTicket, apiAdminDeleteTicket,
  apiAdminGetTrades, apiAdminGetTradeStats, apiAdminUpdateTrade,
  SHOP_CATEGORIES,
  type AdminUser, type UserRole, type ShopCategory,
  type StoreListingAPI, type ForumPostAPI,
  type SupportTicketAPI, type TicketStatus, type TicketPriority, type TicketStatsAPI,
  type TradeRequestAPI, type TradeStatus, type TradeStatsAPI,
} from '../lib/api';

const ROLE_LABELS: Record<UserRole, { label: string; style: string }> = {
  admin:      { label: 'Admin',      style: 'bg-orange-400/15 text-orange-400 border border-orange-400/30' },
  shop_owner: { label: 'Shop Owner', style: 'bg-amber-400/15 text-amber-400 border border-amber-400/30' },
  gamer:      { label: 'Gamer',      style: 'bg-gs-surface-2 text-gs-muted border border-gs-border' },
};

const TICKET_STATUS: Record<TicketStatus, { label: string; style: string; icon: React.ReactNode }> = {
  open:        { label: 'Open',        style: 'text-sky-400 bg-sky-400/10 border-sky-400/25',            icon: <Clock className="size-3" /> },
  in_progress: { label: 'In Progress', style: 'text-amber-400 bg-amber-400/10 border-amber-400/25',      icon: <RefreshCw className="size-3" /> },
  resolved:    { label: 'Resolved',    style: 'text-emerald-400 bg-emerald-400/10 border-emerald-400/25', icon: <CheckCircle2 className="size-3" /> },
  closed:      { label: 'Closed',      style: 'text-gs-faint bg-gs-surface-2 border-gs-border',          icon: <X className="size-3" /> },
};

const TICKET_PRIORITY: Record<TicketPriority, string> = {
  low:    'text-gs-faint',
  normal: 'text-sky-400',
  high:   'text-orange-400',
  urgent: 'text-red-400 font-bold',
};

type AdminTab = 'users' | 'tickets' | 'trades' | 'platform';

interface EditState { role: UserRole; shop_category: ShopCategory | ''; }

export function Admin() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const me       = getUser();
  const tabParam = searchParams.get('tab');
  const [activeTab, setActiveTab] = useState<AdminTab>(
    tabParam === 'tickets' || tabParam === 'trades' || tabParam === 'platform' || tabParam === 'users'
      ? tabParam
      : 'users'
  );

  // ── User management state ──
  const [users,   setUsers]   = useState<AdminUser[]>([]);
  const [loading, setLoading] = useState(true);
  const [error,   setError]   = useState('');
  const [editId,  setEditId]  = useState<number | null>(null);
  const [editVal, setEditVal] = useState<EditState>({ role: 'gamer', shop_category: '' });
  const [saving,  setSaving]  = useState(false);
  const [contentUser, setContentUser]     = useState<AdminUser | null>(null);
  const [contentLoading, setContentLoading] = useState(false);
  const [storeListings, setStoreListings] = useState<StoreListingAPI[]>([]);
  const [forumPosts, setForumPosts]       = useState<ForumPostAPI[]>([]);
  const [contentTab, setContentTab]       = useState<'store' | 'forum'>('store');

  // ── Tickets state ──
  const [tickets, setTickets]             = useState<SupportTicketAPI[]>([]);
  const [ticketStats, setTicketStats]     = useState<TicketStatsAPI | null>(null);
  const [ticketsLoading, setTicketsLoading] = useState(false);
  const [selectedTicket, setSelectedTicket] = useState<SupportTicketAPI | null>(null);
  const [ticketFilter, setTicketFilter]   = useState<{ status?: string; priority?: string }>({});
  const [ticketResponse, setTicketResponse] = useState('');
  const [ticketStatus, setTicketStatus]   = useState<TicketStatus>('open');
  const [respondingId, setRespondingId]   = useState<number | null>(null);

  // ── Trades state ──
  const [trades, setTrades]               = useState<TradeRequestAPI[]>([]);
  const [tradeStats, setTradeStats]       = useState<TradeStatsAPI | null>(null);
  const [tradesLoading, setTradesLoading] = useState(false);
  const [tradeFilter, setTradeFilter]     = useState('');
  const [selectedTrade, setSelectedTrade] = useState<TradeRequestAPI | null>(null);
  const [tradeStatusVal, setTradeStatusVal] = useState<TradeStatus>('pending');
  const [tradeNote, setTradeNote]         = useState('');
  const [updatingTradeId, setUpdatingTradeId] = useState<number | null>(null);

  useEffect(() => {
    if (!me || me.role !== 'admin') navigate('/');
  }, [me, navigate]);

  const loadUsers = async () => {
    setLoading(true); setError('');
    try { setUsers(await apiAdminGetUsers()); }
    catch (e: unknown) { setError(e instanceof Error ? e.message : 'Failed to load users.'); }
    finally { setLoading(false); }
  };

  const loadTickets = async () => {
    setTicketsLoading(true);
    try {
      const [t, s] = await Promise.all([
        apiAdminGetTickets(ticketFilter),
        apiAdminGetTicketStats(),
      ]);
      setTickets(t); setTicketStats(s);
    } catch { /* ignore */ }
    finally { setTicketsLoading(false); }
  };

  const loadTrades = async () => {
    setTradesLoading(true);
    try {
      const [t, s] = await Promise.allSettled([
        apiAdminGetTrades(tradeFilter || undefined),
        apiAdminGetTradeStats(),
      ]);
      if (t.status === 'fulfilled') setTrades(t.value);
      if (s.status === 'fulfilled') setTradeStats(s.value);
    } catch { /* ignore */ }
    finally { setTradesLoading(false); }
  };

  const handleUpdateTrade = async () => {
    if (!selectedTrade) return;
    setUpdatingTradeId(selectedTrade.id);
    try {
      const updated = await apiAdminUpdateTrade(selectedTrade.id, { status: tradeStatusVal, admin_note: tradeNote });
      window.dispatchEvent(new Event('notifications_updated'));
      setTrades(prev => prev.map(t => t.id === updated.id ? updated : t));
      setSelectedTrade(null);
    } catch { alert('Failed to update trade.'); }
    finally { setUpdatingTradeId(null); }
  };

  useEffect(() => { loadUsers(); }, []);
  useEffect(() => { if (activeTab === 'tickets') loadTickets(); }, [activeTab, ticketFilter]);
  useEffect(() => { if (activeTab === 'trades') loadTrades(); }, [activeTab, tradeFilter]);

  // User management helpers
  const startEdit = (u: AdminUser) => {
    setEditId(u.id);
    setEditVal({ role: u.role, shop_category: (u.shop_category as ShopCategory) ?? '' });
  };
  const cancelEdit = () => setEditId(null);

  const saveEdit = async (id: number) => {
    setSaving(true);
    try {
      const updated = await apiAdminUpdateUser(id, {
        role: editVal.role,
        shop_category: editVal.role === 'shop_owner' ? editVal.shop_category as ShopCategory : null,
      });
      setUsers(prev => prev.map(u => u.id === id ? updated : u));
      setEditId(null);
    } catch (e: unknown) { setError(e instanceof Error ? e.message : 'Update failed.'); }
    finally { setSaving(false); }
  };

  const deleteUser = async (id: number, username: string) => {
    if (!confirm(`Delete user "${username}"? This also removes their content.`)) return;
    try {
      await apiAdminDeleteUser(id);
      setUsers(prev => prev.filter(u => u.id !== id));
    } catch (e: unknown) { setError(e instanceof Error ? e.message : 'Delete failed.'); }
  };

  const openContentModal = async (u: AdminUser) => {
    setContentUser(u);
    setContentLoading(true);
    setContentTab(u.role === 'shop_owner' ? 'store' : 'forum');
    try {
      const data = await apiAdminGetUserContent(u.id);
      setStoreListings(data.storeListings);
      setForumPosts(data.forumPosts);
    } catch (e: unknown) { setError(e instanceof Error ? e.message : 'Failed to load content.'); }
    finally { setContentLoading(false); }
  };

  const deleteForumPost = async (id: number) => {
    if (!confirm('Delete this forum post?')) return;
    try { await apiAdminDeleteForumPost(id); setForumPosts(prev => prev.filter(p => p.id !== id)); }
    catch { alert('Failed to delete post.'); }
  };

  const deleteStoreListing = async (id: string) => {
    if (!confirm('Delete this store listing?')) return;
    try { await apiAdminDeleteStoreListing(id); setStoreListings(prev => prev.filter(p => p.id !== id)); }
    catch { alert('Failed to delete listing.'); }
  };

  // Ticket helpers
  const openRespondModal = (ticket: SupportTicketAPI) => {
    setSelectedTicket(ticket);
    setTicketResponse(ticket.admin_response || '');
    setTicketStatus(ticket.status);
  };

  const handleRespondTicket = async () => {
    if (!selectedTicket) return;
    setRespondingId(selectedTicket.id);
    try {
      const updated = await apiAdminUpdateTicket(selectedTicket.id, {
        status: ticketStatus,
        admin_response: ticketResponse,
      });
      window.dispatchEvent(new Event('notifications_updated'));
      setTickets(prev => prev.map(t => t.id === updated.id ? updated : t));
      setSelectedTicket(null);
    } catch { alert('Failed to update ticket.'); }
    finally { setRespondingId(null); }
  };

  const handleDeleteTicket = async (id: number) => {
    if (!confirm('Delete this support ticket?')) return;
    try {
      await apiAdminDeleteTicket(id);
      setTickets(prev => prev.filter(t => t.id !== id));
    } catch { alert('Failed to delete ticket.'); }
  };

  if (!me || me.role !== 'admin') return null;

  const gamerCount     = users.filter(u => u.role === 'gamer').length;
  const shopCount      = users.filter(u => u.role === 'shop_owner').length;
  const adminCount     = users.filter(u => u.role === 'admin').length;

  return (
    <div className="max-w-7xl mx-auto px-6 py-8 space-y-6">

      {/* ── HEADER ── */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <div className="w-11 h-11 rounded-xl flex items-center justify-center" style={{ background: 'rgba(249,115,22,0.1)', border: '1px solid rgba(249,115,22,0.25)' }}>
            <ShieldCheck className="size-6" style={{ color: 'var(--gs-accent)' }} />
          </div>
          <div>
            <h1 className="text-2xl font-extrabold text-gs-text tracking-tight">Admin Panel</h1>
            <p className="text-xs text-gs-faint mt-0.5">Manage users, handle support tickets, and monitor platform health</p>
          </div>
        </div>
        <button
          onClick={() => activeTab === 'users' ? loadUsers() : activeTab === 'trades' ? loadTrades() : loadTickets()}
          className="flex items-center gap-2 text-sm text-gs-muted hover:text-gs-text border border-gs-border rounded-xl px-4 py-2 transition-all hover:bg-gs-surface-2"
        >
          <RefreshCw className="size-4" /> Refresh
        </button>
      </div>

      {/* ── STATS BAR ── */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        {[
          { label: 'Total Users',    value: users.length,   color: 'text-gs-text',    icon: <Users className="size-4 text-gs-accent" /> },
          { label: 'Gamers',         value: gamerCount,     color: 'text-sky-400',    icon: <Users className="size-4 text-sky-400" /> },
          { label: 'Shop Owners',    value: shopCount,      color: 'text-amber-400',  icon: <Package className="size-4 text-amber-400" /> },
          { label: 'Open Tickets',   value: ticketStats?.open ?? '…', color: ticketStats?.open ? 'text-red-400' : 'text-gs-faint', icon: <Ticket className="size-4 text-red-400" /> },
        ].map((s, i) => (
          <div key={i} className="bg-gs-surface border border-gs-border rounded-xl px-5 py-4 flex items-center gap-3">
            <div className="w-9 h-9 rounded-lg bg-gs-surface-2 flex items-center justify-center shrink-0">{s.icon}</div>
            <div>
              <p className={`text-xl font-extrabold ${s.color}`}>{s.value}</p>
              <p className="text-[11px] text-gs-faint">{s.label}</p>
            </div>
          </div>
        ))}
      </div>

      {error && (
        <div className="flex items-center gap-2 px-4 py-3 rounded-xl border border-red-400/25 bg-red-400/8 text-red-400 text-sm">
          <AlertCircle className="size-4 shrink-0" />{error}
          <button onClick={() => setError('')} className="ml-auto"><X className="size-4" /></button>
        </div>
      )}

      {/* ── TABS ── */}
      <div className="flex gap-1 p-1 bg-gs-surface border border-gs-border rounded-xl">
        {([
          { id: 'users',    label: `Users (${users.length})`,                             icon: <Users className="size-3.5" /> },
          { id: 'tickets',  label: `Support Tickets${ticketStats ? ` (${ticketStats.open} open)` : ''}`, icon: <Ticket className="size-3.5" /> },
          { id: 'trades',   label: `Skin Trades${tradeStats ? ` (${tradeStats.pending} pending)` : ''}`,  icon: <ArrowLeftRight className="size-3.5" /> },
          { id: 'platform', label: 'Platform Overview',                                   icon: <BarChart3 className="size-3.5" /> },
        ] as const).map(t => (
          <button
            key={t.id}
            onClick={() => setActiveTab(t.id)}
            className={`flex-1 flex items-center justify-center gap-2 py-2.5 rounded-lg text-sm font-semibold transition-all ${
              activeTab === t.id ? 'text-white' : 'text-gs-faint hover:text-gs-muted'
            }`}
            style={activeTab === t.id ? { background: 'var(--gs-accent)' } : {}}
          >
            {t.icon}{t.label}
          </button>
        ))}
      </div>

      {/* ════════════════════════════════════
          USERS TAB
          ════════════════════════════════════ */}
      {activeTab === 'users' && (
        <section className="bg-gs-surface border border-gs-border rounded-2xl overflow-hidden shadow-sm">
          <div className="flex items-center gap-3 px-6 py-4 border-b border-gs-border bg-gs-surface-2">
            <Users className="size-4 text-gs-faint" />
            <h2 className="text-sm font-bold text-gs-text uppercase tracking-widest">All Users</h2>
            <span className="ml-auto text-xs text-gs-faint bg-gs-surface px-2.5 py-1 rounded-full border border-gs-border">{users.length} total</span>
          </div>

          {loading ? (
            <div className="py-20 flex items-center justify-center gap-2 text-gs-faint text-sm">
              <span className="w-5 h-5 rounded-full border-2 border-gs-border border-t-gs-muted animate-spin" />
              Loading users…
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-gs-border">
                    {['ID', 'User', 'Email', 'Role', 'Category', 'Joined', 'Actions'].map(h => (
                      <th key={h} className="px-5 py-3 text-left text-[11px] font-bold uppercase tracking-widest text-gs-faint">{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {users.map(u => {
                    const isEditing = editId === u.id;
                    const isMe      = u.id === me.id;
                    return (
                      <tr key={u.id} className="border-b border-gs-border last:border-0 hover:bg-gs-surface-2/60 transition-colors">
                        <td className="px-5 py-4 text-gs-faint text-xs tabular-nums font-mono">#{u.id}</td>
                        <td className="px-5 py-4">
                          <div className="flex items-center gap-2.5">
                            <div className="w-8 h-8 rounded-full flex items-center justify-center text-[11px] font-bold shrink-0" style={{ background: 'var(--gs-accent)', color: '#fff' }}>
                              {u.username.slice(0, 2).toUpperCase()}
                            </div>
                            <div>
                              <p className="text-gs-text font-semibold text-sm">{u.username}</p>
                              {isMe && <span className="text-[9px] text-gs-accent font-bold uppercase tracking-wider">(you)</span>}
                            </div>
                          </div>
                        </td>
                        <td className="px-5 py-4 text-gs-muted text-xs">{u.email}</td>
                        <td className="px-5 py-4">
                          {isEditing ? (
                            <select value={editVal.role} onChange={e => setEditVal({ role: e.target.value as UserRole, shop_category: '' })}
                              className="bg-gs-surface-2 border border-gs-border rounded-lg px-2.5 py-1.5 text-xs text-gs-text focus:outline-none focus:border-gs-accent/60">
                              <option value="gamer">Gamer</option>
                              <option value="shop_owner">Shop Owner</option>
                              <option value="admin">Admin</option>
                            </select>
                          ) : (
                            <span className={`inline-flex px-2.5 py-1 rounded-lg text-[11px] font-semibold ${ROLE_LABELS[u.role].style}`}>
                              {ROLE_LABELS[u.role].label}
                            </span>
                          )}
                        </td>
                        <td className="px-5 py-4">
                          {isEditing && editVal.role === 'shop_owner' ? (
                            <select value={editVal.shop_category} onChange={e => setEditVal(prev => ({ ...prev, shop_category: e.target.value as ShopCategory }))}
                              className="bg-gs-surface-2 border border-gs-border rounded-lg px-2.5 py-1.5 text-xs text-gs-text focus:outline-none focus:border-gs-accent/60">
                              <option value="" disabled>Select…</option>
                              {SHOP_CATEGORIES.map(c => <option key={c} value={c}>{c}</option>)}
                            </select>
                          ) : (
                            <span className="text-gs-faint text-xs">{u.shop_category ?? '—'}</span>
                          )}
                        </td>
                        <td className="px-5 py-4 text-gs-faint text-xs whitespace-nowrap">
                          {new Date(u.created_at).toLocaleDateString(undefined, { year: 'numeric', month: 'short', day: 'numeric' })}
                        </td>
                        <td className="px-5 py-4">
                          <div className="flex items-center gap-1.5">
                            {isEditing ? (
                              <>
                                <button onClick={() => saveEdit(u.id)} disabled={saving}
                                  className="p-1.5 rounded-lg bg-gs-accent/15 text-gs-accent hover:bg-gs-accent/25 transition-colors" title="Save">
                                  <Check className="size-3.5" />
                                </button>
                                <button onClick={cancelEdit} className="p-1.5 rounded-lg hover:bg-gs-surface-2 text-gs-faint transition-colors" title="Cancel">
                                  <X className="size-3.5" />
                                </button>
                              </>
                            ) : (
                              <>
                                <button onClick={() => openContentModal(u)} title="View content"
                                  className="p-1.5 rounded-lg hover:bg-gs-surface-2 text-gs-faint hover:text-gs-accent transition-colors">
                                  <ShieldCheck className="size-3.5" />
                                </button>
                                <button onClick={() => startEdit(u)} title="Edit role"
                                  className="p-1.5 rounded-lg hover:bg-gs-surface-2 text-gs-faint hover:text-gs-text transition-colors">
                                  <Pencil className="size-3.5" />
                                </button>
                                {!isMe && (
                                  <button onClick={() => deleteUser(u.id, u.username)} title="Delete user"
                                    className="p-1.5 rounded-lg hover:bg-red-400/10 text-gs-faint hover:text-red-400 transition-colors">
                                    <Trash2 className="size-3.5" />
                                  </button>
                                )}
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
        </section>
      )}

      {/* ════════════════════════════════════
          TICKETS TAB
          ════════════════════════════════════ */}
      {activeTab === 'tickets' && (
        <div className="space-y-5">

          {/* Ticket stats */}
          {ticketStats && (
            <div className="grid grid-cols-5 gap-3">
              {[
                { label: 'Total',       value: ticketStats.total,       style: 'text-gs-text' },
                { label: 'Open',        value: ticketStats.open,        style: 'text-sky-400' },
                { label: 'In Progress', value: ticketStats.in_progress, style: 'text-amber-400' },
                { label: 'Resolved',    value: ticketStats.resolved,    style: 'text-emerald-400' },
                { label: 'Urgent',      value: ticketStats.urgent,      style: 'text-red-400 font-extrabold' },
              ].map(s => (
                <div key={s.label} className="bg-gs-surface border border-gs-border rounded-xl px-4 py-3 text-center">
                  <p className={`text-2xl font-extrabold ${s.style}`}>{s.value}</p>
                  <p className="text-[11px] text-gs-faint mt-0.5">{s.label}</p>
                </div>
              ))}
            </div>
          )}

          {/* Filters */}
          <div className="flex flex-wrap items-center gap-3">
            <div className="flex items-center gap-1.5 text-xs text-gs-faint">
              <Filter className="size-3.5" /> Filter:
            </div>
            <div className="relative">
              <select value={ticketFilter.status ?? ''} onChange={e => setTicketFilter(p => ({ ...p, status: e.target.value || undefined }))}
                className="appearance-none bg-gs-surface border border-gs-border rounded-lg pl-3 pr-7 py-1.5 text-xs text-gs-muted focus:outline-none cursor-pointer">
                <option value="">All Statuses</option>
                <option value="open">Open</option>
                <option value="in_progress">In Progress</option>
                <option value="resolved">Resolved</option>
                <option value="closed">Closed</option>
              </select>
              <ChevronDown className="absolute right-2 top-1/2 -translate-y-1/2 size-3 text-gs-faint pointer-events-none" />
            </div>
            <div className="relative">
              <select value={ticketFilter.priority ?? ''} onChange={e => setTicketFilter(p => ({ ...p, priority: e.target.value || undefined }))}
                className="appearance-none bg-gs-surface border border-gs-border rounded-lg pl-3 pr-7 py-1.5 text-xs text-gs-muted focus:outline-none cursor-pointer">
                <option value="">All Priorities</option>
                <option value="urgent">Urgent</option>
                <option value="high">High</option>
                <option value="normal">Normal</option>
                <option value="low">Low</option>
              </select>
              <ChevronDown className="absolute right-2 top-1/2 -translate-y-1/2 size-3 text-gs-faint pointer-events-none" />
            </div>
            <span className="ml-auto text-xs text-gs-faint">{tickets.length} tickets</span>
          </div>

          {ticketsLoading ? (
            <div className="py-20 flex items-center justify-center gap-2 text-gs-faint text-sm">
              <span className="w-5 h-5 rounded-full border-2 border-gs-border border-t-gs-muted animate-spin" />
              Loading tickets…
            </div>
          ) : tickets.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-16 gap-3 text-center">
              <Ticket className="size-12 text-gs-faint opacity-40" />
              <p className="text-gs-text font-semibold">No tickets found</p>
              <p className="text-gs-faint text-sm">No support tickets match the current filters.</p>
            </div>
          ) : (
            <div className="bg-gs-surface border border-gs-border rounded-2xl overflow-hidden shadow-sm">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-gs-border">
                    {['#', 'User', 'Subject', 'Category', 'Priority', 'Status', 'Date', 'Actions'].map(h => (
                      <th key={h} className="px-5 py-3 text-left text-[11px] font-bold uppercase tracking-widest text-gs-faint">{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {tickets.map(ticket => (
                    <tr key={ticket.id} className="border-b border-gs-border last:border-0 hover:bg-gs-surface-2/60 transition-colors">
                      <td className="px-5 py-4 text-gs-faint text-xs font-mono">#{ticket.id}</td>
                      <td className="px-5 py-4">
                        <p className="text-xs font-semibold text-gs-text">{ticket.username}</p>
                        <p className="text-[10px] text-gs-faint truncate max-w-[120px]">{ticket.email}</p>
                      </td>
                      <td className="px-5 py-4">
                        <p className="text-xs text-gs-text font-medium max-w-[180px] truncate">{ticket.subject}</p>
                      </td>
                      <td className="px-5 py-4">
                        <span className="text-[10px] bg-gs-surface-2 border border-gs-border text-gs-muted px-2 py-0.5 rounded-full">{ticket.category}</span>
                      </td>
                      <td className="px-5 py-4">
                        <span className={`text-xs font-semibold ${TICKET_PRIORITY[ticket.priority]}`}>{ticket.priority}</span>
                      </td>
                      <td className="px-5 py-4">
                        <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full border text-[10px] font-semibold ${TICKET_STATUS[ticket.status].style}`}>
                          {TICKET_STATUS[ticket.status].icon} {TICKET_STATUS[ticket.status].label}
                        </span>
                      </td>
                      <td className="px-5 py-4 text-gs-faint text-xs whitespace-nowrap">
                        {new Date(ticket.created_at).toLocaleDateString(undefined, { month: 'short', day: 'numeric' })}
                      </td>
                      <td className="px-5 py-4">
                        <div className="flex items-center gap-1.5">
                          <button onClick={() => openRespondModal(ticket)} title="Respond"
                            className="p-1.5 rounded-lg hover:bg-gs-accent/15 text-gs-faint hover:text-gs-accent transition-colors">
                            <MessageSquare className="size-3.5" />
                          </button>
                          <button onClick={() => handleDeleteTicket(ticket.id)} title="Delete"
                            className="p-1.5 rounded-lg hover:bg-red-400/10 text-gs-faint hover:text-red-400 transition-colors">
                            <Trash2 className="size-3.5" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {/* ════════════════════════════════════
          SKIN TRADES TAB
          ════════════════════════════════════ */}
      {activeTab === 'trades' && (
        <div className="space-y-5">
          {/* Stats */}
          {tradeStats && (
            <div className="grid grid-cols-2 sm:grid-cols-5 gap-3">
              {[
                { label: 'Total',     value: tradeStats.total,     color: 'text-gs-text'     },
                { label: 'Pending',   value: tradeStats.pending,   color: 'text-orange-400'  },
                { label: 'Verified',  value: tradeStats.verified,  color: 'text-sky-400'     },
                { label: 'Completed', value: tradeStats.completed, color: 'text-emerald-400' },
                { label: 'Rejected',  value: tradeStats.rejected,  color: 'text-red-400'     },
              ].map(s => (
                <div key={s.label} className="bg-gs-surface border border-gs-border rounded-xl px-4 py-3 text-center">
                  <p className={`text-xl font-extrabold ${s.color}`}>{s.value}</p>
                  <p className="text-[11px] text-gs-faint mt-0.5">{s.label}</p>
                </div>
              ))}
            </div>
          )}

          {/* Filter + table */}
          <div className="bg-gs-surface border border-gs-border rounded-2xl overflow-hidden shadow-sm">
            <div className="flex items-center gap-3 px-6 py-4 border-b border-gs-border bg-gs-surface-2">
              <ArrowLeftRight className="size-4 text-gs-faint" />
              <h3 className="text-sm font-bold text-gs-text flex-1">Skin Trade Requests</h3>
              <div className="relative">
                <select value={tradeFilter} onChange={e => setTradeFilter(e.target.value)}
                  className="appearance-none bg-gs-surface border border-gs-border rounded-lg pl-3 pr-7 py-1.5 text-xs text-gs-muted focus:outline-none cursor-pointer">
                  <option value="">All Statuses</option>
                  <option value="pending">Pending</option>
                  <option value="verified">Verified</option>
                  <option value="completed">Completed</option>
                  <option value="rejected">Rejected</option>
                </select>
                <ChevronDown className="absolute right-2 top-1/2 -translate-y-1/2 size-3 text-gs-faint pointer-events-none" />
              </div>
              <span className="text-xs text-gs-faint">{trades.length} requests</span>
            </div>

            {tradesLoading ? (
              <div className="py-20 flex items-center justify-center gap-2 text-gs-faint text-sm">
                <span className="w-5 h-5 rounded-full border-2 border-gs-border border-t-gs-muted animate-spin" />
                Loading trades…
              </div>
            ) : trades.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-16 gap-3 text-center">
                <ArrowLeftRight className="size-12 text-gs-faint opacity-40" />
                <p className="text-gs-text font-semibold">No trade requests</p>
                <p className="text-gs-faint text-sm">When buyers purchase skins, their trade requests will appear here.</p>
              </div>
            ) : (
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-gs-border">
                    {['#', 'Buyer', 'Item', 'Game', 'Price', 'Status', 'Date', 'Actions'].map(h => (
                      <th key={h} className="px-5 py-3 text-left text-[11px] font-bold uppercase tracking-widest text-gs-faint">{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {trades.map(tr => {
                    const statusStyles: Record<TradeStatus, string> = {
                      pending:   'text-orange-400  bg-orange-400/10  border-orange-400/25',
                      verified:  'text-sky-400     bg-sky-400/10     border-sky-400/25',
                      completed: 'text-emerald-400 bg-emerald-400/10 border-emerald-400/25',
                      rejected:  'text-red-400     bg-red-400/10     border-red-400/25',
                    };
                    return (
                      <tr key={tr.id} className="border-b border-gs-border last:border-0 hover:bg-gs-surface-2/60 transition-colors">
                        <td className="px-5 py-4 text-gs-faint text-xs font-mono">#{tr.id}</td>
                        <td className="px-5 py-4">
                          <p className="text-xs font-semibold text-gs-text">{tr.buyer_username}</p>
                          {tr.seller_username && <p className="text-[10px] text-gs-faint">Seller: {tr.seller_username}</p>}
                        </td>
                        <td className="px-5 py-4">
                          <p className="text-xs text-gs-text font-medium max-w-[160px] truncate">{tr.item_name}</p>
                          {tr.category && <p className="text-[10px] text-gs-faint">{tr.category}</p>}
                        </td>
                        <td className="px-5 py-4 text-xs text-gs-muted">{tr.game}</td>
                        <td className="px-5 py-4 text-xs font-bold text-gs-text">${tr.price.toFixed(2)}</td>
                        <td className="px-5 py-4">
                          <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full border text-[10px] font-semibold ${statusStyles[tr.status]}`}>
                            {tr.status}
                          </span>
                        </td>
                        <td className="px-5 py-4 text-xs text-gs-faint whitespace-nowrap">
                          {new Date(tr.created_at).toLocaleDateString()}
                        </td>
                        <td className="px-5 py-4">
                          <button
                            onClick={() => { setSelectedTrade(tr); setTradeStatusVal(tr.status); setTradeNote(tr.admin_note ?? ''); }}
                            className="flex items-center gap-1.5 text-xs px-3 py-1.5 rounded-lg font-semibold transition-all border border-gs-border hover:border-gs-accent/40 text-gs-muted hover:text-gs-text"
                          >
                            <Pencil className="size-3" /> Review
                          </button>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            )}
          </div>
        </div>
      )}

      {/* ── TRADE REVIEW MODAL ── */}
      {selectedTrade && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-5">
          <div className="bg-gs-surface border border-gs-border rounded-2xl w-full max-w-lg shadow-2xl overflow-hidden">
            <div className="flex items-center justify-between px-6 py-5 border-b border-gs-border bg-gs-surface-2">
              <div>
                <h3 className="text-base font-bold text-gs-text flex items-center gap-2">
                  <ArrowLeftRight className="size-4" style={{ color: 'var(--gs-accent)' }} />
                  Trade #{selectedTrade.id} — {selectedTrade.item_name}
                </h3>
                <p className="text-xs text-gs-muted mt-0.5">Buyer: {selectedTrade.buyer_username} · ${selectedTrade.price.toFixed(2)}</p>
              </div>
              <button onClick={() => setSelectedTrade(null)} className="p-2 rounded-xl hover:bg-gs-surface text-gs-faint hover:text-gs-text transition-colors">
                <X className="size-5" />
              </button>
            </div>
            <div className="p-6 space-y-5 overflow-y-auto max-h-[80vh]">
              {/* Trade info */}
              <div className="grid grid-cols-2 gap-3 text-sm">
                {[
                  { label: 'Item',   value: selectedTrade.item_name },
                  { label: 'Game',   value: selectedTrade.game },
                  { label: 'Buyer',  value: selectedTrade.buyer_username },
                  { label: 'Seller', value: selectedTrade.seller_username ?? 'Unknown' },
                  { label: 'Price',  value: `$${selectedTrade.price.toFixed(2)}` },
                  { label: 'Category', value: selectedTrade.category ?? '—' },
                ].map(({ label, value }) => (
                  <div key={label} className="bg-gs-surface-2 rounded-xl px-3 py-2 border border-gs-border">
                    <p className="text-[10px] text-gs-faint uppercase tracking-wider">{label}</p>
                    <p className="text-xs font-semibold text-gs-text mt-0.5 truncate">{value}</p>
                  </div>
                ))}
              </div>

              {/* Trade flow progress */}
              <div className="flex items-center gap-1 text-xs">
                {[
                  { key: 'pending',         label: 'Buyer Requested' },
                  { key: 'seller_accepted', label: 'Seller Accepted + Proof' },
                  { key: 'verified',        label: 'Admin Verified' },
                  { key: 'completed',       label: 'Completed' },
                ].map((step, i, arr) => {
                  const order = ['pending','seller_accepted','verified','completed'];
                  const currentIdx = order.indexOf(selectedTrade.status);
                  const stepIdx = order.indexOf(step.key);
                  const isDone = currentIdx >= stepIdx && selectedTrade.status !== 'seller_declined' && selectedTrade.status !== 'rejected';
                  const isCurrent = currentIdx === stepIdx;
                  return (
                    <React.Fragment key={step.key}>
                      <div className={`flex flex-col items-center gap-1 flex-1 ${isDone ? 'text-emerald-400' : 'text-gs-faint'}`}>
                        <div className={`size-5 rounded-full border-2 flex items-center justify-center ${isDone ? 'border-emerald-400 bg-emerald-400/15' : 'border-gs-border'} ${isCurrent ? 'ring-2 ring-emerald-400/30' : ''}`}>
                          {isDone && <Check className="size-2.5" strokeWidth={3} />}
                        </div>
                        <span className={`text-[9px] text-center leading-tight ${isDone ? 'text-emerald-400 font-semibold' : 'text-gs-faint'}`}>{step.label}</span>
                      </div>
                      {i < arr.length - 1 && <div className={`flex-1 h-px mb-4 ${currentIdx > stepIdx ? 'bg-emerald-400/50' : 'bg-gs-border'}`} />}
                    </React.Fragment>
                  );
                })}
              </div>

              {/* Seller response info */}
              <div className={`rounded-xl px-4 py-3 text-xs space-y-1 border ${
                selectedTrade.seller_status === 'accepted' ? 'bg-emerald-400/6 border-emerald-400/25' :
                selectedTrade.seller_status === 'declined' ? 'bg-red-400/6 border-red-400/25' :
                'bg-amber-400/6 border-amber-400/25'
              }`}>
                <p className={`font-bold text-sm ${
                  selectedTrade.seller_status === 'accepted' ? 'text-emerald-400' :
                  selectedTrade.seller_status === 'declined' ? 'text-red-400' : 'text-amber-400'
                }`}>
                  Seller Status:{' '}
                  {selectedTrade.seller_status === 'accepted' ? '✓ Accepted & Proof Uploaded' :
                   selectedTrade.seller_status === 'declined' ? '✗ Declined' : '⏳ Awaiting Response'}
                </p>
                {selectedTrade.seller_note && (
                  <p className="text-gs-faint">Seller note: <span className="text-gs-muted">{selectedTrade.seller_note}</span></p>
                )}
                {selectedTrade.seller_responded_at && (
                  <p className="text-gs-faint/60">Responded: {new Date(selectedTrade.seller_responded_at).toLocaleString()}</p>
                )}
              </div>

              {/* PROOF IMAGE — the key part for admin to verify */}
              {selectedTrade.proof_image ? (
                <div className="space-y-2">
                  <p className="text-xs font-bold text-gs-faint uppercase tracking-wider flex items-center gap-1.5">
                    <ImageIcon className="size-3.5" /> Seller's Proof Screenshot
                  </p>
                  <div className="rounded-xl overflow-hidden border-2 border-emerald-400/30 bg-gs-surface-2">
                    <img src={selectedTrade.proof_image} alt="Trade proof" className="w-full max-h-64 object-contain" />
                  </div>
                  <p className="text-[10px] text-gs-faint">Review this screenshot carefully. If it looks legitimate, set status to Verified or Completed.</p>
                </div>
              ) : (
                selectedTrade.seller_status !== 'declined' && (
                  <div className="rounded-xl border border-dashed border-amber-400/30 bg-amber-400/5 px-4 py-4 text-center space-y-1">
                    <ImageIcon className="size-5 text-amber-400/50 mx-auto" />
                    <p className="text-xs text-amber-400 font-semibold">No proof uploaded yet</p>
                    <p className="text-[10px] text-gs-faint">Seller has not accepted and uploaded proof. Wait before making a decision.</p>
                  </div>
                )
              )}

              {/* Admin instructions */}
              <div className="rounded-xl px-4 py-3 text-xs space-y-1" style={{ background: 'rgba(249,115,22,0.06)', border: '1px solid rgba(249,115,22,0.2)' }}>
                <p className="font-bold" style={{ color: 'var(--gs-accent)' }}>Admin Escrow Guide</p>
                <p className="text-gs-faint">1. Wait for seller to accept and upload a proof screenshot above</p>
                <p className="text-gs-faint">2. Inspect the screenshot — does the seller clearly hold the item?</p>
                <p className="text-gs-faint">3. Set to <span className="text-sky-400 font-semibold">Verified</span> to notify the buyer it's safe to proceed</p>
                <p className="text-gs-faint">4. Set to <span className="text-emerald-400 font-semibold">Completed</span> once delivery is confirmed — this decrements stock</p>
                <p className="text-gs-faint">5. Set to <span className="text-red-400 font-semibold">Rejected</span> if the listing is fraudulent</p>
              </div>

              <div>
                <label className="text-xs font-semibold text-gs-faint uppercase tracking-wider block mb-2">Update Status</label>
                <div className="relative">
                  <select value={tradeStatusVal} onChange={e => setTradeStatusVal(e.target.value as TradeStatus)}
                    className="w-full appearance-none bg-gs-surface-2 border border-gs-border rounded-xl px-3 pr-8 py-2.5 text-sm text-gs-text focus:outline-none focus:border-gs-accent/60">
                    <option value="pending">Pending — buyer requested, awaiting seller</option>
                    <option value="seller_accepted">Seller Accepted — proof uploaded</option>
                    <option value="verified">Verified — safe for buyer to proceed</option>
                    <option value="completed">Completed — delivery confirmed</option>
                    <option value="rejected">Rejected — fraud / scam detected</option>
                  </select>
                  <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 size-3.5 text-gs-faint pointer-events-none" />
                </div>
              </div>

              <div>
                <label className="text-xs font-semibold text-gs-faint uppercase tracking-wider block mb-2">Admin Note (shown to buyer)</label>
                <textarea
                  rows={3}
                  value={tradeNote}
                  onChange={e => setTradeNote(e.target.value)}
                  placeholder="Optional note for the buyer..."
                  className="w-full bg-gs-surface-2 border border-gs-border rounded-xl px-4 py-3 text-sm text-gs-text placeholder-gs-faint focus:outline-none focus:border-gs-accent/60 resize-none"
                />
              </div>

              <div className="flex gap-3">
                <button onClick={() => setSelectedTrade(null)} className="flex-1 py-3 rounded-xl border border-gs-border text-gs-muted text-sm font-semibold hover:bg-gs-surface-2 transition-colors">
                  Cancel
                </button>
                <button
                  onClick={handleUpdateTrade}
                  disabled={updatingTradeId === selectedTrade.id}
                  className="flex-1 flex items-center justify-center gap-2 py-3 rounded-xl text-white text-sm font-bold hover:opacity-90 transition-opacity disabled:opacity-50"
                  style={{ background: 'var(--gs-accent)' }}
                >
                  <Check className="size-4" />
                  {updatingTradeId === selectedTrade.id ? 'Saving…' : 'Save Decision'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ════════════════════════════════════
          PLATFORM OVERVIEW TAB
          ════════════════════════════════════ */}
      {activeTab === 'platform' && (
        <div className="grid md:grid-cols-2 gap-5">
          <div className="bg-gs-surface border border-gs-border rounded-2xl p-6">
            <h3 className="text-sm font-bold text-gs-text mb-4 flex items-center gap-2">
              <Users className="size-4 text-gs-accent" /> User Distribution
            </h3>
            <div className="space-y-3">
              {([
                { label: 'Gamers',      count: gamerCount,  color: 'bg-sky-400',    width: users.length > 0 ? (gamerCount / users.length) * 100 : 0 },
                { label: 'Shop Owners', count: shopCount,   color: 'bg-amber-400',  width: users.length > 0 ? (shopCount / users.length) * 100 : 0 },
                { label: 'Admins',      count: adminCount,  color: 'bg-orange-400', width: users.length > 0 ? (adminCount / users.length) * 100 : 0 },
              ] as const).map(item => (
                <div key={item.label}>
                  <div className="flex justify-between text-xs mb-1.5">
                    <span className="text-gs-muted">{item.label}</span>
                    <span className="font-bold text-gs-text">{item.count} <span className="text-gs-faint font-normal">({item.width.toFixed(0)}%)</span></span>
                  </div>
                  <div className="h-2 bg-gs-surface-2 rounded-full overflow-hidden">
                    <div className={`h-full ${item.color} rounded-full transition-all duration-500`} style={{ width: `${item.width}%` }} />
                  </div>
                </div>
              ))}
            </div>
          </div>

          {ticketStats && (
            <div className="bg-gs-surface border border-gs-border rounded-2xl p-6">
              <h3 className="text-sm font-bold text-gs-text mb-4 flex items-center gap-2">
                <Ticket className="size-4 text-sky-400" /> Support Ticket Health
              </h3>
              <div className="space-y-3">
                {[
                  { label: 'Open',        value: ticketStats.open,        color: 'bg-sky-400',      total: ticketStats.total },
                  { label: 'In Progress', value: ticketStats.in_progress, color: 'bg-amber-400',    total: ticketStats.total },
                  { label: 'Resolved',    value: ticketStats.resolved,    color: 'bg-emerald-400',  total: ticketStats.total },
                  { label: 'Urgent',      value: ticketStats.urgent,      color: 'bg-red-400',      total: ticketStats.total },
                ].map(item => (
                  <div key={item.label}>
                    <div className="flex justify-between text-xs mb-1.5">
                      <span className="text-gs-muted">{item.label}</span>
                      <span className="font-bold text-gs-text">{item.value}</span>
                    </div>
                    <div className="h-2 bg-gs-surface-2 rounded-full overflow-hidden">
                      <div className={`h-full ${item.color} rounded-full transition-all duration-500`} style={{ width: item.total > 0 ? `${(item.value / item.total) * 100}%` : '0%' }} />
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          <div className="md:col-span-2 bg-gs-surface border border-gs-border rounded-2xl p-6">
            <h3 className="text-sm font-bold text-gs-text mb-4 flex items-center gap-2">
              <BarChart3 className="size-4 text-purple-400" /> Quick Moderation Actions
            </h3>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
              <button onClick={() => { setActiveTab('users'); loadUsers(); }} className="flex flex-col items-center gap-2 p-4 rounded-xl border border-gs-border hover:bg-gs-surface-2 hover:border-gs-accent/30 transition-all text-gs-muted hover:text-gs-text">
                <Users className="size-6 text-gs-accent" />
                <span className="text-xs font-semibold">Manage Users</span>
              </button>
              <button onClick={() => setActiveTab('tickets')} className="flex flex-col items-center gap-2 p-4 rounded-xl border border-gs-border hover:bg-gs-surface-2 hover:border-sky-400/30 transition-all text-gs-muted hover:text-gs-text">
                <Ticket className="size-6 text-sky-400" />
                <span className="text-xs font-semibold">View Tickets</span>
                {ticketStats && ticketStats.open > 0 && (
                  <span className="text-[10px] text-red-400 font-bold">{ticketStats.open} pending</span>
                )}
              </button>
              <button onClick={() => setActiveTab('tickets')} className="flex flex-col items-center gap-2 p-4 rounded-xl border border-gs-border hover:bg-gs-surface-2 hover:border-orange-400/30 transition-all text-gs-muted hover:text-gs-text">
                <AlertCircle className="size-6 text-orange-400" />
                <span className="text-xs font-semibold">Urgent Issues</span>
                {ticketStats && <span className="text-[10px] text-orange-400 font-bold">{ticketStats.urgent} urgent</span>}
              </button>
              <button onClick={() => window.open('/community', '_self')} className="flex flex-col items-center gap-2 p-4 rounded-xl border border-gs-border hover:bg-gs-surface-2 hover:border-purple-400/30 transition-all text-gs-muted hover:text-gs-text">
                <MessageSquare className="size-6 text-purple-400" />
                <span className="text-xs font-semibold">Forum</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── USER CONTENT MODAL ── */}
      {contentUser && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-5">
          <div className="bg-gs-surface border border-gs-border rounded-2xl w-full max-w-4xl max-h-[90vh] flex flex-col shadow-2xl overflow-hidden">
            <div className="flex items-center justify-between px-6 py-5 border-b border-gs-border bg-gs-surface-2">
              <div>
                <h3 className="text-base font-bold text-gs-text">Content: {contentUser.username}</h3>
                <p className="text-xs text-gs-muted mt-0.5">{contentUser.email} · {ROLE_LABELS[contentUser.role].label}</p>
              </div>
              <button onClick={() => setContentUser(null)} className="p-2 rounded-xl hover:bg-gs-surface text-gs-faint hover:text-gs-text transition-colors">
                <X className="size-5" />
              </button>
            </div>
            <div className="flex border-b border-gs-border bg-gs-surface-2 px-6 gap-6">
              {(['store', 'forum'] as const).map(t => (
                <button key={t} onClick={() => setContentTab(t)}
                  className={`py-3 text-sm font-semibold border-b-2 transition-colors ${contentTab === t ? 'border-gs-accent text-gs-text' : 'border-transparent text-gs-faint hover:text-gs-text'}`}>
                  {t === 'store' ? `Store Listings (${storeListings.length})` : `Community Posts (${forumPosts.length})`}
                </button>
              ))}
            </div>
            <div className="p-6 overflow-y-auto flex-1">
              {contentLoading ? (
                <div className="text-center py-12 text-gs-faint flex items-center justify-center gap-2">
                  <span className="w-4 h-4 rounded-full border-2 border-gs-border border-t-gs-muted animate-spin" /> Loading…
                </div>
              ) : contentTab === 'store' ? (
                <div className="grid grid-cols-2 gap-4">
                  {storeListings.length === 0 && <p className="text-gs-faint text-sm col-span-2">No store listings.</p>}
                  {storeListings.map(listing => (
                    <div key={listing.id} className="p-4 rounded-xl border border-gs-border bg-gs-surface-2 flex flex-col gap-2">
                      <div className="flex items-start justify-between">
                        <div>
                          <span className="text-[10px] font-bold uppercase text-gs-accent bg-gs-accent/10 px-2 py-0.5 rounded-full">{listing.game}</span>
                          <h4 className="text-sm font-bold text-gs-text mt-1">{listing.item || listing.highlight || listing.type}</h4>
                          <p className="text-xs text-gs-muted">${listing.price.toFixed(2)}</p>
                        </div>
                        <button onClick={() => deleteStoreListing(listing.id)} className="p-1.5 text-gs-faint hover:text-red-400 bg-gs-surface rounded-lg border border-gs-border" title="Delete">
                          <Trash2 className="size-4" />
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="flex flex-col gap-4">
                  {forumPosts.length === 0 && <p className="text-gs-faint text-sm">No forum posts.</p>}
                  {forumPosts.map(post => (
                    <div key={post.id} className="p-4 rounded-xl border border-gs-border bg-gs-surface-2 flex flex-col gap-2">
                      <div className="flex items-start justify-between">
                        <div>
                          <h4 className="text-sm font-bold text-gs-text">{post.title}</h4>
                          <span className="text-xs text-gs-muted">{post.game} · {post.category}</span>
                        </div>
                        <button onClick={() => deleteForumPost(post.id)} className="p-1.5 text-gs-faint hover:text-red-400 bg-gs-surface rounded-lg border border-gs-border" title="Delete">
                          <Trash2 className="size-4" />
                        </button>
                      </div>
                      <p className="text-sm text-gs-text mt-1 whitespace-pre-wrap">{post.body}</p>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* ── TICKET RESPOND MODAL ── */}
      {selectedTicket && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-5">
          <div className="bg-gs-surface border border-gs-border rounded-2xl w-full max-w-2xl shadow-2xl overflow-hidden">
            <div className="flex items-center justify-between px-6 py-5 border-b border-gs-border bg-gs-surface-2">
              <div>
                <h3 className="text-base font-bold text-gs-text">Respond to Ticket #{selectedTicket.id}</h3>
                <p className="text-xs text-gs-muted mt-0.5">{selectedTicket.username} · {selectedTicket.email}</p>
              </div>
              <button onClick={() => setSelectedTicket(null)} className="p-2 rounded-xl hover:bg-gs-surface text-gs-faint hover:text-gs-text transition-colors">
                <X className="size-5" />
              </button>
            </div>

            <div className="p-6 space-y-5">
              <div>
                <p className="text-xs font-semibold text-gs-faint uppercase tracking-wider mb-2">Subject</p>
                <p className="text-sm font-semibold text-gs-text">{selectedTicket.subject}</p>
              </div>
              <div>
                <p className="text-xs font-semibold text-gs-faint uppercase tracking-wider mb-2">User Message</p>
                <p className="text-sm text-gs-muted whitespace-pre-wrap bg-gs-surface-2 p-4 rounded-xl border border-gs-border">{selectedTicket.message}</p>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-xs font-semibold text-gs-faint uppercase tracking-wider block mb-2">Update Status</label>
                  <div className="relative">
                    <select value={ticketStatus} onChange={e => setTicketStatus(e.target.value as TicketStatus)}
                      className="w-full appearance-none bg-gs-surface-2 border border-gs-border rounded-xl px-3 pr-8 py-2.5 text-sm text-gs-text focus:outline-none focus:border-gs-accent/60">
                      <option value="open">Open</option>
                      <option value="in_progress">In Progress</option>
                      <option value="resolved">Resolved</option>
                      <option value="closed">Closed</option>
                    </select>
                    <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 size-3.5 text-gs-faint pointer-events-none" />
                  </div>
                </div>
                <div className="flex items-end">
                  <div className={`w-full px-3 py-2.5 rounded-xl border text-xs font-semibold flex items-center gap-2 ${TICKET_STATUS[ticketStatus].style}`}>
                    {TICKET_STATUS[ticketStatus].icon} {TICKET_STATUS[ticketStatus].label}
                  </div>
                </div>
              </div>

              <div>
                <label className="text-xs font-semibold text-gs-faint uppercase tracking-wider block mb-2">Your Response</label>
                <textarea
                  rows={5}
                  value={ticketResponse}
                  onChange={e => setTicketResponse(e.target.value)}
                  placeholder="Write your support response here..."
                  className="w-full bg-gs-surface-2 border border-gs-border rounded-xl px-4 py-3 text-sm text-gs-text placeholder-gs-faint focus:outline-none focus:border-gs-accent/60 resize-none"
                />
              </div>

              <div className="flex gap-3">
                <button onClick={() => setSelectedTicket(null)} className="flex-1 py-3 rounded-xl border border-gs-border text-gs-muted text-sm font-semibold hover:bg-gs-surface-2 transition-colors">
                  Cancel
                </button>
                <button
                  onClick={handleRespondTicket}
                  disabled={respondingId === selectedTicket.id}
                  className="flex-1 flex items-center justify-center gap-2 py-3 rounded-xl text-white text-sm font-bold hover:opacity-90 transition-opacity disabled:opacity-50"
                  style={{ background: 'var(--gs-accent)' }}
                >
                  <Send className="size-4" />
                  {respondingId === selectedTicket.id ? 'Sending...' : 'Send Response'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
