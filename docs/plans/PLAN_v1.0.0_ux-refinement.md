# Cycling-ADSC — UX/UI Refinement Plan v1.0.0

> **Status:** APPROVED 2026-07-10 · **For the next agent to execute.** Follow top-to-bottom. Every step ends with QA + a git commit. Tick the `[ ]` boxes as you finish. Update `AGENTS.md` (repo root) after every step with an ISO timestamp + your model name + commit hash.
>
> This is the canonical, versioned in-repo copy. (A working copy also exists at `C:\Users\Mbluelap\.claude\plans\velvet-seeking-yeti.md`; this file is the source of truth.)

---

## Context — why this work exists

The app (`D:\Alchemy\ADSC\Cycling-ADSC`) is a CEO-level interactive presentation of the Abu Dhabi Cycling Network, built from two source PDFs (2022 Basis of Design + Dec 2025 Progress Status). A prior session rebuilt it into a scroll-driven "spatial story" (map + 11 chapters + executive dashboard + rule-based assistant). The client has now reviewed it and requested 12 concrete UX/UI refinements: split language/theme controls, a fixed executive KPI card, top-mounted compact story tabs, a **tab-driven single-viewport fly-in card deck** (no scrolling to the next card), a clickable in-map track legend replacing the "Design & Build" caption, in-map floating controls, removal of repeated figures, a full-width map title, universal card symmetry, full map pan/zoom, complete light/dark parity, and a **fully AI-driven** assistant + generative insights. The outcome must stay premium, bilingual (EN/AR + RTL), themed (dark/light), responsive (mobile/tablet/desktop), animation-rich, and architecturally continuous with what exists — this is refinement, not a rewrite.

### Locked decisions (confirmed with client — they deferred to recommendations)
1. **AI = serverless proxy.** `OPENAI_API_KEY` stays server-side; the browser calls `/api/*`. The rule-based assistant remains as a graceful offline fallback. **⚠️ The API key the client pasted into chat is compromised — instruct them to rotate it in the OpenAI dashboard and never commit any key.**
2. **Story = tab-driven single-viewport deck.** One chapter card visible at a time, swapped by top tabs + prev/next, animated with framer-motion `AnimatePresence`. No inter-chapter scrolling.
3. **Layout = map hero + right story rail + fixed top-right KPI card.** Full-width primary title + compact tabs on top.
4. **Animation stack = Framer Motion + GSAP** (both already installed). No three.js/anime.js.

---

## Current architecture (verified — trust this map)

