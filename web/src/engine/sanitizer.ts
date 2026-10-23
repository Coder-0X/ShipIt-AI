/**
 * Enterprise Secret & PII Redactor
 * Ensures no private keys, database passwords, JWTs, AWS secrets, or user PII
 * are ever transmitted to third-party LLM endpoints.
 */

const SECRET_PATTERNS = [
  // AWS Access Keys
  { name: 'AWS_ACCESS_KEY', regex: /(?:A3T[A-Z0-9]|AKIA|AGPA|AIDA|AROA|AIPA|ANPA|ANVA|ASIA)[A-Z0-9]{16}/g },
  // AWS Secret Keys
  { name: 'AWS_SECRET_KEY', regex: /aws_secret_access_key\s*=\s*[A-Za-z0-9\/+=]{40}/gi },
  // Generic API Keys & Tokens
  { name: 'GENERIC_API_KEY', regex: /(?:api_key|apikey|secret|token|password|auth_token|bearer)\s*[:=]\s*['"][A-Za-z0-9_\-\.]{16,}['"]/gi },
  // GitHub Tokens
  { name: 'GITHUB_TOKEN', regex: /(?:ghp|gho|ghu|ghs|ghr)_[A-Za-z0-9_]{36,255}/g },
  // Slack Webhooks & Tokens
  { name: 'SLACK_TOKEN', regex: /xox[baprs]-[0-9]{10,13}-[0-9]{10,13}[a-zA-Z0-9-]*/g },
  { name: 'SLACK_WEBHOOK', regex: /https:\/\/hooks\.slack\.com\/services\/T[a-zA-Z0-9_]+\/B[a-zA-Z0-9_]+\/[a-zA-Z0-9_]+/g },
  // Private RSA/SSH Keys
  { name: 'PRIVATE_KEY', regex: /-----BEGIN (?:RSA |EC |OPENSSH |DSA )?PRIVATE KEY-----[\s\S]*?-----END (?:RSA |EC |OPENSSH |DSA )?PRIVATE KEY-----/g },
  // JWT Tokens
  { name: 'JWT_TOKEN', regex: /eyJ[A-Za-z0-9_-]{10,}\.eyJ[A-Za-z0-9_-]{10,}\.[A-Za-z0-9_-]{10,}/g },
  // Database connection URIs
  { name: 'DB_CONNECTION_URI', regex: /(?:postgres|mysql|mongodb|redis|mssql):\/\/[^:\s]+:[^@\s]+@[^:\s]+:\d+\/[^\s]+/g },
  // IPv4 Addresses (private / internal networks)
  { name: 'INTERNAL_IP', regex: /\b(?:10\.\d{1,3}\.\d{1,3}\.\d{1,3}|192\.168\.\d{1,3}\.\d{1,3}|172\.(?:1[6-9]|2\d|3[01])\.\d{1,3}\.\d{1,3})\b/g },
  // Email Addresses
  { name: 'PII_EMAIL', regex: /[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/g }
];

export interface SanitizationResult {
  sanitizedContent: string;
  redactionsCount: number;
  redactedCategories: string[];
}

export function sanitizeDiff(rawDiff: string): SanitizationResult {
  if (!rawDiff) {
    return { sanitizedContent: '', redactionsCount: 0, redactedCategories: [] };
  }

  let sanitized = rawDiff;
  let count = 0;
  const categories = new Set<string>();

  for (const pattern of SECRET_PATTERNS) {
    sanitized = sanitized.replace(pattern.regex, (match) => {
      count++;
      categories.add(pattern.name);
      return `[REDACTED_${pattern.name}]`;
    });
  }

  // Filter out lockfiles and huge binary diffs
  sanitized = filterIrrelevantDiffFiles(sanitized);

  return {
    sanitizedContent: sanitized,
    redactionsCount: count,
    redactedCategories: Array.from(categories),
  };
}

function filterIrrelevantDiffFiles(diff: string): string {
  const ignorePatterns = [
    /diff --git a\/.*(?:package-lock\.json|yarn\.lock|pnpm-lock\.yaml|go\.sum|Cargo\.lock)[\s\S]*?(?=(diff --git|$))/g,
    /diff --git a\/.*(?:\.min\.js|\.min\.css|\.map|\.svg|\.png|\.jpg|\.jpeg|\.ico)[\s\S]*?(?=(diff --git|$))/g
  ];

  let cleaned = diff;
  for (const pattern of ignorePatterns) {
    cleaned = cleaned.replace(pattern, '[FILTERED_GENERATED_OR_BINARY_DIFF]\n');
  }

  return cleaned;
}
