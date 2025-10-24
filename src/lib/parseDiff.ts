import parseDiff from 'parse-diff';
import type { ParsedFile, Chunk } from '../types/review';

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
        oldLine: change.ln1,
        newLine: change.ln2,
        ln: change.ln,
        ln1: change.ln1,
        ln2: change.ln2,
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
