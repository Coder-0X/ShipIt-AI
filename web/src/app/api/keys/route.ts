import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabaseAdmin';
import crypto from 'crypto';

// In a real app, you would use createRouteHandlerClient to verify the user's session.
// For this MVP, we simulate an authenticated user context via a mocked header or fallback to a default user.

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { name } = body;

    // MVP Mock Authentication
    // Real app: const { data: { user } } = await supabase.auth.getUser();
    const mockUserId = process.env.MOCK_USER_ID || '00000000-0000-0000-0000-000000000001';
    
    // Generate a secure API key prefix and token
    const randomBytes = crypto.randomBytes(32).toString('hex');
    const apiKey = `sk_live_${randomBytes}`;
    
    const { data: insertedKey, error } = await supabaseAdmin
      .from('api_keys')
      .insert({
        key: apiKey,
        user_id: mockUserId,
        name: name || 'Default Extension Key',
      })
      .select('name, created_at, last_used_at, key')
      .single();

    if (error) {
      console.error('Failed to create API key in DB:', error);
      return NextResponse.json({ error: 'Database error while generating key' }, { status: 500 });
    }

    return NextResponse.json({ message: 'API Key generated successfully', apiKey: insertedKey }, { status: 201 });

  } catch (err: any) {
    console.error('API Key Generation Error:', err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}

export async function GET(req: NextRequest) {
  try {
    const mockUserId = process.env.MOCK_USER_ID || '00000000-0000-0000-0000-000000000001';
    
    // We intentionally don't return the full key string in a GET request in production, 
    // usually just the prefix/suffix. For MVP we return it so the UI can display it.
    const { data: keys, error } = await supabaseAdmin
      .from('api_keys')
      .select('key, name, created_at, last_used_at')
      .eq('user_id', mockUserId);

    if (error) {
      return NextResponse.json({ error: 'Database error' }, { status: 500 });
    }

    return NextResponse.json({ keys }, { status: 200 });

  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}

export async function DELETE(req: NextRequest) {
  try {
    const { key } = await req.json();
    const mockUserId = process.env.MOCK_USER_ID || '00000000-0000-0000-0000-000000000001';

    if (!key) {
      return NextResponse.json({ error: 'Key is required' }, { status: 400 });
    }

    const { error } = await supabaseAdmin
      .from('api_keys')
      .delete()
      .eq('key', key)
      .eq('user_id', mockUserId);

    if (error) {
      return NextResponse.json({ error: 'Failed to delete key' }, { status: 500 });
    }

    return NextResponse.json({ message: 'API Key revoked successfully' }, { status: 200 });

  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
