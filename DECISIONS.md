# DECISIONS.md - Noevix Architectural & Product Decisions

This document records architectural, product, and implementation decisions made during the design and construction of Noevix, along with rejected alternatives and trade-offs.

---

### D-001: Monorepo & Single-Process Express + Vite Server
- **Decision**: Run backend orchestration routes (`/v1/*`, `/api/*`, `/healthz`, `/readyz`) and the Vite-driven application in a single unified Node.js process using Express and `vite.middlewares` in development, serving the built SPA in production.
- **Alternative Rejected**: Multi-port setups with separate reverse proxies.
- **Rationale**: Eliminates cross-port connection fragility in sandboxed iframe environments, provides zero-latency in-memory message bus and SSE event streams, and preserves `/packages/*` monorepo contracts.

### D-002: Strict Monochrome "Light in a Dark Room" Constitution
- **Decision**: Absolute zero-hue visual discipline. Colors are exclusively black (`#000000`), white (`#FFFFFF`), and neutral grays (rgba values with equal R, G, B channels). No accent colors, no colored status badges, no colored syntax themes. Code blocks utilize font-weight and opacity differences. A CI test script (`scripts/check-monochrome.js`) validates all CSS on build.
- **Alternative Rejected**: Subtle saturated accents or branded purple/blue glows.
- **Rationale**: Design Constitution Section 0 requirement: "Concept: light in a dark room. Zero hue anywhere... If any pixel has nonzero saturation, it is a bug."

### D-003: Editorial Document Stage Layout (No Chat Bubbles, No Left Sidebar)
- **Decision**: Replace conventional chat bubble threads and left sidebar history with:
  1. **Top Bar** (48px): Transparent, fades in on hover, displays "Noevix" in Instrument Serif, space title, Index trigger (⌘K), theme toggle, avatar/auth menu.
  2. **The Stage**: Editorial document where each turn is an article section. User prompt is an uncontained Instrument Serif 32px headline; response is an article body (Geist 17px/1.7) max 720px width. Left 160px margin holds metadata (lens name, elapsed time, token count) and branch switcher (`1 / 2`).
  3. **The Dock**: Floating composer at bottom center surrounded by Aura edge light, expanding up to 40vh. Centered in empty state with "Begin." then smoothly gliding to bottom.
  4. **The Timeline Rail**: 24px vertical strip on right with ticks per exchange and hover preview snippets.
  5. **Index Overlay (⌘K)**: Fullscreen blurred overlay hosting spaces grouped by date, search, settings, and export.
- **Alternative Rejected**: Traditional left sidebar + chat bubble column.
- **Rationale**: Strict compliance with forbidden list in Section 0: "No left sidebar chat history. No centered narrow column of bubbles. No bubbles for either side. No avatar logos beside messages."

### D-004: GPU-Friendly Reactive Monochrome Aura Component
- **Decision**: Reusable `<Aura />` component driven by a smoothed `--energy` CSS variable (0.0 to 1.0) with state machine transitions:
  - `idle`: 0.25 (6s breathing cycle)
  - `typing`: 0.50 (scales with keystroke rate)
  - `thinking`: 0.70 (slow pulse prior to first token)
  - `streaming`: 0.60–1.00 (modulated by token generation speed)
  - `error`: momentary flicker then return to idle (strictly monochrome, zero red)
  - `done`: smooth decay over 800ms
  Animated purely via `transform` and `opacity` (no animated blur filters). Includes SVG feTurbulence grain overlay, rotating conic border edge light using `@property --angle`, and accessibility respect for `prefers-reduced-motion` and a "Reduce effects" user setting.
- **Alternative Rejected**: Canvas-based particle rendering or CPU-heavy SVG animation.
- **Rationale**: Guarantees 60fps performance and zero layout shifts while providing atmospheric presence.

### D-005: Swappable Inference Backend with Universal Interface
- **Decision**: Unified `InferenceBackend` interface supporting:
  1. NVIDIA NIM via OpenAI-compatible endpoints (`/v1/chat/completions`). (Note: Production self-hosting requires an NVIDIA AI Enterprise license; the Developer Program hosted catalog is for dev/test).
  2. Generic OpenAI-compatible local server (vLLM / SGLang).
  3. Server-side Gemini API provider fallback using `@google/genai`.
  4. Scripted high-fidelity MockBackend supporting all edge cases (fast, slow, tool use, artifact, error, rate limit, mid-stream disconnect).
