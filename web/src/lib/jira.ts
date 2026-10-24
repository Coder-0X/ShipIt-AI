/**
 * Jira Cloud REST API Client
 * Provides issue comment sync, issue context lookup, and Jira Release Hubs (Versions) management.
 */

export interface JiraConfig {
  host: string;
  email?: string;
  apiToken?: string;
  pat?: string;
}

export interface JiraVersion {
  id?: string;
  name: string;
  description?: string;
  archived?: boolean;
  released?: boolean;
  releaseDate?: string;
  projectId?: number;
  project?: string;
}

export interface JiraCommentResponse {
  success: boolean;
  simulated?: boolean;
  commentId?: string;
  issueKey: string;
  url?: string;
  message: string;
  error?: string;
}

export interface JiraReleaseHubResponse {
  success: boolean;
  simulated?: boolean;
  versionId?: string;
  versionName: string;
  projectKey: string;
  releaseNotesUrl?: string;
  message: string;
  error?: string;
}

export function getJiraConfig(): JiraConfig | null {
  const host = process.env.JIRA_HOST;
  const email = process.env.JIRA_EMAIL;
  const apiToken = process.env.JIRA_API_TOKEN;
  const pat = process.env.JIRA_PAT;

  if (!host) {
    return null;
  }

  // Clean host (remove trailing slash)
  const cleanHost = host.replace(/\/+$/, '');

  return {
    host: cleanHost,
    email,
    apiToken,
    pat
  };
}

export function isJiraConfigured(): boolean {
  const config = getJiraConfig();
  if (!config) return false;
  return Boolean(config.pat || (config.email && config.apiToken));
}

function getAuthHeaders(config: JiraConfig): Record<string, string> {
  const headers: Record<string, string> = {
    'Accept': 'application/json',
    'Content-Type': 'application/json'
  };

  if (config.pat) {
    headers['Authorization'] = `Bearer ${config.pat}`;
  } else if (config.email && config.apiToken) {
    const creds = Buffer.from(`${config.email}:${config.apiToken}`).toString('base64');
    headers['Authorization'] = `Basic ${creds}`;
  }

  return headers;
}

/**
 * Posts an official release note comment to a Jira issue in Atlassian Document Format (ADF).
 */
export async function postJiraComment(
  issueKey: string,
  commentMarkdown: string
): Promise<JiraCommentResponse> {
  const config = getJiraConfig();

  if (!config || !isJiraConfigured()) {
    console.info(`[JiraClient] Jira not configured in .env.local. Simulating comment post to ${issueKey}.`);
    return {
      success: true,
      simulated: true,
      issueKey,
      url: `https://jira-instance.atlassian.net/browse/${issueKey}`,
      message: `[Simulated] Comment for issue ${issueKey} prepared and queued successfully. Add JIRA_HOST, JIRA_EMAIL, and JIRA_API_TOKEN to .env.local for live sync.`
    };
  }

  try {
    const url = `${config.host}/rest/api/3/issue/${encodeURIComponent(issueKey)}/comment`;
    
    // Structure in Atlassian Document Format (ADF)
    const body = {
      body: {
        type: 'doc',
        version: 1,
        content: [
          {
            type: 'paragraph',
            content: [
              {
                type: 'text',
                text: commentMarkdown
              }
            ]
          }
        ]
      }
    };

    const res = await fetch(url, {
      method: 'POST',
      headers: getAuthHeaders(config),
      body: JSON.stringify(body)
    });

    if (!res.ok) {
      const errText = await res.text();
      console.error(`[JiraClient] Failed to post comment to ${issueKey}: ${res.status}`, errText);
      return {
        success: false,
        issueKey,
        message: `Jira API returned error ${res.status}`,
        error: errText
      };
    }

    const data = await res.json();
    return {
      success: true,
      issueKey,
      commentId: data.id,
      url: `${config.host}/browse/${issueKey}?focusedCommentId=${data.id}`,
      message: `Comment successfully posted to Jira issue ${issueKey}`
    };
  } catch (error: any) {
    console.error(`[JiraClient] Network exception posting to ${issueKey}:`, error);
    return {
      success: false,
      issueKey,
      message: error.message || 'Network error connecting to Jira',
      error: error.stack
    };
  }
}

