# JobTracker — Job Application Tracker

A comprehensive, fast, and intuitive web application to track job applications, companies, job boards, skill gaps, and manage your core candidate profile. Built with **Next.js 14**, **Supabase**, and **Tailwind CSS**.

![Next.js](https://img.shields.io/badge/Next.js-14-black?logo=nextdotjs)
![Supabase](https://img.shields.io/badge/Supabase-PostgreSQL-3ECF8E?logo=supabase)
![TypeScript](https://img.shields.io/badge/TypeScript-5-blue?logo=typescript)
![Tailwind](https://img.shields.io/badge/Tailwind-3-38B2AC?logo=tailwindcss)

---

## 🌟 Major Features

- **Dashboard & Analytics** — A dynamic overview with total applications, interview counts, offers, and rejections. Filter by status and specific date ranges.
- **Job Application Tracking** — Full data table with search, filter, sort, inline status editing, and sleek modal forms to log and manage your job hunt.
- **Global & Tracked Companies** — A shared global database of companies. Users can "track" global companies to add their private interest-level stars, LinkedIn connections, and notes without polluting the global list.
- **Global Job Boards** — A comprehensive, globally-accessible directory of job search sites. Users can "track" specific boards to add their personal keywords, browsing dates, and private notes.
- **Quick Notes (Floating Notepad)** — A globally accessible floating notepad that sits in the corner of your screen on every page. Perfect for rapidly storing job links or titles before properly logging them.
- **Candidate Profile Builder** — A dedicated section to manage your professional identity. Store your Professional Summary, Experience, Projects, Education, and Core Skills in one centralized database.
- **AI Workshop / Generator** — Integrated workspace to generate and format Cover Letters and CVs using your built-in candidate profile data.
- **Skill Gap Tracking** — Track required skills you've discovered during your job hunt. Group them by category, assign priorities, and visually monitor your learning progress.
- **Smart Suggestions** — Auto-complete dropdowns intelligently suggest previous entries (like company names, locations, and sectors) to vastly speed up data entry.

---

## 🔒 Security & Performance

- **Authentication** — Secure Email/Password authentication powered by Supabase Auth.
- **Row-Level Security (RLS)** — Robust PostgreSQL policies ensure that user-specific data (notes, tracked companies, quick notes, profile data) remains strictly private and invisible to other users.
- **Optimized Architecture** — Strict data types, intelligent junction tables for global vs. private data, index targeting, and automatic timestamps for lightning-fast performance.
- **Modern UI/UX** — Responsive layouts, micro-animations, glassmorphism, and dynamic visual feedback tailored for desktop and mobile.

---

## 🛠️ Prerequisites

- **Node.js** ≥ 18
- **npm** ≥ 9
- A **Supabase** project ([create one free](https://supabase.com/dashboard))

---

## 🚀 Setup & Installation

### 1. Clone & Install

```bash
git clone <your-repo-url>
cd Job_application_tracker
npm install
```

### 2. Configure Supabase

1. Go to your [Supabase Dashboard](https://supabase.com/dashboard)
2. Create a new project (or use an existing one)
3. Go to **Settings → API** and copy your `Project URL` and `anon / public` key.

### 3. Set Environment Variables

```bash
cp .env.local.example .env.local
```

Edit `.env.local` and paste your values:

```env
NEXT_PUBLIC_SUPABASE_URL=https://your-project-id.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key-here
```

### 4. Run Database Migrations

1. Go to **Supabase Dashboard → SQL Editor**
2. Click **New Query**
3. Paste and execute the contents of `supabase_schema.sql` (Base setup)
4. Execute `migrate_to_global.sql` (Sets up Global Companies & Job Boards)
5. Execute `quick_notes_schema.sql` (Sets up Quick Notes)
6. Execute `candidate_database.sql` and `ai_settings_table.sql` (Sets up Profile & Workshop)

*Note: You can execute these iteratively as you explore the project.*

### 5. Enable Email Auth

1. Go to **Authentication → Providers**
2. Ensure **Email** is enabled
3. Under **Authentication → URL Configuration**, set the Site URL to:
   - Local: `http://localhost:3000`
   - Production: `https://your-domain.vercel.app`

### 6. Run Locally

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) in your browser.

---

## 🚢 Deploy to Vercel

### 1. Push to GitHub

```bash
git init
git add .
git commit -m "Initial commit"
git remote add origin <your-repo-url>
git push -u origin main
```

### 2. Deploy on Vercel

1. Go to [vercel.com/new](https://vercel.com/new)
2. Import your GitHub repository
3. Add environment variables:
   - `NEXT_PUBLIC_SUPABASE_URL`
   - `NEXT_PUBLIC_SUPABASE_ANON_KEY`
4. Click **Deploy**

### 3. Update Supabase URLs

After deployment, update the **Site URL** in Supabase:

- Go to **Authentication → URL Configuration**
- Set Site URL to `https://your-app.vercel.app`
- Add `https://your-app.vercel.app/auth/callback` to Redirect URLs

---

## 📁 Project Structure

```
src/
├── app/
│   ├── globals.css          # Global styles + Tailwind UI definitions
│   ├── layout.tsx           # Root layout
│   ├── login/               # Supabase Auth
│   ├── dashboard/           # Main stats & tracking dashboard
│   ├── jobs/                # Jobs table & applications
│   ├── companies/           # Global & tracked companies
│   ├── boards/              # Global & tracked job boards
│   ├── skills/              # Skills gap tracking
│   ├── profile/             # Candidate Profile UI
│   ├── profile-database/    # Profile database management
│   ├── workshop/            # AI document generator workspace
│   └── api/                 # Backend API routes
├── components/
│   ├── Sidebar.tsx          # Navigation sidebar
│   ├── LayoutShell.tsx      # Main authenticated layout wrapper
│   ├── QuickNotesPanel.tsx  # Floating notepad component
│   └── ui/                  # Reusable form & UI components
├── lib/
│   ├── supabase.ts          # Client-side Supabase setup
│   └── utils.ts             # Formatting & color mappings
└── types/
    └── database.ts          # Comprehensive TypeScript schema definitions
```

---

## 💻 Tech Stack

| Layer      | Technology |
|------------|------------|
| **Frontend**   | Next.js 14 (App Router) |
| **Styling**    | Tailwind CSS 3 |
| **Database**   | Supabase (PostgreSQL) |
| **Auth**       | Supabase Auth |
| **Language**   | TypeScript 5 |
| **Deployment** | Vercel |

---

## 📄 License

MIT
