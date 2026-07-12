// src/app/lib/api.ts — Shared fetch helper + auth token utilities

const BASE = '/api'; // Proxied to http://localhost:3001 via Vite
const PROFILE_KEY = 'gg_user_profile';

// ─── Token storage ────────────────────────────────────────────────────────────

export function getToken(): string | null {
  return localStorage.getItem('gg_token');
}

export function setToken(token: string): void {
  localStorage.setItem('gg_token', token);
}

/** Avatar is stored in DB, not in the JWT — cache it locally for display. */
export function setUserProfile(user: Pick<AuthUser, 'id' | 'avatar_url'>): void {
  localStorage.setItem(PROFILE_KEY, JSON.stringify({
    id: user.id,
    avatar_url: user.avatar_url ?? null,
  }));
}

function readCachedAvatar(userId: number): string | null {
  try {
    const cached = JSON.parse(localStorage.getItem(PROFILE_KEY) || 'null') as { id?: number; avatar_url?: string | null } | null;
    if (cached?.id === userId) return cached.avatar_url ?? null;
  } catch { /* ignore */ }
  return null;
}

function persistSession(token: string, user: AuthUser) {
  setToken(token);
  setUserProfile(user);
}

export function removeToken(): void {
  localStorage.removeItem('gg_token');
  localStorage.removeItem(PROFILE_KEY);
}

/** Swap oversized legacy JWTs (avatar embedded in token) for a slim token via POST body. */
let migratePromise: Promise<void> | null = null;

export function ensureSlimToken(): Promise<void> {
  if (!migratePromise) migratePromise = migrateTokenIfNeeded();
  return migratePromise;
}

async function migrateTokenIfNeeded(): Promise<void> {
  const token = getToken();
  if (!token) return;

  let needsRefresh = token.length > 4096;
  if (!needsRefresh) {
    try {
      const payload = JSON.parse(atob(token.split('.')[1]));
      if (payload.avatar_url) needsRefresh = true;
    } catch { /* ignore */ }
  }
  if (!needsRefresh) return;

  try {
    const res = await fetch(`${BASE}/auth/refresh`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ token }),
    });
    if (!res.ok) return;
    const data = await res.json() as { token: string; user: AuthUser };
    persistSession(data.token, data.user);
    window.dispatchEvent(new Event('user_updated'));
  } catch { /* ignore — user can sign in again */ }
}

// ─── User types ───────────────────────────────────────────────────────────────

export type UserRole = 'gamer' | 'shop_owner' | 'admin';

export const SHOP_CATEGORIES = [
  'FPS Skins',
  'RPG Items',
  'Strategy Gear',
  'MOBA Cosmetics',
  'Battle Royale Loot',
] as const;

export type ShopCategory = typeof SHOP_CATEGORIES[number];

export interface AuthUser {
  id: number;
  username: string;
  email: string;
  role: UserRole;
  shop_category: ShopCategory | null;
  avatar_url?: string | null;
}

/** Decode JWT payload (no signature verify — server handles that) */
export function getUser(): AuthUser | null {
  const token = getToken();
  if (!token) return null;
  try {
    const payload = JSON.parse(atob(token.split('.')[1]));
    // Check expiry
    if (payload.exp && payload.exp * 1000 < Date.now()) {
      removeToken();
      return null;
    }
    return {
      id: payload.id,
      username: payload.username,
      email: payload.email,
      role: payload.role ?? 'gamer',
      shop_category: payload.shop_category ?? null,
      avatar_url: readCachedAvatar(payload.id),
    };
  } catch {
    return null;
  }
}

// ─── Fetch helper ─────────────────────────────────────────────────────────────

interface RequestOptions {
  method?: 'GET' | 'POST' | 'PUT' | 'DELETE' | 'PATCH';
  body?: unknown;
  auth?: boolean; // default true
}

