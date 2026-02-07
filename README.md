# College NCC Army Wing Website

A comprehensive web application for managing NCC activities, built with React, Firebase, and Bootstrap.

## 🌀 Animations & Responsive UI

Global, lightweight CSS animations and a visibility-driven component enhance UX:

Utilities (in `src/index.css`):
- `.fade-in` – opacity entrance
- `.slide-up` – translate + fade entrance
- `.stagger` – sequential child reveal (up to first 6 children)
- `.hover-lift` – elevate interactive cards on hover

Component: `AnimatedSection` (`src/components/common/AnimatedSection.tsx`)
```tsx
import { AnimatedSection } from './components';

<AnimatedSection effect="slide" delay={0.1} as={Row}>
  <Card />
</AnimatedSection>
```
Props: `effect` ('slide'|'fade'), `delay` (seconds), `threshold` (intersection), `as` (element override).

Usage Pattern:
1. Wrap major layout blocks (hero, rows, feature grids) with `AnimatedSection`.
2. Add `.hover-lift` to cards/buttons that benefit from subtle emphasis.
3. Apply `.stagger` to a parent row/container for automatic cascading entrance.
4. Keep animations short (<0.8s) for responsiveness.

Accessibility & Performance:
- IntersectionObserver disconnects after reveal; low overhead.
- Consider adding a future enhancement to respect `prefers-reduced-motion` by conditionally disabling animations.
- Avoid animating large images; animate container not media for smoother rendering.

Recommended Consistency Rules:
- One entrance animation per section; avoid chaining multiple different effects.
- Use `slide` for structural sections and `fade` for headings or small info blocks.
- Maintain visual rhythm: delays increment ~0.1s for stagger sequences.

Future Enhancements (optional):
- Theme transition (light/dark) with CSS custom properties.
- Animated progress indicators for loading states.
- Micro-interactions on form focus (border-color transitions).


## 🚀 Features

### For Cadets
- ✅ Profile management
- ✅ Attendance tracking with stats (Present, Late, Absent)
- ✅ Personal attendance view with filtering
- ✅ Event registration
- ✅ Exam preparation materials
- ✅ Achievement records
- ✅ Notifications

### For Admins
- ✅ Cadet management
- ✅ **Attendance Management** (Generator, Marker, Reporter)
  - Generator: Create attendance sessions by date, type, platoon
  - Marker: Mark attendance (P/L/A) for all cadets in a session
  - Reporter: View session summaries and export to CSV
- ✅ **On-Duty Report Form** (auto-fills cadet data)
- ✅ Event organization
- ✅ Duty roster management
- ✅ Report generation (CSV export)
- ✅ Gallery management
- ✅ **CMS Editor** (dynamic About page and more)
- ✅ Notifications & announcements

## 📋 Prerequisites

- Node.js (v16 or higher)
- npm or yarn
- Firebase account (free tier)
- Git

## 🛠️ Installation

### 1. Clone the repository
```bash
git clone <your-repo-url>
cd ncc-website
```

### 2. Install dependencies
```bash
npm install
```

### 3. Firebase Setup

