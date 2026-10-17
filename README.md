# Noevix — Production-Grade AI Intelligence System

Noevix presents itself to users as **one unified intelligence**, powered by an adaptive routing architecture and five role-prompted specialist modules running behind a singular, ultra-responsive interface.

Users never observe internal codenames, routing JSON, or multi-agent mechanics; they interact with a single coherent voice and an optional interactive **lens chip** (`Engineering`, `Design`, `Research`, `Reasoning`, `Writing`).

---

## 1. Quick Start

### Prerequisites
- Node.js 20+
- npm or pnpm

### Development
```bash
# 1. Install dependencies
npm install

# 2. Start full-stack dev server (Express backend + Vite client on port 3000)
npm run dev
```

Visit `http://localhost:3000` to interact with Noevix.

---

## 2. Architecture Overview

```
                                +-------------------+
                                |    User Client    |
                                +---------+---------+
                                          |
                              POST /v1/chat (SSE Stream)
                                          |
                                          v
+-----------------------------------------------------------------------------------+
| Noevix Orchestration Engine                                                       |
|                                                                                   |
|  1. Heuristic Pre-Router (Sub-ms regex/syntax match: Confidence >= 0.82)         |
|         │                                                                         |
|         ├──────── Speculative Dispatch ─────────┐                                 |
|         v                                       v                                 |
|  2. Kybernes Router (Zod JSON-schema)   Speculative Specialist Generation         |
|         │                                       │                                 |
|         └──────── Validation & Agreement ───────┘                                 |
|                                                                                   |
|  3. Prompt Assembler (Strict 4-Block Prefix Caching)                              |
|     - Block 1: Constitution (Identical bytes, SHA-256 hashed, Canary token)       |
|     - Block 2: Specialist Role Module (Techne, Morphe, Gnosis, Logos, Rhetor)     |
|     - Block 3: Session State (Compact summary & preferences JSON)                 |
|     - Block 4: Dynamic Turn (Handoff note + Bounded history N=6 + Sandboxed Tools)|
|                                                                                   |
|  4. Tool Execution (Registry with Zod Validation)                                 |
|     - Web Search (DuckDuckGo provider abstraction)                                |
|     - Document Retrieval (Lexical chunking & TF-IDF scoring over user uploads)   |
|     - Sandboxed Code Execution (Feature flag `CODE_EXEC_ENABLED=false`)          |
|                                                                                   |
|  5. Canary Scan & Artifact Extractor (Fenced code, documents, HTML previews)     |
+-----------------------------------------+-----------------------------------------+
                                          |
                                          v
                               +--------------------+
                               |  Inference Backend |
                               |  (Swappable)       |
                               +--------------------+
```

---

## 3. Swappable Inference Backends

Noevix implements a universal `InferenceBackend` interface (`/src/api/inference/types.ts`). You can seamlessly switch backends without altering application logic:

### Option A: NVIDIA NIM (Hosted or Self-Hosted)
Set in `.env`:
```bash
INFERENCE_BACKEND="nim"
NVIDIA_NIM_API_KEY="nvapi-..."
NVIDIA_NIM_BASE_URL="https://integrate.api.nvidia.com/v1"
ROUTER_MODEL="meta/llama-3.2-3b-instruct"
FAST_MODEL="meta/llama-3.1-8b-instruct"
DEEP_MODEL="meta/llama-3.1-70b-instruct"
```

### Option B: Generic OpenAI-Compatible (vLLM / SGLang / Local)
```bash
INFERENCE_BACKEND="openai"
OPENAI_API_BASE="http://localhost:8000/v1"
OPENAI_API_KEY="none"
ROUTER_MODEL="meta-llama/Llama-3.2-3B-Instruct"
FAST_MODEL="meta-llama/Llama-3.1-8B-Instruct"
DEEP_MODEL="meta-llama/Llama-3.1-70B-Instruct"
```

### Option C: Google Gemini API (Server-Side)
```bash
INFERENCE_BACKEND="gemini"
GEMINI_API_KEY="AIzaSy..."
ROUTER_MODEL="gemini-3.8-flash"
FAST_MODEL="gemini-3.8-flash"
DEEP_MODEL="gemini-3.8-flash"
```

### Option D: Deterministic Mock Backend
When no API key is provided, Noevix runs in deterministic Mock mode with scripted testing scenarios (`fast`, `slow`, `tool_use`, `artifact`, `error`, `rate_limit`, `mid_stream_disconnect`).

---

## 4. Evaluation Harness & Benchmarks

The evaluation system in `/packages/evals` assesses routing precision, rubric compliance, and latency against a 40-case hand-written seed dataset.

Run via CLI:
```bash
npx tsx -e "import { runEvaluationHarness } from './packages/evals/eval_harness.ts'; runEvaluationHarness().then(r => console.log(r.summary));"
```
Or open the **Eval Harness & Benchmarks** modal directly inside the Noevix web UI (`Cmd+K -> Run Evaluation Harness` or bottom rail button).

---

## 5. Security Architecture

Detailed in `SECURITY.md`:
1. **Prompt Injection Defense**: Router is tool-free; tool outputs encapsulated in rigid delimiters; Constitution treats instructions as data.
2. **Canary Leakage Detection**: `NOEVIX-SENTINEL-9924-K7X` embedded in Block 1 halts and redacts output if system instructions leak.
3. **Workspace Isolation**: Artifact previews execute in a sandboxed iframe with strict CSP (`default-src 'none'`).
4. **User Privacy**: Consent flag (`user_logging_consent`) gates prompt storage.

---

## 6. Known Limitations & Next 3 Improvements

1. **Embedding-Based Pre-Router**: Replace pure regex heuristics with a tiny 2MB ONNX vector classifier for even higher pre-router hit rates on ambiguous conversational turns.
2. **Persistent pgvector Retrieval**: Upgrade in-memory chunking to persistent `pgvector` or `sqlite-vec` for multi-gigabyte document libraries.
3. **Multi-turn Context Branch Merging**: Add git-style merge previews when branching across multiple edited turns in deep technical troubleshooting sessions.