- **Stack:** React 19, Vite 7, TypeScript, Tailwind 3 (`darkMode:"class"`), Zustand, framer-motion ^12, GSAP ^3.13, Lenis, ECharts, mapbox-gl (no token → SVG fallback renders), lucide-react. No three.js / anime.js / openai pkg. No `.env`.
- **Entry/live tree** (`src/App.tsx`): `<AmbientBackground/>` + `<Hero/>` + `<StoryExperience/>` + `<EvidenceSource/>` + `<ProjectAssistant/>` + presenter bar. Everything below `App.tsx:247` is dead-coded behind `{false && (…)}` — a `Header` component (with already-separate lang/theme buttons and theme-safe `.app-header` CSS) is defined but **never rendered**.
- **Controls today:** language + theme toggles are **combined** in an `accessibility-popover` inside `Hero` (`App.tsx` ~621-642), labels hardcoded EN. Presenter/tour buttons are **page-level** in `StoryExperience.tsx` `.story-map-controls` (~336-346), not in the map.
- **Store** (`src/store/useNetworkStore.ts`): `selectedRouteId, soloRouteId, visibleTypes, playback, speed, theme, locale, query, presenter, tour` + setters (`setTheme, setLocale, setSelectedRouteId, setSoloRouteId, setVisibleTypes, toggleType, setPlayback, setSpeed, setPresenter, setTour, setQuery`).
- **Story** (`src/components/StoryExperience.tsx`, ~837 lines): 11 steps — `vision, value, principles, users, strategy, route-types, network, progress, kpis, future, ask`. Layout = `.story-shell` → `.story-kpi-bar` (4 `StoryKpi`) + `.story-layout` → `.story-map-column` (sticky map + `.story-chapter-nav` + `.story-live-caption`) and `.story-content-column`. **All 11 `motion.article` panels are rendered stacked and scrolled**; active state is a CSS class set by a center-band `IntersectionObserver`. framer-motion usage is minimal (one `whileInView` reveal).
- **Right-column previews** (same file + `src/components/ExecDataviz.tsx`): `NetworkGlobe, ValueBeat, PrinciplesPreview, UserGroupPreview, NetworkStrategyPreview, RouteTypePreview, NetworkFocusPreview, ExecutiveProgressDashboard, ExecutiveInsights, ForecastTimeline, MilestonePreview, CompletionInsights, TheAsk, StructuresContractors, BudgetGauge`.
- **Map** (`src/components/NetworkMap.tsx`): `variant="story"` renders `story-map-frame` + `GeoJsonRouteOverlay` (SVG, `viewBox 0 0 1000 620`, `preserveAspectRatio="xMidYMid slice"`). **No user pan/zoom** — only a programmatic `viewBox` camera tween (~950ms, `zoomEnabled`). Mapbox `NavigationControl` is added only inside `map.on("load")`, which never runs without a token. `projectOverlayPoint()` maps lng/lat → SVG coords. The full variant has left filter aside + right details aside.
- **Data** (`src/data/network.ts`): `networkRoutes` (7 routes; canonical `plannedKm/completedKm/forecast/contractor/structures`), `milestones`, `programme` (budget 1.7B/4B, HSCT 90%), `strategyPrinciples`, `designPrinciples`, `personas`, `gallery`, `documents`, `statusLabels`. **Totals: planned 409.71 km, completed 219.01 km, remaining 190.7 km, 53%.**
- **i18n** (`src/i18n.ts`): `uiCopy{en,ar}` (~78 keys), `storyText{en,ar}` (11 steps each), `routeTypeName, statusText` (`"design-build":"Design & Build"` @ ~L199), `mapPlaceNames`, helpers `routeName/routeLabel/routeDescription/formatForecast`. New strings = add the same key under **both** `en` and `ar`.
- **Assistant** (`src/components/ProjectAssistant.tsx`): entirely rule-based (`answerQuestion()` keyword chain). No AI, no fetch.
- **Small comps:** `CountUp.tsx` (rAF count-in on view, respects reduced-motion), `Preloader.tsx`, `EvidenceSource.tsx` (PDF + gallery section).

### Theme system (verified)
- `:root` (`styles.css` 5-57) = **LIGHT**; `.dark` (72-113) overrides. Tokens: `--bg,--bg-elevated,--bg-panel,--fg,--gold*,--glass-*,--story-*`, motion `--ease-premium/--dur-*`.
- **Glass rule** (`styles.css` 769-803) forces `position:relative; overflow:hidden` on 25 selectors (incl. `.story-kpi-bar,.story-panel,.exec-*`). `.story-kpi-bar` is re-forced `sticky` at 870-872. **Adding a sticky element to this list needs a later re-assertion.**
- **Light patch** (`styles.css` 1337-1351) rewrites `text-white*/bg-white*/border-white*` to readable values **only inside `.story-shell`** — content outside it stays dark.
- **`.app-header` IS theme-safe** but not rendered. Hardcoded-dark-that-won't-flip: `.hero` (base rule dark by design, 333-350), `.presenter-bar` (2670+), `.tour-hud` (2759+), `.floating-panel` (`text-pearl`), NetworkMap badges `bg-obsidian/72` (L368) & `bg-obsidian` (L399), `.gis-map-stage` flips only via `.is-light` JS toggle, `.map-mode`/`.route-search-result` patched only inside story-shell. Tailwind named colors in `tailwind.config.js` (`obsidian,ink,pearl,asphalt…`) never flip.

### Duplication index (drives Step 5)
Same figures repeat across: top `story-kpi-bar` (planned/completed/remaining/%), `ExecutiveProgressDashboard` (restates all four + 9 tiles + package list + milestones), `ForecastTimeline`, `MilestonePreview`, `CompletionInsights`, `TheAsk`, `NetworkFocusPreview`, `StructuresContractors`, plus static literal metrics in `storyText`/step defs (`"280+ km","62 km","70.26 km","99%","2029"`). Heaviest concentration: the single `progress` panel.

---

## Cross-cutting rules (apply to EVERY step)

