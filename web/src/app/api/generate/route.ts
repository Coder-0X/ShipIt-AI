import { NextResponse } from 'next/server';
import { GoogleGenAI } from '@google/genai';
import { supabaseAdmin } from '@/lib/supabaseAdmin';
import rateLimit from '@/lib/rateLimit';
import { withRetry } from '@/lib/withRetry';

// Only disable TLS verification in local development (e.g., behind a corporate proxy)
if (process.env.NODE_ENV !== 'production') {
  process.env.NODE_TLS_REJECT_UNAUTHORIZED = '0';
}

const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });

const limiter = rateLimit({
  interval: 60 * 1000, // 60 seconds
  uniqueTokenPerInterval: 500, // Max 500 users per minute
});

export async function OPTIONS(req: Request) {
  return new NextResponse(null, {
    status: 200,
    headers: {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type, Authorization',
    },
  });
}

export async function POST(req: Request) {
  try {
    // 0. Volumetric Rate Limiting (DDoS Protection)
    const ip = req.headers.get('x-forwarded-for') || '127.0.0.1';
    try {
      // Limit to 10 requests per minute per IP
      await limiter.check(10, ip);
    } catch {
      return NextResponse.json({ error: 'Rate limit exceeded. Please slow down.' }, { status: 429 });
    }
    // 1. API Key Authentication
    const authHeader = req.headers.get('Authorization');
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return NextResponse.json({ error: 'Missing or invalid API Key. Please provide an Authorization header with a Bearer token.' }, { status: 401 });
    }
    const apiKey = authHeader.replace('Bearer ', '').trim();

    // In a production scenario, we'd lookup the key in `api_keys`, but for this MVP,
    // we assume the apiKey IS the user's UUID (or a secret dev key) to keep it simple without auth UI.
    const devBypassKey = process.env.DEV_BYPASS_KEY || 'sk_dev_bypass_123';
    
    let targetUserId = null;
    
    if (apiKey === devBypassKey) {
      // Dev bypass logic for testing without Stripe
      targetUserId = null;
    } else {
      // Validate true API Key
      const { data: keyRecord, error: keyError } = await supabaseAdmin
        .from('api_keys')
        .select('user_id')
        .eq('key', apiKey)
        .single();
        
      if (keyError || !keyRecord) {
        return NextResponse.json({ error: 'Invalid API Key' }, { status: 401 });
      }
      
      targetUserId = keyRecord.user_id;
      
      // Update last_used_at
      await supabaseAdmin.from('api_keys').update({ last_used_at: new Date().toISOString() }).eq('key', apiKey);
    }
    
    // 2. Billing Enforcement
    if (targetUserId) {
      const { data: user, error: userError } = await supabaseAdmin
        .from('users')
        .select('subscription_tier, generations_this_month')
        .eq('id', targetUserId)
        .single();
        
      if (userError || !user) {
        return NextResponse.json({ error: 'User not found in billing system' }, { status: 403 });
      }
      
      if (user.subscription_tier !== 'pro' && user.subscription_tier !== 'enterprise') {
        if (user.generations_this_month >= 50) {
          return NextResponse.json({ error: 'Free tier limit reached. Please upgrade to Pro.' }, { status: 402 });
        }
        
        // Increment generation count
        await supabaseAdmin.rpc('increment_generation_count', { target_user_id: targetUserId });
      }
    }

    const { commits, tone } = await req.json();

    if (!commits || !commits.trim()) {
      return NextResponse.json({ error: "Commits or notes are required" }, { status: 400 });
    }

    console.log("[AI Engine] Initiating 3-Pass Reasoning Pipeline with Gemini 3.6 Flash...");

    // ==========================================
    // PASS 1: The Product Strategist
    // ==========================================
    const strategistPrompt = `Analyze the following git commits/notes and extract the core product narrative.
Identify the "Why this matters to the user" rather than just technical implementation details.
Commits:
${commits}

Return a strict JSON object with NO markdown wrapping:
{
  "value_prop": "The main benefit to the user in one clear sentence",
  "key_features": ["Feature 1 benefit", "Feature 2 benefit"],
  "technical_brag": "One impressive technical architectural detail to highlight if appropriate"
}`;

    const strategistResponse = await withRetry(() => ai.models.generateContent({
      model: 'gemini-3.5-flash-lite',
      contents: strategistPrompt,
      config: { temperature: 0.2, responseMimeType: "application/json" }
    }));
    const strategy = JSON.parse(strategistResponse.text || "{}");

    // ==========================================
    // PASS 2: The Copywriter
    // ==========================================
    const copywriterPrompt = `You are an elite technical copywriter. Write release assets based on this product strategy:
Value Prop: ${strategy.value_prop}
Features: ${strategy.key_features?.join(', ') || 'Various improvements'}
Technical Detail: ${strategy.technical_brag || 'Optimized performance'}

Tone requirement: ${tone}

Draft the following:
1. twitter: A high-engagement Twitter thread (use 1/, 2/ format, max 280 chars per tweet).
2. linkedin: A professional, insightful LinkedIn post.
3. changelog: A clean, structured Markdown changelog.
4. email: An engaging release announcement email to active users.

Return a strict JSON object with keys: "twitter", "linkedin", "changelog", "email". Ensure values are plain strings.`;

    const copywriterResponse = await withRetry(() => ai.models.generateContent({
      model: 'gemini-3.5-flash-lite',
      contents: copywriterPrompt,
      config: { temperature: 0.8, responseMimeType: "application/json" }
    }));
    const drafts = JSON.parse(copywriterResponse.text || "{}");

    // ==========================================
    // PASS 3: The Ruthless Anti-Fluff Editor
    // ==========================================
    const editorPrompt = `You are a ruthless technical editor who despises AI clichés.
Review these 4 marketing drafts:
1. Remove ALL AI buzzwords (e.g., "delve", "testament", "cutting-edge", "revolutionize", "landscape", "supercharge", "in today's fast-paced").
2. Make it sound like a real, experienced software engineer or product founder wrote it.
3. Tighten the prose and ensure the tone strictly adheres to: ${tone}.

Drafts to edit:
Twitter: ${drafts.twitter}
LinkedIn: ${drafts.linkedin}
Changelog: ${drafts.changelog}
Email: ${drafts.email}

Return the final refined JSON object with keys: "twitter", "linkedin", "changelog", "email".`;

    const editorResponse = await withRetry(() => ai.models.generateContent({
      model: 'gemini-3.5-flash-lite',
      contents: editorPrompt,
      config: { temperature: 0.3, responseMimeType: "application/json" }
    }));
    
    const text = editorResponse.text || "{}";
    const cleanText = text.replace(/```json\n?|```/g, '');
    const finalResult = JSON.parse(cleanText);

    console.log("[AI Engine] 3-Pass Pipeline successfully completed.");
    return NextResponse.json(finalResult);

  } catch (error: any) {
    console.error("[AI Engine Error]:", error);

    if (error?.status === 429 || error?.message?.includes('429') || error?.message?.includes('quota') || error?.message?.includes('RESOURCE_EXHAUSTED')) {
      return NextResponse.json({
        error: "Google Gemini Free Tier Rate Limit reached (20 req/day quota exceeded). Please wait a few moments or switch to a paid API key in Google AI Studio for unlimited requests."
      }, { status: 429 });
    }

    let cleanMessage = error?.message || 'Failed to contact Gemini API';
    try {
      const parsed = JSON.parse(cleanMessage);
      if (parsed.error && parsed.error.message) {
        cleanMessage = parsed.error.message;
      }
    } catch (e) {
      // Not JSON, leave as is
    }

    return NextResponse.json({ 
      error: `AI Generation Error: ${cleanMessage}` 
    }, { status: 500 });
  }
}
