import { NextRequest, NextResponse } from 'next/server';
import { dispatchSlackNotification } from '@/lib/slack';

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { webhookUrl, blockKitPayload } = body;
    
    if (!webhookUrl || !blockKitPayload) {
      return NextResponse.json({ error: 'Missing webhookUrl or blockKitPayload' }, { status: 400 });
    }
    
    const success = await dispatchSlackNotification(webhookUrl, blockKitPayload);
    
    if (success) {
      return NextResponse.json({ message: 'Dispatched to Slack successfully' }, { status: 200 });
    } else {
      return NextResponse.json({ error: 'Failed to dispatch to Slack' }, { status: 500 });
    }
    
  } catch (error: any) {
    console.error('Slack Dispatch API Error:', error);
    return NextResponse.json(
      { error: 'Slack dispatch failed', details: error.message },
      { status: 500 }
    );
  }
}