- **Commit at each step** on a feature branch `feat/ux-refinement-v1`. Conventional messages, e.g. `feat(controls): split language and theme into independent buttons`. End every commit body with the Co-Authored-By trailer.
- **Bilingual:** any new user-facing string → add to `uiCopy.en` **and** `uiCopy.ar`. Never hardcode EN in JSX.
- **Theming:** new surfaces use CSS tokens (`var(--…)`), never raw hex/`bg-obsidian`/`text-pearl`. Must look correct in **both** themes.
- **RTL:** verify Arabic; keep map SVG + timelines `direction:ltr` (already patched). Mirror only where semantically correct.
- **Responsive:** verify at 375 / 768 / 1280 / 1900 px. No horizontal body scroll.
- **Reduced motion:** every new animation gated by `prefers-reduced-motion` (framer-motion `useReducedMotion()` / CSS `@media`).
- **Error handling:** all async (AI, fetch, fullscreen) wrapped in try/catch with user-visible fallback; never leave a dead-feeling button (lesson from prior session — features must give immediate feedback).
- **Security:** no secrets in the client bundle; `.env*` gitignored; validate/limit all AI I/O.
- **Verify before commit:** `npx tsc --noEmit` clean + drive the change in the live app via Claude_Preview MCP (see Verification). On Windows, if Vite serves an empty module after an edit, touch the file's mtime (known Vite+Windows cache bug).
- **Use the `ui-ux-pro-max` skill** when designing new components/layout (invoke `/ui-ux-pro-max` for palettes, spacing, card systems, interaction states).

---

## STEP 0 — Bootstrap, safety net, versioned docs

