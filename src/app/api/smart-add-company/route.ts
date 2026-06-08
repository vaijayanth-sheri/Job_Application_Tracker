import { NextResponse } from 'next/server';

export async function POST(req: Request) {
  try {
    const { companyInput } = await req.json();

    if (!companyInput) {
      return NextResponse.json({ error: 'Missing companyInput' }, { status: 400 });
    }

    const geminiApiKey = process.env.GEMINI_API_KEY;
    if (!geminiApiKey) {
      return NextResponse.json({ error: 'Gemini API key is not configured' }, { status: 500 });
    }

    const prompt = `
You are an expert corporate researcher.
I have provided a company name, website link, or scraped text from a company homepage.
Your goal is to extract or research the company's core details.

INPUT:
${companyInput}

Return ONLY a valid JSON object with exactly these fields (no markdown, no explanation, just raw JSON):
{
  "company_name": "Extracted or Researched Company Name",
  "sector": "Extracted Sector",
  "location": "Headquarters Location (City, Country)",
  "website_link": "Official Website URL",
  "is_global": true
}

Rules:
- The "sector" MUST be concise, exactly 2 to 3 words max (e.g. "Renewable Energy", "Financial Technology", "Software Development").
- If the input is a broken link or just a name, use your Google Search capability to find the official website, location, and sector.
- Do NOT hallucinate. If you absolutely cannot find the company via search, return empty strings for the fields.
`;

    const geminiUrl = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${geminiApiKey}`;
    
    const geminiRes = await fetch(geminiUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        contents: [{ parts: [{ text: prompt }] }],
        tools: [{ googleSearch: {} }],
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

    let parsedResult;
    try {
      parsedResult = JSON.parse(rawText);
    } catch (e) {
      console.error("Failed to parse Gemini JSON:", rawText);
      return NextResponse.json({ error: 'AI returned invalid format.' }, { status: 500 });
    }

    const finalData = {
      company_name: parsedResult.company_name || '',
      sector: parsedResult.sector || '',
      location: parsedResult.location || '',
      website_link: parsedResult.website_link || '',
      is_global: typeof parsedResult.is_global === 'boolean' ? parsedResult.is_global : true,
    };

    return NextResponse.json(finalData);

  } catch (error: any) {
    console.error("Smart Add Company error:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