#### a. Create a Firebase Project
1. Go to [Firebase Console](https://console.firebase.google.com/)
2. Click "Add project"
3. Enter project name (e.g., "college-ncc")
4. Disable Google Analytics (optional for MVP)
5. Click "Create project"

#### b. Enable Authentication
1. In Firebase Console, go to **Authentication** > **Sign-in method**
2. Enable **Email/Password** authentication
3. Click Save

#### c. Create Firestore Database
1. Go to **Firestore Database**
2. Click "Create database"
3. Select **Start in production mode**
4. Choose location closest to your users
5. Click "Enable"

#### d. Enable Storage
1. Go to **Storage**
2. Click "Get started"
3. Use the default security rules
4. Click "Done"

#### e. Get Firebase Config
1. Go to **Project Settings** (gear icon) > **General**
2. Scroll to "Your apps"
3. Click web icon `</>`
4. Register app with nickname "NCC Website"
5. Copy the `firebaseConfig` object

### 4. Configure Environment Variables

Create a `.env` file in the root directory:

```bash
cp .env.example .env
```

Edit `.env` and paste your Firebase config:

```env
VITE_FIREBASE_API_KEY=your_api_key_here
VITE_FIREBASE_AUTH_DOMAIN=your-project.firebaseapp.com
VITE_FIREBASE_PROJECT_ID=your-project-id
VITE_FIREBASE_STORAGE_BUCKET=your-project.appspot.com
VITE_FIREBASE_MESSAGING_SENDER_ID=123456789
VITE_FIREBASE_APP_ID=1:123456789:web:abcdef
```

### 5. Deploy Security Rules

#### Firestore Rules
1. In Firebase Console, go to **Firestore Database** > **Rules**
2. Copy content from `firestore.rules` file
3. Paste and **Publish**

#### Storage Rules
1. Go to **Storage** > **Rules**
2. Copy content from `storage.rules` file
3. Paste and **Publish**

## 🏃‍♂️ Running the Application

### Development Mode
```bash
npm run dev
```

The app will open at `http://localhost:3000`

### Build for Production
```bash
npm run build
```

## 🚀 Deployment to Firebase Hosting

### 1. Install Firebase CLI
```bash
npm install -g firebase-tools
```

### 2. Login to Firebase
```bash
firebase login
```

### 3. Initialize Firebase in your project
```bash
firebase init
```

Select:
- ✅ Hosting
- Choose your existing project
- Public directory: `dist`
- Single-page app: **Yes**
- GitHub auto-deploy: **No** (for now)

### 4. Build and Deploy
```bash
npm run build
firebase deploy
```

Your site will be live at: `https://your-project-id.web.app`

## 📁 Project Structure

```
ncc-website/
├── public/              # Static assets
├── src/
│   ├── components/      # Reusable components
│   │   ├── layout/      # Navbar, Footer
│   │   ├── common/      # ProtectedRoute, AnimatedSection, Markdown
│   │   └── index.ts
│   ├── features/        # Domain-based feature modules
│   │   ├── attendance/
│   │   │   ├── service.ts
│   │   │   ├── pages/
│   │   │   │   ├── AttendanceManagement.tsx
│   │   │   │   └── AttendanceView.tsx
│   │   │   └── index.ts
│   │   ├── cms/
│   │   │   ├── service.ts
│   │   │   ├── pages/
│   │   │   │   ├── CmsEditor.tsx
│   │   │   │   └── About.tsx
│   │   │   └── index.ts
│   │   ├── reports/
│   │   │   ├── service.ts
│   │   │   ├── pages/
│   │   │   │   └── OnDutyReportForm.tsx
│   │   │   └── index.ts
│   │   ├── announcements/
│   │   │   ├── pages/
│   │   │   │   ├── AnnouncementsAdmin.tsx
│   │   │   │   └── NotificationsPage.tsx
│   │   │   └── index.ts
│   │   └── index.ts
│   ├── config/          # Configuration files
│   │   ├── firebase.ts
│   │   └── constants.ts
│   ├── contexts/        # React contexts
│   │   └── AuthContext.tsx
│   ├── types/           # TypeScript type definitions
│   │   ├── index.ts
│   │   └── ambient.d.ts
│   ├── pages/           # Generic/public page components
│   │   ├── public/      # Home, Contact, Alumni, etc.
│   │   ├── auth/        # Login, Register, ForgotPassword
│   │   ├── activities/  # Camps, Parades, SocialService
│   │   ├── events/      # NationalDays
│   │   ├── gallery/     # Photos, Videos
│   │   ├── cadets/      # CadetList, Ranks, Achievements
│   │   ├── admin/       # UserManagement
│   │   ├── Dashboard.tsx
│   │   └── index.ts
│   ├── App.tsx          # Main app component
│   ├── main.tsx         # Entry point
│   └── index.css        # Global styles + animations
├── firebase.json        # Firebase config
├── firestore.rules      # Firestore security rules
├── firestore.indexes.json # Firestore composite indexes
├── storage.rules        # Storage security rules
├── tsconfig.json        # TypeScript config
├── vite.config.ts       # Vite config
├── .env.example         # Environment template
├── ARCHITECTURE.md      # Architecture & migration guide
├── ATTENDANCE_ONDUTY_GUIDE.md # Feature documentation
└── package.json         # Dependencies
```

**Note:** See `ARCHITECTURE.md` for detailed structure explanation and migration guidelines.

## 👥 Default User Roles

- **Visitor**: Public access (no login)
- **Cadet**: Registered cadets
- **Admin**: NCC staff/instructors
- **Super Admin**: CO/ANO with full access

## 🔐 Creating First Admin User

1. Register a regular cadet account
2. Go to Firebase Console > Firestore Database
3. Find the user document in `users` collection
4. Edit the `role` field from `cadet` to `admin` or `superadmin`
5. Refresh the website and login again

## 📊 Database Collections

- `users` - User accounts and roles
- `cadets` - Cadet profiles (linked to users by userId)
- `attendanceSessions` - Attendance sessions with nested `marks` subcollection
- `cms` - CMS pages (About, etc.) with sections and visibility control
- `events` - Events and camps
- `duties` - Duty rosters
- `gallery` - Photo albums
- `alumni` - Alumni directory
- `notifications` - Announcements
- `paradeLogs` - Daily parade records
- `achievements` - Cadet achievements
- `reports` - On-duty reports and other generated reports
- `auditLogs` - Admin action logs

## 🎨 Customization

### Change Theme Colors
Edit `src/index.css`:
```css
:root {
  --primary-color: #0d6efd;
  --secondary-color: #6c757d;
  /* ... */
}
```

### Update College Info
Edit `src/components/Footer.tsx` and `src/pages/Home.tsx`

### Edit Dynamic Content
Admins can update the About page and other CMS content directly from `/admin/cms` without touching code.

## 📱 Features to Implement Next

- [ ] QR code attendance
- [x] PDF report generation (structure ready for jsPDF)
- [x] CSV export for attendance
- [ ] Email notifications
- [ ] Gallery upload
- [ ] Event registration
- [ ] Announcements/notices board
- [ ] Exam prep quiz system
- [ ] Alumni networking
- [ ] Duty roster automation
- [ ] Mobile PWA support

## 🆘 Troubleshooting

### Build errors
```bash
rmdir /s /q node_modules
del package-lock.json
npm install
```

### Firebase permission errors
- Check Firestore and Storage rules are deployed
- Verify user role in Firestore database
- Ensure `cadets` collection has a doc with `userId` matching your logged-in user for cadet views

### Environment variables not loading
- Ensure `.env` file is in root directory
- Variable names must start with `VITE_`
- Restart dev server after changes (`npm run dev`)

### PowerShell execution policy error
Run in **cmd.exe** instead or bypass with:
```powershell
Set-ExecutionPolicy -Scope Process -ExecutionPolicy Bypass
```

## 🎯 Key Admin Workflows

### Attendance Management
1. **Generator tab**: Create a new attendance session (date, type, platoon filter, location)
2. **Marker tab**: Select session, mark each cadet as P/L/A (real-time update)
3. **Reporter tab**: Select session, view summary stats, export to CSV

### On-Duty Reporting
1. Navigate to **Admin → On-Duty Reports**
2. Select cadet from dropdown (cadet details auto-fill)
3. Fill duty date, type, time range, observations
4. Save to Firestore `reports` collection (can later add PDF generation)

### CMS Management
1. Go to **Admin → CMS / About**
2. Edit title and sections (heading, body)
3. Add or remove sections dynamically
4. Save → changes reflect immediately on the public About page

## 📞 Support

For issues and questions:
- Check Firebase Console for errors
- Review browser console for client errors
- Check Firestore rules for permission issues
- Verify TypeScript types and imports if you encounter type errors

## 📄 License

MIT License - feel free to use for your college NCC unit!

## 🙏 Credits

Built with:
- **React 18** + **TypeScript** + **Vite**
- **Firebase** (Auth, Firestore, Storage, Hosting)
- **React Bootstrap** + **Bootstrap 5** + **Bootstrap Icons**
- **React Router v6**
- **date-fns**, **react-hot-toast**
- Bootstrap Icons

---

**Made with ❤️ for NCC Cadets**
