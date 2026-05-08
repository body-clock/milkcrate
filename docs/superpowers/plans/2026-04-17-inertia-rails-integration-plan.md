# Inertia Rails Integration Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Add Inertia.js with Rails + React + Vite to the existing Milkcrate app, laying the foundation for interactive frontend development.

**Architecture:** Install `inertia_rails` gem and `vite_rails` to replace importmaps with a Vite-based JS build. Set up React + TypeScript + Inertia React adapter. Migrate the application layout and root route to Inertia as a smoke test, while keeping all other ERB views working. The existing test suite must remain green.

**Tech Stack:** Ruby 3.4, Rails 8.1, inertia_rails gem, Vite + vite_rails, React 19, TypeScript

---

## File Structure

- Modify: `Gemfile` — add inertia_rails, vite_rails gems
- Modify: `package.json` — add React, Inertia, TypeScript deps
- Create: `vite.config.ts` — Vite config with React plugin
- Create: `app/frontend/entrypoints/application.tsx` — mounts Inertia React app
- Create: `app/frontend/layouts/app_layout.tsx` — replaces application.html.erb
- Create: `app/frontend/pages/stores/featured.tsx` — smoke test Inertia page
- Create: `app/frontend/css/application.css` — Tailwind entry moved from app/assets
- Create: `tsconfig.json` — TypeScript config
- Modify: `app/views/layouts/application.html.erb` — switch to Inertia layout
- Modify: `app/controllers/stores_controller.rb` — switch featured to `render inertia:`
- Modify: `app/controllers/application_controller.rb` — share current dig session via inertia_share
- Modify: `bin/dev` — add Vite process to Procfile.dev

### Task 1: Install Gems And Vite Dependencies

**Files:**
- Modify: `Gemfile`
- Modify: `Procfile.dev`

- [ ] **Step 1: Add inertia_rails and vite_rails to Gemfile**

  ```ruby
  # Gemfile — add before the `group :development, :test` block
  gem "inertia_rails"
  gem "vite_rails"
  ```

- [ ] **Step 2: Run bundle install**

  Run: `mise exec -- bundle install`
  Expected: Gems installed, Gemfile.lock updated.

- [ ] **Step 3: Run Vite installer**

  Run: `mise exec -- bundle exec vite install`
  Expected: Creates `vite.config.ts`, `app/frontend/entrypoints/application.js`, updates `Procfile.dev`.

- [ ] **Step 4: Add frontend dependencies to package.json**

  ```json
  // package.json — add under "devDependencies"
  {
    "devDependencies": {
      "@types/react": "^19.0.0",
      "@types/react-dom": "^19.0.0",
      "typescript": "^5.7.0"
    },
    "dependencies": {
      "@inertiajs/react": "^2.0.0",
      "react": "^19.0.0",
      "react-dom": "^19.0.0"
    }
  }
  ```

- [ ] **Step 5: Install npm dependencies**

  Run: `npm install`
  Expected: node_modules populated, no errors.

- [ ] **Step 6: Verify Vite compiles cleanly**

  Run: `mise exec -- bundle exec vite build`
  Expected: Builds to `public/vite/` with no errors.

- [ ] **Step 7: Commit**

  ```bash
  git add Gemfile Gemfile.lock package.json package-lock.json vite.config.ts Procfile.dev
  git commit -m "feat: add inertia-rails and vite dependencies"
  ```

### Task 2: Configure TypeScript And Vite For React

**Files:**
- Modify: `vite.config.ts`
- Create: `tsconfig.json`
- Create: `app/frontend/css/application.css`

- [ ] **Step 1: Create tsconfig.json**

  ```json
  {
    "compilerOptions": {
      "target": "ES2020",
      "module": "ESNext",
      "moduleResolution": "bundler",
      "jsx": "react-jsx",
      "strict": true,
      "esModuleInterop": true,
      "skipLibCheck": true,
      "forceConsistentCasingInFileNames": true,
      "baseUrl": ".",
      "paths": {
        "@/*": ["app/frontend/*"]
      }
    },
    "include": ["app/frontend/**/*", "vite.config.ts"]
  }
  ```

