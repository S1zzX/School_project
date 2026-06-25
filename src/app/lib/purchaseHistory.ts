// src/app/lib/purchaseHistory.ts — Purchase history stored in localStorage

export interface PurchasedKeyEntry {
  name: string;
  platform: string;
  image: string;
  price: number;
  originalPrice?: number | null;
  key: string;
}

export interface PurchaseOrder {
  orderId: string;
  purchasedAt: string; // ISO string
  items: PurchasedKeyEntry[];
  total: number;
  paymentMethod: string;
  promoApplied: boolean;
}

const STORAGE_KEY = 'gg_purchase_history';

/** Load all orders for the current user */
export function loadPurchaseHistory(userId: number): PurchaseOrder[] {
  try {
    const raw = localStorage.getItem(`${STORAGE_KEY}_${userId}`);
    if (!raw) return [];
    return JSON.parse(raw) as PurchaseOrder[];
  } catch {
    return [];
  }
}

/** Save a new order to history */
export function savePurchaseOrder(userId: number, order: PurchaseOrder): void {
  const existing = loadPurchaseHistory(userId);
  // newest first
  const updated = [order, ...existing];
  localStorage.setItem(`${STORAGE_KEY}_${userId}`, JSON.stringify(updated));
}

/** Generate a unique order ID */
export function generateOrderId(): string {
  const ts = Date.now().toString(36).toUpperCase();
  const rand = Math.random().toString(36).substring(2, 6).toUpperCase();
  return `GG-${ts}-${rand}`;
}
