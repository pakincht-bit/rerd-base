I# Radia - Real Estate Analysis Dashboard

## Project Overview

Radia is a real estate market analysis dashboard built with **React + TypeScript + Vite**. It visualizes property project data on a Leaflet map with filtering, sorting, and export capabilities.

## Tech Stack

- **Framework**: React 19 (via ESM imports, no bundled node_modules for React)
- **Build Tool**: Vite
- **Styling**: Tailwind CSS (CDN) — NOT bundled, loaded via `<script>` tag in `index.html`
- **Map**: Leaflet + react-leaflet
- **Icons**: lucide-react
- **Fonts**: Google Fonts (Plus Jakarta Sans, IBM Plex Sans Thai)
- **Data**: CSV parsing via PapaParse
- **Auth & Backend**: Supabase (Auth + Database + Storage)
- **AI**: Google Gemini via `@google/genai`

## Architecture

### Layout Structure

```
┌──────┬────────────┬─────────────────────────────┐
│ Icon │  Property  │                             │
│ Side │   List     │         Map (full screen)   │
│ bar  │  Panel     │                             │
│      │            │                             │
│ logo │            │                             │
│ tabs │            │                             │
│      │            │  ┌───────────────────────┐  │
│      │            │  │ Floating Filter Bar   │  │
└──────┴────────────┴──┴───────────────────────┴──┘
```

### Key Components

| Component | File | Purpose |
|-----------|------|---------|
| App | `App.tsx` | Main layout, state management, data filtering |
| IconSidebar | `components/IconSidebar.tsx` | Slim left sidebar with logo + category tabs + user avatar |
| FloatingFilterBar | `components/FloatingFilterBar.tsx` | Bottom floating bar with search & filter popovers |
| ResultsPanel | `components/FilterModal.tsx` | Property/place list with sort controls |
| MapComponent | `components/Map.tsx` | Leaflet map with markers, layers, legend |
| ProjectDetailPanel | `components/ProjectDetailPanel.tsx` | Detailed project info + trend charts |
| ExportDashboard | `components/ExportDashboard.tsx` | Export view for dashboard image |
| AuthModal | `components/AuthModal.tsx` | Sign in/up modal (Google OAuth + email/password) |
| AuthProvider | `services/AuthContext.tsx` | Auth context provider, `useAuth()` hook, profile management |

### State Flow

- **Search/filter state** (`SearchState`) lives in `App.tsx` and is passed down to all components
- **`activeTab`** (projects/mall/hospital/school) is lifted to `App.tsx`, shared between `IconSidebar` and `ResultsPanel`
- **Nearby places** (OSM data) are fetched inside `ResultsPanel` and lifted to `App.tsx` via callbacks
- **Auth state** lives in `AuthContext` (`services/AuthContext.tsx`). `useAuth()` provides `user`, `profile`, `signOut`, etc. `AuthProvider` wraps `<App />` in `index.tsx`.

## Design Guidelines

- **Color scheme**: Dark teal primary (`#1B333C` / scbx), hover state `#2A4A56` (scbxHover), black/white/gray neutral palette
- **Primary buttons**: Use `bg-scbx hover:bg-scbxHover text-white` with inner shadow: `shadow-[inset_0_1px_8px_rgba(255,255,255,0.2),inset_0_-1px_4px_rgba(0,0,0,0.15)]`, `rounded-lg`, `font-display font-normal`, `text-xs`
- **Glass morphism**: Use `bg-white/75 backdrop-blur-2xl` for panels
- **Rounded corners**: `rounded-2xl` or `rounded-3xl` for major containers
- **Edge gap**: All floating panels have `12px` (top-3/left-3/bottom-3) gap from screen edges
- **Floating elements**: Filter bar and export button float over the map with shadows
- **Typography**: Plus Jakarta Sans + IBM Plex Sans Thai fonts, font-normal weights for buttons/labels, monospace for data values
- **Minimalist layouts**: Avoid excessive card borders and padding for feed lists to achieve a flatter, more compact density when needed.
- **List panels**: Include a bottom fade gradient (`h-32`, `from-white via-white/80 to-transparent`) and `pb-36` on scrollable lists

## Coding Conventions

- Use **functional setState** (`prev => ({ ...prev, ... })`) for state updates
- Use **`useMemo`** for computed/filtered data
- Keep components in separate files — no inline component definitions
- Use **Tailwind utility classes** (CDN mode — no custom config beyond `index.html`)
- Dynamic Tailwind classes must use complete class names (no template interpolation like `` `w-[${var}px]` ``)
- Use `scbx` / `scbxHover` Tailwind tokens instead of hardcoded hex values where possible

## Running

```bash
npm run dev    # Start Vite dev server
npm run build  # Production build
```

## Known Patterns

- CSV data is parsed via `services/csvService.ts` and stored as `Project[]`
- Distance calculations use the Haversine formula (duplicated in a few files)
- Overpass API (with mirror rotation) is used for nearby place data (malls, hospitals, schools)
- Map markers are color-coded by area code using HSL generation
- **Ruler tool**: Activated via `R` hotkey or FloatingFilterBar emoji button. State (`rulerActive`, `rulerPoints`) lives in `App.tsx`. Renders a ruler-style line with tick marks and distance labels on the map.
- **Feedback Center**: Full-page overlay (`FeedbackWidget.tsx`) with Community Requests feed, submission form, and Changelog timeline.
- **Changelog**: Always update `data/changelogData.ts` with newly implemented features and fixes at the end of a successful implementation session.
- **Auth**: Supabase Auth with Google OAuth + email/password. `AuthProvider` in `index.tsx`, `useAuth()` hook for access. Profile auto-created on first sign-in. User avatar shown at bottom of `IconSidebar`.
- **Error messages**: Map raw Supabase/API error strings to user-friendly messages using a `friendlyError()` helper pattern (see `AuthModal.tsx`). Never show raw technical errors to users.
- **Supabase client**: `services/supabaseClient.ts` exports `supabase` client and `isSupabaseConfigured` boolean. App must work gracefully when Supabase is not configured (dummy fallback).
- **SQL migrations**: Stored in `supabase/migrations/`. Instructions to run them manually in Supabase Dashboard SQL Editor.
- **Environment variables**: Vite env vars prefixed with `VITE_`. Type declarations in `env.d.ts`. Current vars: `VITE_SUPABASE_URL`, `VITE_SUPABASE_ANON_KEY`.