- [x] **0.1** Create branch `feat/ux-refinement-v1`. Commit the current uncommitted baseline first (prior session's work is untracked — this is the restore point): `git add -A && git commit -m "chore: baseline before UX refinement v1"`.
- [x] **0.2** Create `docs/plans/` and `docs/plans/old/`. Copy this plan to `docs/plans/PLAN_v1.0.0_ux-refinement.md`. *(Done during planning — this file. No older plans existed to move.)*
- [x] **0.3** Create the handover file `AGENTS.md` at repo root. *(Done during planning — seeded with overview/architecture + first log row. Keep appending.)*
- [x] **0.4** Secrets hygiene: ensure `.gitignore` contains `.env`, `.env.local`, `.env.*`. Create `.env.local` (gitignored) holding `OPENAI_API_KEY=…` and add `.env.example` (committed, no secret) documenting required vars. **Do not commit the real key.** (`AGENTS.md` already notes the shared key must be rotated.)
- [x] **0.5** Confirm toolchain: `gsap` + `framer-motion` present (they are). No new animation deps needed. Commit docs + gitignore.

---

## STEP 1 — Controls & complete theme parity  (Req #1, #12)

**Goal:** two independent control buttons, click-outside-to-close, and a 100%-themed app in light mode.

- [ ] **1.1 Split controls.** Replace the combined `accessibility-popover` in `Hero` (`App.tsx`) with **two separate, always-visible buttons**: a **Language** toggle (`EN`/`AR`) and a **Theme** toggle (sun/moon). Localize their labels/aria via `uiCopy` (add keys `language`, `theme`, `lightMode`, `darkMode`, `displayOptions` to `en`+`ar`). These live in the new persistent top bar (built in Step 2) — for now render them where the popover was, then relocate in Step 2.
- [ ] **1.2 Click-outside.** Add a reusable `src/hooks/useClickOutside.ts` (pointerdown listener → callback when target is outside the ref; also close on `Escape`). Apply to every popover/menu/dropdown (assistant panel, any legend flyout, base-map menu).
- [ ] **1.3 Theme parity sweep.** Make every hardcoded-dark surface token-driven so light mode has **no dark islands**:
  - `.hero` + `.hero-map-grid` (`styles.css` 333-364): replace base dark gradient/`color:#eef4fc` with `var(--story-bg)`/`var(--fg)`; keep a `.dark` variant. The ADSC logo/top bar must read light in light mode.
  - `.presenter-bar` (2670+) and `.tour-hud` (2759+): add light-theme variants via tokens (`--glass-surface-strong`, `--fg`).
  - `.floating-panel` (`text-pearl`→ token), NetworkMap `bg-obsidian/72` (L368) & `bg-obsidian` (L399) → tokened glass classes; `.map-mode`/`.route-search-result` → move off `.story-shell`-only patch.
  - Audit remaining `bg-ink/bg-asphalt/bg-obsidian/text-pearl/text-white*` in **rendered** components (dead `{false&&}` block can be ignored or deleted — see Step 5.4). Prefer deleting dead code over theming it.
- [ ] **1.4 QA:** toggle light↔dark on every screen region (top bar, map, story deck, KPI card, assistant, presenter bar, tour HUD, dialogs). Contrast ≥ WCAG AA for text. Gold branding preserved. Commit `feat(theme): independent controls + full light/dark parity`.

---

## STEP 2 — Top chrome: full-width title, compact tabs, fixed KPI card  (Req #2, #3, #9, #10)

**Goal:** the new page skeleton.

- [ ] **2.1 Persistent top bar.** Render a sticky, theme-aware top bar (reuse/adapt the existing `Header` component + `.app-header` CSS which is already theme-safe): ADSC logo (left) + the two Step-1 control buttons (right). This is the "top application bar" Req #12 calls out — it must flip with theme.
- [ ] **2.2 Full-width primary title (Req #9).** Promote the network/map title to a full-width primary `<h1>` directly under the top bar, spanning the page. Source copy from `storyText[locale][?].title` or a new `uiCopy.experienceTitle`. Treat as the hero heading of the whole experience, not a map caption.
- [ ] **2.3 Compact chapter tabs (Req #3).** Move `.story-chapter-nav` to the top (under the title). Make it lighter/denser: smaller chips, thin active underline/pill, keep the progress indicator subtle. Active chapter clearly marked. Horizontal-scroll/overflow handled; auto-center active chip (logic already exists). Tabs now drive the deck (Step 3), not scroll.
- [ ] **2.4 Fixed executive KPI card (Req #2, #10).** Build a fixed/sticky **top-right** card with exactly the 4 KPIs (Planned / Completed / Remaining / Completion %). Reuse `StoryKpi` + `CountUp`. Enforce **perfect symmetry**: one shared tile class with identical width, padding, icon size (`h-5 w-5`), label/`value` typography, alignment, and hierarchy — 2×2 grid, equal heights via grid, not intrinsic sizing. This becomes the **single home** for these four figures (Step 5 removes them elsewhere). Collapses to a compact bar under 767px.
- [ ] **2.5 Card system (Req #10).** Define shared card CSS custom props (`--card-pad`, `--card-radius`, `--card-gap`, heading position, icon slot) and apply to `.story-panel`, exec tiles, route-type/persona cards so same-group cards are dimension/padding/typography-consistent. Use `ui-ux-pro-max` for the spacing scale.
- [ ] **2.6 QA:** title spans full width at all breakpoints; tabs compact + legible; KPI tiles pixel-symmetric (inspect via MCP `preview_inspect` computed padding/width). Commit `feat(layout): top bar, full-width title, compact tabs, fixed KPI card`.

---

## STEP 3 — Tab-driven fly-in story deck  (Req #5, #4)

**Goal:** one card at a time, no scroll, rich motion.

- [ ] **3.1 Deck conversion.** In `StoryExperience.tsx`, replace the stacked `localizedSteps.map(...)` render with an `AnimatePresence` that renders **only the active step's** `motion.article`. Drive `activeStepId` from tabs + prev/next + arrow keys. **Remove the center-band `IntersectionObserver`** chapter activation (and its `scrollGuardRef` machinery) — chapters no longer change on scroll. Keep `activateStep()` (it syncs map: `setSelectedRouteId`, `setVisibleTypes`). Card content area is a fixed-height viewport (right rail per Step-2 layout); internal overflow scrolls **within** the card only if needed (esp. the exec dashboard).
- [ ] **3.2 Fly-in choreography.** Direction-aware enter/exit variants (next → enter from right+scale/opacity/depth, exit left; prev reversed), `--ease-premium` timing. Stacked feel: outgoing card scales/dims beneath incoming. Add `useReducedMotion()` fallback (cross-fade only).
- [ ] **3.3 Richer framer-motion (Req #4).** Add: staggered child reveals (`staggerChildren`), hover micro-interactions on interactive tiles, animated bicycle SVG element (framer-motion path/`motion.svg`, GSAP timeline optional) referencing the ADSC "Arena/Financial Assistant" animation *language* (do not copy), and KPI counter animations (reuse `CountUp`; adopt for exec tiles too). Smooth state transitions on filter/select.
- [ ] **3.4 Prev/next + affordances.** Add elegant prev/next controls + chapter position ("03 / 11"). Ensure tab click and arrows both route through one `goToStep(id)` that sets active step + syncs map (no snap-back races).
- [ ] **3.5 QA:** every chapter reachable with zero page scroll; enter/exit smooth both directions; reduced-motion path verified; map updates per chapter. Commit `feat(story): tab-driven fly-in card deck with framer-motion`.

---

## STEP 4 — Map: pan/zoom, in-map controls, clickable track legend  (Req #6, #7, #11)

**Goal:** a fully explorable map with integrated controls and legend.

- [ ] **4.1 User pan/zoom on the SVG overlay.** Extend `GeoJsonRouteOverlay`'s existing `viewBox` camera into a full controller: pointer-drag pan, wheel/trackpad zoom (zoom-to-cursor), touch pinch-zoom, and a `userInteracting` flag that **suspends auto-framing** until reset. Clamp zoom (e.g. 1×–6×) and pan to content bounds. Reuse `projectOverlayPoint()` and the existing rAF viewBox tween for animated transitions. Keep `vectorEffect="non-scaling-stroke"` on routes.
- [ ] **4.2 Zoom + reset controls.** Floating in-map **+ / −** buttons and a **Reset View / Fit-to-Network** button (fits full 7-route extent, clears filter + `userInteracting`). Animated camera transitions. Preserve fly-to.
- [ ] **4.3 Move Fly + Presenter into the map (Req #7).** Relocate the two `.story-ctrl` buttons from `.story-map-controls` into the map as polished floating glass controls (top-left/right cluster), theme-aware, localized. Keep the tour + presenter logic intact.
- [ ] **4.4 Clickable track legend (Req #6).** **Remove** the "Design & Build" status caption below the map (`story-live-caption` / story footer status line). Add an in-map **legend** with one item **per track** (7 routes), each showing its color swatch + label. Click a legend item → `setSoloRouteId(route.id)` + `setSelectedRouteId` + camera-frame it → filters map, highlights it, de-emphasizes/hides others, updates the contextual panel. Add a clear **Reset Filter** item → restores full network (`setSoloRouteId(null)`, all `visibleTypes`). Legend is theme-aware and keyboard-accessible.
- [ ] **4.5 QA:** drag/wheel/pinch/buttons all pan+zoom smoothly; reset fits network; fly-to still works; legend filters + highlights + resets correctly; no "Design & Build" caption remains. Test touch on mobile viewport (MCP `preview_resize` mobile). Commit `feat(map): full pan/zoom, in-map controls, clickable track legend`.

---

## STEP 5 — De-duplication & data-truth pass  (Req #8)

**Goal:** each figure communicated once.

- [ ] **5.1 Single home per metric.** Planned/Completed/Remaining/% live **only** in the fixed KPI card (Step 2.4). Strip these totals from `ExecutiveProgressDashboard` — refocus that panel on non-duplicated content (package status mix, structures, contractor accountability, forecast timeline) rather than restating totals + gauge already shown.
- [ ] **5.2 Forecast dates once.** Keep the forecast **timeline** (`ForecastTimeline`) as the single canonical forecast view. Remove forecast-date repetition from `exec-package-list`, `MilestonePreview`, `CompletionInsights`, and `TheAsk` (reference the timeline instead, or show only the one net-new datum each adds). Collapse `MilestonePreview` vs `exec-milestone-grid` (same 4 milestones) into one.
- [ ] **5.3 Derive static literals.** Replace hardcoded metric strings in `storyText`/step defs (`"280+ km","62 km","70.26 km","99%","2029"`) with values derived live from `networkRoutes`/`programme`, or remove them so they can't drift.
- [ ] **5.4 Delete dead code.** Remove the `{false && (…)}` block in `App.tsx` (247-553) and the dead `AIPanel`/unused `Header` remnants once their still-useful CSS (`.app-header`) is retained. Reduces confusion + duplicate figures (e.g. hardcoded "1.7B / 4B", "90%").
- [ ] **5.5 QA:** walk every chapter + map; confirm no figure appears twice; totals still correct (planned 409.7 / completed 219.0 / 53%). Commit `refactor(content): remove repeated KPIs, forecasts, and dead code`.

---

## STEP 6 — AI layer: secure proxy, live assistant, generative insights  (fully AI-driven)

**Goal:** real AI with the key server-side.

- [ ] **6.1 Proxy.** Add a server-side proxy exposing `POST /api/assistant` (chat over project data) and `POST /api/insights` (generative executive insight for a given chapter/route/context). Dev: a Vite server plugin/middleware in `vite.config.ts` that reads `OPENAI_API_KEY` from `.env.local` and calls OpenAI server-side. Prod: an equivalent serverless function (`/api/*.ts`) — document Vercel/Netlify deploy in `AGENTS.md`. Use the latest appropriate OpenAI model; stream if practical.
- [ ] **6.2 Assistant upgrade.** Rewire `ProjectAssistant.tsx` to call `/api/assistant` with a system prompt grounded in `networkRoutes`/`programme`/`milestones` (pass a compact data context). **Keep `answerQuestion()` as the fallback** when the endpoint errors/offline. Elegant loading (typing/shimmer), error states, retry. Route-mention side-effects (select/fly) preserved.
- [ ] **6.3 Generative insights.** Add tasteful "AI insight" moments: per-chapter generated executive takeaways and/or a KPI-card insight chip, calling `/api/insights` with context. Cache per session; skeleton loaders; never block the UI.
- [ ] **6.4 Security & robustness (cyber).** Key **only** server-side (grep the built bundle for `sk-` → must be zero). Input validation + max prompt/response length; server-side timeout + rate-limit + basic prompt-injection guardrails (ignore instructions in user text, scope to project data); lock CORS to app origin; strip PII; graceful degradation on 401/429/5xx. Add `.env.example`. Re-affirm key rotation.
- [ ] **6.5 QA:** assistant answers live; kill the endpoint → fallback works with no crash; insights render with loaders; bundle has no key. Commit `feat(ai): secure OpenAI proxy, live assistant + generative insights`.

---

## STEP 7 — Global polish, responsive, a11y, QA/QC, security review

- [ ] **7.1 Responsive.** Verify 375 / 768 / 1280 / 1900 px: top bar, title, tabs, KPI card (collapses), map + in-map controls (touch), story deck. No horizontal scroll; tap targets ≥ 44px.
- [ ] **7.2 Motion & a11y.** All new animations respect `prefers-reduced-motion`. Keyboard: tabs, prev/next, legend, controls, assistant reachable + focus-visible. ARIA labels localized.
- [ ] **7.3 Theme + RTL final sweep.** Full light/dark parity (no dark islands) and full Arabic/RTL pass (both locales for every new string; map/timeline stay LTR).
- [ ] **7.4 Systematic QA.** `npx tsc --noEmit` clean; `npm run build` succeeds; preview via MCP with console/network error checks per chapter.
- [ ] **7.5 Security review.** Run `/security-review`. Grep `dist/` for `sk-`/secrets (must be empty). `npm audit` (note criticals). Confirm `.env*` gitignored and not in history.
- [ ] **7.6 Ship.** Final commit `chore(release): UX refinement v1.0.0`, tag `v1.0.0`. Update `AGENTS.md` completion log. Optionally open a PR to `main`.

---

## Verification (how to prove each step)

- **Run:** dev server via Claude_Preview MCP — `preview_start` name `cycling-adsc-dev` (`.claude/launch.json`, `npm run dev`, port 5173 / autoPort). Never use Bash to run the server.
- **Drive it:** `preview_eval` to skip the preloader (`.preloader-skip`), navigate chapters, open the assistant, exercise the map (dispatch wheel/pointer events), toggle theme/language. `preview_snapshot` for structure, `preview_inspect` for computed CSS (symmetry, theme colors — more reliable than screenshots), `preview_console_logs`/`preview_network` for errors, `preview_resize` for mobile/tablet + dark-mode emulation, `preview_screenshot` only for final visual proof.
- **Verify computed state, not DOM presence** (prior bug: content mounted but `opacity:0`). Check computed `opacity`/`position`/`viewBox`.
- **Per step:** `npx tsc --noEmit` (use `-p tsconfig.json`; if `tsconfig.tsbuildinfo` is locked on Windows, use `--noEmit` without `-b`). If a module serves empty after edit (Vite+Windows cache), touch its mtime.

---

## Requirement → Step traceability
#1 Controls split + click-outside → **1.1, 1.2** · #2 Fixed KPI card → **2.4** · #3 Top compact tabs → **2.3** · #4 More framer-motion → **3.3** · #5 Fly-in stacked deck → **3.1-3.2** · #6 Track legend replaces "Design & Build" → **4.4** · #7 In-map Fly/Presenter → **4.3** · #8 Remove repetition → **Step 5** · #9 Full-width map title → **2.2** · #10 Card symmetry → **2.4, 2.5** · #11 Full pan/zoom + reset → **4.1, 4.2** · #12 Complete light/dark → **Step 1, 7.3**.
