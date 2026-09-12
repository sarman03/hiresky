# HireSky Code Audit

Audit of the current codebase across all directories (`backend`, `cloud-backend`, `web`, `marketing`, `overlay-macos`, `overlay-windows`). Scope: genuine bugs, security issues, and correctness defects that exist in the code today — not missing features or incomplete work.

Date: 2026-09-12

## Cross-cutting critical issues

### 1. cloud-backend has no authentication enforcement at all
`src/index.ts` mounts every router (`auth`, `billing`, `interviews`, `context`, `calendar`, `analytics`, `leaderboard`, `notifications`, `referrals`, `admin`) with no JWT-verification middleware. `jwt.verify` is never called anywhere in the source — tokens are only ever signed (`src/routes/auth.routes.ts:34-35, 68-69`). Every route reads `userId` straight from `req.params`/`req.body` and uses it directly in Prisma queries.

**Impact:** any unauthenticated caller can read/write any other user's data by supplying a different `userId`/`sessionId`, e.g. `GET /api/context/:userId`, `GET /api/calendar/:userId`, `GET /api/analytics/:userId`, `GET /api/notifications/:userId`, `PUT /api/context/:userId`.

### 2. Admin panel is fully open, both server- and client-side
- **Server:** `cloud-backend/src/routes/admin.routes.ts` — `GET /stats`, `GET /users`, `PATCH /users/:id/ban`, `GET /logs` have zero role/auth checks. The `ban` endpoint takes `adminId` straight from `req.body` (line 56) with no verification it belongs to a real admin, and falls back to the *target* user's id if omitted (line 67) — the audit trail can be forged. `User.role` exists in `prisma/schema.prisma:20` but is never read anywhere in the code.
- **Client:** `web/src/app/admin/page.tsx:15-22` only checks that *some* login token exists in `localStorage`, never that the decoded role is `ADMIN`. Any logged-in candidate can open `/admin` and see all user PII/revenue, and ban/unban accounts.

### 3. Billing can be bypassed for free
`cloud-backend/src/routes/billing.routes.ts` `POST /checkout/success` (lines 20-62) creates an active `Subscription` and `UserEntitlement` purely from client-supplied `userId`/`planId` — no payment-provider verification (no webhook signature, no external call) at all. Combined with #1, anyone can grant themselves or any other user paid access for free.

### 4. Hardcoded JWT fallback secret
`cloud-backend/src/routes/auth.routes.ts:7`: `const JWT_SECRET = process.env.JWT_SECRET || "supersecretkey_phase1";` — committed to tracked source. If `JWT_SECRET` is ever unset, the server signs tokens with this publicly-known string, and anyone can forge valid tokens for any `userId`.

### 5. Windows overlay does not currently compile
`overlay-windows/MainWindow.xaml.cs` and `Services/DatabaseService.cs` reference `HireSky.Models.ChatSession`/`ChatMessage`, which don't exist anywhere in the repo (verified with an actual `dotnet build`, which fails with 6 `CS0234`/`CS0246` errors). This is a committed, build-breaking defect on the branch, not a build-artifact issue.

### 6. The backend's primary feature can never fire with the shipped config
`backend/hiresky/orchestrator.py:175-189` (`_answer`) aborts every answer with "You haven't added any prompt" unless `cfg.llm.system_prompt` is set. Nothing anywhere in the codebase ever assigns `system_prompt`/`candidate_info` at runtime — the "sent dynamically by the overlay dashboard on session start" data path referenced in `config.example.yaml:53` doesn't exist in code (`_on_command` only recognizes `toggle_listening`, `assist`, `ask`, `analyze_screen`). Out of the box, with the shipped config, the app can never answer a question.

## Other IDOR / data-integrity issues (cloud-backend)

- **Notification IDOR:** `notifications.routes.ts` `PATCH /:notificationId/read` (68-80) and `PATCH /:userId/read-all` (83-95) have no ownership check tying the notification/user to the caller's identity.
- **Unsafe field spreading:** `interviews.routes.ts` `/:sessionId/complete` (86-102) spreads `req.body` fields (`summaryData`, transcript objects) directly into `prisma.create({...})` calls with no allow-list — a caller can override `sessionId` inside the spread or set arbitrary schema fields (e.g. `overallScore`) on someone else's interview.
- **Unbounded record creation:** several read-or-create `GET` endpoints (`context`, `analytics`, `notifications`, `referrals`, `leaderboard`) will create rows for arbitrary/random `userId`s with no auth or rate limiting — enumeration/pollution/DoS vector.
- **CORS wide open:** `src/index.ts:22` uses `cors()` with default settings (reflects any origin), removing a layer of defense-in-depth for a backend serving PII and billing data.