export async function apiFetch<T = unknown>(
  path: string,
  { method = 'GET', body, auth = true }: RequestOptions = {}
): Promise<T> {
  if (auth) await ensureSlimToken();

  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
  };

  if (auth) {
    const token = getToken();
    if (token) headers['Authorization'] = `Bearer ${token}`;
  }

  const res = await fetch(`${BASE}${path}`, {
    method,
    headers,
    body: body !== undefined ? JSON.stringify(body) : undefined,
  }).catch(() => {
    throw new Error('Cannot reach the API server. Open a terminal and run: cd server && npm start');
  });

  const data = await res.json().catch(() => ({}));

  if (!res.ok) {
    const msg = (data as { error?: string }).error;
    if (res.status >= 500 && !msg) {
      throw new Error('API server is not running. Run: cd server && npm start');
    }
    throw new Error(msg ?? `HTTP ${res.status}`);
  }

  return data as T;
}

// ─── Auth helpers ─────────────────────────────────────────────────────────────

export async function apiRegister(
  username: string,
  email: string,
  password: string,
  role: UserRole = 'gamer',
  shop_category?: ShopCategory
) {
  const data = await apiFetch<{ token: string; user: AuthUser }>('/auth/register', {
    method: 'POST',
    body: { username, email, password, role, shop_category },
    auth: false,
  });
  persistSession(data.token, data.user);
  return data.user;
}

export async function apiLogin(email: string, password: string) {
  const data = await apiFetch<{ token: string; user: AuthUser }>('/auth/login', {
    method: 'POST',
    body: { email, password },
    auth: false,
  });
  persistSession(data.token, data.user);
  return data.user;
}

export function apiLogout() {
  removeToken();
}

// ─── Cart helpers ─────────────────────────────────────────────────────────────

export interface CartItemAPI {
  id: number;
  user_id: number;
  item_id: string;
  name: string;
  game: string;
  game_color: string;
  type: string;
  platform: string;
  price: number;
  original_price: number | null;
  image: string;
  added_at: string;
}

export function apiGetCart() {
  return apiFetch<CartItemAPI[]>('/cart');
}

export async function apiAddToCart(item: Omit<CartItemAPI, 'id' | 'user_id' | 'added_at'>) {
  const res = await apiFetch<CartItemAPI>('/cart', { method: 'POST', body: item });
  window.dispatchEvent(new Event('cart_updated'));
  return res;
}

export async function apiRemoveFromCart(id: number) {
  const res = await apiFetch(`/cart/${id}`, { method: 'DELETE' });
  window.dispatchEvent(new Event('cart_updated'));
  return res;
}

export async function apiClearCart() {
  const res = await apiFetch('/cart', { method: 'DELETE' });
  window.dispatchEvent(new Event('cart_updated'));
  return res;
}

// ─── Forum helpers ────────────────────────────────────────────────────────────

export interface ForumPostAPI {
  id: number;
  user_id: number;
  author: string;
  author_role?: UserRole;
  author_post_count?: number;
  game: string;
  category: string;
  title: string;
  body: string;
  image?: string | null;
  likes: number;
  liked_by_me: boolean;
  reply_count?: number;
  views?: number;
  created_at: string;
}

export interface ForumReplyAPI {
  id: number;
  post_id: number;
  user_id: number;
  author: string;
  author_role: UserRole;
  body: string;
  created_at: string;
}

export function apiGetForum() {
  return apiFetch<ForumPostAPI[]>('/forum');
}

export function apiGetForumPost(id: number) {
  return apiFetch<ForumPostAPI>(`/forum/${id}`, { auth: false });
}

export function apiGetPostReplies(postId: number) {
  return apiFetch<ForumReplyAPI[]>(`/forum/${postId}/replies`, { auth: false });
}

export function apiCreateReply(postId: number, body: string) {
  return apiFetch<ForumReplyAPI>(`/forum/${postId}/replies`, { method: 'POST', body: { body } });
}

export function apiDeleteReply(postId: number, replyId: number) {
  return apiFetch(`/forum/${postId}/replies/${replyId}`, { method: 'DELETE' });
}

