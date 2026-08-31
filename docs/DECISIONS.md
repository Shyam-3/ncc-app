# Architecture & Product Decisions

## Decision: Cloudinary for Profile Photos Instead of Firebase Storage

**Date**: Evident from codebase
**Context**: The app needs profile photo storage for cadets, alumni, and ANOs. Firebase Storage rules exist but Cloudinary is the primary photo host.
**Decision**: Use Cloudinary with unsigned upload presets for all profile photos.
**Reason**: Cloudinary provides image transformation, CDN delivery, and organized folder structures without requiring a backend server. Unsigned presets allow direct client-to-Cloudinary uploads.
**Consequences**: Two storage systems to manage. Cloudinary cleanup requires API credentials in GitHub Secrets. Upload preset name and cloud name are public.

---

## Decision: GitHub Actions for Server-Side Operations

**Date**: Evident from codebase
**Context**: Firebase client SDK cannot delete Auth accounts or perform admin operations. A server-side mechanism is needed.
**Decision**: Use GitHub Actions workflows triggered via `workflow_dispatch` and `repository_dispatch` to run Node.js scripts with `firebase-admin`.
**Reason**: Avoids deploying and maintaining a custom backend server. GitHub Actions provides free compute for the automation needs of this project.
**Consequences**: GitHub PAT must be stored in Firestore for frontend-triggered workflows. Automation is asynchronous — there's no immediate feedback to the admin triggering the action.

---

## Decision: Registration Approval Flow

**Date**: Evident from codebase
**Context**: The NCC unit needs to verify that registrants are actual cadets before granting access.
**Decision**: Open registration creates a `pendingCadets` entry. Admins must manually approve or reject each registration.
**Reason**: Prevents unauthorized access to cadet data and attendance systems.
**Consequences**: Unauthenticated writes to `pendingCadets` are allowed, which could be a spam vector. Email verification is required as a minimum quality check.

---

## Decision: Year Rollover via Scheduled Automation

**Date**: Evident from codebase
**Context**: Each academic year, cadets must be promoted and graduates archived. This was previously a manual process.
**Decision**: Automated via `scripts/year-rollover.mjs` run by GitHub Actions on a schedule (April/May).
**Reason**: Manual rollover is error-prone and time-consuming. Automation ensures consistency and creates rollback snapshots.
**Consequences**: Script must handle edge cases (5-year departments, NCC 3rd year completion). Dry-run mode is essential for previewing changes.

---

## Decision: No Custom Backend Server

**Date**: Evident from codebase
**Context**: The application could use Cloud Functions, a custom Express server, or remain fully serverless.
**Decision**: Rely entirely on Firebase client SDK + Firestore rules for security, with GitHub Actions for admin operations.
**Reason**: Reduces infrastructure complexity and cost for a college project. Firestore rules provide server-side security without a dedicated backend.
**Consequences**: Some operations (Auth account deletion, email verification sync) require GitHub Actions workarounds. No server-side validation beyond Firestore rules.

---

## Decision: Bootstrap Over Custom Design System

**Date**: Evident from codebase
**Context**: The application needs a consistent UI framework.
**Decision**: Use React Bootstrap + Bootstrap 5 + Bootstrap Icons.
**Reason**: Rapid development with pre-built responsive components. Bootstrap is widely known and easy to maintain.
**Consequences**: Limited design customization compared to a custom design system. Some CSS variables are defined in `src/shared/styles/variables.css` for NCC-specific theming.

---

## DECISION REQUIRED: Firebase Emulator Integration

**Context**: Local development currently connects directly to production Firebase. `.env.local` with `VITE_USE_EMULATORS=true` exists but `firebase.ts` does not read this flag.
**Options**:

1. Add emulator connection code to `src/shared/config/firebase.ts` using `connectAuthEmulator()` and `connectFirestoreEmulator()`.
2. Use a separate Firebase project for development.
3. Accept the current risk with careful manual `.env` management.
   **Recommendation**: Option 1 — add emulator toggle to `firebase.ts`.

---

## DECISION REQUIRED: Automated Testing Framework

**Context**: Zero automated tests exist. ESLint and TypeScript provide static analysis only.
**Options**:

1. **Vitest** — native Vite integration, fast, recommended for this stack.
2. **Jest** — widely used but requires additional Vite configuration.
3. Defer testing to a later phase.
   **Recommendation**: Vitest + React Testing Library + `@firebase/rules-unit-testing`.
