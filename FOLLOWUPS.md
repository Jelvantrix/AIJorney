# FOLLOWUPS.md - Recorded Anomalies and Future Action Items

Per Constraint **C6** ("If something looks wrong, buggy, or improvable, DO NOT fix it. Record it in FOLLOWUPS.md and keep going"), this file documents pre-existing issues and technical debt detected during migration without modifying existing behavior.

---

### F-001: Monochrome Check Failure on `tokens.css`
- **Location**: `src/styles/tokens.css` (lines 186-187)
- **Observed**: Values `#f7f7f8` and `#efeff1` have a slight non-zero saturation, triggering a failure in `node scripts/check-monochrome.js`.
- **Constraint Compliance**: C1 & C6 forbid changing visual styling or fixing bugs during the extraction. Kept identical and tracked here for a dedicated post-migration lint cleanup pass.

### F-002: Vite Configuration Native Loader Warning
- **Location**: `vite.config.ts` (line 11)
- **Observed**: Vite warning regarding `__dirname` usage under native config loading.
- **Action**: Kept as-is to preserve existing configuration syntax without introducing unsolicited refactoring.

### F-003: Bundle Size Optimization for Shiki Syntax Highlighter
- **Location**: Product chat bundle (`CodeEditorBlock.tsx` and Shiki dynamic loaders)
- **Observed**: Shiki contributes ~500kB to client chunk size.
- **Action**: Left unchanged to guarantee zero degradation or behavioral change in code rendering.
