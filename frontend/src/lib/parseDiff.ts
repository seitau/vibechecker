import parseDiff from 'parse-diff';
import type { ParsedFile } from "../types/model";

export function parseGitDiff(diffText: string): ParsedFile[] {
  const parsed = parseDiff(diffText);

  return parsed.map(file => ({
    from: file.from,
    to: file.to,
    chunks: file.chunks.map(chunk => ({
      content: chunk.content,
      changes: chunk.changes.map(change => ({
        type: change.type as 'normal' | 'add' | 'del',
        content: change.content,
        oldLine: (change as any).ln1,
        newLine: (change as any).ln2,
        ln: (change as any).ln,
        ln1: (change as any).ln1,
        ln2: (change as any).ln2,
      })),
      oldStart: chunk.oldStart,
      oldLines: chunk.oldLines,
      newStart: chunk.newStart,
      newLines: chunk.newLines,
    })),
    deletions: file.deletions,
    additions: file.additions,
  }));
}
