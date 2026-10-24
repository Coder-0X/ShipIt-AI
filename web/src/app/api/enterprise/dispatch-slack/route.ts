import { NextRequest, NextResponse } from 'next/server';
import { dispatchSlackNotification } from '@/lib/slack';

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { webhookUrl, blockKitPayload } = body;
    
    if (!blockKitPayload) {
      return NextResponse.json({ error: 'Missing blockKitPayload in request body' }, { status: 400 });
    }
    
    const result = await dispatchSlackNotification(webhookUrl, blockKitPayload);
    
    if (result.success) {
      return NextResponse.json({
        message: result.message,
        simulated: result.simulated
      }, { status: 200 });
    } else {
      return NextResponse.json({
        error: result.message,
        details: result.error
      }, { status: 502 });
    }
    
  } catch (error: any) {
    console.error('Slack Dispatch API Error:', error);
    return NextResponse.json(
      { error: 'Slack dispatch failed', details: error.message },
      { status: 500 }
    );
  }
}
