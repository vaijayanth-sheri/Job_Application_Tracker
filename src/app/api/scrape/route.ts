import { NextResponse } from 'next/server';
import * as cheerio from 'cheerio';

export async function POST(req: Request) {
  try {
    const { url } = await req.json();

    if (!url) {
      return NextResponse.json({ error: 'Missing URL parameter' }, { status: 400 });
    }

    // Basic URL validation
    try {
      new URL(url);
    } catch {
      return NextResponse.json({ error: 'Invalid URL provided' }, { status: 400 });
    }

    // Fetch the URL content
    // We add a basic user-agent to avoid being blocked immediately by simple protections
    const response = await fetch(url, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
        'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,*/*;q=0.8',
        'Accept-Language': 'en-US,en;q=0.5',
      },
    });

    if (!response.ok) {
      if (response.status === 403) {
        return NextResponse.json({ error: 'Access forbidden. This site likely blocks automated scrapers. Please copy and paste the job description manually.' }, { status: 403 });
      }
      return NextResponse.json({ error: `Failed to fetch URL. Status: ${response.status}` }, { status: response.status });
    }

    const html = await response.text();
    const $ = cheerio.load(html);

    // Remove scripts, styles, noscript, and SVG tags which clutter the text
    $('script, style, noscript, svg, nav, footer, header, iframe').remove();

    // Extract text and clean up whitespace
    let extractedText = $('body').text() || $.text();
    
    // Normalize excessive whitespace/newlines
    extractedText = extractedText.replace(/\s+/g, ' ').trim();

    if (!extractedText || extractedText.length < 50) {
      return NextResponse.json({ error: 'Could not extract meaningful text from this page. It might require JavaScript to render.' }, { status: 422 });
    }

    return NextResponse.json({ text: extractedText });

  } catch (error: any) {
    console.error("Scraping error:", error);
    return NextResponse.json({ error: error.message || 'An error occurred during scraping' }, { status: 500 });
  }
}
