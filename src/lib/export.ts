import type { Review, ParsedFile } from "../types/model";

export function exportJSON(review: Review): void {
  const json = JSON.stringify(review, null, 2);
  const blob = new Blob([json], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `vibecheck-review-${review.review_id}.json`;
  a.click();
  URL.revokeObjectURL(url);
}

export function exportMarkdown(review: Review, files: ParsedFile[]): string {
  const { repo = 'N/A', base_ref = 'N/A', head_ref = 'N/A', review_id, created_at, comments } = review;

  // Group comments by file
  const commentsByFile = new Map<string, typeof comments>();
  comments.forEach(comment => {
    const fileComments = commentsByFile.get(comment.file_path) || [];
    fileComments.push(comment);
    commentsByFile.set(comment.file_path, fileComments);
  });

  let markdown = `# 🧩 Review Export — vibecheck

**Repository:** \`${repo}\`
**Base:** \`${base_ref}\`
**Head:** \`${head_ref}\`
**Review ID:** \`${review_id}\`
**Created:** ${created_at}
**Total Comments:** ${comments.length}

---
`;

  // Generate markdown for each file with comments
  commentsByFile.forEach((fileComments, filePath) => {
    markdown += `\n## 📄 File: \`${filePath}\`\n\n`;

    fileComments.forEach(comment => {
      // Find the corresponding file and hunk
      const file = files.find(f => (f.to || f.from) === filePath);
      let diffContext = '';

      if (file) {
        const chunk = file.chunks.find(c => {
          // Find chunk containing the comment line
          const lineNum = comment.start_line_new || comment.start_line_old;
          if (!lineNum) return false;

          if (comment.start_line_new) {
            return c.changes.some(ch => ch.newLine === lineNum);
          } else {
            return c.changes.some(ch => ch.oldLine === lineNum);
          }
        });

        if (chunk) {
          // Extract context around the comment (max 5 lines)
          const targetLine = comment.start_line_new || comment.start_line_old;
          const changeIndex = chunk.changes.findIndex(ch =>
            (ch.newLine === targetLine) || (ch.oldLine === targetLine)
          );

          if (changeIndex !== -1) {
            const start = Math.max(0, changeIndex - 2);
            const end = Math.min(chunk.changes.length, changeIndex + 3);
            const contextLines = chunk.changes.slice(start, end);
            diffContext = contextLines.map(ch => ch.content).join('\n');
          }
        }
      }

      markdown += `### 🔢 Diff Context\n\`\`\`diff\n${diffContext || '(context not available)'}\n\`\`\`\n\n`;
      markdown += `### 💬 Comment\n\n${comment.comment}\n\n`;

      if (comment.tags && comment.tags.length > 0) {
        markdown += `**Tags:** ${comment.tags.join(', ')}\n`;
      }

      markdown += `**Status:** ${comment.resolved ? '✅ resolved' : '⬜️ unresolved'}\n\n`;
      markdown += `---\n\n`;
    });
  });

  // Summary
  const fileCount = commentsByFile.size;
  const resolvedCount = comments.filter(c => c.resolved).length;

  markdown += `## 🧠 Summary

- 🧾 **Files reviewed:** ${fileCount}
- 💬 **Total comments:** ${comments.length}
- ⚙️ **Resolved:** ${resolvedCount} / ${comments.length}
`;

  return markdown;
}

export async function copyToClipboard(text: string): Promise<boolean> {
  try {
    await navigator.clipboard.writeText(text);
    return true;
  } catch (error) {
    console.error('Failed to copy to clipboard:', error);
    return false;
  }
}
