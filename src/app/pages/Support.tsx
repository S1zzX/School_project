import React, { useState, useEffect, useRef, useMemo } from 'react';
import { Link } from 'react-router';
import {
  Search, Send, Clock, CheckCircle2, AlertCircle,
  ChevronDown, ChevronRight, X, Ticket,
  RefreshCw, HelpCircle, ArrowLeftRight,
  BookOpen, Info, Upload, ImageIcon, Check,
} from 'lucide-react';
import {
  getUser, apiCreateTicket, apiGetMyTickets, apiGetMyTrades,
  apiGetSellerTrades, apiSellerRespondTrade,
  type SupportTicketAPI, type TicketCategory, type TicketPriority, type TicketStatus,
  type TradeRequestAPI, type TradeStatus,
} from '../lib/api';

const CATEGORIES: { value: TicketCategory; label: string }[] = [
  { value: 'general',   label: 'General Inquiry' },
  { value: 'billing',   label: 'Billing & Payments' },
  { value: 'account',   label: 'Account Issues' },
  { value: 'technical', label: 'Technical Support' },
  { value: 'store',     label: 'Store & Orders' },
  { value: 'other',     label: 'Other' },
];

const STATUS_CONFIG: Record<TicketStatus, { label: string; style: string; icon: React.ReactNode }> = {
  open:        { label: 'Open',        style: 'text-sky-600 bg-sky-50 border-sky-200',      icon: <Clock className="size-3" /> },
  in_progress: { label: 'In Progress', style: 'text-amber-600 bg-amber-50 border-amber-200', icon: <RefreshCw className="size-3" /> },
  resolved:    { label: 'Resolved',    style: 'text-emerald-600 bg-emerald-50 border-emerald-200', icon: <CheckCircle2 className="size-3" /> },
  closed:      { label: 'Closed',      style: 'text-slate-500 bg-slate-100 border-slate-200', icon: <X className="size-3" /> },
};

const PRIORITY_STYLE: Record<TicketPriority, string> = {
  low:    'text-slate-500 bg-slate-100 border-slate-200',
  normal: 'text-blue-600 bg-blue-50 border-blue-200',
  high:   'text-orange-600 bg-orange-50 border-orange-200',
  urgent: 'text-red-600 bg-red-50 border-red-200',
};

const TRADE_STATUS_CONFIG: Record<TradeStatus, { label: string; style: string; icon: React.ReactNode; desc: string }> = {
  pending:         { label: 'Awaiting Seller',   style: 'text-amber-600 bg-amber-50 border-amber-200',  icon: <Clock className="size-3" />,         desc: 'Your request was sent to the seller. Waiting for them to accept and upload proof.' },
  seller_accepted: { label: 'Seller Accepted',   style: 'text-blue-600 bg-blue-50 border-blue-200',    icon: <CheckCircle2 className="size-3" />,  desc: 'The seller accepted and uploaded proof. Admin is now reviewing it.' },
  seller_declined: { label: 'Seller Declined',   style: 'text-red-600 bg-red-50 border-red-200',     icon: <X className="size-3" />,             desc: 'The seller declined your trade request. Contact support if you need help.' },
  verified:        { label: 'Verified',        style: 'text-sky-600 bg-sky-50 border-sky-200',     icon: <CheckCircle2 className="size-3" />,  desc: 'Admin confirmed the item is legitimate. You may proceed with the trade.' },
  completed:       { label: 'Completed',       style: 'text-emerald-600 bg-emerald-50 border-emerald-200', icon: <CheckCircle2 className="size-3" />, desc: 'Trade completed successfully. Item has been delivered.' },
  rejected:        { label: 'Rejected',        style: 'text-red-600 bg-red-50 border-red-200',     icon: <X className="size-3" />,             desc: 'Admin rejected this trade. The listing may be fraudulent. Do not proceed.' },
};

type Article = { q: string; a: string };
type TopicGroup = { id: string; title: string; description: string; articles: Article[] };

