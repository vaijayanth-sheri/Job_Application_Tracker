import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

// Initialize Supabase client with Service Role or regular client if auth token provided
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;

export async function POST(req: Request) {
  try {
    const { jobDescription, userId } = await req.json();

    if (!jobDescription || !userId) {
      return NextResponse.json({ error: 'Missing jobDescription or userId' }, { status: 400 });
    }

    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // 1. Fetch user's profile
    const { data: profileData, error: profileError } = await supabase
      .from('user_profiles')
      .select('resume_text')
      .eq('user_id', userId)
      .maybeSingle();

    if (profileError) {
      console.error("Profile fetch error:", profileError);
    }

    const resumeText = profileData?.resume_text || '';

    // 2. Call Gemini API
    const geminiApiKey = process.env.GEMINI_API_KEY;
    if (!geminiApiKey) {
      return NextResponse.json({ error: 'Gemini API key is not configured' }, { status: 500 });
    }

    const profileSection = resumeText 
      ? `USER PROFILE / RESUME:\n${resumeText}` 
      : 'USER PROFILE / RESUME: Not provided. Score relevancy as 50 and note that no profile was available for matching.';

    const prompt = `
You are an expert technical recruiter and career coach.
I have a job description and a user's resume/profile.
Extract key information from the job description and evaluate how well the user matches this job.

${profileSection}

JOB DESCRIPTION:
${jobDescription}

Return ONLY a valid JSON object with exactly these fields (no markdown, no explanation, just raw JSON):
{
  "title": "Extracted Job Title",
  "company": "Extracted Company Name (empty string if not found)",
  "location": "Extracted Location (empty string if not found)",
  "relevancy": 85,
  "interest_level": 3,
  "match_reasoning": "A 1-2 sentence explanation of why this is or isn't a good fit."
}

Rules:
- "relevancy" is an integer from 0 to 100 based on how well the user's skills match the job requirements. 100 is a perfect match.
- "interest_level" is an integer from 1 to 5 estimating how interesting this role would be for the user.
- Extract the job title, company name and location directly from the job description.
    `;

    const geminiUrl = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${geminiApiKey}`;
    
    const geminiRes = await fetch(geminiUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        contents: [{ parts: [{ text: prompt }] }],
        generationConfig: {
          temperature: 0.2
        }
      })
    });

    if (!geminiRes.ok) {
      const errorText = await geminiRes.text();
      console.error("Gemini API Error:", errorText);
      return NextResponse.json({ error: `Gemini API Error: ${errorText}` }, { status: 500 });
    }

    const geminiData = await geminiRes.json();
    let rawText = geminiData.candidates[0].content.parts[0].text;
    
    // Strip markdown formatting if the model included it
    rawText = rawText.replace(/```json/gi, '').replace(/```/g, '').trim();

    // Parse the JSON safely
    let parsedResult;
    try {
      parsedResult = JSON.parse(rawText);
    } catch (e) {
      console.error("Failed to parse Gemini JSON:", rawText);
      return NextResponse.json({ error: 'AI returned invalid format.' }, { status: 500 });
    }

    // Combine match_reasoning into notes
    const finalData = {
      title: parsedResult.title || '',
      company: parsedResult.company || '',
      location: parsedResult.location || '',
      relevancy: typeof parsedResult.relevancy === 'number' ? parsedResult.relevancy : 50,
      interest_level: typeof parsedResult.interest_level === 'number' ? parsedResult.interest_level : 3,
      notes: parsedResult.match_reasoning ? `Match Reasoning: ${parsedResult.match_reasoning}` : ''
    };

    return NextResponse.json(finalData);

  } catch (error: any) {
    console.error("Smart Add Job error:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
