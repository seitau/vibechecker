import React, { useState } from 'react';
import type { ParsedFile, Comment } from "../types/model";
import { generateHunkId } from '../lib/hunkId';

type Props = {
  file: ParsedFile | null;
  comments: Comment[];
  onAddComment: (comment: Omit<Comment, 'comment_id' | 'created_at' | 'resolved'>) => void;
};

export default function DiffViewer({ file, comments, onAddComment }: Props) {
  const [commentingLine, setCommentingLine] = useState<{
    hunkId: string;
    lineNumber?: number;
    isOld: boolean;
    lineContent?: string;
    changeIdx: number;
  } | null>(null);
  const [commentText, setCommentText] = useState('');
  const [selectedLines, setSelectedLines] = useState<{
    hunkId: string;
    startIdx: number;
    endIdx: number;
    isOld: boolean;
  } | null>(null);
  const [isSelecting, setIsSelecting] = useState(false);

  if (!file) {
    return (
      <div className="flex-1 flex items-center justify-center text-gray-500">
        Select a file to view diff
      </div>
    );
  }


  const handleLineMouseDown = (hunkId: string, changeIdx: number, isOld: boolean, e: React.MouseEvent) => {
    e.preventDefault();
    setIsSelecting(true);
    setSelectedLines({ hunkId, startIdx: changeIdx, endIdx: changeIdx, isOld });
    setCommentingLine(null);
  };

  const handleLineMouseEnter = (hunkId: string, changeIdx: number, isOld: boolean) => {
    if (isSelecting && selectedLines && selectedLines.hunkId === hunkId && selectedLines.isOld === isOld) {
      setSelectedLines({ ...selectedLines, endIdx: changeIdx });
    }
  };

  const handleLineMouseUp = () => {
    if (isSelecting && selectedLines) {
      setIsSelecting(false);
      // If only one line is selected (start == end), treat as single line comment
      if (selectedLines.startIdx === selectedLines.endIdx) {
        const chunk = file.chunks.find(c => generateHunkId(file.to || file.from || 'unknown', c) === selectedLines.hunkId);
        if (chunk) {
          const change = chunk.changes[selectedLines.startIdx];
          const lineNumber = change.newLine || change.oldLine || change.ln;
          setCommentingLine({
            hunkId: selectedLines.hunkId,
            lineNumber,
            isOld: selectedLines.isOld,
            lineContent: change.content,
            changeIdx: selectedLines.startIdx
          });
          setSelectedLines(null);
        }
      }
    }
  };

  const handleSubmitComment = () => {
    if (!commentText.trim()) return;

    if (selectedLines) {
      const chunk = file.chunks.find(c => generateHunkId(file.to || file.from || 'unknown', c) === selectedLines.hunkId);
      if (!chunk) return;

      const startIdx = Math.min(selectedLines.startIdx, selectedLines.endIdx);
      const endIdx = Math.max(selectedLines.startIdx, selectedLines.endIdx);

      const startChange = chunk.changes[startIdx];
      const endChange = chunk.changes[endIdx];

      const startLineNew = selectedLines.isOld ? undefined : (startChange.newLine || startChange.ln);
      const startLineOld = selectedLines.isOld ? (startChange.oldLine || startChange.ln) : undefined;
      const endLineNew = selectedLines.isOld ? undefined : (endChange.newLine || endChange.ln);
      const endLineOld = selectedLines.isOld ? (endChange.oldLine || endChange.ln) : undefined;

      const lineContents = chunk.changes.slice(startIdx, endIdx + 1).map(c => c.content).join('\n');

      onAddComment({
        file_path: file.to || file.from || 'unknown',
        hunk_id: selectedLines.hunkId,
        start_line_new: startLineNew,
        start_line_old: startLineOld,
        end_line_new: endLineNew,
        end_line_old: endLineOld,
        line_content: lineContents,
        comment: commentText.trim(),
      });

      setSelectedLines(null);
      setCommentText('');
    } else if (commentingLine) {
      onAddComment({
        file_path: file.to || file.from || 'unknown',
        hunk_id: commentingLine.hunkId,
        start_line_new: commentingLine.isOld ? undefined : commentingLine.lineNumber,
        start_line_old: commentingLine.isOld ? commentingLine.lineNumber : undefined,
        line_content: commentingLine.lineContent,
        comment: commentText.trim(),
      });

      setCommentingLine(null);
      setCommentText('');
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if ((e.metaKey || e.ctrlKey) && e.key === 'Enter') {
      e.preventDefault();
      handleSubmitComment();
    }
  };

  const fileName = file.to || file.from || 'unknown';

  return (
    <div className="flex-1 overflow-y-auto bg-white">
      <div className="p-4 border-b border-gray-300 bg-gray-50">
        <h2 className="font-mono text-sm font-semibold">{fileName}</h2>
        <div className="text-xs text-gray-600 mt-1">
          <span className="text-green-600">+{file.additions}</span>
          {' '}
          <span className="text-red-600">-{file.deletions}</span>
        </div>
      </div>

      <div className="font-mono text-xs">
        {file.chunks.map((chunk, chunkIdx) => {
          const hunkId = generateHunkId(fileName, chunk);

          return (
            <div key={chunkIdx} className="border-b border-gray-200">
              <div className="bg-gray-100 px-4 py-1 text-gray-600 sticky top-0">
                @@ -{chunk.oldStart},{chunk.oldLines} +{chunk.newStart},{chunk.newLines} @@
              </div>

              <table className="w-full">
                <tbody>
                  {chunk.changes.map((change, changeIdx) => {
                    const isSelected = selectedLines?.hunkId === hunkId &&
                                       Math.min(selectedLines.startIdx, selectedLines.endIdx) <= changeIdx &&
                                       changeIdx <= Math.max(selectedLines.startIdx, selectedLines.endIdx);

                    const bgColor = isSelected ? 'bg-blue-200' :
                      change.type === 'add' ? 'bg-green-50' :
                      change.type === 'del' ? 'bg-red-50' : 'bg-white';

                    const lineColor =
                      change.type === 'add' ? 'text-green-700' :
                      change.type === 'del' ? 'text-red-700' : 'text-gray-500';

                    const isCommentingThisLine = commentingLine?.hunkId === hunkId &&
                                                  commentingLine?.changeIdx === changeIdx;

                    // Find existing comments for this line
                    // Show comment on the last line of a multi-line comment range
                    const lineComments = comments.filter(c => {
                      const hunkMatch = c.hunk_id === hunkId;

                      let lineMatch = false;

                      if (change.type === 'add') {
                        const changeLine = change.newLine || change.ln;
                        if (c.start_line_new !== undefined && changeLine !== undefined) {
                          if (c.end_line_new !== undefined) {
                            // Multi-line comment: show on last line
                            lineMatch = c.end_line_new === changeLine;
                          } else {
                            // Single line comment
                            lineMatch = c.start_line_new === changeLine;
                          }
                        }
                      } else if (change.type === 'del') {
                        const changeLine = change.oldLine || change.ln;
                        if (c.start_line_old !== undefined && changeLine !== undefined) {
                          if (c.end_line_old !== undefined) {
                            // Multi-line comment: show on last line
                            lineMatch = c.end_line_old === changeLine;
                          } else {
                            // Single line comment
                            lineMatch = c.start_line_old === changeLine;
                          }
                        }
                      } else {
                        // For normal lines
                        if (c.start_line_new !== undefined && change.newLine !== undefined) {
                          if (c.end_line_new !== undefined) {
                            lineMatch = c.end_line_new === change.newLine;
                          } else {
                            lineMatch = c.start_line_new === change.newLine;
                          }
                        } else if (c.start_line_old !== undefined && change.oldLine !== undefined) {
                          if (c.end_line_old !== undefined) {
                            lineMatch = c.end_line_old === change.oldLine;
                          } else {
                            lineMatch = c.start_line_old === change.oldLine;
                          }
                        }
                      }

                      return hunkMatch && lineMatch;
                    });

                    // Check if this line is within a multi-line comment range (for highlighting)
                    const isInCommentRange = comments.some(c => {
                      if (c.hunk_id !== hunkId) return false;

                      if (change.type === 'add') {
                        const changeLine = change.newLine || change.ln;
                        if (c.start_line_new !== undefined && changeLine !== undefined && c.end_line_new !== undefined) {
                          return c.start_line_new <= changeLine && changeLine <= c.end_line_new;
                        }
                      } else if (change.type === 'del') {
                        const changeLine = change.oldLine || change.ln;
                        if (c.start_line_old !== undefined && changeLine !== undefined && c.end_line_old !== undefined) {
                          return c.start_line_old <= changeLine && changeLine <= c.end_line_old;
                        }
                      } else {
                        if (c.start_line_new !== undefined && change.newLine !== undefined && c.end_line_new !== undefined) {
                          return c.start_line_new <= change.newLine && change.newLine <= c.end_line_new;
                        } else if (c.start_line_old !== undefined && change.oldLine !== undefined && c.end_line_old !== undefined) {
                          return c.start_line_old <= change.oldLine && change.oldLine <= c.end_line_old;
                        }
                      }
                      return false;
                    });

                    return (
                      <React.Fragment key={`change-${chunkIdx}-${changeIdx}`}>
                        <tr
                          className={`${bgColor} hover:bg-blue-100 cursor-pointer group select-none`}
                          onMouseDown={(e) => handleLineMouseDown(hunkId, changeIdx, change.type === 'del', e)}
                          onMouseEnter={() => handleLineMouseEnter(hunkId, changeIdx, change.type === 'del')}
                          onMouseUp={handleLineMouseUp}
                        >
                          <td className={`px-2 py-0.5 text-right select-none w-12 ${lineColor}`}>
                            {change.oldLine || ''}
                          </td>
                          <td className={`px-2 py-0.5 text-right select-none w-12 ${lineColor}`}>
                            {change.newLine || ''}
                          </td>
                          <td className="px-2 py-0.5 w-8">
                            {lineComments.length > 0 ? (
                              <span className="text-blue-600">💬</span>
                            ) : isInCommentRange ? (
                              <span className="text-blue-400">│</span>
                            ) : (
                              <span className="invisible group-hover:visible text-gray-400">💬</span>
                            )}
                          </td>
                          <td className="px-2 py-0.5 whitespace-pre-wrap break-all">
                            <span className={change.type === 'add' ? 'text-green-700' : change.type === 'del' ? 'text-red-700' : ''}>
                              {change.content}
                            </span>
                          </td>
                        </tr>

                        {/* Show existing comments */}
                        {lineComments.length > 0 && lineComments.map(comment => {
                          const isMultiLine = (comment.end_line_new !== undefined && comment.end_line_new !== comment.start_line_new) ||
                                              (comment.end_line_old !== undefined && comment.end_line_old !== comment.start_line_old);
                          const startLine = comment.start_line_new || comment.start_line_old;
                          const endLine = comment.end_line_new || comment.end_line_old;

                          return (
                            <tr key={comment.comment_id}>
                              <td colSpan={4} className="p-0">
                                <div className={`p-3 border-t ${comment.resolved ? 'bg-green-50 border-green-200' : 'bg-yellow-50 border-yellow-200'}`}>
                                  <div className="flex items-start justify-between">
                                    <div className="flex-1">
                                      <div className="text-xs text-gray-500 mb-1">
                                        {isMultiLine && <span className="mr-2 text-blue-600">Lines {startLine}-{endLine}</span>}
                                        {new Date(comment.created_at).toLocaleString()}
                                        {comment.resolved && <span className="ml-2 text-green-600">✓ Resolved</span>}
                                      </div>
                                      <div className="text-sm whitespace-pre-wrap break-words font-sans">
                                        {comment.comment}
                                      </div>
                                    </div>
                                  </div>
                                </div>
                              </td>
                            </tr>
                          );
                        })}

                        {/* Comment input form */}
                        {isCommentingThisLine && (
                          <tr>
                            <td colSpan={4} className="p-0">
                              <div className="bg-blue-50 p-4 border-t border-blue-200">
                                <div className="text-xs text-gray-600 mb-2">
                                  Commenting on line {commentingLine.lineNumber}
                                </div>
                                <textarea
                                  className="w-full p-2 border border-gray-300 rounded text-sm font-sans"
                                  rows={3}
                                  placeholder="Write a comment... (⌘+Enter to submit)"
                                  value={commentText}
                                  onChange={(e) => setCommentText(e.target.value)}
                                  onKeyDown={handleKeyDown}
                                  autoFocus
                                />
                                <div className="mt-2 flex gap-2">
                                  <button
                                    onClick={handleSubmitComment}
                                    className="px-3 py-1 bg-blue-600 text-white rounded text-sm hover:bg-blue-700"
                                  >
                                    Add Comment
                                  </button>
                                  <button
                                    onClick={() => setCommentingLine(null)}
                                    className="px-3 py-1 bg-gray-300 rounded text-sm hover:bg-gray-400"
                                  >
                                    Cancel
                                  </button>
                                </div>
                              </div>
                            </td>
                          </tr>
                        )}

                        {/* Multi-line comment input form */}
                        {selectedLines && !isSelecting && selectedLines.hunkId === hunkId &&
                         changeIdx === Math.max(selectedLines.startIdx, selectedLines.endIdx) && (
                          <tr>
                            <td colSpan={4} className="p-0">
                              <div className="bg-blue-50 p-4 border-t border-blue-200">
                                <div className="text-xs text-gray-600 mb-2">
                                  Commenting on lines {Math.min(selectedLines.startIdx, selectedLines.endIdx) + 1} - {Math.max(selectedLines.startIdx, selectedLines.endIdx) + 1}
                                </div>
                                <textarea
                                  className="w-full p-2 border border-gray-300 rounded text-sm font-sans"
                                  rows={3}
                                  placeholder="Write a comment... (⌘+Enter to submit)"
                                  value={commentText}
                                  onChange={(e) => setCommentText(e.target.value)}
                                  onKeyDown={handleKeyDown}
                                  autoFocus
                                />
                                <div className="mt-2 flex gap-2">
                                  <button
                                    onClick={handleSubmitComment}
                                    className="px-3 py-1 bg-blue-600 text-white rounded text-sm hover:bg-blue-700"
                                  >
                                    Add Comment
                                  </button>
                                  <button
                                    onClick={() => {
                                      setSelectedLines(null);
                                      setCommentText('');
                                    }}
                                    className="px-3 py-1 bg-gray-300 rounded text-sm hover:bg-gray-400"
                                  >
                                    Cancel
                                  </button>
                                </div>
                              </div>
                            </td>
                          </tr>
                        )}
                      </React.Fragment>
                    );
                  })}
                </tbody>
              </table>
            </div>
          );
        })}
      </div>
    </div>
  );
}
