---
name: testing
description: Guide for running tests, static analysis, and quality checks on the NCC App. Covers lint, typecheck, build verification, and future test framework setup.
---

# Testing — NCC Army Wing

## Quick Reference

```bash
# Lint (ESLint)
npm run lint

# Type check (TypeScript strict mode)
npx tsc --noEmit

# Build verification
npm run build

# Dev server
npm run dev
```

## Static Analysis

### ESLint

```bash
npm run lint
```

Runs ESLint with TypeScript, React, and React Hooks plugins. Fails on any warnings (`--max-warnings 0`).

### TypeScript

```bash
npx tsc --noEmit
```

Strict mode with `noUnusedLocals` and `noUnusedParameters` enabled.

**Known existing errors** (not introduced by documentation changes):

- `AdminSettings.tsx` — leftover code from removed manual rollover feature
- `AuthContext.tsx` — missing `writeBatch` import
- `Profile.tsx` — blood group type mismatch
- `CatcCampReport.tsx`, `OnDutyLetterReport.tsx` — implicit `any` parameters

## Build Verification

```bash
npm run build
```

Vite production build with code splitting. Output goes to `dist/`.

## Local Development Testing

### Firebase Emulator

See the `firebase-emulator` skill for full setup instructions.

```bash
# Start emulators
npx firebase emulators:start

# Start dev server (separate terminal)
npm run dev
```

### Manual Testing Checklist

| Area          | Test                                  |
| ------------- | ------------------------------------- |
| Auth          | Login with email/password             |
| Auth          | Login with Google                     |
| Auth          | Registration flow                     |
| Auth          | Password reset                        |
| Dashboard     | Admin dashboard loads                 |
| Dashboard     | Member dashboard loads                |
| Attendance    | Create session, mark attendance       |
| Reports       | Generate PDF report                   |
| Announcements | Create announcement, check visibility |
| CMS           | Edit About page                       |
| Profile       | Update profile, upload photo          |
| Public        | Home page loads, events display       |

## CI Pipeline

The CI pipeline (`.github/workflows/ci.yml`) runs automatically on push and PR:

1. `npm ci` — Clean install
2. `npm run lint` — ESLint
3. `npx tsc --noEmit` — Type check
4. `npm run build` — Build verification

## Future Testing (Recommended)

### Vitest Setup

```bash
npm install -D vitest @testing-library/react @testing-library/jest-dom jsdom
```

Add to `vite.config.ts`:

```typescript
export default defineConfig({
  // ... existing config
  test: {
    globals: true,
    environment: "jsdom",
    setupFiles: "./src/test/setup.ts",
  },
});
```

### Firestore Rules Testing

```bash
cd scripts
npm install -D @firebase/rules-unit-testing firebase-tools
```

Test patterns:

- Authenticated user can read their own profile
- Admin can create attendance sessions
- Member cannot write to `auditLogs`
- Unauthenticated user can read public events
- Immutable collections reject updates/deletes

## Test Data Policy

- Use deterministic fake data for all tests.
- Never use real personal information.
- Never connect automated tests to production Firebase.
- Sample data patterns exist in `ncc_sample_data/` (gitignored).
