import { GitCommit, CommitHealthScore } from './types';

const CONVENTIONAL_TYPES = [
  'feat', 'fix', 'docs', 'style', 'refactor', 'perf', 'test', 'build', 'ci', 'chore', 'revert'
];

const JIRA_KEY_REGEX = /([A-Z][A-Z0-9]+-[0-9]+)/;
const CONVENTIONAL_REGEX = new RegExp(`^(${CONVENTIONAL_TYPES.join('|')})(\\([a-zA-Z0-9_\\-\\.]+\\))?!?: (.+)`);

export function scoreCommitsAndPR(
  commits: GitCommit[],
  branchName?: string,
  prTitle?: string
): CommitHealthScore {
  if (!commits || commits.length === 0) {
    return {
      overallScore: 50,
      isConventional: false,
      hasIssueKey: false,
      clarityRating: 'POOR',
      feedback: ['No commits provided for evaluation.'],
      gatePassed: false
    };
  }

  let totalScore = 100;
  const feedback: string[] = [];
  let conventionalCount = 0;
  let hasIssueKeyAnywhere = false;

  // Check branch name or PR title for Jira issue key
  if ((branchName && JIRA_KEY_REGEX.test(branchName)) || (prTitle && JIRA_KEY_REGEX.test(prTitle))) {
    hasIssueKeyAnywhere = true;
  }

  commits.forEach((commit, idx) => {
    const msg = commit.message.trim();
    const firstLine = msg.split('\n')[0];

    // 1. Check Conventional Commits
    const match = CONVENTIONAL_REGEX.exec(firstLine);
    if (match) {
      conventionalCount++;
    } else {
      totalScore -= Math.min(15, Math.floor(40 / commits.length));
      feedback.push(`Commit "${commit.hash.slice(0, 7)}" does not adhere to Conventional Commits standard.`);
    }

    // 2. Check length of first line (Subject line max 72 chars)
    if (firstLine.length > 72) {
      totalScore -= 5;
      feedback.push(`Commit "${commit.hash.slice(0, 7)}" subject line exceeds 72 characters (${firstLine.length} chars).`);
    }

    // 3. Check for issue key in commit message
    if (JIRA_KEY_REGEX.test(msg)) {
      hasIssueKeyAnywhere = true;
    }

    // 4. Vague commit messages penalty
    const lower = firstLine.toLowerCase();
    if (['fix', 'update', 'changes', 'wip', 'fixed bug', 'quick fix', 'test', 'misc'].includes(lower)) {
      totalScore -= 20;
      feedback.push(`Commit "${commit.hash.slice(0, 7)}" has a low-context message ("${firstLine}").`);
    }
  });

  if (!hasIssueKeyAnywhere) {
    totalScore -= 15;
    feedback.push('No associated Jira Issue Key (e.g. PROJ-123) detected in PR title, branch, or commits.');
  }

  const isConventional = conventionalCount === commits.length;
  const clampedScore = Math.max(0, Math.min(100, totalScore));

  let clarityRating: 'POOR' | 'FAIR' | 'EXCELLENT' = 'EXCELLENT';
  if (clampedScore < 60) clarityRating = 'POOR';
  else if (clampedScore < 80) clarityRating = 'FAIR';

  if (feedback.length === 0) {
    feedback.push('All commits follow standard conventions and include traceability metadata.');
  }

  return {
    overallScore: clampedScore,
    isConventional,
    hasIssueKey: hasIssueKeyAnywhere,
    clarityRating,
    feedback,
    gatePassed: clampedScore >= 70
  };
}
