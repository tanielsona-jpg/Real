# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

This is a Portuguese-language Bible study app ("Bíblia — Família Azevedo") built with React + Firebase. It includes multi-version Bible reading, AI-powered biblical commentary (the "Canela de Fogo" feature powered by Claude via a Firebase Cloud Function), personal notes with cloud sync, and an Android wrapper via Capacitor.

## Commands

### Web App (root)
```bash
npm start        # Start dev server (Create React App)
npm run build    # Production build → /build
npm test         # Run tests with jsdom environment
```

### Firebase Cloud Functions (`functions/` directory)
```bash
cd functions && npm run serve   # Run Functions emulator locally
cd functions && npm run deploy  # Deploy functions to Firebase
```

### Android (Capacitor)
```bash
npm run build && npx cap sync android   # Sync web build to Android
npx cap open android                    # Open in Android Studio
```

## Architecture

### State & Data Flow

`App.js` is the monolithic container (~600 lines) that owns all navigation state, user auth, and Bible content. It renders four tabs (`renderHome`, `renderBible`, `renderStudy`, `renderYou`) and passes data down to child components. There is no external state management library — state lives in `useState` hooks within `App.js`, with persistence split between:
- **localStorage** — theme, current tab, onboarding completion, cached AI responses
- **Firebase Firestore** — per-user notes and study progress
- **React state** — ephemeral UI state (selected book/chapter, loaded verses, version toggles)

### Bible Data Sources

The app uses two local JSON files and two remote APIs:
- `src/data/almeida_ra.json` / `src/data/almeida_rc.json` — Full ARA/ARC translations, ~217k lines each, imported directly into the bundle
- `api.scripture.api.bible` — NVI and NVT translations fetched on demand via `src/utils/apiBible.js`
- `bible-api.com` — KJV English verses for the "original text" toggle

`apiBible.js` maps Portuguese book names to OSIS codes and caches Bible IDs in memory; the API key (`q3d75t6SITE5gIxDJr2_C`) is public/rate-limited and included directly in source.

### AI Integration (Canela de Fogo)

The Claude integration is entirely server-side. `src/components/CanelaDeFogo.jsx` sends the user's question, the current book/chapter metadata, and the full chapter text to a Firebase Callable Function (`functions/index.js`). The function calls Claude (model: `claude-opus-4-6`) with a system prompt defining the "Canela de Fogo" persona — a warm, theologically grounded assistant. The Claude API key lives in Firebase Secrets and is never exposed to the client.

The Cloud Function validates input length (max 800 chars) and returns 3–8 line responses (`{ resposta: string }`).

### Firebase Setup (`src/firebase.js`)

Exports `auth`, `googleProvider`, `db` (Firestore), and `functions`. The Firebase config object is in plain source — this is intentional for public Firebase projects (security is enforced via Firestore rules and Function auth, not by hiding the config).

### Component Responsibilities

- **`Onboarding.jsx`** — 3-step flow: name capture → Google login → AI greeting. Writes name to localStorage.
- **`Anotacoes.jsx`** — Per-chapter notes; saves to Firestore when authenticated, localStorage when guest. Auto-saves with debounce.
- **`CanelaDeFogo.jsx`** — Floating chat UI that calls the Cloud Function. Clears message history when chapter changes.

### Styling

`src/styles.css` is a single 1,400-line file using CSS custom properties for the design system. Key tokens: `--radius-*` for border radii, `--shadow-*` for layered shadows. The app toggles a `dark` class on the `.app` container to switch themes. Fonts: Cormorant Garamond (display), Nunito (UI), Lora (body text).

## Conventions

- **Language:** UI text, variable names, and function names are in Portuguese (e.g., `capitulo`, `versiculos`, `estudoLivro`, `renderBible`). Keep this consistent when adding new features.
- **Study book:** The study tracker is hardcoded to `STUDY_BOOK` (currently Daniel). Changing the study target requires updating this constant in `App.js`.
- **No linting config** is present — the project relies on CRA defaults (ESLint built into react-scripts).
- **No TypeScript** despite `"main": "src/index.tsx"` in package.json; the actual entry point is `src/index.js`.
