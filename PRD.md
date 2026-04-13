\# Job Application Tracker – Product Requirements Document (PRD)



\## 1. Product Overview



A lightweight, fast, and intuitive web-based application to track job applications, related resources, and skill gaps. The tool replaces scattered spreadsheets and notes with a structured, visual, and user-friendly workflow.



Primary goal: \*\*Speed + clarity in job tracking with minimal friction\*\*



\---



\## 2. Target User



\* Individual job seeker (single user)

\* No collaboration required

\* No sensitive data handling required



\---



\## 3. Core Principles



\* Fast input (≤5 seconds per job entry)

\* Minimal clicks

\* Visual clarity (status, progress, priorities)

\* Clean, modern, and “happy” UI

\* Zero clutter



\---



\## 4. Tech Stack



\### Frontend



\* Next.js (React)



\### Backend / Database



\* Supabase (PostgreSQL + Auth + API)



\### Deployment



\* Vercel



\---



\## 5. Features (MVP Scope)



\## 5.1 Homepage (Dashboard)



Purpose: Quick overview of job application progress



\### Components:



\* Stats Cards:



&#x20; \* Total Jobs

&#x20; \* Applied

&#x20; \* Interview

&#x20; \* Rejected

&#x20; \* Offers

\* Filters:



&#x20; \* By date range

&#x20; \* By status

\* Optional:



&#x20; \* Recent activity list



\---



\## 5.2 Jobs Page



\### Table Fields:



\* ID (auto-generated)

\* Title (job role)

\* Company (optional but recommended)

\* Applied Date

\* Location

\* Current Status



&#x20; \* Wishlist

&#x20; \* Applied

&#x20; \* Interview

&#x20; \* Offer

&#x20; \* Rejected

\* Position Relevancy (Low / Medium / High)

\* Interest Level (1–5 scale)

\* Interview Stage (optional text)

\* Job Link (URL)

\* Notes (free text)



\### Functionalities:



\* Create job (quick-add)

\* Edit job (inline or modal)

\* Delete job

\* Filter + search

\* Sort by date/status



\---



\## 5.3 Job Boards Page



\### Fields:



\* Site Name

\* Link

\* Last Browsed Date

\* Keywords (search terms used)

\* Notes



\### Functionalities:



\* Add / edit / delete entries

\* Quick access links



\---



\## 5.4 Skills Page



\### Purpose:



Track skill gaps discovered during job search



\### Fields:



\* Skill Name

\* Category (optional)

\* Priority (Low / Medium / High)

\* Status:



&#x20; \* To Learn

&#x20; \* In Progress

&#x20; \* Learned

\* Notes



\### Functionalities:



\* Add / edit / delete skills

\* Filter by status



\---



\## 6. Data Model (Simplified)



\### Jobs Table



\* id

\* title

\* company

\* applied\_date

\* location

\* status

\* relevancy

\* interest\_level

\* interview\_stage

\* job\_link

\* notes

\* created\_at



\### Job Boards Table



\* id

\* site

\* link

\* last\_browsed

\* keywords

\* notes



\### Skills Table



\* id

\* skill\_name

\* category

\* priority

\* status

\* notes



\---



\## 7. UX Requirements



\* Clean, colorful UI (soft, non-distracting colors)

\* Smooth transitions

\* Fast load time

\* Minimal form inputs

\* Inline editing where possible

\* Mobile responsive (basic)



\---



\## 8. Non-Functional Requirements



\* Fast performance

\* Data persistence via Supabase

\* Private user data (auth enabled)

\* Simple deployment and setup



\---



\## 9. Out of Scope (for MVP)



\* AI features

\* Notifications / reminders

\* Multi-user collaboration

\* Advanced analytics

\* Integrations (LinkedIn, etc.)



\---



\## 10. Success Criteria



\* User can add a job in <5 seconds

\* User can visually track status instantly

\* No friction in daily usage

\* Fully functional on free-tier deployment



\---