export function apiCreatePost(post: { game: string; category: string; title: string; body: string; image?: string | null }) {
  return apiFetch<ForumPostAPI>('/forum', { method: 'POST', body: post });
}

export function apiEditPost(id: number, post: { game: string; category: string; title: string; body: string; image?: string | null }) {
  return apiFetch<ForumPostAPI>(`/forum/${id}`, { method: 'PUT', body: post });
}

export function apiLikePost(id: number) {
  return apiFetch<ForumPostAPI>(`/forum/${id}/like`, { method: 'POST' });
}

export function apiDeletePost(id: number) {
  return apiFetch(`/forum/${id}`, { method: 'DELETE' });
}

// ─── Admin helpers ────────────────────────────────────────────────────────────

export interface AdminUser {
  id: number;
  username: string;
  email: string;
  role: UserRole;
  shop_category: ShopCategory | null;
  created_at: string;
}

export function apiAdminGetUsers() {
  return apiFetch<AdminUser[]>('/admin/users');
}

export function apiAdminUpdateUser(id: number, data: { role?: UserRole; shop_category?: ShopCategory | null }) {
  return apiFetch<AdminUser>(`/admin/users/${id}`, { method: 'PATCH', body: data });
}

export function apiAdminDeleteUser(id: number) {
  return apiFetch(`/admin/users/${id}`, { method: 'DELETE' });
}

export function apiAdminGetUserContent(id: number) {
  return apiFetch<{ storeListings: StoreListingAPI[], forumPosts: ForumPostAPI[] }>(`/admin/users/${id}/content`);
}

export function apiAdminDeleteForumPost(id: number) {
  return apiFetch(`/admin/forum/${id}`, { method: 'DELETE' });
}

export function apiAdminEditForumPost(id: number, data: Partial<ForumPostAPI>) {
  return apiFetch(`/admin/forum/${id}`, { method: 'PUT', body: data });
}

export function apiAdminDeleteStoreListing(id: string) {
  return apiFetch(`/admin/store/${id}`, { method: 'DELETE' });
}

export function apiAdminEditStoreListing(id: string, data: Partial<StoreListingAPI>) {
  return apiFetch(`/admin/store/${id}`, { method: 'PUT', body: data });
}

// ─── Profile update ───────────────────────────────────────────────────────────

export interface ProfileUpdate {
  username?: string;
  email?: string;
  currentPassword?: string;
  newPassword?: string;
  avatar_url?: string | null;
}

export async function apiUpdateProfile(data: ProfileUpdate): Promise<AuthUser> {
  const result = await apiFetch<{ token: string; user: AuthUser }>('/auth/profile', {
    method: 'PATCH',
    body: data,
  });
  persistSession(result.token, result.user);
  window.dispatchEvent(new Event('user_updated'));
  return result.user;
}

// ─── Store helpers ────────────────────────────────────────────────────────────

export interface StoreListingAPI {
  id: string;
  user_id: number;
  type: 'skin' | 'account';
  game: 'CS2' | 'Valorant' | 'LoL';
  item?: string;
  category?: string;
  wear?: string;
  float?: string;
  rank?: string;
  hoursPlayed?: number;
  skinsOwned?: number;
  championsOwned?: number;
  level?: number;
  highlight?: string;
  description?: string;
  price: number;
  seller: string;
  seller_role?: UserRole;
  sellerRating: number;
  image: string;
  views: number;
  stock?: number;
  status?: 'available' | 'sold' | 'reserved';
  order_count?: number;
  created_at: string;
}

export function apiGetStoreListings() {
  return apiFetch<StoreListingAPI[]>('/store');
}

export function apiIncrementListingView(id: string | number) {
  return apiFetch<{ id: number; views: number }>(`/store/${id}/view`, { method: 'POST' });
}

export function apiCreateStoreListing(listing: Partial<StoreListingAPI>) {
  return apiFetch<StoreListingAPI>('/store', { method: 'POST', body: listing });
}

