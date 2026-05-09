# Inertia Rails Integration Design

## Goal

Install and configure Inertia.js with Rails + React + Vite as a prerequisite for building interactive UI. This project is purely additive — no existing views change, no behavior regressions.

## Scope

In scope:
- Add `inertia_rails` gem
- Set up Vite + `vite_rails` for JS bundling (replacing importmaps)
- Install React + TypeScript + Inertia React adapter
- Replace the application layout with an Inertia layout
- Convert the root `stores#featured` route to an Inertia page as a smoke test
- Ensure existing views (dig sessions, store sections, etc.) still render through Inertia
- Verify all existing tests pass

Out of scope:
- Rebuilding any existing page UI
- The tactile homepage redesign (separate project)
- Any algorithmic changes

## Architecture

- `inertia_rails` gem replaces direct ERB rendering for page requests
- Vite replaces importmap for JS bundling
- React components live under `app/frontend/`
- Tailwind stays — it works through Vite with `@tailwindcss/vite`
- The Inertia layout wraps the existing `<body>` structure (session bar, flash, header) as a persistent layout
- Existing ERB partials that are shared (like session bar) are ported to React components

## Component tree (new)

```
app/frontend/
├── pages/
│   └── stores/
│       └── featured.tsx      ← smoke test page
├── layouts/
│   └── app_layout.tsx        ← replaces application.html.erb
├── components/
│   └── session_bar.tsx       ← ported from ERB partial
├── types/
│   └── inertia.d.ts          ← Inertia page prop types
├── css/
│   └── application.css       ← Tailwind entry point
├── entrypoints/
│   └── application.tsx       ← Vite entry (mounts Inertia app)
```

## Route mapping

All existing routes remain unchanged. The `inertia_rails` gem intercepts responses — Rails controllers call `render inertia: '...', props: {}` instead of rendering ERB views.

For the smoke test transition:
- `root` (stores#featured) switches to `render inertia: 'stores/featured', props: { store:, picks:, sections: }`
- All other routes continue to use ERB until Project 2

This is possible because Inertia coexists with Rails's normal rendering — you opt in per-controller-action.

## Data flow

- Controller sets up data as before (store, picks, sections, session)
- `render inertia: 'ComponentName', props: { ... }` passes data as React props
- Inertia serializes to JSON and sends to the React frontend
- The React page component receives props directly — no fetch, no API layer

## Error handling

- Inertia handles redirects, validation errors, and flash messages through its built-in protocol
- Validation errors come back as props.errors on form submissions
- Flash messages from Rails `flash` appear in `usePage().props.flash`

## Testing

- Existing system/request specs should pass unchanged (Inertia preserves the request/response cycle)
- Add `inertia-rails-testing` gem for asserting Inertia-specific behavior
- Component tests can use standard React testing patterns (Vitest + React Testing Library)

## Security

- Inertia enforces that all props are serialized JSON — no accidental exposure of instance variables
- Auth stays server-side (basic auth in ApplicationController)
- CSRF is handled by Inertia's `<Form>` component automatically

## Success criteria

- `bin/dev` starts Vite dev server alongside Rails
- `root` renders through Inertia with correct props
- All existing routes (dig sessions, store sections, etc.) still work
- `bundle exec rspec` passes with no regressions
- Browser dev tools show Inertia page visits in the network tab
