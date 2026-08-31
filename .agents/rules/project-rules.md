# Project Rules — NCC Army Wing

These rules apply to all AI agents and human developers working on this repository.

## Read Before Coding

1. Always read `AGENTS.md` before making any changes.
2. Read `docs/DATA_MODEL.md` before touching Firestore collections or security rules.
3. Read `docs/DOMAIN_RULES.md` before changing business logic.
4. Read `docs/SECURITY.md` before changing authentication or authorization.

## Architecture Constraints

- **No new dependencies** without explicit approval. The project uses React Bootstrap — do not introduce Tailwind, Material UI, or other frameworks.
- **No custom backend**. All server-side logic runs via GitHub Actions scripts using `firebase-admin`.
- **Firestore rules are the security boundary.** Frontend role checks are for UX only.
- **Path alias `@/`** maps to `src/`. Use it consistently.

## Environment Safety

- **Never use production credentials for testing.** Use Firebase Emulator Suite.
- **Never commit `.env` or service account keys.** Check `.gitignore` before committing.
- The `.env.local` file enables emulators via `VITE_USE_EMULATORS=true`.

## Code Quality

- Run `npm run lint` before completing work.
- Run `npx tsc --noEmit` before completing work.
- Run `npm run build` to verify production build succeeds.
- Do not suppress TypeScript errors with `@ts-ignore` unless absolutely necessary and documented.

## Firestore Rules

- Test security rule changes against all role types (visitor, member, admin, superadmin).
- Never remove the default deny rule at the bottom of `firestore.rules`.
- Immutable collections (`auditLogs`, `rollbackSnapshots`) must never allow update/delete.

## Commit Practices

- Do not commit or push unless explicitly instructed.
- Keep commits focused on a single concern.
- Update relevant documentation when making architectural changes.
- Distinguish **IMPLEMENTED** from **PLANNED** in documentation.
