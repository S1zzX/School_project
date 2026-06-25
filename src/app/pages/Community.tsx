import { useState, useEffect } from 'react';
import {
  ThumbsUp, Plus, X, Trash2, LogIn, Edit2, ChevronRight,
  ArrowLeft, Crown, Loader2, Send,
} from 'lucide-react';
import { useNavigate, useSearchParams } from 'react-router';
import {
  apiGetForum, apiGetForumPost, apiCreatePost, apiEditPost, apiLikePost, apiDeletePost,
  apiAdminDeleteForumPost, apiAdminEditForumPost,
  apiGetPostReplies, apiCreateReply, apiDeleteReply,
  ForumPostAPI, ForumReplyAPI, getUser, type UserRole,
} from '../lib/api';

const CATEGORIES = ['All', 'Tips & Tricks', 'Loadouts', 'Clips', 'Discussion'];
const GAMES      = ['League of Legends', 'CS2', 'Valorant'];

function timeAgo(iso: string): string {
  const diff = Date.now() - new Date(iso).getTime();
  const m = Math.floor(diff / 60000);
  if (m < 1)  return 'just now';
  if (m < 60) return `${m} minute${m === 1 ? '' : 's'} ago`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h} hour${h === 1 ? '' : 's'} ago`;
  const d = Math.floor(h / 24);
  if (d < 7) return `${d} day${d === 1 ? '' : 's'} ago`;
  return formatThreadDate(iso);
}

function formatThreadDate(iso: string): string {
  const d = new Date(iso);
  const date = d.toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' });
  const time = d.toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit', hour12: false });
  return `${date} ${time}`;
}

function initials(name: string) {
  return name.slice(0, 2).toUpperCase();
}

const AVATAR_COLORS = [
  'bg-violet-500/25 text-violet-300',
  'bg-yellow-500/25 text-yellow-300',
  'bg-orange-500/25 text-orange-300',
  'bg-sky-500/25 text-sky-300',
  'bg-zinc-500/25 text-zinc-300',
  'bg-blue-500/25 text-blue-300',
  'bg-emerald-500/25 text-emerald-300',
  'bg-pink-500/25 text-pink-300',
];

function avatarColor(name: string) {
  let h = 0;
  for (const c of name) h = (h * 31 + c.charCodeAt(0)) & 0xffff;
  return AVATAR_COLORS[h % AVATAR_COLORS.length];
}

function usernameColor(role?: UserRole): string {
  if (role === 'admin') return '#84cc16';
  if (role === 'shop_owner') return '#facc15';
  return 'var(--gs-accent)';
}

function AdminBadge() {
  return (
    <span className="inline-flex items-center gap-0.5 text-[9px] px-1.5 py-0.5 rounded font-bold uppercase bg-amber-400/15 text-amber-400 border border-amber-400/35">
      <Crown className="size-2.5 shrink-0" strokeWidth={2.5} />
      Admin
    </span>
  );
}

function ThreadAvatar({ name, image, size = 'md' }: { name: string; image?: string | null; size?: 'sm' | 'md' | 'lg' }) {
  const dim = size === 'lg' ? 'w-12 h-12 text-sm' : size === 'sm' ? 'w-8 h-8 text-[9px]' : 'w-10 h-10 text-[10px]';
  if (image) {
    return (
      <img src={image} alt="" className={`${dim} rounded object-cover shrink-0 border border-gs-border`} />
    );
  }
  return (
    <div className={`${dim} rounded flex items-center justify-center shrink-0 ${avatarColor(name)}`} style={{ fontWeight: 700 }}>
      {initials(name)}
    </div>
  );
}

export function Community() {
  const navigate  = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const user      = getUser();

  const [posts, setPosts]             = useState<ForumPostAPI[]>([]);
  const [loading, setLoading]         = useState(true);
  const [activeTab, setActiveTab]     = useState('All');
  const [selectedPost, setSelectedPost] = useState<ForumPostAPI | null>(null);
  const [threadReplies, setThreadReplies] = useState<ForumReplyAPI[]>([]);
  const [threadLoading, setThreadLoading] = useState(false);
  const [replyDraft, setReplyDraft]   = useState('');
  const [replySubmitting, setReplySubmitting] = useState(false);
  const [replyError, setReplyError]   = useState('');

  const [showModal, setShowModal]     = useState(false);
  const [submitting, setSubmitting]   = useState(false);
  const [formError, setFormError]     = useState('');
  const [newGame, setNewGame]         = useState(GAMES[0]);
  const [newCategory, setNewCategory] = useState(CATEGORIES[1]);
  const [newTitle, setNewTitle]       = useState('');
  const [newBody, setNewBody]         = useState('');
  const [newImage, setNewImage]       = useState<string | null>(null);
  const [editingId, setEditingId]     = useState<number | null>(null);

  useEffect(() => {
    apiGetForum()
      .then(setPosts)
      .catch(console.error)
      .finally(() => setLoading(false));
  }, []);

  // Keep open thread in the URL (?thread=7) so reload refetches replies from the server.
  useEffect(() => {
    const raw = searchParams.get('thread');
    if (!raw) {
      setSelectedPost(null);
      setThreadReplies([]);
      return;
    }

    const id = Number(raw);
    if (!Number.isFinite(id) || id <= 0) return;

    let cancelled = false;
    (async () => {
      setThreadLoading(true);
      setReplyError('');
      setReplyDraft('');
      try {
        const [fresh, replies] = await Promise.all([
          apiGetForumPost(id),
          apiGetPostReplies(id),
        ]);
        if (cancelled) return;
        setSelectedPost(fresh);
        setThreadReplies(replies);
        setPosts(prev => (
          prev.some(p => p.id === fresh.id)
            ? prev.map(p => p.id === fresh.id ? fresh : p)
            : prev
        ));
      } catch {
        if (!cancelled) {
          setSelectedPost(null);
          setThreadReplies([]);
          setSearchParams(prev => {
            const next = new URLSearchParams(prev);
            next.delete('thread');
            return next;
          }, { replace: true });
        }
      } finally {
        if (!cancelled) setThreadLoading(false);
      }
    })();

    return () => { cancelled = true; };
  }, [searchParams]);

  const filtered = activeTab === 'All'
    ? posts
    : posts.filter(p => p.category === activeTab);

  const openThread = (post: ForumPostAPI) => {
    setSearchParams(prev => {
      const next = new URLSearchParams(prev);
      next.set('thread', String(post.id));
      return next;
    });
  };

  const closeThread = () => {
    setSearchParams(prev => {
      const next = new URLSearchParams(prev);
      next.delete('thread');
      return next;
    });
    setReplyDraft('');
    setReplyError('');
  };

  const handleLike = async (id: number) => {
    if (!user) { navigate('/login'); return; }
    const updated = await apiLikePost(id).catch(() => null);
    if (updated) {
      setPosts(prev => prev.map(p => p.id === id ? updated : p));
      if (selectedPost?.id === id) setSelectedPost(updated);
    }
  };

  const handleDelete = async (post: ForumPostAPI) => {
    if (!confirm('Delete this thread?')) return;
    try {
      if (user?.role === 'admin' && post.user_id !== user.id) {
        await apiAdminDeleteForumPost(post.id);
      } else {
        await apiDeletePost(post.id);
      }
      setPosts(prev => prev.filter(p => p.id !== post.id));
      if (selectedPost?.id === post.id) closeThread();
    } catch {
      alert('Failed to delete post.');
    }
  };

  const handleSubmitReply = async () => {
    if (!user || !selectedPost) { navigate('/login'); return; }
    const body = replyDraft.trim();
    if (!body) return;
    setReplySubmitting(true);
    setReplyError('');
    try {
      const reply = await apiCreateReply(selectedPost.id, body);
      setThreadReplies(prev => [...prev, reply]);
      setReplyDraft('');
      const updated = {
        ...selectedPost,
        reply_count: (selectedPost.reply_count ?? 0) + 1,
      };
      setSelectedPost(updated);
      setPosts(prev => prev.map(p => p.id === updated.id ? updated : p));
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Failed to post reply.';
      setReplyError(msg.includes('404') || msg.includes('Cannot')
        ? 'Could not save reply. Restart the backend: cd server && npm start'
        : msg);
    } finally {
      setReplySubmitting(false);
    }
  };

  const handleDeleteReply = async (reply: ForumReplyAPI) => {
    if (!selectedPost || !confirm('Delete this reply?')) return;
    try {
      await apiDeleteReply(selectedPost.id, reply.id);
      setThreadReplies(prev => prev.filter(r => r.id !== reply.id));
      const updated = {
        ...selectedPost,
        reply_count: Math.max(0, (selectedPost.reply_count ?? 1) - 1),
      };
      setSelectedPost(updated);
      setPosts(prev => prev.map(p => p.id === updated.id ? updated : p));
    } catch {
      alert('Failed to delete reply.');
    }
  };

  const handleImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) { setNewImage(null); return; }
    const reader = new FileReader();
    reader.onload = () => setNewImage(reader.result as string);
    reader.readAsDataURL(file);
  };

  const handleEditClick = (post: ForumPostAPI) => {
    setEditingId(post.id);
    setNewGame(post.game);
    setNewCategory(post.category);
    setNewTitle(post.title);
    setNewBody(post.body);
    setNewImage(post.image || null);
    setShowModal(true);
  };

  const handleOpenNew = () => {
    if (!user) { navigate('/login'); return; }
    setEditingId(null);
    setNewTitle(''); setNewBody(''); setNewImage(null);
    setFormError('');
    setShowModal(true);
  };

  const handleSubmitPost = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormError('');
    if (!user) { navigate('/login'); return; }
    if (!newTitle.trim() || !newBody.trim()) { setFormError('Title and body are required.'); return; }
    setSubmitting(true);
    try {
      if (editingId) {
        const postToEdit = posts.find(p => p.id === editingId);
        let updated;
        if (user.role === 'admin' && postToEdit?.user_id !== user.id) {
          updated = await apiAdminEditForumPost(editingId, { game: newGame, category: newCategory, title: newTitle, body: newBody, image: newImage });
        } else {
          updated = await apiEditPost(editingId, { game: newGame, category: newCategory, title: newTitle, body: newBody, image: newImage });
        }
        setPosts(prev => prev.map(p => p.id === editingId ? updated : p));
        if (selectedPost?.id === editingId) setSelectedPost(updated);
      } else {
        const post = await apiCreatePost({ game: newGame, category: newCategory, title: newTitle, body: newBody, image: newImage });
        setPosts(prev => [post, ...prev]);
      }
      setShowModal(false);
    } catch (err: unknown) {
      setFormError(err instanceof Error ? err.message : 'Failed to post.');
    } finally {
      setSubmitting(false);
    }
  };

  /* ── Thread detail view ─────────────────────────────────────────────── */
  const threadParam = searchParams.get('thread');
  if (threadParam || selectedPost) {
    if (!selectedPost) {
      return (
        <div className="max-w-3xl mx-auto px-4 py-6 pb-32 flex justify-center py-20">
          <Loader2 className="size-6 animate-spin text-gs-faint" />
        </div>
      );
    }

    const isOwn = user?.id === selectedPost.user_id;
    return (
      <div className="max-w-3xl mx-auto px-4 py-6 pb-32">
        {/* Breadcrumb */}
        <nav className="flex items-center gap-1.5 text-xs mb-5 flex-wrap">
          <button onClick={closeThread} className="text-gs-faint hover:text-gs-accent transition-colors">
            Community
          </button>
          <ChevronRight className="size-3 text-gs-faint" />
          <span className="text-gs-faint">{selectedPost.category}</span>
          <ChevronRight className="size-3 text-gs-faint" />
          <span className="text-gs-text font-medium truncate max-w-[200px]">{selectedPost.title}</span>
        </nav>

        <button
          onClick={closeThread}
          className="flex items-center gap-1.5 text-xs text-gs-muted hover:text-gs-text mb-4 transition-colors"
        >
          <ArrowLeft className="size-3.5" /> Back to threads
        </button>

        {threadLoading ? (
          <div className="flex justify-center py-20">
            <Loader2 className="size-6 animate-spin text-gs-faint" />
          </div>
        ) : (
          <div className="rounded-xl border border-gs-border overflow-hidden" style={{ background: 'var(--gs-surface)' }}>
            {/* Original post */}
            <div className="px-5 py-5 border-b border-gs-border">
              <div className="flex gap-3">
                <ThreadAvatar name={selectedPost.author} image={selectedPost.image} size="lg" />
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap mb-1">
                    <span className="text-sm font-semibold" style={{ color: usernameColor(selectedPost.author_role) }}>
                      {selectedPost.author}
                    </span>
                    {selectedPost.author_role === 'admin' && <AdminBadge />}
                    <span className="text-[10px] text-gs-faint ml-auto">{formatThreadDate(selectedPost.created_at)}</span>
                  </div>
                  <h1 className="text-base font-bold text-gs-text mb-2">{selectedPost.title}</h1>
                  <p className="text-sm text-gs-muted leading-relaxed whitespace-pre-wrap">{selectedPost.body}</p>
                  {selectedPost.image && (
                    <div className="mt-3 rounded-lg overflow-hidden border border-gs-border">
                      <img src={selectedPost.image} alt="" className="w-full max-h-80 object-contain bg-gs-surface-2" />
                    </div>
                  )}
                  <div className="flex items-center gap-3 mt-3 pt-3 border-t border-gs-border">
                    <button
                      onClick={() => handleLike(selectedPost.id)}
                      className={`flex items-center gap-1 text-xs ${selectedPost.liked_by_me ? 'text-gs-accent' : 'text-gs-faint hover:text-gs-muted'}`}
                    >
                      <ThumbsUp className={`size-3.5 ${selectedPost.liked_by_me ? 'fill-current' : ''}`} />
                      {selectedPost.likes}
                    </button>
                    {(isOwn || user?.role === 'admin') && (
                      <>
                        <button onClick={() => handleEditClick(selectedPost)} className="text-gs-faint hover:text-gs-text">
                          <Edit2 className="size-3.5" />
                        </button>
                        <button onClick={() => handleDelete(selectedPost)} className="text-gs-faint hover:text-red-400">
                          <Trash2 className="size-3.5" />
                        </button>
                      </>
                    )}
                  </div>
                </div>
              </div>
            </div>

            {/* Replies */}
            {threadReplies.map(reply => (
              <div key={reply.id} className="px-5 py-4 border-b border-gs-border last:border-b-0">
                <div className="flex gap-3">
                  <ThreadAvatar name={reply.author} size="sm" />
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap mb-1">
                      <span className="text-xs font-semibold" style={{ color: usernameColor(reply.author_role) }}>
                        {reply.author}
                      </span>
                      {reply.author_role === 'admin' && <AdminBadge />}
                      <span className="text-[10px] text-gs-faint">{formatThreadDate(reply.created_at)}</span>
                      {(user?.id === reply.user_id || user?.role === 'admin') && (
                        <button
                          onClick={() => handleDeleteReply(reply)}
                          className="ml-auto text-gs-faint hover:text-red-400"
                        >
                          <Trash2 className="size-3" />
                        </button>
                      )}
                    </div>
                    <p className="text-sm text-gs-muted leading-relaxed whitespace-pre-wrap">{reply.body}</p>
                  </div>
                </div>
              </div>
            ))}

            {/* Reply composer */}
            {user ? (
              <div className="px-5 py-4 border-t border-gs-border bg-gs-surface-2/50">
                <textarea
                  rows={4}
                  value={replyDraft}
                  onChange={e => setReplyDraft(e.target.value)}
                  placeholder="Enter your message here…"
                  className="w-full bg-gs-surface border border-gs-border rounded-lg px-3 py-2.5 text-sm text-gs-text placeholder-gs-faint resize-none focus:outline-none focus:border-gs-accent/50"
                />
                {replyError && <p className="text-xs text-red-400 mt-2">{replyError}</p>}
                <button
                  type="button"
                  onClick={handleSubmitReply}
                  disabled={replySubmitting || !replyDraft.trim()}
                  className="mt-3 flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-semibold transition-opacity disabled:opacity-50 hover:opacity-90"
                  style={{ background: 'var(--gs-accent)', color: '#fff' }}
                >
                  {replySubmitting ? <Loader2 className="size-4 animate-spin" /> : <Send className="size-4" />}
                  {replySubmitting ? 'Posting…' : 'Post reply'}
                </button>
              </div>
            ) : (
              <div className="px-5 py-4 border-t border-gs-border text-xs text-gs-faint">
                <button onClick={() => navigate('/login')} className="text-gs-accent hover:underline font-semibold">Sign in</button> to reply.
              </div>
            )}
          </div>
        )}
      </div>
    );
  }

  /* ── Thread list view ───────────────────────────────────────────────── */
  return (
    <div className="max-w-3xl mx-auto px-4 py-6 pb-28 space-y-5">

      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-gs-text text-xl font-bold">Community</h1>
          <p className="text-gs-faint text-xs mt-0.5">{posts.length} thread{posts.length !== 1 ? 's' : ''}</p>
        </div>
        <button
          id="new-post-btn"
          onClick={handleOpenNew}
          className="flex items-center gap-1.5 px-4 py-2 rounded-lg text-sm font-semibold hover:opacity-90 transition-opacity"
          style={{ background: 'var(--gs-accent)', color: '#fff' }}
        >
          <Plus className="size-4" /> New thread
        </button>
      </div>

      {!user && (
        <div className="flex items-center gap-3 rounded-lg border border-gs-border px-4 py-3 text-sm text-gs-muted">
          <LogIn className="size-4 text-gs-accent shrink-0" />
          <span>
            <button onClick={() => navigate('/login')} className="text-gs-accent hover:underline font-semibold">Sign in</button>
            {' '}to post or reply.
          </span>
        </div>
      )}

      {/* Category tabs */}
      <div className="flex gap-1 p-1 rounded-lg border border-gs-border overflow-x-auto" style={{ background: 'var(--gs-surface-2)' }}>
        {CATEGORIES.map(cat => (
          <button
            key={cat}
            onClick={() => setActiveTab(cat)}
            className={`shrink-0 px-3 py-1.5 rounded-md text-xs font-medium transition-all ${
              activeTab === cat ? 'bg-gs-surface text-gs-text shadow-sm' : 'text-gs-faint hover:text-gs-muted'
            }`}
          >
            {cat}
          </button>
        ))}
      </div>

      {/* Thread list */}
      {loading ? (
        <div className="flex justify-center py-20">
          <Loader2 className="size-6 animate-spin text-gs-faint" />
        </div>
      ) : filtered.length === 0 ? (
        <p className="text-center py-16 text-gs-faint text-sm">No threads yet. Start one!</p>
      ) : (
        <div className="rounded-xl border border-gs-border overflow-hidden divide-y divide-gs-border" style={{ background: 'var(--gs-surface)' }}>
          {filtered.map(post => (
            <button
              key={post.id}
              type="button"
              onClick={() => openThread(post)}
              className="w-full flex items-start gap-3.5 px-4 py-4 text-left transition-colors hover:bg-gs-surface-2/80 group"
            >
              <ThreadAvatar name={post.author} image={post.image} />
              <div className="flex-1 min-w-0">
                <h3 className="text-sm font-semibold text-gs-text leading-snug mb-1.5 group-hover:text-gs-accent transition-colors line-clamp-2">
                  {post.title}
                </h3>
                <p className="text-[11px] text-gs-faint leading-relaxed flex flex-wrap items-center gap-x-1">
                  <span className="font-semibold" style={{ color: usernameColor(post.author_role) }}>{post.author}</span>
                  {post.author_role === 'admin' && (
                    <span className="inline-flex items-center gap-0.5 text-[8px] px-1 py-px rounded font-bold uppercase bg-amber-400/15 text-amber-400 border border-amber-400/30">
                      <Crown className="size-2" strokeWidth={2.5} />
                    </span>
                  )}
                  <span>·</span>
                  <span>{(post.author_post_count ?? 1).toLocaleString()} posts</span>
                  <span>·</span>
                  <span>{(post.reply_count ?? 0).toLocaleString()} replies</span>
                  <span>·</span>
                  <span>{(post.views ?? 0).toLocaleString()} views</span>
                  <span>·</span>
                  <span>{timeAgo(post.created_at)}</span>
                </p>
              </div>
              <ChevronRight className="size-4 text-gs-faint shrink-0 mt-1 opacity-0 group-hover:opacity-100 transition-opacity" />
            </button>
          ))}
        </div>
      )}

      {/* New post modal */}
      {showModal && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4" onClick={() => setShowModal(false)}>
          <div className="relative w-full max-w-lg rounded-2xl border border-gs-border p-6 space-y-4" style={{ background: 'var(--gs-surface)' }} onClick={e => e.stopPropagation()}>
            <div className="flex items-center justify-between">
              <h2 className="text-gs-text font-semibold">{editingId ? 'Edit thread' : 'New thread'}</h2>
              <button onClick={() => setShowModal(false)} className="text-gs-muted hover:text-gs-text">
                <X className="size-4" />
              </button>
            </div>
            <form onSubmit={handleSubmitPost} className="space-y-3">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs text-gs-muted font-semibold uppercase tracking-wide mb-1.5 block">Game</label>
                  <select value={newGame} onChange={e => setNewGame(e.target.value)} className="w-full bg-gs-surface-2 border border-gs-border rounded-lg px-3 py-2 text-sm text-gs-text focus:outline-none">
                    {GAMES.map(g => <option key={g}>{g}</option>)}
                  </select>
                </div>
                <div>
                  <label className="text-xs text-gs-muted font-semibold uppercase tracking-wide mb-1.5 block">Category</label>
                  <select value={newCategory} onChange={e => setNewCategory(e.target.value)} className="w-full bg-gs-surface-2 border border-gs-border rounded-lg px-3 py-2 text-sm text-gs-text focus:outline-none">
                    {CATEGORIES.slice(1).map(c => <option key={c}>{c}</option>)}
                  </select>
                </div>
              </div>
              <div>
                <label className="text-xs text-gs-muted font-semibold uppercase tracking-wide mb-1.5 block">Title</label>
                <input type="text" value={newTitle} onChange={e => setNewTitle(e.target.value)} placeholder="Thread title" className="w-full bg-gs-surface-2 border border-gs-border rounded-lg px-3 py-2 text-sm text-gs-text focus:outline-none" />
              </div>
              <div>
                <label className="text-xs text-gs-muted font-semibold uppercase tracking-wide mb-1.5 block">Image (optional)</label>
                <input type="file" accept="image/*" onChange={handleImageChange} className="w-full text-sm text-gs-muted" />
                {newImage && (
                  <img src={newImage} alt="" className="mt-2 h-16 rounded border border-gs-border" />
                )}
              </div>
              <div>
                <label className="text-xs text-gs-muted font-semibold uppercase tracking-wide mb-1.5 block">Message</label>
                <textarea rows={4} value={newBody} onChange={e => setNewBody(e.target.value)} placeholder="Write your post…" className="w-full bg-gs-surface-2 border border-gs-border rounded-lg px-3 py-2 text-sm text-gs-text resize-none focus:outline-none" />
              </div>
              {formError && <p className="text-xs text-red-400">{formError}</p>}
              <div className="flex gap-2 pt-1">
                <button type="button" onClick={() => setShowModal(false)} className="flex-1 border border-gs-border text-gs-muted py-2.5 rounded-lg text-sm">Cancel</button>
                <button type="submit" disabled={submitting} className="flex-1 py-2.5 rounded-lg text-sm font-semibold text-white disabled:opacity-60" style={{ background: 'var(--gs-accent)' }}>
                  {submitting ? 'Saving…' : editingId ? 'Save' : 'Post'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
