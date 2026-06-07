import { streamText } from 'ai';
import { createGoogleGenerativeAI } from '@ai-sdk/google';
import { createServerClient } from '@supabase/ssr';
import { cookies } from 'next/headers';

export async function POST(req: Request) {
  try {
    const { jobDescription } = await req.json();

    if (!jobDescription) {
      return new Response(JSON.stringify({ error: "Missing jobDescription" }), { status: 400 });
    }

    const cookieStore = cookies();
    const supabase = createServerClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      {
        cookies: {
          getAll() {
            return cookieStore.getAll();
          },
          setAll() {},
        },
      }
    );

    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), { status: 401 });
    }

    // Fetch Candidate Database
    const [
      { data: core },
      { data: experiences },
      { data: projects },
      { data: education },
      { data: skills }
    ] = await Promise.all([
      supabase.from('profile_core').select('*').eq('user_id', user.id).single(),
      supabase.from('profile_experiences').select('*').eq('user_id', user.id).order('start_date', { ascending: false }),
      supabase.from('profile_projects').select('*').eq('user_id', user.id),
      supabase.from('profile_education').select('*').eq('user_id', user.id),
      supabase.from('skills').select('*').eq('user_id', user.id).eq('status', 'learned')
    ]);

    if (!core) {
      return new Response(JSON.stringify({ error: "Core profile not found. Please setup Profile Database first." }), { status: 400 });
    }

    // Construct the XML Database context
    const candidateDatabaseXML = `
<CANDIDATE_DATABASE>
  <CORE_PROFILE>
    <PROFESSIONAL_SUMMARY>${core.professional_summary}</PROFESSIONAL_SUMMARY>
    <CAREER_INTERESTS>${core.career_interests}</CAREER_INTERESTS>
    <COVER_LETTER_GUIDELINES>${core.cover_letter_guidelines}</COVER_LETTER_GUIDELINES>
  </CORE_PROFILE>

  <SKILLS_DATABASE>
    ${skills?.map((s: any) => `<SKILL category="${s.category || 'General'}">${s.skill_name}</SKILL>`).join('\n    ') || 'None provided'}
  </SKILLS_DATABASE>

  <EXPERIENCES_DATABASE>
    ${experiences?.map((e: any) => `
    <EXPERIENCE>
      <TITLE>${e.title}</TITLE>
      <COMPANY>${e.company}</COMPANY>
      <DATES>${e.start_date} - ${e.end_date}</DATES>
      <DESCRIPTION>${e.description}</DESCRIPTION>
    </EXPERIENCE>`).join('') || 'None provided'}
  </EXPERIENCES_DATABASE>

  <PROJECTS_DATABASE>
    ${projects?.map((p: any) => `
    <PROJECT>
      <NAME>${p.name}</NAME>
      <DESCRIPTION>${p.description}</DESCRIPTION>
      <TECHNOLOGIES>${p.technologies_used}</TECHNOLOGIES>
      <BUSINESS_RELEVANCE>${p.business_relevance}</BUSINESS_RELEVANCE>
      <TRANSFERABLE_VALUE>${p.transferable_value}</TRANSFERABLE_VALUE>
    </PROJECT>`).join('') || 'None provided'}
  </PROJECTS_DATABASE>

  <EDUCATION_DATABASE>
    ${education?.map((e: any) => `
    <EDUCATION>
      <INSTITUTION>${e.institution}</INSTITUTION>
      <DEGREE>${e.degree}</DEGREE>
      <FIELD>${e.field_of_study}</FIELD>
    </EDUCATION>`).join('') || 'None provided'}
  </EDUCATION_DATABASE>
</CANDIDATE_DATABASE>
`;

    const systemPrompt = `
You are an expert technical recruiter, CV optimizer, and application writer.
Your primary objective is to act as an EVIDENCE RETRIEVAL SYSTEM.
You will be provided with a <CANDIDATE_DATABASE> and a target JOB DESCRIPTION.

CORE PRINCIPLE:
Every statement you produce must be traceable to the stored candidate information.
If evidence does not exist, omit the information.
Do NOT invent responsibilities, metrics, or achievements.
Prioritize relevance over keyword matching.

CRITICAL GUARDRAIL: Analyze the JOB DESCRIPTION text carefully. If the text appears to be a generic company homepage, an article, or is clearly NOT a specific job posting, you MUST output EXACTLY the phrase: "ERROR: NOT_A_JOB_POSTING" and nothing else. Do not generate the 5 sections. Every request is independent.

OUTPUT FORMAT:
You must output EXACTLY these 5 sections in order. Use Markdown headers for the sections.

### SECTION 1: PROFILE SUMMARY
A tailored professional summary aligned to the target role.
Length: 4-6 lines maximum.

### SECTION 2: RELEVANT SKILLS
Only skills relevant to the role selected from the SKILLS_DATABASE.
Length: 10-20 skills as a bulleted list.
Prioritize direct matches, adjacent matches, and transferable skills.

### SECTION 3: EXPERIENCE SECTION
For each relevant stored experience, provide:
- **Title at Company**
- Exactly 3 tailored bullet points.
These bullets must be selected or adapted from the existing description evidence.
Do not create responsibilities that did not occur.

### SECTION 4: SELECTED PROJECTS
Select the 3 most relevant projects from the PROJECTS_DATABASE based on the job description.
For each project:
- **Project Title**
- Exactly 3 tailored bullet points.

### SECTION 5: COVER LETTER CONTENT
Follow the tone specified in the COVER_LETTER_GUIDELINES.
Structure:
- Introduction paragraph.
- Why I am a fit (5-6 concise bullet points, each 1-2 sentences maximum, evidence-based).
- Professional and concise closing paragraph.

CANDIDATE DATABASE:
${candidateDatabaseXML}
`;

    const google = createGoogleGenerativeAI({
      apiKey: process.env.GEMINI_API_KEY || '',
    });

    const result = await streamText({
      model: google('gemini-2.5-flash'),
      system: systemPrompt,
      prompt: `JOB DESCRIPTION:\n\n${jobDescription}`,
    });

    return result.toTextStreamResponse();
  } catch (error: any) {
    console.error("AI Workshop API Error:", error);
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' },
    });
  }
}
