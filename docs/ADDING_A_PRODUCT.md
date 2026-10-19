# Adding a Product to Noevix

This guide describes how to add a new product application to the Noevix monorepo ecosystem. Following these steps guarantees behavior preservation, single-source-of-truth registry consistency, and zero changes required in company marketing codebase.

---

## 1. Register the Product in `@noevix/products`

Open `packages/products/src/index.ts` and append your product definition to `PRODUCTS`:

```typescript
export const PRODUCTS: Product[] = [
  // ... existing products (e.g. Noevix Chat)
  {
    slug: 'my-new-product',
    name: 'Noevix Codex',
    tagline: 'Autonomous code verification and invariant testing.',
    status: 'live', // or 'soon' for upcoming product teaser
    url: process.env.VITE_CODEX_APP_URL || '/codex',
    order: 2,
    description: 'Deep static analysis engine that checks behavioral invariants across distributed systems.',
    category: 'Engineering & Verification',
    badge: 'NEW',
  },
];
```

Because the company site's `/products` directory and homepage directory section render dynamically from `@noevix/products`, your new product will immediately appear with consistent styling, cards, and launch actions.

---

## 2. Scaffold the Product Application

Create a new application directory under `/apps`:

```bash
mkdir -p apps/my-new-product/src
```

Create `apps/my-new-product/package.json`:

```json
{
  "name": "@noevix/app-my-new-product",
  "version": "1.0.0",
  "private": true,
  "type": "module",
  "scripts": {
    "dev": "vite",
    "build": "vite build",
    "preview": "vite preview"
  },
  "dependencies": {
    "@noevix/design-system": "*",
    "@noevix/products": "*",
    "@noevix/config": "*",
    "react": "^19.0.1",
    "react-dom": "^19.0.1",
    "lucide-react": "^0.546.0"
  }
}
```

---

## 3. Configure Entry Points & Styles

Import the unified theme and styles from `@noevix/design-system`:

```tsx
// apps/my-new-product/src/main.tsx
import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App.tsx';
import '@noevix/design-system/styles/tokens.css';
import '@noevix/design-system/styles/components.css';
import '@noevix/design-system/styles/globals.css';

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
);
```

---

## 4. Verification Checklist

1. **Monochrome / Aura Constitution**: Ensure the new app imports `@noevix/design-system` so all design tokens, font hierarchy, and aura background effects match pixel-for-pixel.
2. **Independent Deployment**: Run `npm run build --workspace=@noevix/app-my-new-product` to confirm the app bundles cleanly with zero external marketing leakage.
3. **Company Site Launch Link**: Confirm that clicking the product card on the company website launches the application at its registered URL.
