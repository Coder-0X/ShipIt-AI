export async function dispatchSlackNotification(webhookUrl: string, blockKitPayload: any): Promise<boolean> {
  if (!webhookUrl) {
    console.warn('No Slack webhook URL provided. Skipping dispatch.');
    return false;
  }
  
  try {
    const response = await fetch(webhookUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(blockKitPayload),
    });
    
    if (!response.ok) {
      const errorText = await response.text();
      console.error(`Slack dispatch failed: ${response.status} ${response.statusText}`, errorText);
      return false;
    }
    
    return true;
  } catch (error) {
    console.error('Slack dispatch network error:', error);
    return false;
  }
}
