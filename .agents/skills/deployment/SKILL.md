---
name: deployment
description: Guide for deploying the NCC App to Firebase Hosting, including Firestore rules, indexes, and Storage rules deployment. Covers pre-deployment checks and rollback.
---

# Deployment — NCC Army Wing

## Pre-Deployment Checklist

Before deploying, run these checks:

```bash
# 1. Lint
npm run lint

# 2. Type check
npx tsc --noEmit

# 3. Build
npm run build
```

All three must pass before deploying.

## Deploy Commands

### Full Deployment (Hosting + Rules + Indexes)

```bash
npx firebase deploy
```

### Hosting Only (most common)

```bash
npm run build
npx firebase deploy --only hosting
```

### Firestore Rules Only

```bash
npx firebase deploy --only firestore:rules
```

> ⚠️ **Test rule changes thoroughly before deploying.** Incorrect rules can lock out users or expose data.

### Firestore Indexes Only

```bash
npx firebase deploy --only firestore:indexes
```

### Storage Rules Only

```bash
npx firebase deploy --only storage
```

## Verify Deployment

After deploying, verify:

1. Visit `https://ncc-app-200cdt.web.app`
2. Confirm the app loads correctly
3. Test login (email/password and Google)
4. Check a protected route (dashboard)
5. If rules were changed, test affected operations

## Rollback

### Hosting Rollback

Go to Firebase Console → Hosting → Release history → Select a previous deployment → Rollback.

### Rules Rollback

```bash
# Get the previous rules version from git
git checkout <commit-hash> -- firestore.rules
npx firebase deploy --only firestore:rules
```

## GitHub Actions

Automation workflows run separately from deployments. See `docs/DEPLOYMENT.md` for full workflow documentation.

**Trigger a workflow manually:**

1. Go to GitHub → Actions tab
2. Select the workflow
3. Click "Run workflow"
4. For year rollover, enable `dry_run` first
