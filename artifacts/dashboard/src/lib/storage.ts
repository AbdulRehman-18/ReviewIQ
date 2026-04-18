export const STORAGE_KEYS = {
  PRODUCTS_LIST: "rdash_products_list",
  PRODUCTS_MAP: "rdash_products_map",
  SELECTED_PRODUCT: "rdash_selected_product",
  MODERATION_QUEUE: "rdash_moderation_queue",
} as const;

function safeGet<T>(key: string, fallback: T): T {
  try {
    const raw = localStorage.getItem(key);
    if (raw === null) return fallback;
    return JSON.parse(raw) as T;
  } catch {
    return fallback;
  }
}

function safeSet(key: string, value: unknown): void {
  try {
    localStorage.setItem(key, JSON.stringify(value));
  } catch {
    // Quota exceeded or private browsing
    console.warn("localStorage write failed for key:", key);
  }
}

export const storage = {
  getSelectedProduct: (): number | null =>
    safeGet(STORAGE_KEYS.SELECTED_PRODUCT, null),
  setSelectedProduct: (id: number | null) =>
    safeSet(STORAGE_KEYS.SELECTED_PRODUCT, id),

  getProductsList: <T = unknown>(): T[] =>
    safeGet(STORAGE_KEYS.PRODUCTS_LIST, [] as T[]),
  setProductsList: <T = unknown>(list: T[]) =>
    safeSet(STORAGE_KEYS.PRODUCTS_LIST, list),

  getProductsMap: <T = unknown>(): Record<number, T> =>
    safeGet(STORAGE_KEYS.PRODUCTS_MAP, {} as Record<number, T>),
  setProductsMap: <T = unknown>(map: Record<number, T>) =>
    safeSet(STORAGE_KEYS.PRODUCTS_MAP, map),

  getModerationQueue: <T = unknown>(): T[] =>
    safeGet(STORAGE_KEYS.MODERATION_QUEUE, [] as T[]),
  setModerationQueue: <T = unknown>(queue: T[]) =>
    safeSet(STORAGE_KEYS.MODERATION_QUEUE, queue),

  clearAll: () => {
    Object.values(STORAGE_KEYS).forEach((key) => {
      try { localStorage.removeItem(key); } catch {}
    });
  },
};
