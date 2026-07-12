# AGENTS.md — Cycling-ADSC Handover

> **Living handover.** Read this first, then the active plan. **Append a row to the Step Log (§7) after every step** with an ISO timestamp + your model name + commit hash. Keep §1–§6 current so the next agent can take over cold.
>
> **Active plan:** [`docs/plans/PLAN_v1.0.0_ux-refinement.md`](docs/plans/PLAN_v1.0.0_ux-refinement.md) — execute top-to-bottom, commit each step. Superseded plans live in `docs/plans/old/`.

---

## 1. What this is
CEO-level interactive presentation of the **Abu Dhabi Cycling Network** (ADSC), built from two source PDFs (2022 Basis of Design + Dec 2025 Progress Status). It transforms static reports into a premium, animated "spatial story": an interactive map + chaptered narrative + executive dashboard + assistant. Must stay **premium, bilingual (EN/AR + RTL), dark/light themed, responsive (mobile/tablet/desktop), animation-rich, and AI-driven**. Direction = refinement of the existing app, never a rewrite. Preserve ADSC gold branding + glass/liquid-glass aesthetic.

## 2. Stack & run
- **Stack:** React 19 · Vite 7 · TypeScript · Tailwind 3 (`darkMode:"class"`, `:root`=light / `.dark`=dark) · Zustand · framer-motion ^12 · GSAP ^3.13 · Lenis · ECharts · mapbox-gl (no token → the bespoke **SVG map** in `GeoJsonRouteOverlay` is what renders — this is the intended star) · lucide-react. **Not installed:** three.js, anime.js, openai SDK.
- **Run (dev):** `npm run dev` → `127.0.0.1:5173` (autoPort may shift it). Prefer the **Claude_Preview MCP** (`preview_start` name `cycling-adsc-dev` from `.claude/launch.json`) over Bash for running/inspecting.
- **Build:** `npm run build` (`tsc -b && vite build`). Typecheck only: `npx tsc --noEmit`.
- **Env:** `.env.local` (gitignored) → `OPENAI_API_KEY`. See `.env.example`. **⚠️ The OpenAI key previously pasted into chat is compromised — rotate it in the OpenAI dashboard. Never commit any key; no secret may reach the client bundle.**

## 3. Architecture map (verified 2026-07-10)
- **Live tree** (`src/App.tsx`): `<AmbientBackground/>` + `<Hero/>` + `<StoryExperience/>` + `<ProjectAssistant/>` + presenter bar. The source/evidence section and persistent header were removed per client review; language/theme now float inside the hero.
- **Controls today:** language + theme are independent hero controls. Presenter/tour, pan/zoom/reset, and the seven-route filter legend live inside the map.
- **Store** (`src/store/useNetworkStore.ts`): `selectedRouteId, soloRouteId, visibleTypes, playback, speed, theme, locale, query, presenter, tour` + setters.
- **Story** (`src/components/StoryExperience.tsx`): 11 steps — `vision, value, principles, users, strategy, route-types, network, progress, kpis, future, ask`. Currently **all panels rendered stacked + scrolled**; active step set by a center-band `IntersectionObserver`. Right-column preview components + `src/components/ExecDataviz.tsx` (`ForecastTimeline, StructuresContractors, BudgetGauge`).
- **Map** (`src/components/NetworkMap.tsx`): SVG overlay, `viewBox 0 0 1000 620`, `preserveAspectRatio="xMidYMid slice"`. Only a programmatic viewBox camera tween (no user pan/zoom yet). `projectOverlayPoint()` = lng/lat → SVG coords.
- **Data** (`src/data/network.ts`): 7 `networkRoutes`, `milestones`, `programme` (budget 1.7B/4B, HSCT 90%). **Canonical totals: planned 409.71 km · completed 219.01 km · remaining 190.7 km · 53%.**
- **i18n** (`src/i18n.ts`): `uiCopy{en,ar}`, `storyText{en,ar}`, `routeTypeName`, `statusText` (`"design-build":"Design & Build"`), helpers `routeName/routeLabel/routeDescription/formatForecast`. New string ⇒ add under **both** locales.
- **Assistant** (`src/components/ProjectAssistant.tsx`): **rule-based only** (`answerQuestion()` keyword chain) — no AI/fetch yet.
- **Small comps:** `CountUp.tsx`, `Preloader.tsx`, `EvidenceSource.tsx`.

