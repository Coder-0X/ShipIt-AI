export interface SlackDispatchResult {
  success: boolean;
  simulated?: boolean;
  message: string;
  error?: string;
  statusCode?: number;
}

/**
 * Dispatches an interactive Slack Block-Kit notification payload to an incoming webhook URL.
 */
export async function dispatchSlackNotification(
  webhookUrl?: string,
  blockKitPayload?: any
): Promise<SlackDispatchResult> {
  const targetUrl = webhookUrl || process.env.SLACK_WEBHOOK_URL;

  if (!targetUrl || targetUrl.includes('MOCK/URL') || targetUrl === 'https://hooks.slack.com/services/xxx/yyy/zzz') {
    console.warn('[SlackClient] No live Slack webhook URL provided. Operating in simulated dispatch mode.');
    return {
      success: true,
      simulated: true,
      message: 'Slack payload formatted and validated. Set SLACK_WEBHOOK_URL in .env.local to receive live broadcasts in your Slack channel.'
    };
  }

  if (!blockKitPayload) {
    return {
      success: false,
      message: 'No Block-Kit payload provided for dispatch.'
    };
  }

  try {
    const response = await fetch(targetUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(blockKitPayload),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error(`[SlackClient] Slack dispatch failed: ${response.status} ${response.statusText}`, errorText);
      return {
        success: false,
        statusCode: response.status,
        message: `Slack incoming webhook responded with status ${response.status}`,
        error: errorText
      };
    }

    return {
      success: true,
      message: 'Block-Kit release broadcast successfully delivered to Slack channel.'
    };
  } catch (error: any) {
    console.error('[SlackClient] Slack dispatch network error:', error);
    return {
      success: false,
      message: error.message || 'Network error while attempting to reach Slack incoming webhook',
      error: error.stack
    };
  }
}
