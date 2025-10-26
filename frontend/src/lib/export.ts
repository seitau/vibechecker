import type { Review, ParsedFile } from "../types/model";

export function exportJSON(review: Review): void {
  const json = JSON.stringify(review, null, 2);
  const blob = new Blob([json], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `vibechecker-review-${review.review_id}.json`;
  a.click();
  URL.revokeObjectURL(url);
}

export function exportMarkdown(review: Review, files: ParsedFile[]): string {
  const { comments } = review;

  // Group comments by file
  const commentsByFile = new Map<string, typeof comments>();
  comments.forEach(comment => {
    const fileComments = commentsByFile.get(comment.file_path) || [];
    fileComments.push(comment);
    commentsByFile.set(comment.file_path, fileComments);
  });

  let markdown = '';

  // Generate markdown for each file with comments
  commentsByFile.forEach((fileComments, filePath) => {
    markdown += `## ${filePath}\n\n`;

    fileComments.forEach(comment => {
      // Add line number info
      const lineInfo = comment.start_line_new
        ? `Line ${comment.start_line_new}`
        : comment.start_line_old
        ? `Line ${comment.start_line_old} (old)`
        : '';

      if (lineInfo) {
        markdown += `**${lineInfo}**\n\n`;
      }

      // Find the corresponding file and hunk
      const file = files.find(f => (f.to || f.from) === filePath);
      let diffContext = '';

      if (file && comment.hunk_id) {
        // Try to find the chunk by hunk_id first (more reliable)
        const chunk = file.chunks.find((_c, idx) => `hunk_${idx}` === comment.hunk_id);

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

      // Fallback to stored line_content if chunk lookup failed
      if (!diffContext && comment.line_content) {
        diffContext = comment.line_content;
      }

      markdown += `\`\`\`diff\n${diffContext || '(context not available)'}\n\`\`\`\n\n`;
      markdown += `${comment.comment}\n\n`;

      if (comment.resolved) {
        markdown += `Status: resolved\n`;
      }

      markdown += `\n`;
    });
  });

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
