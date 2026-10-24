import Resolver from '@forge/resolver';
import api, { route, storage } from '@forge/api';

const resolver = new Resolver();

// Resolver to fetch issue context and linked commits
resolver.define('getIssueAnalysis', async (req) => {
  const { issueKey } = req.context.extension;

  // 1. Check if cached analysis exists in Forge KVS storage
  const cached = await storage.get(`analysis-${issueKey}`);
  if (cached) {
    return cached;
  }

  // 2. Fetch Jira Issue details
  const issueRes = await api.asApp().requestJira(route`/rest/api/3/issue/${issueKey}`);
  const issueData = await issueRes.json();

  return {
    issueKey,
    summary: issueData.fields.summary,
    status: issueData.fields.status.name,
    hasAnalysis: false
  };
});

// Resolver to run 4-Stage Analysis directly from Jira
resolver.define('triggerAnalysis', async (req) => {
  const { issueKey, commits, rawDiff } = req.payload;

  // Fetch issue details
  const issueRes = await api.asApp().requestJira(route`/rest/api/3/issue/${issueKey}`);
  const issueData = await issueRes.json();

  const analysisPayload = {
    id: issueKey,
    title: issueData.fields.summary,
    description: issueData.fields.description?.content?.[0]?.content?.[0]?.text || '',
    sourceBranch: `feature/${issueKey}`,
    targetBranch: 'main',
    author: issueData.fields.reporter?.displayName || 'Developer',
    jiraIssueKey: issueKey,
    commits: commits || [],
    rawDiff: rawDiff || ''
  };

  // Cache in Forge Storage
  await storage.set(`analysis-${issueKey}`, analysisPayload);

  return { success: true, payload: analysisPayload };
});

// Resolver to post generated changelog directly as an official Jira Comment
resolver.define('postJiraComment', async (req) => {
  const { issueKey, commentMarkdown } = req.payload;

  const res = await api.asApp().requestJira(route`/rest/api/3/issue/${issueKey}/comment`, {
    method: 'POST',
    headers: {
      'Accept': 'application/json',
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({
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
    })
  });

  return { success: res.status === 201 };
});

// Resolver for Jira Release Hub: list project versions
resolver.define('getProjectVersions', async (req) => {
  const { projectKey } = req.payload;
  const res = await api.asApp().requestJira(route`/rest/api/3/project/${projectKey}/versions`);
  if (!res.ok) {
    return { versions: [] };
  }
  const versions = await res.json();
  return { versions };
});

// Resolver for Jira Release Hub: sync version release notes
resolver.define('syncReleaseHubVersion', async (req) => {
  const { versionId, versionName, description } = req.payload;

  const res = await api.asApp().requestJira(route`/rest/api/3/version/${versionId}`, {
    method: 'PUT',
    headers: {
      'Accept': 'application/json',
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({
      name: versionName,
      description: description.slice(0, 1000),
      released: true,
      releaseDate: new Date().toISOString().slice(0, 10)
    })
  });

  return { success: res.ok };
});

export const handler = resolver.getDefinitions();
