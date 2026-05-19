import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

export async function POST(request: Request) {
  try {
    // 1. Authenticate using static API Key
    const authHeader = request.headers.get('authorization');
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    
    const token = authHeader.split(' ')[1];
    // We check against the AGENT_API_KEY environment variable
    if (!process.env.AGENT_API_KEY || token !== process.env.AGENT_API_KEY) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // 2. Extract and Validate Payload
    const body = await request.json();
    const { user_id, companies } = body;

    if (!user_id) {
      return NextResponse.json({ error: 'Validation failed', details: 'user_id is required' }, { status: 400 });
    }
    if (!Array.isArray(companies) || companies.length === 0) {
      return NextResponse.json({ error: 'Validation failed', details: 'companies array is required and must not be empty' }, { status: 400 });
    }

    // 3. Setup Admin Client
    // We must use the Service Role Key to bypass RLS and insert on behalf of the user
    if (!process.env.NEXT_PUBLIC_SUPABASE_URL || !process.env.SUPABASE_SERVICE_ROLE_KEY) {
      throw new Error('Server misconfiguration: Missing Supabase URL or Service Role Key');
    }

    const supabaseAdmin = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL,
      process.env.SUPABASE_SERVICE_ROLE_KEY
    );

    const batch_id = `b-${Math.random().toString(36).substring(2, 9)}`;
    const errors: any[] = [];
    let inserted = 0;
    let skipped = 0;

    // 4. Pre-fetch existing companies for deduplication
    // We only fetch for this specific user
    const { data: existingCompanies, error: fetchError } = await supabaseAdmin
      .from('companies')
      .select('company_name')
      .eq('user_id', user_id);

    if (fetchError) {
      throw new Error(`Failed to fetch existing companies: ${fetchError.message}`);
    }

    const existingNames = new Set(
      existingCompanies?.map(c => String(c.company_name).toLowerCase().trim()) || []
    );

    // 5. Process and Normalize Companies
    const companiesToInsert = [];

    for (const c of companies) {
      if (!c.company_name) {
        errors.push({ record: c, error: 'company_name is missing' });
        continue;
      }

      const normalizedName = String(c.company_name).toLowerCase().trim();
      
      // Deduplication check
      if (existingNames.has(normalizedName)) {
        skipped++;
        continue;
      }

      // Add to insertion array, binding the target user_id
      // Enforce VARCHAR length constraints to prevent DB insertion failures
      companiesToInsert.push({
        user_id,
        company_name: String(c.company_name).substring(0, 100),
        sector: c.sector ? String(c.sector).substring(0, 50) : '',
        website_link: c.website_link ? String(c.website_link) : '',
        location: c.location ? String(c.location).substring(0, 50) : '',
        interest_level: Math.max(1, Math.min(5, Number(c.interest_level) || 3)),
        linkedin_connections: c.linkedin_connections ? String(c.linkedin_connections) : '',
        notes: c.notes ? String(c.notes) : ''
      });
      
      // Add to our Set so we don't duplicate within the same batch payload
      existingNames.add(normalizedName);
    }

    // 6. Bulk Insert
    if (companiesToInsert.length > 0) {
      const { error: insertError } = await supabaseAdmin
        .from('companies')
        .insert(companiesToInsert);

      if (insertError) {
        throw new Error(`Insert failed: ${insertError.message}`);
      }
      inserted = companiesToInsert.length;
    }

    // 7. Log to database
    const status = errors.length > 0 && inserted === 0 ? 'failed' : (errors.length > 0 ? 'partial' : 'success');
    
    // We fire-and-forget the log, or await it. Awaiting is safer for edge functions.
    await supabaseAdmin.from('ingestion_logs').insert({
      batch_id,
      status,
      records_processed: companies.length,
      records_inserted: inserted,
      errors: errors
    });

    return NextResponse.json({
      success: true,
      message: `Processed ${companies.length} companies`,
      inserted,
      skipped,
      errors: errors.length,
      batch_id
    });

  } catch (error: any) {
    console.error('Ingestion Error:', error);
    return NextResponse.json(
      { error: 'Internal Server Error', details: error.message || 'Unknown error' },
      { status: 500 }
    );
  }
}