Checked and found sound in cloud-backend: no raw SQL (`$queryRawUnsafe`/`$executeRawUnsafe` unused — everything goes through Prisma), passwords hashed with bcrypt, error handlers don't leak stack traces, no secrets committed to git (`.env`/`dev.db` gitignored).

## web app (Next.js)

| Severity | Finding |
|---|---|
| High | `history/[id]/page.tsx` treats `params` as a plain object, but Next.js 16 (pinned in `package.json`) requires page `params` to be unwrapped via `use(params)`. `params.id` is `undefined` at runtime, so `/history/<id>` always fetches `.../stats/undefined` and the page can never load real data. |
| High | `/admin` route guard (`admin/page.tsx:15-22`) checks only for *any* login token, not an ADMIN role — client-side authorization bypass. |
| Med-High | Ban action sends the *banned user's* id as `adminId` in the request body (`admin/page.tsx:24-30`) — audit log records the wrong actor. |
| Med-High | Several pages omit the `Authorization` header on fetches that sibling calls in the *same file* send correctly: `page.tsx:43`, `notifications/page.tsx:32,44,49`, `analytics/page.tsx:19`, `calendar/page.tsx:31,41`, `context/page.tsx:44`, `referrals/page.tsx:16`, `admin/page.tsx:19-21,26`. Inconsistent, IDOR-prone given the backend's lack of enforcement. |
| Medium | `/pricing` is missing from `ClientLayout.tsx:10`'s `isPublicRoute` list, so it renders inside the dashboard Sidebar shell it wasn't designed for. |
| Medium | Pricing checkout (`(auth)/pricing/page.tsx:34-39`) silently falls back to `userId: "dummy_user_id"` on JWT decode failure instead of redirecting to login like every other page. |
| Low-Med | Leaderboard epoch switch (`leaderboard/page.tsx:11-28`) has no stale-response guard — fast dropdown changes can let an older response overwrite newer data. |
| Low | All API calls hardcode `http://localhost:4000` (plain HTTP, not configurable). |

Checked and found sound: no `dangerouslySetInnerHTML`, no exposed `NEXT_PUBLIC_*` secrets, no leaked WebSocket/interval/listener cleanup issues.

## marketing site (Next.js)

| Severity | Finding |
|---|---|
| High | `NotifyForm.tsx` (pricing waitlist) never reads the email field, never calls any API (none exists), and only does `setSent(true)` — the site's primary conversion mechanism silently discards every signup while showing a false "You're on the list" confirmation. |
| Medium | `Navbar.tsx`'s `links` array renders `/pricing` and `/contact` as plain `<a href>` tags instead of `next/link`, forcing full page reloads (inconsistent with `Footer.tsx`, which uses `Link` correctly for the same routes). |
| Low | `Footer.tsx:63` "GitHub" link points to `https://github.com` (homepage), not an actual repo. |
| Low | `ThemeToggle.tsx` initializes React state to `"light"` regardless of the persisted theme, causing a brief icon/label mismatch on load when the stored theme is dark. |

Checked and found sound: no secrets, no `dangerouslySetInnerHTML`, no broken image paths, `mailto:` construction in `ContactForm.tsx` correctly escapes via `encodeURIComponent`.

## macOS overlay (Swift)

| Severity | Finding |
|---|---|
| High | Every Start→End→Start session cycle re-registers all 7 global hotkeys and NSEvent monitors (`AppDelegate.swift:213-281`, `HotKey.swift:47-67`) without ever unregistering the previous set — unbounded leak; after a few cycles a single keypress triggers duplicate Carbon callbacks system-wide. |
| High | ScreenCaptureKit audio callback (`NativeEngine.swift:327`) runs on a **concurrent** dispatch queue mutating shared converter state (`themConverter`, `themRecognitionRequest`, etc.) with no lock — real crash/data-corruption risk around session stop/start. |
| Medium | Login and session-start HTTP endpoints are hardcoded to `http://localhost:4000` with no env override (unlike the WebSocket URL) — a real distributed build can never reach a real backend. |
| Medium | Auth tokens, refresh token, and the Gemini API key are stored in plaintext `UserDefaults`/`@AppStorage` instead of Keychain — readable via `defaults read` and included in local/Time Machine backups. |
| Medium | Every screen-analysis action unconditionally writes a full-resolution screenshot to `~/Desktop/hiresky_debug_capture.png`, plus a second copy to a hardcoded path `/Users/akash/HireSky/debug_capture.png` — leftover developer path shipping in the product, and a real privacy leak of interview-screen content. |
| Low-Med | No re-entrancy guard on `analyzeScreen`/`analyzeScreenOnly` (`OverlayController.swift:154-177`) — pressing the hotkey twice within ~150-200ms starts two overlapping capture sequences, duplicating the chat message/LLM request. |
| Low | Login password sent over plaintext `http://`, not `https://`. |