// ─── Chatbot helpers ──────────────────────────────────────────────────────────

export interface ChatMessageAPI {
  id: string;
  text: string;
  sender: 'user' | 'bot';
  timestamp: Date | string;
}

export function apiChat(messages: ChatMessageAPI[], contextGame?: string | null) {
  return apiFetch<{ text: string }>('/chat', {
    method: 'POST',
    body: { messages, contextGame },
    auth: false,
  });
}

// ─── Support ticket helpers ───────────────────────────────────────────────────

export type TicketStatus   = 'open' | 'in_progress' | 'resolved' | 'closed';
export type TicketPriority = 'low' | 'normal' | 'high' | 'urgent';
export type TicketCategory = 'general' | 'billing' | 'account' | 'technical' | 'store' | 'other';

export interface SupportTicketAPI {
  id: number;
  user_id: number | null;
  username: string;
  email: string;
  subject: string;
  message: string;
  category: TicketCategory;
  priority: TicketPriority;
  status: TicketStatus;
  admin_response: string | null;
  admin_id: number | null;
  created_at: string;
  updated_at: string;
}

export interface TicketStatsAPI {
  total: number;
  open: number;
  in_progress: number;
  resolved: number;
  urgent: number;
}

export function apiCreateTicket(ticket: {
  username: string;
  email: string;
  subject: string;
  message: string;
  category?: TicketCategory;
  priority?: TicketPriority;
}) {
  return apiFetch<SupportTicketAPI>('/support', { method: 'POST', body: ticket, auth: false });
}

export function apiGetMyTickets() {
  return apiFetch<SupportTicketAPI[]>('/support/mine');
}

export function apiAdminGetTickets(filters?: { status?: string; priority?: string; category?: string }) {
  const params = new URLSearchParams();
  if (filters?.status)   params.set('status', filters.status);
  if (filters?.priority) params.set('priority', filters.priority);
  if (filters?.category) params.set('category', filters.category);
  const qs = params.toString();
  return apiFetch<SupportTicketAPI[]>(`/support${qs ? `?${qs}` : ''}`);
}

export function apiAdminGetTicketStats() {
  return apiFetch<TicketStatsAPI>('/support/stats');
}

export function apiAdminUpdateTicket(id: number, data: {
  status?: TicketStatus;
  priority?: TicketPriority;
  admin_response?: string;
}) {
  return apiFetch<SupportTicketAPI>(`/support/${id}`, { method: 'PATCH', body: data });
}

export function apiAdminDeleteTicket(id: number) {
  return apiFetch(`/support/${id}`, { method: 'DELETE' });
}

// ─── Shop Owner helpers ───────────────────────────────────────────────────────

export interface CharacterAPI {
  id: number;
  user_id: number;
  game: string;
  character_name: string;
  level: number;
  rank: string | null;
  role: string | null;
  items_count: number;
  skins_count: number;
  description: string | null;
  image: string | null;
  is_for_sale: number;
  sale_price: number | null;
  created_at: string;
}

export interface ShopOwnerStatsAPI {
  totalListings: number;
  activeListings: number;
  soldListings: number;
  totalOrders: number;
  totalCharacters: number;
  forSaleChars: number;
  estimatedRevenue: number;
}

export function apiGetMyCharacters() {
  return apiFetch<CharacterAPI[]>('/shop-owner/characters');
}

export function apiCreateCharacter(char: Omit<CharacterAPI, 'id' | 'user_id' | 'created_at'>) {
  return apiFetch<CharacterAPI>('/shop-owner/characters', { method: 'POST', body: char });
}

export function apiUpdateCharacter(id: number, char: Partial<CharacterAPI>) {
  return apiFetch<CharacterAPI>(`/shop-owner/characters/${id}`, { method: 'PATCH', body: char });
}

export function apiDeleteCharacter(id: number) {
  return apiFetch(`/shop-owner/characters/${id}`, { method: 'DELETE' });
}