- [ ] **Step 2: Configure Vite for React and Tailwind**

  ```typescript
  // vite.config.ts
  import { defineConfig } from "vite"
  import react from "@vitejs/plugin-react"
  import path from "path"

  export default defineConfig({
    plugins: [react()],
    resolve: {
      alias: {
        "@": path.resolve(__dirname, "app/frontend"),
      },
    },
  })
  ```

  Note: Install the vite react plugin:
  Run: `npm install --save-dev @vitejs/plugin-react`

- [ ] **Step 3: Create Tailwind CSS entry point**

  ```css
  /* app/frontend/css/application.css */
  @tailwind base;
  @tailwind components;
  @tailwind utilities;
  ```

- [ ] **Step 4: Create a placeholder Inertia entrypoint**

  ```typescript
  // app/frontend/entrypoints/application.tsx
  import { createInertiaApp } from "@inertiajs/react"
  import { createRoot } from "react-dom/client"
  import React from "react"

  createInertiaApp({
    resolve: (name) => {
      const pages = import.meta.glob("../pages/**/*.tsx", { eager: true })
      return pages[`../pages/${name}.tsx`]
    },
    setup({ el, App, props }) {
      createRoot(el).render(<App {...props} />)
    },
  })
  ```

- [ ] **Step 5: Verify Vite build still works**

  Run: `mise exec -- bundle exec vite build`
  Expected: Build succeeds. May show warnings about missing page imports (expected — pages not written yet).

- [ ] **Step 6: Commit**

  ```bash
  git add tsconfig.json app/frontend/ vite.config.ts
  git commit -m "feat: configure TypeScript and Vite for React Inertia"
  ```

### Task 3: Create Inertia Layout And Root Page Smoke Test

**Files:**
- Create: `app/frontend/layouts/app_layout.tsx`
- Create: `app/frontend/pages/stores/featured.tsx`
- Create: `app/views/layouts/inertia_application.html.erb` (Inertia renders through this)
- Modify: `app/views/layouts/application.html.erb`

- [ ] **Step 1: Create Inertia persistent layout**

  ```tsx
  // app/frontend/layouts/app_layout.tsx
  import React from "react"
  import { Link, usePage } from "@inertiajs/react"

  export default function AppLayout({ children }: { children: React.ReactNode }) {
    const { flash } = usePage().props as any

    return (
      <>
        <header className="mc-header flex items-center justify-between px-4 py-3 border-b mc-border">
          <Link href="/" className="mc-wordmark text-xl font-bold tracking-widest uppercase">
            🥛 Milkcrate
          </Link>
          <nav className="flex items-center gap-4 text-sm">
            <a href="/dig_sessions" className="mc-nav-link">Sessions</a>
            <a href="/stores/new" className="mc-nav-link">+ Store</a>
          </nav>
        </header>

        {flash?.notice && (
          <div className="px-4 py-2 text-sm mc-notice" role="alert">
            {flash.notice}
          </div>
        )}

        <main className="px-4 py-6">{children}</main>
      </>
    )
  }
  ```

- [ ] **Step 2: Create Inertia rendering layout (replaces full HTML shell)**

  ```erb
  <%# app/views/layouts/inertia_application.html.erb %>
  <!DOCTYPE html>
  <html data-theme="dark">
    <head>
      <title><%= content_for(:title) || "Milkcrate" %></title>
      <meta name="viewport" content="width=device-width,initial-scale=1">
      <%= csrf_meta_tags %>
      <%= csp_meta_tag %>
      <%= vite_client_tag %>
      <%= vite_javascript_tag "application.tsx" %>
    </head>
    <body class="mc-body min-h-screen">
      <%= yield %>
    </body>
  </html>
  ```

- [ ] **Step 3: Create smoke test Inertia page**

  ```tsx
  // app/frontend/pages/stores/featured.tsx
  import React from "react"
  import AppLayout from "../layouts/app_layout"

  interface Store {
    id: number
    name: string
    discogs_username: string
    total_listings: number | null
    description: string | null
  }

  interface FeaturedProps {
    store: Store
  }

  export default function Featured({ store }: FeaturedProps) {
    return (
      <AppLayout>
        <h1 className="text-xl font-bold mc-text">{store.name}</h1>
        <p className="text-xs mc-dim mt-0.5">
          @{store.discogs_username} &middot; {store.total_listings || "?"} vinyl listings
        </p>
      </AppLayout>
    )
  }
  ```