Checked and found sound: hotkey register/unregister *pairing* itself is exact; `WebSocketClient.swift` is dead code (never instantiated, so its logic can't manifest issues); string/array slicing in `NativeEngine.swift` is consistently bounds-clamped.

## Windows overlay (C#)

| Severity | Finding |
|---|---|
| Critical | Project does not compile — `MainWindow.xaml.cs`/`Services/DatabaseService.cs` reference `HireSky.Models.ChatSession`/`ChatMessage`, which don't exist anywhere in the repo (confirmed via `dotnet build`, 6 errors). |
| High | `DatabaseService` (owns a LiteDB file handle) is created (`MainWindow.xaml.cs:76`) but never disposed in `OnClosed` (202-212) — risks a stale file lock or unflushed writes on abrupt shutdown. |
| Medium | Unhandled `UriFormatException` risk: if `HIRESKY_WS_URL` is malformed, `new Uri(url)` (line 83-84) throws with no global exception handler (`App.xaml.cs` is a bare 7-line stub) — crashes the app at startup. |
| Medium | Shutdown race: the WebSocket background thread can call `Dispatcher.Invoke` after the window/Dispatcher starts tearing down; `ConnectionChanged?.Invoke(false)` (`WebSocketClient.cs:70`) sits outside its try/catch, risking an unobserved task exception. |
| Low | `PingLoopAsync` can call `SendAsync` on an already-disposed `ClientWebSocket` if the connection drops mid-delay (swallowed by a generic catch, so no crash, but a genuine use-after-dispose race). |
| Low | `WebSocketClient` never implements `IDisposable`; `_cts` is never disposed. |
| Low | All 5 `RegisterHotKey` calls ignore their `bool` return value — silent failure with zero diagnostics if a combination (e.g. Ctrl+Alt+T) is already owned by another app. |

Checked and found sound: hotkey register/unregister pairing is exact and symmetric; the two legitimate cross-thread UI updates correctly use `Dispatcher.Invoke`; reconnect/backoff arithmetic is sound with no double-dispose.

## Python backend

| Severity | Finding |
|---|---|
| High | Primary "answer" feature can never run out of the box — see cross-cutting #6. |
| Medium | `run_zero_dep.py:247-258`'s hand-rolled WebSocket frame parser has no max-payload-size check — a client can claim an arbitrarily large length and hang the handler or force large allocation. |
| Medium | `run_zero_dep.py:524-529` signal handling is broken: `getattr(asyncio, 'SIGINT')` always raises `AttributeError` (should be `signal.SIGINT`, from the `signal` module which isn't imported) — silently swallowed, so SIGINT/SIGTERM never trigger graceful shutdown, unlike `run.py` which does this correctly. |
| Medium | Both WebSocket handlers (`hiresky/server/ws_server.py:54-59`, `run_zero_dep.py:357-364`) crash the connection handler on valid-but-non-object JSON (`msg.get(...)` called on a non-dict raises `AttributeError`, uncaught). |
| Low-Med | `ConversationManager.finalize()` (`hiresky/conversation.py:71-88`) can be invoked concurrently by both the watchdog and an audio-source loop, producing duplicate/garbled "completed" broadcasts under realistic silence-timeout timing. |
| Low | Gemini API key passed as a URL query parameter (`whisper_engine.py:100`, `run_zero_dep.py:92`) rather than a header — more likely to leak into logs/proxies if logging is ever added. |
| Low | `run_zero_dep.py`'s naive line-based YAML parser silently overwrites its own sensible default `system_prompt` with the empty string from `config.example.yaml`, following the documented `cp config.example.yaml config.yaml` setup. |

Checked and found sound: no `eval`/`exec`/`pickle`/`shell=True`/`os.system` anywhere; `yaml.safe_load` used correctly; `.env`/`config.yaml` gitignored with no live secret committed; audio capture's cross-thread handoff and transcriber locking are correctly synchronized; `test_client.html` uses `textContent` exclusively (no XSS).

## Summary

The dominant, overarching issue is **authorization**: the cloud-backend and its admin panel currently have no real access control anywhere, which is a full data-exposure / account-takeover / billing-fraud issue if this is running anywhere reachable beyond localhost. Every other cloud-backend/web finding (billing bypass, admin exposure, notification IDOR) is a symptom of that same root cause. Separately, the Windows overlay is currently in a non-compiling state, and the backend's core "answer" feature is dead-on-arrival with the shipped default config.