export function apiGetShopOwnerStats() {
  return apiFetch<ShopOwnerStatsAPI>('/shop-owner/stats');
}

export function apiGetMyListings() {
  return apiFetch<StoreListingAPI[]>('/shop-owner/listings');
}

export function apiUpdateMyListing(id: string, data: Partial<StoreListingAPI>) {
  return apiFetch<StoreListingAPI>(`/shop-owner/listings/${id}`, { method: 'PATCH', body: data });
}

export function apiDeleteMyListing(id: string) {
  return apiFetch<{ ok: boolean }>(`/shop-owner/listings/${id}`, { method: 'DELETE' });
}

// ─── Purchase & Trade helpers ─────────────────────────────────────────────────

export type TradeStatus = 'pending' | 'seller_accepted' | 'seller_declined' | 'verified' | 'rejected' | 'completed';
export type SellerTradeStatus = 'pending' | 'accepted' | 'declined';

export interface TradeRequestAPI {
  id: number;
  listing_id: number | null;
  buyer_id: number;
  buyer_username: string;
  seller_id: number | null;
  seller_username: string | null;
  item_name: string;
  game: string;
  category: string | null;
  price: number;
  status: TradeStatus;
  seller_status: SellerTradeStatus;
  seller_note: string | null;
  proof_image: string | null;
  seller_responded_at: string | null;
  admin_id: number | null;
  admin_note: string | null;
  created_at: string;
  updated_at: string;
  image?: string | null;
  wear?: string | null;
  float?: string | null;
}

export interface TradeStatsAPI {
  total: number;
  pending: number;
  verified: number;
  rejected: number;
  completed: number;
}

export interface PurchaseItem {
  listing_id: string | number;
  name: string;
  game: string;
  category?: string;
  price: number;
  type: string;
}

export function apiPurchaseItems(items: PurchaseItem[]) {
  return apiFetch<{ results: { listing_id: number; result: string; item_name?: string }[] }>(
    '/store/purchase',
    { method: 'POST', body: { items } }
  );
}

export function apiGetMyTrades() {
  return apiFetch<TradeRequestAPI[]>('/trades/mine');
}

export function apiAdminGetTrades(status?: string) {
  const qs = status ? `?status=${status}` : '';
  return apiFetch<TradeRequestAPI[]>(`/trades${qs}`);
}

export function apiAdminGetTradeStats() {
  return apiFetch<TradeStatsAPI>('/trades/stats');
}

export function apiAdminUpdateTrade(id: number, data: { status: TradeStatus; admin_note?: string }) {
  return apiFetch<TradeRequestAPI>(`/trades/${id}`, { method: 'PATCH', body: data });
}

export function apiGetSellerTrades() {
  return apiFetch<TradeRequestAPI[]>('/trades/for-seller');
}

export function apiSellerRespondTrade(id: number, data: {
  seller_status: 'accepted' | 'declined';
  seller_note?: string;
  proof_image?: string | null;
}) {
  return apiFetch<TradeRequestAPI>(`/trades/${id}/respond`, { method: 'PATCH', body: data });
}

// ─── Notifications ────────────────────────────────────────────────────────────

export type NotificationCategory = 'trades' | 'support' | 'orders' | 'promos';

export interface NotificationAPI {
  id: number;
  category: NotificationCategory;
  title: string;
  body: string;
  link: string | null;
  read: boolean;
  created_at: string;
}

export interface NotificationPrefs {
  notify_trades: boolean;
  notify_support: boolean;
  notify_orders: boolean;
  notify_promos: boolean;
  notify_email: boolean;
}

export function apiGetNotifications() {
  return apiFetch<NotificationAPI[]>('/notifications');
}

export function apiGetUnreadNotificationCount() {
  return apiFetch<{ count: number }>('/notifications/unread-count');
}

export function apiMarkNotificationRead(id: number) {
  return apiFetch(`/notifications/${id}/read`, { method: 'PATCH' });
}

