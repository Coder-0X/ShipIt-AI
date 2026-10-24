import { NextRequest, NextResponse } from 'next/server';
import { listAuditRecords } from '@/lib/auditLedger';

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const limit = parseInt(searchParams.get('limit') || '20', 10);

    const records = await listAuditRecords(limit);
    return NextResponse.json({ records }, { status: 200 });
  } catch (error: any) {
    console.error('List Audits API Error:', error);
    return NextResponse.json(
      { error: 'Failed to retrieve audits', details: error.message },
      { status: 500 }
    );
  }
}
