import { NextRequest, NextResponse } from 'next/server';

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    
    if (!body.analysis) {
      return NextResponse.json({ error: 'Missing analysis object' }, { status: 400 });
    }
    
    const analysis = body.analysis;
    const timestamp = new Date().toISOString();
    
    // Construct a standard SOC2 Change Management Traceability Record
    const soc2Record = {
      documentType: 'SOC2 Change Management Traceability Matrix',
      generatedAt: timestamp,
      system: 'ShipIt AI Enterprise B2B Engine',
      recordId: analysis.synthesis?.complianceAuditLog?.tamperProofHash || 'UNKNOWN_HASH',
      pullRequest: {
        id: analysis.pullRequest?.id,
        title: analysis.pullRequest?.title,
        sourceBranch: analysis.pullRequest?.sourceBranch,
        targetBranch: analysis.pullRequest?.targetBranch,
        author: analysis.pullRequest?.author,
      },
      riskAssessment: {
        level: analysis.riskAssessment?.riskLevel,
        blastRadius: analysis.riskAssessment?.blastRadius,
        hasBreakingChanges: analysis.riskAssessment?.hasBreakingChanges,
      },
      qualityScore: analysis.qualityScore?.overallScore,
      auditJustification: analysis.synthesis?.complianceAuditLog?.justification,
      changeType: analysis.synthesis?.complianceAuditLog?.changeType,
      affectedSystems: analysis.synthesis?.complianceAuditLog?.affectedSystems,
      mitigationControls: analysis.synthesis?.complianceAuditLog?.riskMitigation
    };

    // Return the JSON. The frontend will trigger a download for this.
    return NextResponse.json({ 
      message: 'Report generated',
      soc2Report: soc2Record
    }, { status: 200 });
    
  } catch (error: any) {
    console.error('Audit Export API Error:', error);
    return NextResponse.json(
      { error: 'Audit Export failed', details: error.message },
      { status: 500 }
    );
  }
}