const TOPIC_GROUPS: TopicGroup[] = [
  {
    id: 'getting-started',
    title: 'Getting Started',
    description: 'Learn how to create an account, browse the store, and complete your first purchase.',
    articles: [
      { q: 'How do I create an account?', a: 'Click Register in the header, choose Gamer or Shop Owner, and fill in your details. You can sign in anytime from the login page.' },
      { q: 'How do I purchase a game key or account?', a: 'Browse the Store or dashboard deals, open a listing, add it to your cart, then complete checkout from the Cart page.' },
      { q: 'What games are supported?', a: 'League of Legends, CS2, and Valorant are supported today. More titles are added regularly — check the Community forum for updates.' },
      { q: 'Where is my purchase history?', a: 'Open Purchase History from your account menu to see past orders, keys, and download details.' },
    ],
  },
  {
    id: 'store',
    title: 'Player Store',
    description: 'Buying keys, accounts, skins, stock status, and seller listings.',
    articles: [
      { q: 'Are listings verified?', a: 'Shop owners are verified before listing. Admins review flagged content. Always check seller ratings and stock before buying.' },
      { q: 'How does stock work?', a: 'Each listing shows remaining stock and completed orders. Stock decreases automatically when someone purchases a non-skin item.' },
      { q: 'Can I sell my own items?', a: 'Register as a Shop Owner or ask an Admin to upgrade your account. Then use the Shop Dashboard to manage your stock and listings.' },
    ],
  },
  {
    id: 'trades',
    title: 'Skin Trades',
    description: 'Middleman trades, seller proof, admin approval, and tracking status.',
    articles: [
      { q: 'Why do skin purchases need admin approval?', a: 'Skins use an escrow flow to reduce scams. The seller must upload proof, then an admin verifies before the trade completes.' },
      { q: 'How do I track my trade?', a: 'After requesting a trade, open Support → My Trades (or use the link from checkout) to see each step: seller response, admin review, and completion.' },
      { q: 'What if a seller declines?', a: 'You will see the decline reason in My Trades. Open a support ticket if you believe the listing was misleading.' },
    ],
  },
  {
    id: 'billing',
    title: 'Billing & Refunds',
    description: 'Payments, refunds, invoices, and billing-related issues.',
    articles: [
      { q: 'Can I get a refund?', a: 'Refunds are reviewed case by case. Submit a Billing ticket with your order ID and reason — we respond within 24 hours.' },
      { q: 'My payment failed but I was charged', a: 'Include your transaction reference in a Billing ticket. Do not repeat checkout until support confirms the status.' },
    ],
  },
  {
    id: 'account',
    title: 'Account & Roles',
    description: 'Login issues, passwords, gamer vs shop owner roles, and settings.',
    articles: [
      { q: 'How do I become a shop owner?', a: 'Register with the Shop Owner role, or ask an Admin to upgrade your existing account from Settings or the Admin panel.' },
      { q: 'I forgot my password', a: 'Use the reset flow on the login page. If you still cannot access your account, submit an Account ticket with your registered email.' },
    ],
  },
  {
    id: 'faq',
    title: 'FAQs',
    description: 'Quick answers to the most common questions from our community.',
    articles: [
      { q: 'How fast does support respond?', a: 'Urgent tickets: ~2 hours. High: ~12 hours. Normal: ~24 hours. Low priority: ~48 hours.' },
      { q: 'Is my ticket private?', a: 'Yes. Only you and the support team can see your ticket details and admin responses.' },
      { q: 'Can I edit a submitted ticket?', a: 'You cannot edit after submission, but you can reply with a new ticket referencing the original ticket ID.' },
    ],
  },
];

const FEATURED = [
  {
    id: 'essentials',
    title: 'GameGuide Essentials',
    icon: <BookOpen className="size-7 text-slate-400" strokeWidth={1.5} />,
    topicIds: ['getting-started', 'store'],
  },
  {
    id: 'good-to-know',
    title: 'Good to know',
    icon: <Info className="size-7 text-slate-400" strokeWidth={1.5} />,
    topicIds: ['trades', 'billing', 'faq'],
  },
];

type PageView = 'home' | 'submit' | 'tickets' | 'trades' | 'topic';

function articlesForTopicIds(ids: string[]) {
  return TOPIC_GROUPS.filter(g => ids.includes(g.id));
}

