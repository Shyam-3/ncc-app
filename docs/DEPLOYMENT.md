# Deployment — NCC Army Wing

## Hosting

- **Platform**: Firebase Hosting
- **Project**: `ncc-app-200cdt`
- **URL**: `https://ncc-app-200cdt.web.app`
- **Build output**: `dist/` directory (Vite build)

## Deployment Process

### 1. Build

```bash
npm run build
```

Produces optimized static assets in `dist/` with code splitting:

- `vendor` chunk: React, React DOM, React Router
- `firebase` chunk: Firebase SDK modules
- `bootstrap` chunk: React Bootstrap, Bootstrap CSS

### 2. Validate

```bash
npm run lint
npx tsc --noEmit
```

### 3. Deploy Application

```bash
npx firebase deploy --only hosting
```

Deploys the `dist/` directory to Firebase Hosting.

### 4. Deploy Firestore Rules

```bash
npx firebase deploy --only firestore:rules
```

Deploys `firestore.rules` to Cloud Firestore. **Test rule changes thoroughly before deploying** — incorrect rules can lock out users or expose data.

### 5. Deploy Firestore Indexes

```bash
npx firebase deploy --only firestore:indexes
```

Deploys `firestore.indexes.json`. Index creation is asynchronous — it may take a few minutes to complete.

### 6. Deploy Storage Rules

```bash
npx firebase deploy --only storage
```

Deploys `storage.rules` to Firebase Storage.

### 7. Deploy Everything

```bash
npx firebase deploy
```

Deploys hosting, Firestore rules, indexes, and Storage rules in one command.

## Firebase Hosting Configuration

From `firebase.json`:

- **Public directory**: `dist`
- **SPA rewrite**: All routes → `index.html` (React Router handles routing)
- **Ignored**: `firebase.json`, dotfiles, `node_modules`

## GitHub Actions — Automated Workflows

All workflows are in `.github/workflows/` and restricted to `github.repository == 'ncc-app/ncc-app'`.

### `ci.yml` — Continuous Integration

**Trigger**: Push to `main`, pull requests to `main`.
**Steps**: Install → Lint → Type-check → Build.

### `cloudinary-cleanup.yml` — Nightly Photo Cleanup

**Trigger**: Daily at midnight IST (18:30 UTC), manual dispatch.
**Action**: Processes `cloudinary_cleanup` Firestore collection, deletes orphaned Cloudinary assets.
**Secrets**: `CLOUDINARY_CLOUD_NAME`, `CLOUDINARY_API_KEY`, `CLOUDINARY_API_SECRET`, `FIREBASE_SERVICE_ACCOUNT`.

### `year-rollover.yml` — Annual Cadet Rollover

**Trigger**: Daily in April/May (checks target date), manual dispatch.
**Action**: Promotes cadets, archives graduates, creates rollback snapshots, runs auth cleanup.
**Secrets**: `FIREBASE_SERVICE_ACCOUNT`.
**Dry run**: `workflow_dispatch` with `dry_run: true` (default).

### `auth-cleanup.yml` — Auth Account Deletion

**Trigger**: Manual dispatch only.
**Action**: Processes `pendingAuthDeletions` queue, deletes Firebase Auth accounts.
**Secrets**: `FIREBASE_SERVICE_ACCOUNT`.

### `sync-verifications.yml` — Email Verification Sync

**Trigger**: Repository dispatch (`sync_verifications`), manual dispatch.
**Action**: Syncs email verification status from Firebase Auth to Firestore for pending cadets.
**Secrets**: `FIREBASE_SERVICE_ACCOUNT`.

## Automation Scripts

Located in `scripts/` with their own `package.json` (dependency: `firebase-admin`).

| Script                   | Purpose                                                 |
| ------------------------ | ------------------------------------------------------- |
| `year-rollover.mjs`      | Annual cadet promotion and graduation                   |
| `auth-cleanup.mjs`       | Process auth account deletion queue                     |
| `cloudinary-cleanup.mjs` | Delete orphaned Cloudinary assets                       |
| `sync-verifications.mjs` | Sync email verification status                          |
| `check-schedule.mjs`     | Check if rollover target date is reached                |
| `init-registry.mjs`      | Initialize `takenNumbers` registry from existing cadets |
| `test-db.mjs`            | Test Firebase Admin connection                          |

All scripts require `FIREBASE_SERVICE_ACCOUNT` environment variable (JSON string).

## Rollback

Firebase Hosting maintains a history of deployments. To rollback:

1. Go to Firebase Console → Hosting → Release history.
2. Select the previous deployment and rollback.

For Firestore rules rollback, redeploy the previous version from Git history:

```bash
git checkout <commit> -- firestore.rules
npx firebase deploy --only firestore:rules
```

For data rollback after year rollover, use `rollbackSnapshots` collection data.

## Production Safety Checklist

Before deploying:

- [ ] `npm run lint` passes
- [ ] `npx tsc --noEmit` passes (known errors acceptable)
- [ ] `npm run build` succeeds
- [ ] Firestore rules changes tested against all role types
- [ ] No secrets in committed code
- [ ] `.env` values point to correct Firebase project
