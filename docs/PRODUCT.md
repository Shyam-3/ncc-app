# Product Context — NCC Army Wing

## Purpose

The NCC Army Wing application is a web-based management system for a college NCC (National Cadet Corps) unit at **TCE (Thiagarajar College of Engineering)**. It replaces manual record-keeping with digital workflows for cadet management, attendance tracking, report generation, and public-facing information.

## Users

| User Type            | Description                                                                                 |
| -------------------- | ------------------------------------------------------------------------------------------- |
| **Public visitors**  | View public pages (home, about, events, gallery, alumni directory, recruitment)             |
| **Cadets (members)** | Registered NCC cadets — view attendance, profile, announcements                             |
| **ANOs (admins)**    | Associate NCC Officers — manage cadets, attendance, reports, announcements, CMS             |
| **Superadmins**      | Full administrative access including alumni management, audit logs, settings, user deletion |
| **Alumni**           | Former cadets — limited dashboard access, can self-submit profiles                          |

## NCC Terminology

| Term                  | Meaning                                                                          |
| --------------------- | -------------------------------------------------------------------------------- |
| **NCC**               | National Cadet Corps — India's youth development organization                    |
| **Cadet**             | A student enrolled in NCC training                                               |
| **ANO**               | Associate NCC Officer — the faculty officer managing the NCC unit                |
| **Division**          | SD (Senior Division — male) or SW (Senior Wing — female)                         |
| **Regimental Number** | Unique NCC-assigned identifier for each cadet (format: e.g., `TN20SDA123456`)    |
| **NCC Year**          | Year of NCC training (1st, 2nd, or 3rd Year) — independent of academic year      |
| **Academic Year**     | College year (1st through 5th Year depending on department)                      |
| **Tenure**            | 3-year NCC enrollment period (e.g., 2024-2027)                                   |
| **Rank**              | Military-style rank: CDT → LCPL → CPL → SGT → CQMS → CSM → CUO → SUO             |
| **CATC**              | Combined Annual Training Camp                                                    |
| **Parade State**      | Official count of cadets present for parade/training                             |
| **On-Duty Letter**    | Official letter excusing cadets from academic classes for NCC activities         |
| **Nominal Roll**      | Complete roster of cadets with personal/NCC details                              |
| **Training Diary**    | Log of training activities and topics covered                                    |
| **Year Rollover**     | Annual process of promoting cadets to next year and graduating final-year cadets |

## Core Workflows

### 1. Cadet Registration

New cadets register → Admin reviews pending registrations → Admin approves/rejects → Approved cadets become active members.

### 2. Attendance Tracking

Admin creates attendance session → Marks cadets present/absent → Session can be locked → Per-cadet statistics are computed → Charts display attendance trends.

### 3. Report Generation

Admin selects report type → Fills parameters → System generates PDF using cadet data from Firestore → PDF downloaded or printed.

**Implemented reports:** Annual Attendance, Nominal Roll, CATC/Camp, Parade State, Training Diary, On-Duty Letter.

### 4. Announcements

Admin creates announcement → Sets visibility (public or auth-only) → Sets category → Cadets see unread count → Read tracking per user.

### 5. Year Rollover (Annual)

Automated GitHub Action runs in April/May → Promotes cadets to next academic/NCC year → Archives graduated cadets to alumni → Cleans up auth accounts → Creates rollback snapshots.

### 6. CMS Content

Admin edits About, Contact, Unit Structure pages → Content stored in Firestore → Public pages render CMS content.

### 7. Alumni Self-Submission

Alumni visit `/alumni/submit` → Fill profile form → Status set to `pending` → Superadmin reviews and approves → Profile appears in public alumni directory.

## Product Principles

- **Offline-first is NOT a goal** — the app requires internet connectivity.
- **Mobile-responsive** — Bootstrap provides responsive layouts but no native mobile app is planned.
- **Data ownership** — cadets own their profile data; admins manage operational data.
- **Academic calendar aligned** — the year rollover is tied to April/May, not January.
- **Single NCC unit** — the app serves one college's NCC unit, not multiple units.
