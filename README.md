# College NCC Army Wing Website

React + TypeScript + Vite application for NCC unit operations, including authentication, attendance, announcements, reports, CMS, and role-based dashboard flows.

## Tech Stack

- React 18
- TypeScript
- Vite
- React Router v6
- Firebase (Auth + Firestore + Storage)
- React Bootstrap + Bootstrap Icons

## Quick Start

1. Install dependencies

```bash
npm install
```

2. Create environment file

```bash
copy .env.example .env
```

3. Add Firebase values in `.env`

```env
VITE_FIREBASE_API_KEY=
VITE_FIREBASE_AUTH_DOMAIN=
VITE_FIREBASE_PROJECT_ID=
VITE_FIREBASE_STORAGE_BUCKET=
VITE_FIREBASE_MESSAGING_SENDER_ID=
VITE_FIREBASE_APP_ID=
```

4. Run dev server

```bash
npm run dev
```

## Scripts

```bash
npm run dev
npm run build
npx tsc --noEmit
```

## Root Directory (Current)

```text
ncc-website/
|- .env
|- .env.example
|- .firebaserc
|- .gitignore
|- firebase.json
|- firestore.indexes.json
|- firestore.rules
|- storage.rules
|- index.html
|- package.json
|- package-lock.json
|- tsconfig.json
|- tsconfig.node.json
|- TCE.svg
|- vite.config.ts
|- vite.svg
|- README.md
|- public/
`- src/
```

## Cleanup Notes

- Removed unused root docs: `ARCHITECTURE.md`, `ATTENDANCE_ONDUTY_GUIDE.md`.
- Removed Firebase cache file: `.firebase/hosting.ZGlzdA.cache`.
- `dist/` and `.firebase/` are disposable local artifacts if present.

## Project Structure (High-Level)

```text
src/
|- app/        # app composition (providers, routes, entry app)
|- pages/      # route-level screens (public, auth, dashboard)
|- features/   # domain/business logic (auth, attendance, reports, cms)
|- components/ # reusable UI components
|- shared/     # config, utilities, types, styles, lib
|- assets/     # static media
|- App.tsx
|- index.css
`- vite-env.d.ts
```

## Notes

- Routing is composed from route fragments in `src/app/routes/*` and mounted in `src/app/routes/index.tsx`.
- `src/pages/*` contains route screens.
- `src/features/*` contains feature/domain logic and services.
- Styles are now colocated with corresponding TSX files where inline styles were previously used.
