import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabaseAdmin';

export async function POST(req: NextRequest) {
  try {
    const { hash } = await req.json();

    if (!hash || typeof hash !== 'string') {
      return NextResponse.json({ error: 'Valid hash string is required' }, { status: 400 });
    }

    // Lookup the cryptographic hash in the immutable ledger
    const { data: auditRecord, error } = await supabaseAdmin
      .from('pull_request_audits')
      .select('pr_id, pr_title, source_branch, author, risk_level, quality_score, created_at, full_synthesis_json')
      .eq('tamper_proof_hash', hash)
      .single();

    if (error || !auditRecord) {
      // Return a 404 if the hash is completely missing or fabricated
      return NextResponse.json({ 
        verified: false, 
        message: 'Cryptographic Hash not found in the Audit Ledger. This record may be fabricated or tampered with.' 
      }, { status: 404 });
    }

    return NextResponse.json({
      verified: true,
      message: 'Cryptographic Hash successfully verified against the Immutable Audit Ledger.',
      verifiedRecord: {
        timestamp: auditRecord.created_at,
        pullRequestInfo: {
          id: auditRecord.pr_id,
          title: auditRecord.pr_title,
          branch: auditRecord.source_branch,
          author: auditRecord.author
        },
        riskMetrics: {
          riskLevel: auditRecord.risk_level,
          qualityScore: auditRecord.quality_score
        },
        auditJustification: auditRecord.full_synthesis_json?.complianceAuditLog?.justification
      }
    }, { status: 200 });
    
  } catch (error: any) {
    console.error('Verify Hash API Error:', error);
    return NextResponse.json(
      { error: 'Verification processing failed', details: error.message },
      { status: 500 }
    );
  }
}
