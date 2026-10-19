export type ProductStatus = 'live' | 'soon';

export type Product = {
  slug: string;
  name: string;
  tagline: string;
  status: ProductStatus;
  url: string;
  order: number;
  description?: string;
  category?: string;
  badge?: string;
};

// URL resolution based on environment variables or dev defaults
const CHAT_URL =
  (typeof process !== 'undefined' && process.env?.VITE_CHAT_APP_URL) ||
  (typeof import.meta !== 'undefined' && (import.meta as any).env?.VITE_CHAT_APP_URL) ||
  '/chat';

export const PRODUCTS: Product[] = [
  {
    slug: 'chat',
    name: 'Noevix Chat',
    tagline: 'A modern reasoning instrument.',
    status: 'live',
    url: CHAT_URL,
    order: 1,
    description:
      'A precision instrument for multi-turn reasoning, engineering synthesis, formal verification, and long-horizon tasks. Claims are checkable, effects are staged, and every run leaves a hash-linked record.',
    category: 'Reasoning & Synthesis',
    badge: 'LIVE',
  },
];

export function getProduct(slug: string): Product | undefined {
  return PRODUCTS.find((p) => p.slug === slug);
}

export function getLiveProducts(): Product[] {
  return PRODUCTS.filter((p) => p.status === 'live').sort((a, b) => a.order - b.order);
}