export function apiMarkAllNotificationsRead() {
  return apiFetch('/notifications/read-all', { method: 'PATCH' });
}

export function apiGetNotificationPrefs() {
  return apiFetch<NotificationPrefs>('/notifications/prefs');
}

export function apiUpdateNotificationPrefs(prefs: Partial<NotificationPrefs>) {
  return apiFetch<NotificationPrefs>('/notifications/prefs', { method: 'PATCH', body: prefs });
}

// ─── Computer Vision ─────────────────────────────────────────────────────────

export type VisionProviderId = 'gemini' | 'groq' | 'ollama';

export const VISION_PROVIDER_STORAGE_KEY = 'gameguide-vision-provider';

export function isVisionProviderId(value: string): value is VisionProviderId {
  return value === 'gemini' || value === 'groq' || value === 'ollama';
}

export interface VisionProviderOption {
  id: VisionProviderId;
  label: string;
  shortLabel: string;
  model: string;
  local?: boolean;
  ready?: boolean;
  ollamaRunning?: boolean;
  ollamaModelPulled?: boolean;
}

export interface VisionResult {
  detected: boolean;
  game: 'CS2' | 'Valorant' | 'LoL' | 'Apex Legends' | 'Fortnite' | 'PUBG' | 'Dota 2' | 'Overwatch 2' | 'Other' | null;
  type: 'skin' | 'account' | 'inventory' | 'gameplay' | 'stats' | 'other' | null;
  item: string | null;
  wear: string | null;
  float: string | null;
  rank: string | null;
  level: number | null;
  hoursPlayed: number | null;
  skinsOwned: number | null;
  estimatedPrice: number | null;
  /** AI-only price guess before market lookup */
  aiEstimatedPrice?: number | null;
  /** Live Steam Community Market lowest listing (USD) */
  marketPrice?: number | null;
  marketPriceMedian?: number | null;
  marketVolume?: number | null;
  marketHashName?: string | null;
  priceSource?: 'steam_community_market' | null;
  marketFetchedAt?: string | null;
  /** Exact CS2 skin name was checked against the external catalogue */
  catalogVerified?: boolean;
  /** A live Steam price was found for the verified market hash name */
  priceVerified?: boolean;
  firstStageItem?: string | null;
  verificationReason?: string | null;
  valorantInventory?: Array<{
    weapon: string;
    skin: string;
    tier?: string;
    icon?: string | null;
    confidence: 'high' | 'medium' | 'low';
    estimatedVp?: { min: number; max: number };
  }>;
  valorantTotalVpMin?: number;
  valorantTotalVpMax?: number;
  replacementValueUsd?: { min: number; max: number };
  /** Backend model used for this analysis */
  visionProvider?: string | null;
  confidence: 'high' | 'medium' | 'low';
  description: string;
  tags: string[];
}

export interface VisionStatus {
  online: boolean;
  provider: VisionProviderId | null;
  defaultProvider: VisionProviderId | null;
  label: string | null;
  configured: string;
  providers: VisionProviderOption[];
  ollama?: {
    running: boolean;
    modelPulled: boolean;
    models: string[];
  };
  message?: string;
}

export async function apiVisionStatus(): Promise<VisionStatus> {
  return apiFetch<VisionStatus>('/vision/status');
}

export async function apiAnalyzeScreenshot(
  imageBase64: string,
  mimeType: string,
  context?: string,
  provider?: VisionProviderId,
): Promise<VisionResult> {
  return apiFetch<VisionResult>('/vision/analyze', {
    method: 'POST',
    body: { imageBase64, mimeType, context, provider },
  });
}

export interface ChatMessage {
  role: 'user' | 'assistant';
  content: string;
}

export async function apiVisionChat(
  message: string,
  visionContext: VisionResult | null,
  history: ChatMessage[],
  provider?: VisionProviderId,
): Promise<{ reply: string }> {
  return apiFetch<{ reply: string }>('/vision/chat', {
    method: 'POST',
    body: { message, visionContext, history, provider },
  });
}

