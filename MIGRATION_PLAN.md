# MIGRATION_PLAN.md - Noevix Monorepo Restructuring Plan

## 1. Executive Summary & Audit (Step 0)
The Noevix repository is undergoing a behavior-preserving architectural extraction. The current unified repository is being restructured into an npm workspace monorepo separating:
1. **Company Site** (`/apps/company`): The startup's public website, identity, product directory, and per-product launchpads.
2. **Product App: Chat** (`/apps/chat`): The standalone reasoning instrument / chatbot application (main route `/`), its complete backend API, and execution pipeline.
3. **Shared Packages** (`/packages/*`):
   - `/packages/design-system`: Design tokens, typography, CSS variables, global CSS, shared primitives, and the reactive Aura engine.
   - `/packages/products`: Product registry single source of truth (`type Product`).
   - `/packages/config`: Shared environment variable validation, constants, URLs.
   - `/packages/contracts`: Schemas, mission specifications, and wire interfaces.
   - `/packages/auth`: Shared auth token keys and session utilities.

---

## 2. Comprehensive Inventory Table

| Existing Item | Type | Classification | Target Location | Rationale |
|---|---|---|---|---|
| `src/components/marketing/MarketingPage.tsx` | Page | COMPANY | `apps/company/src/pages/HomePage.tsx` | Main company marketing landing page. |
| `src/components/marketing/MarketingNav.tsx` | Component | COMPANY | `apps/company/src/components/MarketingNav.tsx` | Company navigation header with Products link. |
| `src/components/marketing/ui.tsx` | Primitives | COMPANY | `apps/company/src/components/ui.tsx` | Marketing-specific layout primitives. |
| `src/content/marketing.ts` | Content | COMPANY | `apps/company/src/content/marketing.ts` | Marketing copy and enterprise FAQs. |
| `src/components/editorial/Stage.tsx` | Component | PRODUCT | `apps/chat/src/components/Stage.tsx` | Chat document workspace and exchange turns. |
| `src/components/editorial/Dock.tsx` | Component | PRODUCT | `apps/chat/src/components/Dock.tsx` | Floating prompt composer & model/lens selector. |
| `src/components/editorial/TopBar.tsx` | Component | PRODUCT | `apps/chat/src/components/TopBar.tsx` | Chat top bar with space title, index trigger. |
| `src/components/editorial/EmptyState.tsx` | Component | PRODUCT | `apps/chat/src/components/EmptyState.tsx` | Chat empty state with quick starts & dot matrix. |
| `src/components/editorial/SideRail.tsx` | Component | PRODUCT | `apps/chat/src/components/SideRail.tsx` | Chat left quick rail. |
| `src/components/editorial/TimelineRail.tsx` | Component | PRODUCT | `apps/chat/src/components/TimelineRail.tsx` | Chat right timeline scrubbing rail. |
| `src/components/editorial/IndexOverlay.tsx` | Component | PRODUCT | `apps/chat/src/components/IndexOverlay.tsx` | ⌘K space index and search modal. |
| `src/components/editorial/SettingsModal.tsx` | Component | PRODUCT | `apps/chat/src/components/SettingsModal.tsx` | Chat local preferences modal. |
| `src/components/editorial/SpacesMenu.tsx` | Component | PRODUCT | `apps/chat/src/components/SpacesMenu.tsx` | Chat space switcher menu. |
| `src/components/editorial/ArtifactSheet.tsx` | Component | PRODUCT | `apps/chat/src/components/ArtifactSheet.tsx` | Chat code/artifact inspector sheet. |
| `src/components/editorial/AuthModal.tsx` | Component | SHARED | `packages/design-system/src/components/AuthModal.tsx` | Shared user auth dialog used across apps. |
| `src/components/editorial/OnboardingModal.tsx`| Component | PRODUCT | `apps/chat/src/components/OnboardingModal.tsx` | Chat first-turn onboarding guide. |
| `src/components/editorial/CodeEditorBlock.tsx`| Component | PRODUCT | `apps/chat/src/components/CodeEditorBlock.tsx`| Shiki code block renderer. |
| `src/components/aura/Aura.tsx` | Component | SHARED | `packages/design-system/src/components/Aura.tsx` | Reusable reactive aura lighting effect. |
| `src/components/aura/AuraEngine.tsx` | Engine | SHARED | `packages/design-system/src/components/AuraEngine.tsx` | GPU aura animation engine. |
| `src/components/lab/AuraLab.tsx` | Page/Tool | SHARED | `apps/company/src/pages/AuraLab.tsx` / `apps/chat` | Aura calibration playground. |
| `src/components/mission/*` | Components | PRODUCT | `apps/chat/src/components/mission/*` | Verifiable mission orchestration view. |
| `src/styles/tokens.css` | Styles | SHARED | `packages/design-system/src/styles/tokens.css` | Design tokens and CSS custom properties. |
| `src/styles/components.css` | Styles | SHARED | `packages/design-system/src/styles/components.css` | Button, card, and typography component styles. |
| `src/styles/globals.css` | Styles | SHARED | `packages/design-system/src/styles/globals.css` | Base resets and font assignments. |
| `src/lib/theme.ts` | Lib | SHARED | `packages/design-system/src/theme.ts` | Theme switching and localStorage management. |
| `src/lib/markdown.tsx` | Lib | SHARED | `packages/design-system/src/markdown.tsx` | Markdown formatting utility. |
| `src/lib/store.ts` | Store | PRODUCT | `apps/chat/src/lib/store.ts` | Chat application state machine (Zustand). |
| `src/lib/missionStore.ts` | Store | PRODUCT | `apps/chat/src/lib/missionStore.ts` | Mission execution state store. |
| `src/lib/mockStream.ts` | Lib | PRODUCT | `apps/chat/src/lib/mockStream.ts` | Simulated streaming responses. |
| `src/lib/sse_parser.ts` | Lib | PRODUCT | `apps/chat/src/lib/sse_parser.ts` | SSE streaming decoder. |
| `src/api/*` | API / Backend | PRODUCT | `apps/chat/src/api/*` & server endpoints | Inference, routing, security, and telemetry. |
| `packages/prompts/*` | Prompts | PRODUCT | `apps/chat/prompts/*` | System constitution and specialized prompts. |
| `packages/contracts/*` | Schemas | SHARED | `packages/contracts/*` | Data wire contracts and schemas. |
| `packages/evals/*` | Evals | PRODUCT | `apps/chat/evals/*` | Model evaluation harness and seed data. |
| `.env.example` | Config | SHARED | `packages/config/.env.example` & app envs | Env var definitions. |

