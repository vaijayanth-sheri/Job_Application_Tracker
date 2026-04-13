# JobTracker — Job Application Tracker

A lightweight, fast, and intuitive web application to track job applications, job boards, and skill gaps. Built with **Next.js 14**, **Supabase**, and **Tailwind CSS**.

![Next.js](https://img.shields.io/badge/Next.js-14-black?logo=nextdotjs)
![Supabase](https://img.shields.io/badge/Supabase-PostgreSQL-3ECF8E?logo=supabase)
![TypeScript](https://img.shields.io/badge/TypeScript-5-blue?logo=typescript)
![Tailwind](https://img.shields.io/badge/Tailwind-3-38B2AC?logo=tailwindcss)

---

## Features

- **Dashboard** — Stats overview with total, applied, interview, rejected, offers count. Filter by status and date range.
- **Jobs** — Full data table with search, filter, sort, inline status editing, and modal forms for create/edit.
- **Job Boards** — Card-based layout with quick-access links, keyword tags, and browsed-date tracking.
- **Skills** — Track skill gaps grouped by category with priority levels, progress bars, and click-to-cycle status.
- **Auth** — Email/password authentication via Supabase Auth.
- **RLS** — Row-Level Security ensures data is private per user.
- **Responsive** — Works on desktop and mobile.

---

## Prerequisites

- **Node.js** ≥ 18
- **npm** ≥ 9
- A **Supabase** project ([create one free](https://supabase.com/dashboard))

---

## Setup

### 1. Clone & Install

```bash
git clone <your-repo-url>
cd Job_application_tracker
npm install
```

### 2. Configure Supabase

1. Go to your [Supabase Dashboard](https://supabase.com/dashboard)
2. Create a new project (or use an existing one)
3. Go to **Settings → API** and copy:
   - `Project URL`
   - `anon / public` key

### 3. Set Environment Variables

```bash
cp .env.local.example .env.local
```

Edit `.env.local` and paste your values:

```env
NEXT_PUBLIC_SUPABASE_URL=https://your-project-id.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key-here
```

### 4. Run Database Schema

1. Go to **Supabase Dashboard → SQL Editor**
2. Click **New Query**
3. Paste the contents of `supabase_schema.sql`
4. Click **Run**

This creates the `jobs`, `job_boards`, and `skills` tables with Row-Level Security policies.

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

## Deploy to Vercel

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

## Project Structure

```
src/
├── app/
│   ├── globals.css          # Global styles + Tailwind
│   ├── layout.tsx           # Root layout
│   ├── page.tsx             # Redirect to /dashboard
│   ├── login/page.tsx       # Auth page
│   ├── dashboard/page.tsx   # Dashboard with stats
│   ├── jobs/page.tsx        # Jobs table + CRUD
│   ├── boards/page.tsx      # Job boards cards + CRUD
│   ├── skills/page.tsx      # Skills cards + CRUD
│   └── auth/callback/route.ts  # Auth callback
├── components/
│   ├── Sidebar.tsx          # Navigation sidebar
│   ├── LayoutShell.tsx      # Layout wrapper
│   └── ui/                  # Reusable UI components
│       ├── Badge.tsx
│       ├── Button.tsx
│       ├── ConfirmDialog.tsx
│       ├── Input.tsx
│       ├── Modal.tsx
│       ├── Select.tsx
│       └── Toast.tsx
├── lib/
│   ├── supabase.ts          # Browser Supabase client
│   ├── supabase-server.ts   # Server Supabase client
│   └── utils.ts             # Helpers + color mappings
├── types/
│   └── database.ts          # TypeScript interfaces
└── middleware.ts             # Auth middleware
```

---

## Tech Stack

| Layer      | Technology     |
|------------|----------------|
| Frontend   | Next.js 14 (App Router) |
| Styling    | Tailwind CSS 3 |
| Database   | Supabase (PostgreSQL) |
| Auth       | Supabase Auth  |
| Language   | TypeScript 5   |
| Deployment | Vercel         |

---

## License

MIT
