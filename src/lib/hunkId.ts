import CryptoJS from 'crypto-js';
import type { Chunk } from "../types/model";

/**
 * Generate a stable hunk identifier using SHA1 hash.
 *
 * This creates a unique ID for each hunk (code change block) in a diff by combining:
 * - File path
 * - Hunk header (line numbers: @@ -old +new @@)
 * - First 3 lines of context
 *
 * This allows us to:
 * - Uniquely identify each code change block
 * - Persist comments across diff reloads
 * - Match comments to the correct code section even if line numbers shift
 *
 * @param filePath - The path to the file being reviewed
 * @param chunk - The diff hunk containing changes
 * @returns SHA1 hash as hunk identifier
 */
export function generateHunkId(filePath: string, chunk: Chunk): string {
  const hunkHeader = `@@ -${chunk.oldStart},${chunk.oldLines} +${chunk.newStart},${chunk.newLines} @@`;
  const context = chunk.changes.slice(0, 3).map(c => c.content).join('\n');
  const input = `${filePath}:${hunkHeader}:${context}`;
  return CryptoJS.SHA1(input).toString();
}