## 4. Locked decisions (v1.0.0)
1. **AI = serverless proxy** (`/api/assistant`, `/api/insights`); key server-side only; rule-based assistant is the offline fallback.
2. **Story = tab-driven single-viewport fly-in deck** (framer-motion `AnimatePresence`); no inter-chapter scrolling.
3. **Layout = equal-height map + story rail with an in-flow KPI card above**; full-width primary title + compact tabs on top. No persistent app header or sticky KPI overlay.
4. **Animation = framer-motion + GSAP** only.

## 5. Known pitfalls (do NOT relearn these)
- **Glass rule** (`styles.css` ~769-803) forces `position:relative; overflow:hidden` on 25 selectors → any new `sticky` element must be **re-asserted after** it (see `.story-kpi-bar` at ~870).
- **framer-motion `whileInView` with `amount` > ~0.1 never fires on tall panels** (the exec dashboard is ~3400px) → keep `amount ≤ 0.06` or use presence/center-band. Same math breaks IntersectionObserver ratio thresholds.
- **`dir="rtl"` (Arabic) leaks into inline SVG** and breaks `<text>` anchoring → keep map SVG + timelines `direction:ltr` (already patched in `styles.css`).
- **Light theme has dark islands:** `.hero`, `.presenter-bar`, `.tour-hud`, `.floating-panel` text, NetworkMap `bg-obsidian*` badges, Tailwind named colors (`obsidian/ink/pearl/asphalt`) don't flip. The `.story-shell` light patch (`styles.css` ~1337) doesn't reach content outside `.story-shell`.
- **Vite + Windows** can serve an **empty module transform** after an edit (no error; page throws "does not provide export X") → **touch the file's mtime** to bust it.
- **Verify computed `opacity`/`position`/`viewBox`, not just DOM presence** — content can be mounted but invisible (caused the "empty dashboard" bug).
- **Never leave a dead-feeling button** — every action needs immediate visible feedback (a prior "Fly the network" fired 5s later with no motion and read as broken).

## 6. Deployment (AI proxy — fill in when Step 6 lands)
- Dev proxy = Vite middleware reading `.env.local`; the rule-based assistant is the verified fallback when the key is absent. Production `/api/*` hosting remains Step 6 work. Required server variable: `OPENAI_API_KEY`.

## 7. Step Log (append after every step)
| Step | Status | Timestamp (ISO) | Model | Commit | Notes |
|------|--------|-----------------|-------|--------|-------|
| Planning + docs (Step 0.2/0.3) | done | 2026-07-10 | claude-opus-4-8 | _(uncommitted)_ | Authored PLAN v1.0.0 + this handover after 3-agent codebase exploration. Prior session (Fable 5) fixed the empty-dashboard bug + tour/presenter feedback (uncommitted on `main`). Next agent starts at **Step 0.1** (branch `feat/ux-refinement-v1`, commit baseline). |
| Step 0.1 — baseline branch | done | 2026-07-10T14:15:13+03:00 | GPT-5 Codex | `02d90e7` | Created `feat/ux-refinement-v1` and committed the prior working application as the restore point. |
| Step 0.4/0.5 — environment safety | done | 2026-07-10T14:17:12+03:00 | GPT-5 Codex | `787811f` | Added ignored server-only env files, a safe committed template, runtime ignores, and confirmed GSAP/Framer Motion + clean TypeScript. |
| Step 1 — controls and theme parity | done | 2026-07-10T15:00:17+03:00 | GPT-5 Codex | `1d4ea86` | Split localized language/theme controls, added reusable outside/Escape dismissal, tokenized hero/map/assistant/presenter/tour surfaces, and visually verified EN/AR + light/dark with no console errors. |
| Step 2 — top chrome and KPI layout | done | 2026-07-10T16:06:13+03:00 | GPT-5 Codex | `4aa0a87` | Added sticky ADSC top bar, full-width network title, compact top tabs, symmetric sticky 2×2 KPI card, shared card tokens, responsive QA at 375/1280, and fixed negative rAF counter/preloader timing. |
| Step 3 — animated story deck | done | 2026-07-10T16:21:53+03:00 | GPT-5 Codex | `5b46dad` | Replaced stacked chapters/observer with one AnimatePresence panel, directional RTL-aware choreography, staggered reveals, reduced-motion fallback, animated bicycle progress, prev/next + keyboard navigation, animated KPI tiles, and verified CTA/map sync. |
| Step 4 + client review refinement | done | 2026-07-12T19:05:00+03:00 | GPT-5 Codex | `40c10a6` | Added SVG map pan/zoom/reset, in-map route legend/tour/presenter controls, removed header/evidence, moved KPIs into flow, matched map/deck heights, compacted chapter content, and added secure dev AI proxy + offline assistant fallback. QA: EN/AR, light/dark, 375/1280, all desktop chapters, TypeScript/build, secret scan. |
