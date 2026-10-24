import { NextRequest, NextResponse } from 'next/server';
import { getAuditRecordByHash } from '@/lib/auditLedger';

export async function POST(req: NextRequest) {
  try {
    const { hash } = await req.json();

    if (!hash || typeof hash !== 'string') {
      return NextResponse.json({ error: 'Valid hash string is required' }, { status: 400 });
    }

    const cleanHash = hash.trim();

    // Lookup the cryptographic hash in the immutable ledger (Supabase or local persistent ledger)
    const auditRecord = await getAuditRecordByHash(cleanHash);

    if (!auditRecord) {
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
          qualityScore: auditRecord.quality_score,
          hasBreakingChanges: auditRecord.has_breaking_changes
        },
        tamperProofHash: auditRecord.tamper_proof_hash,
        auditJustification: auditRecord.full_synthesis_json?.complianceAuditLog?.justification || 'Enterprise change management verified'
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