---

## 3. Import Edge Analysis & Decoupling

### Identified Cross-Boundary Import Edges:
1. **Edge**: `MarketingPage.tsx` directly imported `useChatStore` from `src/lib/store.ts` to trigger navigation (`setCurrentView('app')`) and open auth modal.
   - **Resolution**: Company app now imports the single-source-of-truth product registry from `@noevix/products`. The launch CTA ("Start for free", "Launch", etc.) navigates cleanly to the Chat application's registered URL (`products.chat.url`). The Chat store remains isolated in `apps/chat`.
2. **Edge**: `MarketingPage.tsx` and `App.tsx` shared `<Aura />` from `src/components/aura/Aura.tsx` and `src/styles/*.css`.
   - **Resolution**: Move all styling, tokens, and the `<Aura />` component to `@noevix/design-system`. Both applications import from `@noevix/design-system`.
3. **Edge**: `SideRail.tsx` in the chatbot had navigation links back to `setCurrentView('marketing')`.
   - **Resolution**: Per Constraint **C2** ("Any cross-navigation between company and product lives only in the company site. Do not add any new visible element, link, or button inside the chatbot UI"), the chatbot runs as its own standalone application. In `SideRail.tsx`, the home icon navigates to the chat root `/`, and the company site links directly to the chat app.

---

## 4. Workspaces and Verification Milestones
- **Milestone 1**: Extract `@noevix/design-system`, `@noevix/products`, and `@noevix/config`.
- **Milestone 2**: Setup `apps/chat` as an independent runnable app containing all product and API routes.
- **Milestone 3**: Setup `apps/company` with landing page, new product directory (`/products`), and individual product page (`/products/chat`).
- **Milestone 4**: Configure root unified dev server and deployment proxies to serve company site at `/` and product app at `/chat`, with independent builds for each app.
- **Milestone 5**: Full validation via `compile_applet`, typecheck, and bundle isolation checks.
