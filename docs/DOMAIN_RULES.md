# Domain Rules — NCC Army Wing

These are the business rules governing the NCC application, derived from actual implementation. Do not silently change these rules without explicit approval.

## Registration & Approval

1. **Open registration**: Anyone can submit a cadet registration (`pendingCadets` collection allows unauthenticated create).
2. **Email verification**: Registrants must verify their email before admin review. Verification status is synced from Firebase Auth to Firestore.
3. **Admin approval required**: Pending cadets must be approved by an admin or superadmin before gaining `member` access.
4. **Rejection**: Admins can reject pending registrations. Rejected cadets' auth accounts are queued for deletion via `pendingAuthDeletions`.
5. **Default role**: Approved cadets receive the `member` role. Role upgrades to `admin`/`superadmin` are manual.
6. **Unique identifiers**: Regimental number, register number, and roll number must be unique. Enforced via the `takenNumbers` collection.

## Divisions

- **SD (Senior Division)**: Male cadets.
- **SW (Senior Wing)**: Female cadets.
- A cadet belongs to exactly one division. Division does not change during tenure.

## Ranks

Ordered from lowest to highest:

1. CDT (Cadet)
2. LCPL (Lance Corporal)
3. CPL (Corporal)
4. SGT (Sergeant)
5. CQMS (Company Quarter Master Sergeant)
6. CSM (Company Sergeant Major)
7. CUO (Cadet Under Officer)
8. SUO (Senior Under Officer)

New cadets default to `CDT`. Rank promotions are manual admin operations.

## Academic Years & NCC Years

- **Academic years**: 1st through 5th Year (5th Year applies to Architecture and Data Science departments with 5-year courses).
- **NCC years**: 1st, 2nd, or 3rd Year of NCC training.
- Academic year and NCC year are **independent** — a 2nd-year academic student could be in 1st-year NCC training.
- Year labels accept multiple formats (e.g., `1st Year`, `1st`, `1`, `I`) — normalized via `normalizeAcademicYear()` and `normalizeNccYear()`.

## NCC Tenure

- Standard NCC tenure is **3 years** from the date of enrollment.
- Tenure is calculated as `enrollmentYear` to `enrollmentYear + 3` (e.g., 2024-2027).
- Tenure determines the Cloudinary folder path for profile photos.

## Departments

| Code     | Name                                       | Course Tenure |
| -------- | ------------------------------------------ | ------------- |
| IT       | Information Technology                     | 4 years       |
| CSE      | Computer Science and Engineering           | 4 years       |
| ECE      | Electronics and Communication Engineering  | 4 years       |
| EEE      | Electrical and Electronics Engineering     | 4 years       |
| AMCS     | Data Science                               | 5 years       |
| CSE AIML | Computer Science and Engineering (AI & ML) | 4 years       |
| MECH     | Mechanical Engineering                     | 4 years       |
| MECT     | Mechatronics                               | 4 years       |
| CIVIL    | Civil Engineering                          | 4 years       |
| CSBS     | Computer Science and Business Systems      | 4 years       |
| ARCH     | Architecture                               | 5 years       |

## Attendance

- Attendance status is binary: **P** (Present) or **A** (Absent).
- Attendance sessions can be filtered by division and NCC year.
- Sessions can be **locked** to prevent further modifications.
- Attendance thresholds:
  - Below 75% → Low attendance
  - 75-85% → Adequate
  - 85-95% → Good
  - Above 95% → Excellent

## Announcements

- **Categories**: General, Camps, Activities, Parades, Recruitment, Celebrations.
- **Visibility**: `public` (visible to all) or `auth_only` (visible to authenticated users).
- **Read tracking**: Per-user read receipts stored in subcollections.
- Unread count is computed by comparing user's `readAnnouncements` against all visible announcements.

## Year Rollover

The annual year rollover is the most critical automated process:

1. **Timing**: Runs in April/May. Controlled by a configurable date in `settings` collection, checked by `scripts/check-schedule.mjs`.
2. **Promotion**: Each cadet's academic year and NCC year are incremented by 1.
3. **Graduation**: Cadets who have completed their academic course tenure (based on department) or their 3rd NCC year are archived.
4. **Archival**: Graduated cadets are moved from `users` to `alumni` collection.
5. **Auth cleanup**: Auth accounts of graduated cadets are queued for deletion via `pendingAuthDeletions`, processed by `scripts/auth-cleanup.mjs`.
6. **Rollback snapshots**: A snapshot of pre-rollover data is saved to `rollbackSnapshots` for disaster recovery.
7. **Dry run**: The rollover script supports `--dry-run` for preview without writes.

> **DECISION REQUIRED**: The rollover currently archives all members whose academic course is complete. There is no mechanism for cadets who repeat a year or extend NCC training.

## Google Sign-In

- Google sign-in is restricted to **existing approved users only**.
- If a Google account has no matching record in `users` or `alumni`, the auto-created Auth account is deleted.
- If a user's UID changes between providers (email → Google), the system attempts **auto-heal migration** of Firestore documents.

## Profile Photos

- Photos are uploaded to **Cloudinary** (not Firebase Storage).
- Upload uses unsigned presets — no backend required.
- Folder structure: `ncc_assets/profiles/cadets/{tenure}/{division}/{sanitized_name}_{timestamp}`
- Old photos are queued for cleanup in `cloudinary_cleanup` collection, processed nightly by GitHub Actions.

## Blood Groups

Accepted values: A+, A-, B+, B-, AB+, AB-, O+, O-, A1+, A1-, A1B+, A1B-