// ─── Analytics / Data Science ─────────────────────────────────────────────────

export interface AnalyticsSummary {
  activeListings:  number;
  activeSellers:   number;
  completedTrades: number;
  avgPrice:        number;
}

export interface GameStat {
  game:        string;
  listings:    number;
  avgPrice:    number;
  minPrice:    number;
  maxPrice:    number;
  totalSales:  number;
  totalViews:  number;
}

export interface TypeStat {
  type:        string;
  listings:    number;
  avgPrice:    number;
  totalSales:  number;
}

export interface PriceRange {
  range: string;
  count: number;
}

export interface DayActivity {
  day:         string;
  newListings: number;
}

export interface TopListing {
  id:          number;
  game:        string;
  type:        string;
  item:        string | null;
  highlight:   string | null;
  price:       number;
  views:       number;
  order_count: number;
  seller:      string;
  status?:     string;
  created_at:  string;
}

export const apiGetAnalyticsSummary  = () => apiFetch<AnalyticsSummary>('/analytics/summary');
export const apiGetAnalyticsByGame   = () => apiFetch<GameStat[]>('/analytics/by-game');
export const apiGetAnalyticsByType   = () => apiFetch<TypeStat[]>('/analytics/by-type');
export const apiGetTopListings       = () => apiFetch<TopListing[]>('/analytics/top-listings');
export const apiGetPriceRanges       = () => apiFetch<PriceRange[]>('/analytics/price-ranges');
export const apiGetRecentActivity    = () => apiFetch<DayActivity[]>('/analytics/recent-activity');

export interface PricePrediction {
  suggestedPrice: number;
  low:            number;
  high:           number;
  confidence:     'high' | 'medium' | 'low';
  reasoning:      string;
  marketStats:    { count: number; avgPrice: string; minPrice: string; maxPrice: string } | null;
}

export interface PredictPriceInput {
  game:        string;
  type:        string;
  item?:       string;
  wear?:       string;
  float?:      string;
  rank?:       string;
  level?:      number;
  hoursPlayed?: number;
  skinsOwned?:  number;
}

export function apiPredictPrice(input: PredictPriceInput): Promise<PricePrediction> {
  return apiFetch<PricePrediction>('/analytics/predict-price', {
    method: 'POST',
    body: input,
  });
}

// ─── Catalog live prices (CheapShark) ────────────────────────────────────────

export interface CatalogLivePriceEntry {
  salePrice: number;
  normalPrice: number;
  discount: number;
  storeId?: string;
  title?: string;
  isOnSale?: boolean;
  salePriceChangedAt?: string | null;
  saleEndsAt?: string | null;
}

export interface CatalogSteamStatsEntry {
  currentPlayers?: number;
  ownersEstimate?: string | null;
  medianPlaytimeHours?: number | null;
  steamSpyCcu?: number | null;
  steamOnSale?: boolean;
  steamDiscountPercent?: number;
  isOnSale?: boolean;
  salePriceChangedAt?: string | null;
  saleEndsAt?: string | null;
}

export interface CatalogLivePricesResponse {
  prices: Record<string, CatalogLivePriceEntry>;
  stats: Record<string, CatalogSteamStatsEntry>;
  fetchedAt: string;
  source: string;
  ttlSeconds: number;
  note?: string;
}

export function apiFetchCatalogLivePrices(steamAppIds: number[]): Promise<CatalogLivePricesResponse> {
  if (steamAppIds.length === 0) {
    return Promise.resolve({
      prices: {},
      stats: {},
      fetchedAt: new Date().toISOString(),
      source: 'cheapshark+steam+steamspy',
      ttlSeconds: 2700,
    });
  }
  const ids = [...new Set(steamAppIds)].join(',');
  return apiFetch<CatalogLivePricesResponse>(`/catalog/live-prices?ids=${encodeURIComponent(ids)}`);
}
