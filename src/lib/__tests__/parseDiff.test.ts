import { describe, it, expect } from 'vitest';
import { parseGitDiff } from '../parseDiff';

describe('parseGitDiff', () => {
  it('should parse a simple diff', () => {
    const diff = `diff --git a/test.ts b/test.ts
index 1234567..abcdefg 100644
--- a/test.ts
+++ b/test.ts
@@ -1,3 +1,4 @@
 line 1
-line 2
+line 2 modified
 line 3
+line 4 added
`;

    const result = parseGitDiff(diff);

    expect(result).toHaveLength(1);
    expect(result[0].to).toBe('test.ts');
    expect(result[0].chunks).toHaveLength(1);
    expect(result[0].chunks[0].changes).toHaveLength(5);
  });

  it('should handle multiple files', () => {
    const diff = `diff --git a/file1.ts b/file1.ts
index 1234567..abcdefg 100644
--- a/file1.ts
+++ b/file1.ts
@@ -1 +1 @@
-old
+new
diff --git a/file2.ts b/file2.ts
index 1234567..abcdefg 100644
--- a/file2.ts
+++ b/file2.ts
@@ -1 +1 @@
-old2
+new2
`;

    const result = parseGitDiff(diff);

    expect(result).toHaveLength(2);
    expect(result[0].to).toBe('file1.ts');
    expect(result[1].to).toBe('file2.ts');
  });

  it('should return empty array for empty diff', () => {
    const result = parseGitDiff('');
    expect(result).toEqual([]);
  });
});
