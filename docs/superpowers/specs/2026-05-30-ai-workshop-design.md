# AI Workshop & Settings Design Spec

## Overview
Integrate an AI assistant into the Job Application Tracker that takes a Job Description (JD) alongside the user's base CV and custom guidelines to generate targeted CV changes and a drafted cover letter.

## Architecture
- **Backend:** Next.js App Router API Route utilizing the Vercel AI SDK.
- **Model:** Google Gemini (e.g., 1.5 Pro) via API key stored in `.env.local`.
- **Data Flow:** The frontend sends the JD and the user's saved guidelines to the backend. The backend constructs a prompt and streams the response back to the client.

## Database Schema (Supabase)
New table `ai_settings` (1 row per user):
- `id` (uuid, primary key, default gen_random_uuid())
- `user_id` (uuid, foreign key to auth.users)
- `base_cv` (text)
- `cover_letter_guidelines` (text)
- `formatting_rules` (text)
- `updated_at` (timestamp with time zone)

*Note: RLS policies will be applied so the user can only access their own row.*

## User Interface

### 1. AI Settings Page (`/ai-settings`)
- Simple form with three large `textarea` inputs:
  - Base CV
  - Cover Letter Guidelines (tone, structure)
  - Formatting Rules
- "Save" button to update the `ai_settings` table.

### 2. AI Workshop Page (`/workshop`)
- **Select Job:** Dropdown (Combobox) to select an existing job from the `jobs` table.
- **Input:** Large `textarea` for the Job Description.
- **Action:** "Generate Application Assets" button.
- **Output:** Two distinct panels (CV Changes, Cover Letter), populating in real-time via text streaming.
- **UX Detail:** 1-click "Copy to Clipboard" buttons on both output panels.

## Security & Privacy
- RLS (Row-Level Security) on `ai_settings` ensures only the authenticated user can read/update their settings.
- API keys remain secure on the server (never exposed to the browser).
