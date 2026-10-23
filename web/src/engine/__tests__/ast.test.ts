import { parseAndChunkDiff } from '../ast';

describe('AST Chunker & Filter', () => {
  it('should filter out lockfiles (package-lock.json)', () => {
    const rawDiff = `diff --git a/package-lock.json b/package-lock.json
index 1234567..89abcdef 100644
--- a/package-lock.json
+++ b/package-lock.json
@@ -1,3 +1,3 @@
 {
-  "name": "old"
+  "name": "new"
 }
diff --git a/src/app/page.tsx b/src/app/page.tsx
index 111..222 100644
--- a/src/app/page.tsx
+++ b/src/app/page.tsx
@@ -1,2 +1,3 @@
 export default function Page() {
+  console.log('test');
 }`;

    const result = parseAndChunkDiff(rawDiff);

    // Should NOT contain the package-lock.json data
    expect(result).not.toContain('package-lock.json');
    // Should STILL contain the page.tsx data
    expect(result).toContain('src/app/page.tsx');
    expect(result).toContain("console.log('test');");
  });

  it('should handle empty diffs gracefully', () => {
    const result = parseAndChunkDiff('');
    expect(result).toBe('');
  });
});
