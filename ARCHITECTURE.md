# Architecture Overview

This document describes the organizational conventions for the NCC web application codebase.

## Goals
- Clear separation of feature (domain) logic from generic UI components.
- Predictable import paths for services, pages, and shared logic.
- Lightweight barrels to ease refactors and reduce long relative paths.
- Incremental migration path (no need to move existing pages immediately).

## High-Level Layers
1. UI Shell
   - `src/App.tsx`, routing, top-level providers.
2. Components (Generic / Reusable)
   - `src/components/` (layout: Navbar, Footer; common: ProtectedRoute, Markdown, AnimatedSection)
   - Pure presentational or cross-domain wrappers.
3. Features (Domain Grouping)
   - `src/features/<domain>/` contains service.ts, pages/, and index.ts barrel.
   - Each domain is self-contained: attendance, cms, reports, announcements.
   - Imported directly into App.tsx and other components.
4. Contexts / State
   - `src/contexts/` global state (AuthContext).
5. Pages (Generic / Non-domain)
   - `src/pages/` now contains only non-feature pages (auth, public, gallery, etc.)
   - Domain-specific pages moved to respective feature directories.
6. Config & Types
   - `src/config/` (firebase init, constants) and `src/types/` shared interfaces.

## Feature Barrels (Current Implementation)
Each feature directory is fully self-contained:
```
src/features/
  attendance/
    service.ts          # Firestore interactions for attendance
    pages/
      AttendanceManagement.tsx
      AttendanceView.tsx
    index.ts            # Re-exports service functions and page components
  cms/
    service.ts          # CMS content management
    pages/
      CmsEditor.tsx
      About.tsx
    index.ts
  reports/
    service.ts          # On-duty reports
    pages/
      OnDutyReportForm.tsx
    index.ts
  announcements/
    pages/
      AnnouncementsAdmin.tsx
      NotificationsPage.tsx
    index.ts            # Includes ANNOUNCEMENTS_COLLECTION constant
  index.ts              # Namespace exports for all features
```

Example usage:
```ts
// Direct imports from features
import { AttendanceManagement, AttendanceView } from '@/features/attendance';
import { CmsEditor, About } from '@/features/cms';
import { OnDutyReportForm } from '@/features/reports';
import { AnnouncementsAdmin, NotificationsPage } from '@/features/announcements';

// Service functions
import { listCadets, createSession } from '@/features/attendance/service';
import { fetchCms, saveCms } from '@/features/cms/service';
```

## Current Structure (Post-Migration)
```
src/
  features/
    attendance/
      service.ts
      pages/
        AttendanceManagement.tsx
        AttendanceView.tsx
      index.ts
    cms/
      service.ts
      pages/
        CmsEditor.tsx
        About.tsx
      index.ts
    reports/
      service.ts
      pages/
        OnDutyReportForm.tsx
      index.ts
    announcements/
      pages/
        AnnouncementsAdmin.tsx
        NotificationsPage.tsx
      index.ts
    index.ts
  pages/
    auth/
    public/
    activities/
    events/
    gallery/
    cadets/
    admin/
      UserManagement.tsx
    Dashboard.tsx
    index.ts
  components/
    layout/
    common/
  contexts/
  config/
  types/
  styles/
  utils/
```

All domain-specific services and pages have been migrated to their respective feature directories. The `src/services/` directory has been removed, and only generic/shared pages remain in `src/pages/`.

## Naming Conventions
- React components: `PascalCase` (e.g., `AnnouncementsAdmin`).
- Hooks: `useX` naming when introduced (future extraction from pages).
- Feature exports: namespaced objects via `export * as XFeature` in `src/features/index.ts`.
- Firestore collection constants: UPPER_SNAKE_CASE if shared (e.g., `ANNOUNCEMENTS_COLLECTION`).

## Import Examples
```ts
// Feature imports (current usage)
import { AttendanceManagement, AttendanceView } from '@/features/attendance';
import { CmsEditor, About } from '@/features/cms';
import { OnDutyReportForm } from '@/features/reports';
import { AnnouncementsAdmin, NotificationsPage } from '@/features/announcements';

// Service imports
import { listCadets, createSession, listenSessions } from '@/features/attendance/service';
import { fetchCms, saveCms, listenCms } from '@/features/cms/service';
import { saveOnDutyReport } from '@/features/reports/service';

// Constants
import { ANNOUNCEMENTS_COLLECTION } from '@/features/announcements';
```

## Dependency Direction
- Pages may import from features (recommended) or from shared utilities.
- Feature services encapsulate all Firestore/backend interactions for their domain.
- Components remain generic (should not import domain pages).
- Services do not depend on UI components.
- Cross-feature dependencies should be minimal; use shared types/config when needed.

## Migration Status
✅ **Completed Migrations:**
- Attendance domain (AttendanceManagement, AttendanceView + service)
- CMS domain (CmsEditor, About + service)
- Reports domain (OnDutyReportForm + service)
- Announcements domain (AnnouncementsAdmin, NotificationsPage)
- All old service files and duplicate pages removed
- Empty directories pruned (src/services, src/pages/cadet)

**Remaining in src/pages/:**
- Generic/public pages (Home, Login, Register, etc.)
- Gallery pages (Photos, Videos)
- Activity/Event markdown pages
- Admin UserManagement (not yet moved to feature)

## Animation & UX Layer
Animations are handled via CSS utilities + `AnimatedSection` component, orthogonal to domain structure.
Keep them in `components/common`.

## Testing (Future)
Introduce `__tests__/` inside each feature directory for unit / integration tests of service functions.

## Summary
This architecture adds an intermediate feature layer for clarity without disruptive moves. Adopt it progressively; existing imports continue to work.
