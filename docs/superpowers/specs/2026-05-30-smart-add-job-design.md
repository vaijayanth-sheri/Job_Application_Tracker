# Smart Add Job Design Spec

## 1. Overview
The "Smart Add Job" feature enables users to paste a raw Job Description into the app, which uses the free-tier Gemini API to automatically extract key job details and generate a profile match score.

## 2. Components & Architecture

### 2.1 User Profile Storage
- **Database Addition**: We will create a new `user_profiles` table in Supabase.
- **Fields**: 
  - `id` (UUID)
  - `user_id` (UUID, references auth.users)
  - `resume_text` (TEXT) - A single block containing all skills, experiences, and interests.
- **UI**: A simple "Profile" page where the user can paste and save their raw resume/skills text.

### 2.2 Smart Add Modal (UI)
- A new button on the Jobs dashboard: "Smart Add".
- Opens a modal with a large `<textarea>` for the Job Description.
- Contains an "Analyze" button.

### 2.3 AI Engine (Next.js API Route)
- **Endpoint**: `/api/smart-add-job`
- **Model**: Google Gemini (Free Tier, `gemini-1.5-flash` or similar fast model).
- **Process**:
  1. Fetch the user's `resume_text` from the database.
  2. Send a prompt to Gemini containing the `resume_text` and the pasted `job_description`.
  3. Instruct Gemini to return a strict JSON object with:
     - `title` (Job Title)
     - `company` (Company Name)
     - `location` (Job Location)
     - `relevancy` (low, medium, high - based on match score)
     - `match_score` (1-100)
     - `match_reasoning` (1-2 sentences)

### 2.4 Review & Save (UI)
- Once the API returns the JSON, the Smart Add modal populates a standard job form.
- The `status` field defaults to "wishlist" (left blank/default for manual adjustment).
- The user can manually review, edit any field, and then click "Save to Tracker".
- Upon saving, the app checks if the `company` exists in the `companies` table and adds it if not, then inserts the new job into the `jobs` table.

## 3. Scope & Constraints
- **Cost**: $0 (using Gemini Free Tier).
- **Input**: Manual copy-paste of text (avoids scraper blocking issues).
- **Scale**: Generous limits (1,500 requests/day) easily cover the user's requirement of 100 jobs/week.