- **Alternative Rejected**: Hardcoding a single proprietary SDK across the application.
- **Rationale**: Strict adherence to backend swappability and reliability without third-party vendor lock-in.

### D-006: Single Intelligence with Role-Prompted Specialists & Canonical Lenses
- **Decision**: Present Noevix as ONE unified intelligence. Internally, a lightweight router ("Kybernes") and five specialized prompt modules (`Techne`, `Morphe`, `Gnosis`, `Logos`, `Rhetor`) synthesize responses. The client UI maps these strictly to neutral user-facing Lens names:
  - `Techne` -> `Engineering`
  - `Morphe` -> `Design`
  - `Gnosis` -> `Research`
  - `Logos` -> `Reasoning`
  - `Rhetor` -> `Writing`
  Internal specialist codenames are never exposed to clients, API responses, or UI.
- **Alternative Rejected**: Showing multi-agent avatars or committee discussions.
- **Rationale**: Meets core premise: "Noevix presents as ONE intelligence."

### D-007: 4-Block Prefix-Cache Optimized Prompt Assembly
- **Decision**: Assemble prompts in immutable-to-mutable byte order:
  1. Block 1: Constitution (`constitution.v1.md`, identical bytes, prompt canary included)
  2. Block 2: Specialist Role Module (`<specialist>.v1.md`)
  3. Block 3: Session State (compact JSON)
  4. Block 4: Dynamic Turn (handoff note, last 6 turns, user query, tool data)
  Hashes (SHA-256) of each block are computed and tracked in turn telemetry.
- **Alternative Rejected**: Unstructured string concatenation.
- **Rationale**: Maximizes KV-cache hit rates on modern LLM serving engines.

### D-008: Word-Level Reveal Animation for Streamed Output
- **Decision**: Apply an opacity 0 -> 1 and 3px blur -> 0 transition over 160ms strictly to the newest 12 words of incoming streaming text, leaving historical words completely static.
- **Alternative Rejected**: Re-rendering or re-animating the whole message block on every token.
- **Rationale**: Eliminates DOM layout thrashing, ensures smooth reading flow, and achieves first-token rendering within one frame.

### D-009: Monorepo Topology & Package Separation
- **Decision**: Structure the repository into `/apps/company`, `/apps/chat`, and `/packages/{design-system,products,config,contracts,auth}` using standard npm workspaces.
- **Alternative Rejected**: Polyrepo across multiple Git repositories.
- **Rationale**: Preserves rapid development, allows unified type checking across shared design system tokens and product contracts, and fits the single-port AI Studio preview environment requirements.

### D-010: Product App Slug Choice (`chat`)
- **Decision**: Designate `chat` as the primary product slug (`/apps/chat`, route `/chat` in unified development and standalone root `/` when deployed independently).
- **Alternative Rejected**: `reasoning-instrument` or `app`.
- **Rationale**: The existing codebase describes the reasoning client as chat ("Chat is one possible client of the mission system" in architecture brief). `chat` is the standard concise URL-safe slug.

### D-011: Unified Port 3000 Development Server & Path-Based Local Routing
- **Decision**: Keep the dev server running on port 3000 with unified Express middleware serving the Company website at `/`, `/products`, and `/products/chat`, while serving the standalone Chat product at `/chat` (with backend routes at `/v1` and `/api`), while allowing each app to build and bundle strictly isolated outputs.
- **Alternative Rejected**: Running two simultaneous dev server ports (breaks single port 3000 AI Studio dev environment).
- **Rationale**: AI Studio enforces a single dev server process on port 3000. This setup allows both independent production deploys and seamless local previewing.

### D-012: Zero Marketing Leakage into Chatbot App
- **Decision**: Strictly isolate `apps/chat` from company marketing copy, logos, or directory pages. Per Constraint C2, no cross-navigation back to the company site is inserted inside the chatbot UI.
- **Alternative Rejected**: Adding a "Back to Noevix Home" top-bar button inside the chatbot.
- **Rationale**: Constraint C2 explicitly forbids adding any new visible element, link, or button inside the chatbot UI.