- [ ] **Step 4: Switch root route to Inertia render**

  ```ruby
  # app/controllers/stores_controller.rb
  def featured
    entries = Store.rotation
    return render :no_stores if entries.empty?

    entry = entries[Date.current.jd % entries.count]
    @store = Store.find_by(discogs_username: entry["username"])
    return render :no_stores unless @store

    @description = entry["description"]
    @sections = build_sections(@store)

    render inertia: "stores/featured", props: {
      store: @store.as_json(only: [:id, :name, :discogs_username, :total_listings, :description])
    }
  end
  ```

  Keep the `render :no_stores` path as ERB fallback — not part of Inertia yet.

- [ ] **Step 5: Remove legacy application.html.erb head section (let Inertia layout handle it)**

  Only remove `<%= stylesheet_link_tag :app %>` and `<%= javascript_importmap_tags %>` from `application.html.erb` since they're now handled by Vite.

- [ ] **Step 6: Verify the root page renders through Inertia**

  Run: `mise exec -- bundle exec rails server` and visit `/` in a browser, or use curl:
  ```
  curl -H "X-Inertia: true" http://localhost:3000/ | head -20
  ```
  Expected: 200 response with Inertia JSON, or full HTML (non-Inertia request gets a full page).

- [ ] **Step 7: Verify existing non-Inertia pages still work**

  Run: `mise exec -- bundle exec rails routes`
  Visit `/dig_sessions`, `/stores/new` in browser — these should still render as ERB.

- [ ] **Step 8: Commit**

  ```bash
  git add app/frontend/layouts/ app/frontend/pages/ app/views/layouts/inertia_application.html.erb app/controllers/stores_controller.rb
  git commit -m "feat: add Inertia layout and smoke test root page"
  ```

### Task 4: Share Current Dig Session And Flash Through Inertia

**Files:**
- Modify: `app/controllers/application_controller.rb`

- [ ] **Step 1: Add inertia_share for current dig session**

  ```ruby
  # app/controllers/application_controller.rb
  inertia_share do
    {
      current_dig_session: @current_dig_session ? {
        id: @current_dig_session.id,
        name: @current_dig_session.name,
        item_count: @current_dig_session.dig_session_items.count
      } : nil,
      flash: {
        notice: flash.notice,
        alert: flash.alert
      }.compact
    }
  end
  ```

- [ ] **Step 2: Verify flash messages and session bar data appear in Inertia page props**

  Run the dev server and check that the Inertia page response includes these shared props.

- [ ] **Step 3: Commit**

  ```bash
  git add app/controllers/application_controller.rb
  git commit -m "feat: share dig session and flash via inertia_share"
  ```

### Task 5: Verify Test Suite And Clean Up

**Files:**
- Modify: `spec/rails_helper.rb` (if Vite/inertia require test setup)
- Test: run full suite

- [ ] **Step 1: Add inertia-rails-testing gem**

  ```ruby
  # Gemfile
  gem "inertia_rails-contrib", group: :test
  ```

  Run: `mise exec -- bundle install`

- [ ] **Step 2: Run full test suite**

  Run: `mise exec -- bundle exec rspec`
  Expected: All existing tests pass. If any fail due to the Inertia switch (e.g., request specs expecting ERB), fix them to expect Inertia JSON responses or use `inertia_rails-contrib` matchers.

- [ ] **Step 3: Commit final cleanup**

  ```bash
  git add Gemfile Gemfile.lock spec/
  git commit -m "chore: add inertia test helpers and verify test suite"
  ```

- [ ] **Step 4: Verify `bin/dev` starts Vite alongside Rails**

  Run: `bin/dev`
  Expected: Vite dev server starts on port 3036, Rails on 3000, Tailwind watcher runs.

## Self-Review

**Spec coverage:** All items from `2026-04-17-inertia-rails-integration-design.md` are covered:
- inertia_rails gem installation (Task 1)
- Vite + React + TypeScript setup (Tasks 1-2)
- Inertia layout replacing application.html.erb (Task 3)
- Root page converted as smoke test (Task 3)
- Shared props for session/flash (Task 4)
- Existing tests preserved (Task 5)

**No placeholders** — every step has exact code, commands, and expected outcomes.
