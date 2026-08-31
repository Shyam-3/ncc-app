# Environment Strategy — NCC Army Wing

## Environment Architecture

```
LOCAL DEVELOPMENT  →  Firebase Emulator Suite (Auth + Firestore)
        ↓
CI / AUTOMATED     →  Lint + Type-check + Build (no Firebase connection)
        ↓
PRODUCTION         →  Firebase Cloud (ncc-app-200cdt)
```

**Staging is not used.** The project's scale and team size do not justify a separate staging environment. Firebase Hosting provides deployment rollback if needed.

---

## Local Development

### Configuration Files

| File           | Purpose                                         | Git Status     |
| -------------- | ----------------------------------------------- | -------------- |
| `.env`         | Production Firebase credentials (default)       | **gitignored** |
| `.env.local`   | Local development overrides — enables emulators | **gitignored** |
| `.env.example` | Template showing required variables             | Committed      |

### Firebase Emulator Suite

Local development uses the Firebase Emulator Suite to prevent accidental writes to production.

**Start emulators:**

```bash
npx firebase emulators:start
```

This starts:

- **Auth Emulator**: `http://localhost:9099`
- **Firestore Emulator**: `http://localhost:8080`
- **Emulator UI**: `http://localhost:4000`

**Emulator configuration** is defined in `firebase.json` under the `emulators` key.

### Local Environment Variables

`.env.local` overrides `.env` for local development:

```env
VITE_USE_EMULATORS=true
```

> **PLANNED**: The emulator connection code needs to be wired into `src/shared/config/firebase.ts`. When `VITE_USE_EMULATORS` is `true`, the Firebase SDK should call `connectAuthEmulator()` and `connectFirestoreEmulator()` instead of connecting to production. This is a recommended next implementation step.

### Running Locally

```bash
# Terminal 1: Start Firebase Emulators
npx firebase emulators:start

# Terminal 2: Start Vite dev server
npm run dev
```

The Vite dev server runs on `http://localhost:3000`.

---

## CI / Automated Testing

GitHub Actions CI runs on push and PR to `main`.

**CI does NOT connect to Firebase.** It only performs static analysis and build verification:

1. `npm ci` — Install dependencies
2. `npm run lint` — ESLint
3. `npx tsc --noEmit` — TypeScript type checking
4. `npm run build` — Vite production build

No Firebase credentials are required for CI.

---

## Production

| Service          | Instance                                      |
| ---------------- | --------------------------------------------- |
| Firebase Hosting | `ncc-app-200cdt.web.app`                      |
| Cloud Firestore  | `(default)` database, `us-central1`           |
| Firebase Auth    | Production auth users                         |
| Cloudinary       | Cloud name: `yueqedjj`, preset: `ncc_uploads` |
| EmailJS          | Service: `service_nmmvdal`                    |
| GitHub Actions   | Automation workflows (cleanup, rollover)      |

Production credentials are stored in:

- `.env` (local only, gitignored)
- GitHub Secrets (for Actions workflows)

---

## Cross-Environment Safety

### Current Protections

- ✅ `.env` is gitignored — production credentials not committed.
- ✅ `.env.example` provides a safe template with placeholder values.
- ✅ GitHub Actions scripts validate `FIREBASE_SERVICE_ACCOUNT` before running.
- ✅ GitHub workflows restricted to `github.repository == 'ncc-app/ncc-app'`.
- ✅ `firebase.ts` warns about missing env keys in dev mode.

### Risk: No Automatic Production Prevention

> [!WARNING]
> Without the emulator integration in `firebase.ts`, running `npm run dev` with a `.env` pointing to production will read/write production data. Until the emulator toggle is wired in, developers must manually ensure they're using `.env.local` or the emulator is running.

### Recommended Safeguards (Future)

1. **Wire emulator detection into `firebase.ts`** — automatically connect to emulators when `VITE_USE_EMULATORS=true`.
2. **Dev-mode banner** — show a visual indicator when connected to production vs emulator.
3. **Firestore write confirmation** — in dev mode, warn before writes to production collections.

---

## Environment Variable Reference

| Variable                            | Required | Used In                                   |
| ----------------------------------- | -------- | ----------------------------------------- |
| `VITE_FIREBASE_API_KEY`             | ✅       | Firebase initialization                   |
| `VITE_FIREBASE_AUTH_DOMAIN`         | ✅       | Firebase initialization                   |
| `VITE_FIREBASE_PROJECT_ID`          | ✅       | Firebase initialization                   |
| `VITE_FIREBASE_STORAGE_BUCKET`      | ✅       | Firebase initialization                   |
| `VITE_FIREBASE_MESSAGING_SENDER_ID` | ✅       | Firebase initialization                   |
| `VITE_FIREBASE_APP_ID`              | ✅       | Firebase initialization                   |
| `VITE_FIREBASE_MEASUREMENT_ID`      | Optional | Firebase Analytics                        |
| `VITE_APP_NAME`                     | Optional | App branding                              |
| `VITE_APP_URL`                      | Optional | App URL reference                         |
| `VITE_CLOUDINARY_CLOUD_NAME`        | ✅       | Profile photo uploads                     |
| `VITE_CLOUDINARY_UPLOAD_PRESET`     | ✅       | Profile photo uploads                     |
| `VITE_EMAILJS_SERVICE_ID`           | ✅       | Email sending                             |
| `VITE_EMAILJS_TEMPLATE_ID`          | ✅       | Email sending                             |
| `VITE_EMAILJS_PUBLIC_KEY`           | ✅       | Email sending                             |
| `VITE_USE_EMULATORS`                | Optional | Local dev — connect to Firebase Emulators |
