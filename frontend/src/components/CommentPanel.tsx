import type { Comment } from "../types/model";

type Props = {
  comments: Comment[];
  onToggleResolved: (commentId: string) => void;
  onDeleteComment: (commentId: string) => void;
};

export default function CommentPanel({ comments, onToggleResolved, onDeleteComment }: Props) {
  return (
    <div className="w-80 border-l border-gray-300 overflow-y-auto bg-gray-50">
      <div className="p-4 border-b border-gray-300 bg-white">
        <h2 className="font-semibold text-sm">
          Comments ({comments.length})
        </h2>
        <div className="text-xs text-gray-600 mt-1">
          {comments.filter(c => c.resolved).length} resolved
        </div>
      </div>

      <div className="p-2">
        {comments.length === 0 ? (
          <div className="text-sm text-gray-500 p-4 text-center">
            No comments yet. Click 💬 on any line to add a comment.
          </div>
        ) : (
          comments.map((comment) => (
            <div
              key={comment.comment_id}
              className={`mb-3 p-3 rounded border ${
                comment.resolved
                  ? 'bg-green-50 border-green-200'
                  : 'bg-white border-gray-300'
              }`}
            >
              <div className="text-xs font-mono text-gray-600 mb-1 truncate" title={comment.file_path}>
                {comment.file_path}
              </div>

              <div className="text-xs text-gray-500 mb-2">
                Line: {comment.start_line_new || comment.start_line_old || 'N/A'}
              </div>

              {comment.line_content && (
                <div className="mb-2 p-2 bg-gray-100 rounded border border-gray-300">
                  <div className="text-xs font-mono text-gray-700 whitespace-pre-wrap break-all">
                    {comment.line_content}
                  </div>
                </div>
              )}

              <div className="text-sm mb-2 whitespace-pre-wrap break-words">
                {comment.comment}
              </div>

              {comment.tags && comment.tags.length > 0 && (
                <div className="flex flex-wrap gap-1 mb-2">
                  {comment.tags.map((tag, i) => (
                    <span
                      key={i}
                      className="px-2 py-0.5 bg-blue-100 text-blue-700 rounded text-xs"
                    >
                      {tag}
                    </span>
                  ))}
                </div>
              )}

              <div className="flex gap-2 mt-2">
                <button
                  onClick={() => onToggleResolved(comment.comment_id)}
                  className={`px-2 py-1 rounded text-xs ${
                    comment.resolved
                      ? 'bg-gray-300 hover:bg-gray-400'
                      : 'bg-green-600 text-white hover:bg-green-700'
                  }`}
                >
                  {comment.resolved ? '↩️ Unresolve' : '✅ Resolve'}
                </button>
                <button
                  onClick={() => onDeleteComment(comment.comment_id)}
                  className="px-2 py-1 bg-red-600 text-white rounded text-xs hover:bg-red-700"
                >
                  🗑️ Delete
                </button>
              </div>

              <div className="text-xs text-gray-500 mt-2">
                {new Date(comment.created_at).toLocaleString()}
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
}
