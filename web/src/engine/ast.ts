import crypto from 'crypto';

/**
 * Filter out auto-generated files, lockfiles, and minified bundles.
 */
function isIgnoredFile(filename: string): boolean {
  const ignoredPatterns = [
    /package-lock\.json$/,
    /yarn\.lock$/,
    /pnpm-lock\.yaml$/,
    /\.min\.js$/,
    /\.min\.css$/,
    /dist\//,
    /build\//,
    /coverage\//,
    /\.svg$/,
  ];
  return ignoredPatterns.some(pattern => pattern.test(filename));
}

export function parseAndChunkDiff(rawDiff: string): string {
  // A simplistic diff parser to strip ignored files.
  // In a production AST boundary analyzer, we'd use 'parse-diff' or similar,
  // and construct an AST to understand scope (e.g. which functions changed).

  const lines = rawDiff.split('\n');
  let filteredDiff: string[] = [];
  let currentFile = '';
  let skipCurrentFile = false;

  for (const line of lines) {
    if (line.startsWith('diff --git ')) {
      // e.g. diff --git a/package-lock.json b/package-lock.json
      const parts = line.split(' ');
      if (parts.length >= 3) {
        currentFile = parts[2].replace(/^a\//, '');
        skipCurrentFile = isIgnoredFile(currentFile);
      } else {
        skipCurrentFile = false;
      }
    }

    if (!skipCurrentFile) {
      filteredDiff.push(line);
    }
  }

  const resultDiff = filteredDiff.join('\n');
  
  // Truncate to a reasonable token limit (e.g. 10,000 characters) to prevent overloading the LLM
  if (resultDiff.length > 10000) {
    return resultDiff.substring(0, 10000) + '\n\n... [DIFF TRUNCATED BY AST CHUNKER DUE TO SIZE LIMIT]';
  }
  
  return resultDiff;
}

/**
 * Verify GitHub HMAC Webhook Signature
 */
export function verifyGitHubSignature(payload: string, signature: string, secret: string): boolean {
  if (!signature) return false;
  
  const hmac = crypto.createHmac('sha256', secret);
  hmac.update(payload);
  const calculatedSignature = `sha256=${hmac.digest('hex')}`;
  
  try {
    return crypto.timingSafeEqual(Buffer.from(signature), Buffer.from(calculatedSignature));
  } catch (e) {
    return false;
  }
}
