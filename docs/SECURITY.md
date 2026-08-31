# Security Model — NCC Army Wing

## Authentication

- **Provider**: Firebase Authentication.
- **Methods**: Email/password and Google sign-in.
- **Registration**: Open registration creates a pending entry. Admin approval required before access.
- **Google sign-in**: Restricted to users who already have an approved `users` or `alumni` document. Unregistered Google accounts are deleted immediately.
- **Password policy**: Enforced client-side via `src/shared/utils/passwordPolicy.ts`.

## Authorization

Authorization is enforced at **two layers**:

### 1. Frontend (React)

- `<ProtectedRoute requiredRoles={[...]}>` redirects unauthorized users.
- `useAuth()` hook exposes `hasRole()`, `isAdmin()`, `isSuperAdmin()` helpers.
- **Frontend checks are NOT the security boundary.** They exist for UX only.

### 2. Firestore Security Rules (Server-side)

- `firestore.rules` is the **true security boundary**.
- Helper functions: `isAuthenticated()`, `isAdmin()`, `isSuperAdmin()`, `isOwner(userId)`.
- Role checks read from `users/{uid}.role` in Firestore.

### Role Permissions Matrix

| Resource                    | Public                | Member                | Admin                 | Superadmin                                     |
| --------------------------- | --------------------- | --------------------- | --------------------- | ---------------------------------------------- |
| `users`                     | —                     | Read all              | Read, Create, Update  | Read, Create, Update, Delete (non-superadmins) |
| `pendingCadets`             | Create                | Read own              | Full access           | Full access                                    |
| `attendanceSessions`        | —                     | Read                  | Full access           | Full access                                    |
| `events`                    | Read                  | Read                  | Full access           | Full access                                    |
| `gallery`                   | Read                  | Read                  | Full access           | Full access                                    |
| `announcements` (public)    | Read                  | Read                  | Full access           | Full access                                    |
| `announcements` (auth_only) | —                     | Read                  | Full access           | Full access                                    |
| `alumniProfiles`            | Read (active+visible) | Read (active+visible) | Read (active+visible) | Full access                                    |
| `cms`                       | Read                  | Read                  | Full access           | Full access                                    |
| `reports`                   | —                     | —                     | Full access           | Full access                                    |
| `auditLogs`                 | —                     | —                     | Create                | Read, Create                                   |
| `settings`                  | `recruitment` only    | —                     | Full access           | Full access                                    |
| `rollbackSnapshots`         | —                     | —                     | Read, Create          | Read, Create                                   |

### Immutable Collections

- `auditLogs` — No update or delete allowed.
- `rollbackSnapshots` — No update or delete allowed.
- `users/{uid}/readAnnouncements/{id}` — No update or delete allowed.

## Data Ownership

- Users own their profile data in `users/{uid}`.
- Cadets can update only their own profile fields.
- Admins can update any user's profile, including role changes.
- Only superadmins can delete users (except other superadmins).
- `takenNumbers` entries track ownership by UID.

## Secrets & Credentials

### In Source Control

| Item                     | Location            | Sensitivity                             |
| ------------------------ | ------------------- | --------------------------------------- |
| Firebase API key         | `.env` (gitignored) | Low — public by design for client SDK   |
| Cloudinary cloud name    | `.env` (gitignored) | Low — public for unsigned uploads       |
| Cloudinary upload preset | `.env` (gitignored) | Low — unsigned preset                   |
| EmailJS keys             | `.env` (gitignored) | Low — public keys for client-side email |

### In GitHub Secrets

| Secret                     | Used By                                                                  |
| -------------------------- | ------------------------------------------------------------------------ |
| `FIREBASE_SERVICE_ACCOUNT` | All automation scripts (year-rollover, auth-cleanup, sync-verifications) |
| `CLOUDINARY_CLOUD_NAME`    | cloudinary-cleanup workflow                                              |
| `CLOUDINARY_API_KEY`       | cloudinary-cleanup workflow                                              |
| `CLOUDINARY_API_SECRET`    | cloudinary-cleanup workflow                                              |

### In Firestore

| Document          | Field   | Sensitivity                                                      |
| ----------------- | ------- | ---------------------------------------------------------------- |
| `settings/github` | `token` | **HIGH** — GitHub Personal Access Token for triggering workflows |
| `settings/github` | `repo`  | Low — repository identifier                                      |

> [!WARNING]
> The GitHub PAT stored in `settings/github` is readable by any admin. If compromised, it can trigger GitHub Actions workflows. Consider using a more restricted token or moving this to a server-side function.

## Environment Separation

See `docs/ENVIRONMENTS.md` for full environment architecture.

**Current risk**: Local development connects directly to production Firebase. There is no automatic isolation mechanism.

## Firebase Storage Security

Storage rules in `storage.rules` enforce:

- **File type validation**: Images must match `image/*`, max 10MB. Documents must match `application/pdf` or Office formats, max 15MB.
- **Path-based access**: Gallery is public read. Cadet profiles require auth. Documents require auth.
- **Default deny**: `match /{allPaths=**}` denies all unmatched paths.

## Security Testing

**Currently not implemented.** No automated Firestore rules tests exist.

### Recommended (Future)

- Use `@firebase/rules-unit-testing` to test Firestore security rules.
- Test all role-based access patterns.
- Test immutable collection enforcement.
- Test file type and size validation in Storage rules.

## Known Security Findings

| #   | Severity    | Finding                                                                              |
| --- | ----------- | ------------------------------------------------------------------------------------ |
| 1   | 🔴 CRITICAL | Local development uses production Firebase — no isolation                            |
| 2   | 🟡 MEDIUM   | GitHub PAT stored in Firestore, readable by any admin                                |
| 3   | 🟡 MEDIUM   | `pendingCadets` allows unauthenticated create — potential spam vector                |
| 4   | 🟡 MEDIUM   | `takenNumbers` has public read — exposes all regimental/register numbers             |
| 5   | 🟢 INFO     | `writeBatch` import missing in AuthContext — UID migration code will fail at runtime |
