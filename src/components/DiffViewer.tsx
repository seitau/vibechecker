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

  if (!file) {
    return (
      <div className="flex-1 flex items-center justify-center text-gray-500">
        Select a file to view diff
      </div>
    );
  }

  const handleAddCommentClick = (hunkId: string, lineNumber: number | undefined, isOld: boolean, lineContent: string, changeIdx: number) => {
    setCommentingLine({ hunkId, lineNumber, isOld, lineContent, changeIdx });
    setCommentText('');
  };

  const handleSubmitComment = () => {
    if (!commentingLine || !commentText.trim()) return;

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
                    const bgColor =
                      change.type === 'add' ? 'bg-green-50' :
                      change.type === 'del' ? 'bg-red-50' : 'bg-white';

                    const lineColor =
                      change.type === 'add' ? 'text-green-700' :
                      change.type === 'del' ? 'text-red-700' : 'text-gray-500';

                    const isCommentingThisLine = commentingLine?.hunkId === hunkId &&
                                                  commentingLine?.changeIdx === changeIdx;

                    // Find existing comments for this line
                    const lineComments = comments.filter(c => {
                      const hunkMatch = c.hunk_id === hunkId;

                      // Match by line number and type (old vs new)
                      // For add lines: match comment's start_line_new with change.ln or change.newLine
                      // For del lines: match comment's start_line_old with change.ln or change.oldLine
                      // For normal lines: match either old or new line numbers
                      let lineMatch = false;

                      if (change.type === 'add') {
                        // For added lines, only match comments that have start_line_new
                        const changeLine = change.newLine || change.ln;
                        lineMatch = c.start_line_new === changeLine;
                      } else if (change.type === 'del') {
                        // For deleted lines, only match comments that have start_line_old
                        const changeLine = change.oldLine || change.ln;
                        lineMatch = c.start_line_old === changeLine;
                      } else {
                        // For normal lines, match either
                        lineMatch = (c.start_line_new === change.newLine) || (c.start_line_old === change.oldLine);
                      }

                      return hunkMatch && lineMatch;
                    });

                    return (
                      <React.Fragment key={`change-${chunkIdx}-${changeIdx}`}>
                        <tr
                          className={`${bgColor} hover:bg-blue-100 cursor-pointer group`}
                          onClick={() => {
                            const lineNumber = change.newLine || change.oldLine || change.ln;
                            handleAddCommentClick(
                              hunkId,
                              lineNumber,
                              change.type === 'del',
                              change.content,
                              changeIdx
                            );
                          }}
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
                        {lineComments.length > 0 && lineComments.map(comment => (
                          <tr key={comment.comment_id}>
                            <td colSpan={4} className="p-0">
                              <div className={`p-3 border-t ${comment.resolved ? 'bg-green-50 border-green-200' : 'bg-yellow-50 border-yellow-200'}`}>
                                <div className="flex items-start justify-between">
                                  <div className="flex-1">
                                    <div className="text-xs text-gray-500 mb-1">
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
                        ))}

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
