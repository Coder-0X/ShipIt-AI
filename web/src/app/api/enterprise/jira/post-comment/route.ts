import { NextRequest, NextResponse } from 'next/server';
import { postJiraComment } from '@/lib/jira';

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { issueKey, commentMarkdown } = body;

    if (!issueKey || !commentMarkdown) {
      return NextResponse.json(
        { error: 'issueKey and commentMarkdown are required' },
        { status: 400 }
      );
    }

    const result = await postJiraComment(issueKey, commentMarkdown);

    if (result.success) {
      return NextResponse.json(result, { status: 200 });
    } else {
      return NextResponse.json(result, { status: 502 });
    }
  } catch (error: any) {
    console.error('Jira Post Comment API Error:', error);
    return NextResponse.json(
      { error: 'Failed to post comment to Jira', details: error.message },
      { status: 500 }
    );
  }
}
