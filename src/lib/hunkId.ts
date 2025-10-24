import CryptoJS from 'crypto-js';
import type { Chunk } from '../types/review';

export function generateHunkId(filePath: string, chunk: Chunk): string {
  // Generate stable hunk identifier from file path + hunk header + context
  const hunkHeader = `@@ -${chunk.oldStart},${chunk.oldLines} +${chunk.newStart},${chunk.newLines} @@`;
  const context = chunk.changes.slice(0, 3).map(c => c.content).join('\n');
  const input = `${filePath}:${hunkHeader}:${context}`;
  return CryptoJS.SHA1(input).toString();
}