export function Support() {
  const user = getUser();
  const urlTab = new URLSearchParams(window.location.search).get('tab');
  const initialView: PageView =
    urlTab === 'trades'  ? 'trades'  :
    urlTab === 'tickets' ? 'tickets' :
    urlTab === 'submit'  ? 'submit'  : 'home';

  const [pageView, setPageView] = useState<PageView>(initialView);
  const [activeTopicId, setActiveTopicId] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const searchRef = useRef<HTMLInputElement>(null);

  const [tickets, setTickets] = useState<SupportTicketAPI[]>([]);
  const [ticketsLoading, setTicketsLoading] = useState(false);
  const [selectedTicket, setSelectedTicket] = useState<SupportTicketAPI | null>(null);
  const [submitted, setSubmitted] = useState(false);

  const [trades, setTrades] = useState<TradeRequestAPI[]>([]);
  const [tradesLoading, setTradesLoading] = useState(false);
  const [selectedTrade, setSelectedTrade] = useState<TradeRequestAPI | null>(null);
  const [tradeModal, setTradeModal] = useState<TradeRequestAPI | null>(null);
  const [tradeAction, setTradeAction] = useState<'accepted' | 'declined' | null>(null);
  const [tradeNote, setTradeNote] = useState('');
  const [proofImage, setProofImage] = useState<string | null>(null);
  const [tradeSubmitting, setTradeSubmitting] = useState(false);
  const [tradeError, setTradeError] = useState('');
  const tradeFileRef = useRef<HTMLInputElement>(null);

  const isSellerView = user?.role === 'shop_owner' || user?.role === 'admin';

  const [form, setForm] = useState({
    username: user?.username ?? '',
    email:    user?.email ?? '',
    subject:  '',
    message:  '',
    category: 'general' as TicketCategory,
    priority: 'normal'  as TicketPriority,
  });
  const [formError, setFormError] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const filteredTopics = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    if (!q) return TOPIC_GROUPS;
    return TOPIC_GROUPS.filter(group =>
      group.title.toLowerCase().includes(q) ||
      group.description.toLowerCase().includes(q) ||
      group.articles.some(a => a.q.toLowerCase().includes(q) || a.a.toLowerCase().includes(q))
    );
  }, [searchQuery]);

  const activeTopic = TOPIC_GROUPS.find(g => g.id === activeTopicId) ?? null;

  const loadTickets = async () => {
    if (!user) return;
    setTicketsLoading(true);
    try { setTickets(await apiGetMyTickets()); }
    catch { /* ignore */ }
    finally { setTicketsLoading(false); }
  };

  const loadTrades = async () => {
    if (!user) return;
    setTradesLoading(true);
    try {
      setTrades(isSellerView ? await apiGetSellerTrades() : await apiGetMyTrades());
    } catch { /* ignore */ }
    finally { setTradesLoading(false); }
  };

  const openTradeModal = (trade: TradeRequestAPI, action: 'accepted' | 'declined') => {
    setTradeModal(trade);
    setTradeAction(action);
    setTradeNote('');
    setProofImage(null);
    setTradeError('');
  };

  const handleProofImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (ev) => setProofImage(ev.target?.result as string);
    reader.readAsDataURL(file);
  };

  const handleTradeRespond = async () => {
    if (!tradeModal || !tradeAction) return;
    if (tradeAction === 'accepted' && !proofImage) {
      setTradeError('Please upload a proof screenshot before accepting.');
      return;
    }
    setTradeSubmitting(true);
    setTradeError('');
    try {
      await apiSellerRespondTrade(tradeModal.id, {
        seller_status: tradeAction,
        seller_note: tradeNote || undefined,
        proof_image: proofImage,
      });
      window.dispatchEvent(new Event('notifications_updated'));
      await loadTrades();
      setTradeModal(null);
    } catch (err) {
      setTradeError(err instanceof Error ? err.message : 'Failed to respond to trade.');
    } finally {
      setTradeSubmitting(false);
    }
  };

  useEffect(() => {
    if (pageView === 'tickets') loadTickets();
    if (pageView === 'trades')  loadTrades();
  }, [pageView]);

  const handleSubmit = async () => {
    setFormError('');
    if (!form.username || !form.email || !form.subject || !form.message) {
      setFormError('Please fill in all required fields.');
      return;
    }
    setSubmitting(true);
    try {
      await apiCreateTicket(form);
      setSubmitted(true);
      setForm(prev => ({ ...prev, subject: '', message: '', category: 'general', priority: 'normal' }));
    } catch (e: unknown) {
      setFormError(e instanceof Error ? e.message : 'Failed to submit ticket.');
    } finally {
      setSubmitting(false);
    }
  };

  const goHome = () => { setPageView('home'); setActiveTopicId(null); setSubmitted(false); };
  const openTopic = (id: string) => { setActiveTopicId(id); setPageView('topic'); };

  return (
    <div className="min-h-screen" style={{ background: '#f4f6f9' }}>

      {/* ── Help center bar (no logo/sign-in — already in site header) ── */}
      <div className="bg-white border-b border-slate-200">
        <div className="max-w-5xl mx-auto px-5 h-11 flex items-center justify-between">
          <button
            onClick={goHome}
            className="text-sm font-semibold text-slate-700 hover:text-blue-600 transition-colors"
          >
            Help Center
          </button>
          <div className="flex items-center gap-4 text-sm">
            <button
              onClick={() => setPageView('submit')}
              className="text-slate-600 hover:text-slate-900 transition-colors"
            >
              Submit a request
            </button>
            {user && (
              <>
                <button onClick={() => setPageView('tickets')} className="text-slate-600 hover:text-slate-900 transition-colors hidden sm:inline">
                  My tickets
                </button>
                <button onClick={() => setPageView('trades')} className="text-slate-600 hover:text-slate-900 transition-colors hidden sm:inline">
                  My trades
                </button>
              </>
            )}
          </div>
        </div>
      </div>

      {/* ── HOME ── */}
      {pageView === 'home' && (
        <>
          {/* Hero */}
          <section
            className="px-5 py-14"
            style={{
              background: 'linear-gradient(90deg, #ffb347 0%, #ff6b9d 35%, #c084fc 55%, #38bdf8 100%)',
            }}
          >
            <div className="max-w-2xl mx-auto text-center">
              <h1 className="text-3xl sm:text-4xl font-bold text-slate-900 mb-6 tracking-tight">
                How can we help?
              </h1>
              <div className="relative">
                <Search className="absolute left-4 top-1/2 -translate-y-1/2 size-5 text-slate-400" />
                <input
                  ref={searchRef}
                  type="text"
                  value={searchQuery}
                  onChange={e => setSearchQuery(e.target.value)}
                  placeholder="Search"
                  className="w-full pl-12 pr-4 py-3.5 rounded-md bg-white text-slate-800 placeholder-slate-400 text-base shadow-sm border border-white/80 focus:outline-none focus:ring-2 focus:ring-blue-400/40"
                />
              </div>
            </div>
          </section>

          <div className="max-w-5xl mx-auto px-5 py-10 space-y-12">

            {/* Featured cards — hide when searching */}
            {!searchQuery.trim() && (
              <div className="grid sm:grid-cols-2 gap-5">
                {FEATURED.map(card => {
                  const groups = articlesForTopicIds(card.topicIds);
                  const count = groups.reduce((n, g) => n + g.articles.length, 0);
                  return (
                    <button
                      key={card.id}
                      onClick={() => openTopic(card.topicIds[0])}
                      className="bg-white rounded-lg border border-slate-200 p-8 text-left shadow-sm hover:shadow-md hover:border-slate-300 transition-all group"
                    >
                      <div className="mb-5">{card.icon}</div>
                      <h2 className="text-lg font-bold text-slate-800 mb-4">{card.title}</h2>
                      <span className="text-sm font-medium text-blue-600 group-hover:underline inline-flex items-center gap-0.5">
                        See all {count} articles <ChevronRight className="size-4" />
                      </span>
                    </button>
                  );
                })}
              </div>
            )}

            {/* Common topics */}
            <div>
              <h2 className="text-2xl font-bold text-slate-800 mb-8">
                {searchQuery.trim() ? 'Search results' : 'Common Topics'}
              </h2>
              {filteredTopics.length === 0 ? (
                <p className="text-slate-500 text-sm">No articles match your search. Try different keywords or submit a request.</p>
              ) : (
                <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-x-10 gap-y-10">
                  {filteredTopics.map(topic => (
                    <div key={topic.id} className="space-y-2">
                      <h3 className="text-base font-bold text-slate-800">{topic.title}</h3>
                      <p className="text-sm text-slate-500 leading-relaxed min-h-[2.5rem]">{topic.description}</p>
                      <button
                        onClick={() => openTopic(topic.id)}
                        className="text-sm font-medium text-blue-600 hover:underline inline-flex items-center gap-0.5 pt-1"
                      >
                        See all {topic.articles.length} article{topic.articles.length !== 1 ? 's' : ''} <ChevronRight className="size-4" />
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Quick actions row */}
            {user && (
              <div className="flex flex-wrap gap-3 pt-2 border-t border-slate-200">
                <QuickLink icon={<Ticket className="size-4" />} label="My tickets" onClick={() => setPageView('tickets')} />
                <QuickLink icon={<ArrowLeftRight className="size-4" />} label="My trades" onClick={() => setPageView('trades')} />
                <QuickLink icon={<Send className="size-4" />} label="Submit a request" onClick={() => setPageView('submit')} />
              </div>
            )}
          </div>
        </>
      )}

      {/* ── TOPIC ARTICLES ── */}
      {pageView === 'topic' && activeTopic && (
        <div className="max-w-3xl mx-auto px-5 py-10">
          <BackLink onClick={goHome} label="Help Center" />
          <h1 className="text-2xl font-bold text-slate-800 mt-4 mb-2">{activeTopic.title}</h1>
          <p className="text-slate-500 text-sm mb-8">{activeTopic.description}</p>
          <div className="space-y-0 divide-y divide-slate-200 bg-white rounded-lg border border-slate-200 overflow-hidden">
            {activeTopic.articles.map((item, i) => (
              <FAQItem key={i} q={item.q} a={item.a} />
            ))}
          </div>
          <div className="mt-8 p-6 bg-white rounded-lg border border-slate-200 text-center">
            <p className="text-sm text-slate-500 mb-3">Still need help?</p>
            <button
              onClick={() => setPageView('submit')}
              className="px-5 py-2.5 rounded-md text-sm font-semibold text-white bg-blue-600 hover:bg-blue-700 transition-colors"
            >
              Submit a request
            </button>
          </div>
        </div>
      )}

      {/* ── SUBMIT TICKET ── */}
      {pageView === 'submit' && (
        <div className="max-w-3xl mx-auto px-5 py-10">
          <BackLink onClick={goHome} label="Help Center" />
          {submitted ? (
            <div className="mt-8 bg-white rounded-lg border border-slate-200 p-10 text-center">
              <CheckCircle2 className="size-12 text-emerald-500 mx-auto mb-4" />
              <h2 className="text-xl font-bold text-slate-800 mb-2">Request submitted</h2>
              <p className="text-slate-500 text-sm mb-6">Our team will review your message and get back to you soon.</p>
              <div className="flex justify-center gap-3">
                <button onClick={() => setSubmitted(false)} className="px-4 py-2 rounded-md border border-slate-200 text-sm text-slate-600 hover:bg-slate-50">
                  Submit another
                </button>
                {user && (
                  <button onClick={() => { setPageView('tickets'); setSubmitted(false); }} className="px-4 py-2 rounded-md text-sm font-semibold text-white bg-blue-600 hover:bg-blue-700">
                    View my tickets
                  </button>
                )}
              </div>
            </div>
          ) : (
            <div className="mt-6 bg-white rounded-lg border border-slate-200 p-6 sm:p-8 space-y-5">
              <div>
                <h1 className="text-xl font-bold text-slate-800">Submit a request</h1>
                <p className="text-sm text-slate-500 mt-1">Describe your issue and we will respond by email.</p>
              </div>

              {formError && (
                <div className="flex items-center gap-2 px-3 py-2.5 rounded-md border border-red-200 bg-red-50 text-red-700 text-sm">
                  <AlertCircle className="size-4 shrink-0" />{formError}
                </div>
              )}

              <div className="grid sm:grid-cols-2 gap-4">
                <Field label="Your name *">
                  <input value={form.username} onChange={e => setForm(p => ({ ...p, username: e.target.value }))} readOnly={!!user}
                    className={inputCls} placeholder="Username" />
                </Field>
                <Field label="Email *">
                  <input type="email" value={form.email} onChange={e => setForm(p => ({ ...p, email: e.target.value }))} readOnly={!!user}
                    className={inputCls} placeholder="you@email.com" />
                </Field>
              </div>

              <div className="grid sm:grid-cols-2 gap-4">
                <Field label="Category *">
                  <select value={form.category} onChange={e => setForm(p => ({ ...p, category: e.target.value as TicketCategory }))} className={inputCls}>
                    {CATEGORIES.map(c => <option key={c.value} value={c.value}>{c.label}</option>)}
                  </select>
                </Field>
                <Field label="Priority">
                  <select value={form.priority} onChange={e => setForm(p => ({ ...p, priority: e.target.value as TicketPriority }))} className={inputCls}>
                    <option value="low">Low</option>
                    <option value="normal">Normal</option>
                    <option value="high">High</option>
                    <option value="urgent">Urgent</option>
                  </select>
                </Field>
              </div>

              <Field label="Subject *">
                <input value={form.subject} onChange={e => setForm(p => ({ ...p, subject: e.target.value }))}
                  className={inputCls} placeholder="Brief summary of your issue" />
              </Field>

              <Field label="Message *">
                <textarea rows={5} value={form.message} onChange={e => setForm(p => ({ ...p, message: e.target.value }))}
                  className={`${inputCls} resize-none`}
                  placeholder="Include order IDs, screenshots, or steps to reproduce if relevant..." />
              </Field>

              <button onClick={handleSubmit} disabled={submitting}
                className="w-full flex items-center justify-center gap-2 py-3 rounded-md text-sm font-semibold text-white bg-blue-600 hover:bg-blue-700 disabled:opacity-50 transition-colors">
                <Send className="size-4" />
                {submitting ? 'Sending…' : 'Submit request'}
              </button>
            </div>
          )}
        </div>
      )}

      {/* ── MY TICKETS ── */}
      {pageView === 'tickets' && (
        <div className="max-w-3xl mx-auto px-5 py-10">
          <BackLink onClick={goHome} label="Help Center" />
          <div className="flex items-center justify-between mt-4 mb-6">
            <h1 className="text-xl font-bold text-slate-800">My tickets</h1>
            <button onClick={loadTickets} className="text-xs text-slate-500 hover:text-slate-800 flex items-center gap-1">
              <RefreshCw className="size-3.5" /> Refresh
            </button>
          </div>

          {!user ? (
            <EmptyState message="Sign in to view your tickets." action={<Link to="/login" className="text-blue-600 text-sm font-medium hover:underline">Sign in</Link>} />
          ) : ticketsLoading ? (
            <LoadingState />
          ) : tickets.length === 0 ? (
            <EmptyState
              message="No tickets yet."
              action={
                <button onClick={() => setPageView('submit')} className="text-blue-600 text-sm font-medium hover:underline">
                  Submit a request
                </button>
              }
            />
          ) : (
            <div className="space-y-3">
              {tickets.map(ticket => (
                <div key={ticket.id} onClick={() => setSelectedTicket(t => t?.id === ticket.id ? null : ticket)}
                  className="bg-white border border-slate-200 rounded-lg p-4 cursor-pointer hover:border-blue-300 transition-colors">
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <div className="flex flex-wrap gap-1.5 mb-1.5">
                        <Badge cfg={STATUS_CONFIG[ticket.status]} />
                        <span className={`text-[10px] px-2 py-0.5 rounded border font-medium ${PRIORITY_STYLE[ticket.priority]}`}>{ticket.priority}</span>
                      </div>
                      <p className="text-sm font-semibold text-slate-800 truncate">{ticket.subject}</p>
                      <p className="text-xs text-slate-400 mt-0.5">#{ticket.id} · {new Date(ticket.created_at).toLocaleDateString()}</p>
                    </div>
                    <ChevronDown className={`size-4 text-slate-400 shrink-0 transition-transform ${selectedTicket?.id === ticket.id ? 'rotate-180' : ''}`} />
                  </div>
                  {selectedTicket?.id === ticket.id && (
                    <div className="mt-4 pt-4 border-t border-slate-100 space-y-3" onClick={e => e.stopPropagation()}>
                      <Block label="Your message" text={ticket.message} />
                      {ticket.admin_response && (
                        <Block label="Support response" text={ticket.admin_response} highlight />
                      )}
                      <p className="text-xs text-slate-400">Updated {new Date(ticket.updated_at).toLocaleString()}</p>
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* ── MY TRADES ── */}
      {pageView === 'trades' && (
        <div className="max-w-3xl mx-auto px-5 py-10">
          <BackLink onClick={goHome} label="Help Center" />
          <div className="flex items-center justify-between mt-4 mb-6">
            <div>
              <h1 className="text-xl font-bold text-slate-800">{isSellerView ? 'Incoming trade requests' : 'My trades'}</h1>
              {isSellerView && (
                <p className="text-xs text-slate-500 mt-0.5">Accept skin trades and upload proof for admin review.</p>
              )}
            </div>
            <button onClick={loadTrades} className="text-xs text-slate-500 hover:text-slate-800 flex items-center gap-1">
              <RefreshCw className="size-3.5" /> Refresh
            </button>
          </div>

          {!user ? (
            <EmptyState message="Sign in to track skin trades." action={<Link to="/login" className="text-blue-600 text-sm font-medium hover:underline">Sign in</Link>} />
          ) : tradesLoading ? (
            <LoadingState />
          ) : trades.length === 0 ? (
            <EmptyState message={isSellerView ? 'No trade requests yet. Buyers request trades from your skin listings in the Store.' : 'No trade requests yet. Skin purchases from the Store appear here.'} />
          ) : (
            <div className="space-y-3">
              {trades.map(trade => {
                const cfg = TRADE_STATUS_CONFIG[trade.status];
                const isOpen = selectedTrade?.id === trade.id;
                const isPending = trade.status === 'pending';
                return (
                  <div key={trade.id} onClick={() => !isSellerView && setSelectedTrade(t => t?.id === trade.id ? null : trade)}
                    className={`bg-white border border-slate-200 rounded-lg p-4 ${isSellerView ? '' : 'cursor-pointer hover:border-blue-300'} transition-colors`}>
                    <div className="flex items-start justify-between gap-3">
                      <div className="min-w-0">
                        <span className={`inline-flex items-center gap-1 text-[10px] px-2 py-0.5 rounded border font-medium mb-1.5 ${cfg.style}`}>
                          {cfg.icon} {cfg.label}
                        </span>
                        <p className="text-sm font-semibold text-slate-800 truncate">{trade.item_name}</p>
                        <p className="text-xs text-slate-400 mt-0.5">
                          #{trade.id} · {trade.game} · ${trade.price.toFixed(2)}
                          {isSellerView && trade.buyer_username ? ` · Buyer: ${trade.buyer_username}` : ''}
                        </p>
                      </div>
                      {!isSellerView && <ChevronDown className={`size-4 text-slate-400 shrink-0 transition-transform ${isOpen ? 'rotate-180' : ''}`} />}
                    </div>

                    {isSellerView && trade.proof_image && (
                      <div className="mt-3 rounded-lg overflow-hidden border border-slate-200 max-w-xs">
                        <p className="text-xs text-slate-400 px-2 pt-2">Submitted proof:</p>
                        <img src={trade.proof_image} alt="Trade proof" className="w-full max-h-48 object-contain p-2" />
                      </div>
                    )}

                    {isSellerView && isPending && (
                      <div className="flex gap-2 mt-3 pt-3 border-t border-slate-100">
                        <button
                          onClick={() => openTradeModal(trade, 'accepted')}
                          className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-emerald-50 border border-emerald-200 text-emerald-700 text-xs font-bold hover:bg-emerald-100"
                        >
                          <Check className="size-3.5" /> Accept & Upload Proof
                        </button>
                        <button
                          onClick={() => openTradeModal(trade, 'declined')}
                          className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-red-50 border border-red-200 text-red-600 text-xs font-bold hover:bg-red-100"
                        >
                          <X className="size-3.5" /> Decline
                        </button>
                      </div>
                    )}

                    {!isSellerView && isOpen && (
                      <div className="mt-4 pt-4 border-t border-slate-100 space-y-3">
                        <p className="text-sm text-slate-600 bg-slate-50 rounded-md p-3 border border-slate-100">{cfg.desc}</p>
                        {trade.admin_note && (
                          <Block label="Admin note" text={trade.admin_note} highlight />
                        )}
                        {(trade.status === 'rejected' || trade.status === 'seller_declined') && (
                          <button onClick={e => { e.stopPropagation(); setPageView('submit'); }}
                            className="text-sm text-blue-600 hover:underline">
                            Open a support ticket
                          </button>
                        )}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* Seller trade respond modal */}
      {tradeModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
          <div className="bg-white border border-slate-200 rounded-2xl w-full max-w-md shadow-2xl">
            <div className="flex items-center justify-between px-6 py-4 border-b border-slate-200">
              <h3 className="text-base font-bold text-slate-800">
                {tradeAction === 'accepted' ? 'Accept trade & upload proof' : 'Decline trade request'}
              </h3>
              <button onClick={() => setTradeModal(null)} className="text-slate-400 hover:text-slate-700 p-1.5 rounded-lg hover:bg-slate-100">
                <X className="size-5" />
              </button>
            </div>
            <div className="p-6 space-y-4">
              <div className="p-3 rounded-xl bg-slate-50 border border-slate-200 space-y-1">
                <p className="text-sm font-bold text-slate-800">{tradeModal.item_name}</p>
                <p className="text-xs text-slate-500">Buyer: {tradeModal.buyer_username} · ${tradeModal.price.toFixed(2)}</p>
              </div>

              {tradeAction === 'accepted' && (
                <div>
                  <label className="text-xs text-slate-600 block mb-2 font-semibold flex items-center gap-1.5">
                    <ImageIcon className="size-3.5" /> Proof screenshot <span className="text-red-500">*</span>
                  </label>
                  <input type="file" accept="image/*" ref={tradeFileRef} onChange={handleProofImageUpload} className="hidden" />
                  {proofImage ? (
                    <div className="relative rounded-lg overflow-hidden border border-emerald-300">
                      <img src={proofImage} alt="Proof" className="w-full max-h-48 object-contain" />
                      <button onClick={() => setProofImage(null)} className="absolute top-2 right-2 bg-black/60 rounded-full p-1 text-white">
                        <X className="size-3" />
                      </button>
                    </div>
                  ) : (
                    <button
                      onClick={() => tradeFileRef.current?.click()}
                      className="w-full flex flex-col items-center gap-2 py-6 border-2 border-dashed border-slate-200 rounded-xl text-slate-400 hover:border-blue-300 hover:text-slate-600"
                    >
                      <Upload className="size-6" />
                      <span className="text-xs">Click to upload screenshot</span>
                    </button>
                  )}
                </div>
              )}

              <div>
                <label className="text-xs text-slate-600 block mb-1.5 font-semibold">
                  {tradeAction === 'accepted' ? 'Note to admin (optional)' : 'Reason for declining'}
                </label>
                <textarea
                  value={tradeNote}
                  onChange={e => setTradeNote(e.target.value)}
                  rows={3}
                  className={inputCls + ' resize-none'}
                  placeholder={tradeAction === 'accepted' ? 'Any extra info for the admin…' : 'Why are you declining?'}
                />
              </div>

              {tradeError && (
                <div className="flex items-center gap-2 px-3 py-2 rounded-lg border border-red-200 bg-red-50 text-red-600 text-sm">
                  <AlertCircle className="size-4 shrink-0" />{tradeError}
                </div>
              )}

              <div className="flex gap-3 pt-2">
                <button onClick={() => setTradeModal(null)} className="flex-1 py-2.5 rounded-xl border border-slate-200 text-slate-600 text-sm font-semibold hover:bg-slate-50">
                  Cancel
                </button>
                <button
                  onClick={handleTradeRespond}
                  disabled={tradeSubmitting}
                  className={`flex-1 py-2.5 rounded-xl text-white text-sm font-bold disabled:opacity-50 ${
                    tradeAction === 'accepted' ? 'bg-emerald-600 hover:bg-emerald-500' : 'bg-red-600 hover:bg-red-500'
                  }`}
                >
                  {tradeSubmitting ? 'Submitting…' : tradeAction === 'accepted' ? 'Submit proof' : 'Confirm decline'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

/* ── Small UI helpers ── */

const inputCls = 'w-full bg-white border border-slate-200 rounded-md px-3 py-2.5 text-sm text-slate-800 placeholder-slate-400 focus:outline-none focus:border-blue-400 focus:ring-1 focus:ring-blue-400/30';

function BackLink({ onClick, label }: { onClick: () => void; label: string }) {
  return (
    <button onClick={onClick} className="text-sm text-blue-600 hover:underline inline-flex items-center gap-1">
      ← {label}
    </button>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <label className="text-xs font-medium text-slate-600 block mb-1.5">{label}</label>
      {children}
    </div>
  );
}

function QuickLink({ icon, label, onClick }: { icon: React.ReactNode; label: string; onClick: () => void }) {
  return (
    <button onClick={onClick} className="inline-flex items-center gap-2 px-4 py-2 rounded-md bg-white border border-slate-200 text-sm text-slate-600 hover:border-blue-300 hover:text-blue-700 transition-colors">
      {icon}{label}
    </button>
  );
}

function LoadingState() {
  return (
    <div className="flex items-center justify-center py-16 gap-2 text-slate-400 text-sm">
      <span className="w-4 h-4 rounded-full border-2 border-slate-200 border-t-blue-500 animate-spin" />
      Loading…
    </div>
  );
}

function EmptyState({ message, action }: { message: string; action?: React.ReactNode }) {
  return (
    <div className="bg-white rounded-lg border border-slate-200 p-10 text-center">
      <HelpCircle className="size-10 text-slate-300 mx-auto mb-3" />
      <p className="text-sm text-slate-500 mb-2">{message}</p>
      {action}
    </div>
  );
}

function Badge({ cfg }: { cfg: { label: string; style: string; icon: React.ReactNode } }) {
  return (
    <span className={`inline-flex items-center gap-1 text-[10px] px-2 py-0.5 rounded border font-medium ${cfg.style}`}>
      {cfg.icon}{cfg.label}
    </span>
  );
}

function Block({ label, text, highlight }: { label: string; text: string; highlight?: boolean }) {
  return (
    <div>
      <p className={`text-xs font-semibold mb-1.5 ${highlight ? 'text-blue-600' : 'text-slate-500'}`}>{label}</p>
      <p className={`text-sm whitespace-pre-wrap rounded-md p-3 border ${highlight ? 'bg-blue-50 border-blue-100 text-slate-700' : 'bg-slate-50 border-slate-100 text-slate-700'}`}>
        {text}
      </p>
    </div>
  );
}

function FAQItem({ q, a }: { q: string; a: string }) {
  const [open, setOpen] = useState(false);
  return (
    <div className="bg-white">
      <button
        onClick={() => setOpen(o => !o)}
        className="w-full flex items-center justify-between gap-4 px-5 py-4 text-left text-sm font-medium text-slate-800 hover:bg-slate-50 transition-colors"
      >
        {q}
        <ChevronDown className={`size-4 text-slate-400 shrink-0 transition-transform ${open ? 'rotate-180' : ''}`} />
      </button>
      {open && (
        <div className="px-5 pb-4 text-sm text-slate-600 leading-relaxed border-t border-slate-100 pt-3 bg-slate-50/50">
          {a}
        </div>
      )}
    </div>
  );
}
