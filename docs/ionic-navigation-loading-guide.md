# Ionic Navigation + Loading Guide (Rider App)

This guide explains:
- what caused the "page reload / slow transitions" behavior
- how we fixed it in this project
- the required patterns for all future pages/routes

Use this as the source of truth for routing and loading UX.

## Problem We Hit

The app felt like it was reloading on every page switch instead of transitioning smoothly.

Main causes in this codebase were:

1. `IonRouterOutlet` children were custom wrappers (`PrivateRoute`, `PublicRoute`) instead of direct `Route`/`Redirect`.
2. Multiple routed pages did not have an `IonPage` root, so Ionic could not manage view stack/caching/animations properly.
3. Some pages had artificial loading delays (example: Home had a forced `setTimeout(..., 1000)`).
4. Back navigation used `history.push('/')` in several places, which creates new stack entries instead of navigating back.
5. Some screens mixed Ionic scroll/containers with custom fixed elements in ways that caused UI artifacts.

## Current Project Pattern (Required)

### 1) Route Structure in `src/App.tsx`

- Keep `IonReactRouter` + `IonRouterOutlet`.
- Put direct `Route` elements inside `IonRouterOutlet`.
- Do auth gating in `Route render={...}` helpers, not wrapper route components.

Why: Ionic's router outlet expects actual routes so it can manage page lifecycle and transitions.

### 2) Every Routed Screen Must Render Through `IonPage`

- In this project we use a wrapper helper (`withIonPage`) in `src/App.tsx`.
- Any screen mounted by a route must be `IonPage`-wrapped.

If you add a new page route:
1. add page component import
2. create wrapped screen with `withIonPage(NewPage)`
3. use wrapped screen in route

### 3) Navigation Rules

- Internal navigation: use React Router history (`push`, `replace`, `goBack`).
- Do not use `window.location.href` or `window.history.back()` for internal app routing.
- For back buttons, use:

```ts
if (history.length > 1) history.goBack();
else history.replace('/home');
```

This avoids broken stacks in deep-link or cold-start flows.

### 4) Loading UX Rules

- Never add fake delay loaders (no `setTimeout` just to show spinner).
- Show full-screen loader only when truly blocked (auth not ready, required bootstrap data missing).
- Keep previously loaded UI visible during background refresh where possible.
- If using Ionic pull-to-refresh (`IonRefresher`), always call `event.detail.complete()`.

### 5) Ionic Content + Layout Rules

- Prefer:
  - `IonPage` as root page container
  - `IonContent` for scroll area
- Be careful with fixed/sticky elements layered over `IonContent`.
- If a page shows top-edge rendering artifacts, use:
  - `IonContent fullscreen`
  - safe-area top padding in inner container:
    `pt-[calc(env(safe-area-inset-top)+16px)]`

## What Was Already Fixed

- `src/App.tsx`
  - moved to direct routes inside `IonRouterOutlet`
  - centralized auth-gated render helpers
  - `withIonPage` wrapper used for routed pages missing `IonPage`
- `src/pages/home/HomePage.tsx`
  - removed artificial 1-second loading delay
  - fixed long-address layout overflow in route picker
- `src/pages/rides/PublishRidePage.tsx`
  - fixed back/return flow (`goBack` + `/home` fallback)
  - success redirect uses `replace('/home')`
- `src/pages/rides/FindRidePage.tsx`
  - fixed back behavior pattern
- `src/pages/rewards/RewardsPage.tsx`
  - fixed back behavior pattern
- `src/pages/support/SupportPage.tsx`
  - stabilized top layout/safe-area behavior
  - cleaned empty state duplication
- `src/pages/support/NewDisputePage.tsx`
  - improved back fallback and form validation
- `src/pages/support/DisputeChatPage.tsx`
  - fixed back behavior, message merge logic, send/fetch errors, composer layout

## New Route Checklist (Use Every Time)

When adding a page:

1. Create page component.
2. Ensure it is routed via `withIonPage`.
3. Add direct `<Route ... />` in `IonRouterOutlet`.
4. Use history-based navigation only.
5. No artificial loading delays.
6. Verify on mobile viewport:
  - push transition is smooth
  - back transition works
  - no full remount flicker
  - no top safe-area clipping/artifacts

## Quick Troubleshooting

### Symptom: "Page opens like full reload"

Check:
- Is page routed directly via `Route` in `IonRouterOutlet`?
- Is it `IonPage` wrapped?
- Is page showing fake loader each mount?

### Symptom: "Back goes to wrong place / loops"

Check:
- Did we use `history.push('/')` where `goBack()` was expected?
- Is there fallback when history stack is empty?

### Symptom: "Top-left weird shape/artifact"

Check:
- `IonContent fullscreen`
- remove/verify `IonRefresher` behavior
- safe-area top padding

## Team Rule

Before merging any new page or route change, run:

```bash
npx eslint src/App.tsx src/pages/**/*
npm run build
```

And manually test at least one push + back flow for the modified page.