/**
 * Creates or updates a Jira Release Hub Version with automated release notes and description.
 */
export async function syncToJiraReleaseHub(
  projectKey: string,
  versionName: string,
  releaseDescription: string,
  releaseDate?: string
): Promise<JiraReleaseHubResponse> {
  const config = getJiraConfig();

  if (!config || !isJiraConfigured()) {
    console.info(`[JiraClient] Jira not configured. Simulating Release Hub version pack for project ${projectKey} (${versionName}).`);
    return {
      success: true,
      simulated: true,
      versionName,
      projectKey,
      releaseNotesUrl: `https://jira-instance.atlassian.net/projects/${projectKey}/versions/simulated`,
      message: `[Simulated] Jira Release Hub version "${versionName}" created and updated with release notes pack. Add JIRA credentials in .env.local for live Atlassian sync.`
    };
  }

  try {
    // 1. Fetch existing project versions to find if this version already exists
    const listUrl = `${config.host}/rest/api/3/project/${encodeURIComponent(projectKey)}/versions`;
    const listRes = await fetch(listUrl, {
      method: 'GET',
      headers: getAuthHeaders(config)
    });

    let targetVersionId: string | undefined;

    if (listRes.ok) {
      const existingVersions: JiraVersion[] = await listRes.json();
      const match = existingVersions.find(v => v.name.toLowerCase() === versionName.toLowerCase());
      if (match) {
        targetVersionId = match.id;
      }
    }

    if (targetVersionId) {
      // 2a. Update existing version description in Release Hub
      const updateUrl = `${config.host}/rest/api/3/version/${targetVersionId}`;
      const updateRes = await fetch(updateUrl, {
        method: 'PUT',
        headers: getAuthHeaders(config),
        body: JSON.stringify({
          description: releaseDescription.slice(0, 1000), // Jira limit for version description
          released: true,
          releaseDate: releaseDate || new Date().toISOString().slice(0, 10)
        })
      });

      if (!updateRes.ok) {
        const errText = await updateRes.text();
        return {
          success: false,
          versionName,
          projectKey,
          message: `Failed updating existing Release Hub version: ${updateRes.status}`,
          error: errText
        };
      }

      return {
        success: true,
        versionId: targetVersionId,
        versionName,
        projectKey,
        releaseNotesUrl: `${config.host}/projects/${projectKey}/versions/${targetVersionId}/tab/release-report-all-issues`,
        message: `Successfully synchronized Release Hub version "${versionName}" in Jira project ${projectKey}.`
      };
    } else {
      // 2b. Create new version in Jira Release Hub
      const createUrl = `${config.host}/rest/api/3/version`;
      const createRes = await fetch(createUrl, {
        method: 'POST',
        headers: getAuthHeaders(config),
        body: JSON.stringify({
          name: versionName,
          project: projectKey,
          description: releaseDescription.slice(0, 1000),
          released: true,
          releaseDate: releaseDate || new Date().toISOString().slice(0, 10)
        })
      });

      if (!createRes.ok) {
        const errText = await createRes.text();
        return {
          success: false,
          versionName,
          projectKey,
          message: `Failed creating Release Hub version: ${createRes.status}`,
          error: errText
        };
      }

      const createdData = await createRes.json();
      return {
        success: true,
        versionId: createdData.id,
        versionName,
        projectKey,
        releaseNotesUrl: `${config.host}/projects/${projectKey}/versions/${createdData.id}/tab/release-report-all-issues`,
        message: `Successfully created and published Release Hub version "${versionName}" in Jira project ${projectKey}.`
      };
    }
  } catch (error: any) {
    console.error(`[JiraClient] Release Hub sync error:`, error);
    return {
      success: false,
      versionName,
      projectKey,
      message: error.message || 'Error connecting to Jira Release Hub',
      error: error.stack
    };
  }
}
