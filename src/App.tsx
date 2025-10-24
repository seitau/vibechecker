import { useState, useEffect } from 'react';
import type { Review, Comment, ParsedFile } from "../types/model";
import { parseGitDiff } from './lib/parseDiff';
import { loadReview, saveReview } from './lib/storage';
import { exportJSON, exportMarkdown, copyToClipboard } from './lib/export';
import { fetchCurrentBranchDiff, fetchGitInfo } from './lib/git';
import FileList from './components/FileList';
import DiffViewer from './components/DiffViewer';
import CommentPanel from './components/CommentPanel';
import DiffInput from './components/DiffInput';

function App() {
  const [review, setReview] = useState<Review | null>(null);
  const [files, setFiles] = useState<ParsedFile[]>([]);
  const [selectedFileIndex, setSelectedFileIndex] = useState(0);
  const [showDiffInput, setShowDiffInput] = useState(false);
  const [toast, setToast] = useState<string | null>(null);
  const [isLoadingDiff, setIsLoadingDiff] = useState(false);

  // Load review from localStorage on mount
  useEffect(() => {
    const savedReview = loadReview();
    if (savedReview) {
      setReview(savedReview);
    }
  }, []);

  // Auto-load current branch diff on mount
  useEffect(() => {
    loadCurrentBranchDiff();
  }, []);

  // Save review to localStorage whenever it changes
  useEffect(() => {
    if (review) {
      saveReview(review);
    }
  }, [review]);

  const showToast = (message: string) => {
    setToast(message);
    setTimeout(() => setToast(null), 3000);
  };

  const loadCurrentBranchDiff = async () => {
    setIsLoadingDiff(true);
    try {
      const [gitInfo, diffData] = await Promise.all([
        fetchGitInfo(),
        fetchCurrentBranchDiff(),
      ]);

      if (diffData) {
        const parsedFiles = parseGitDiff(diffData);
        if (parsedFiles.length > 0) {
          setFiles(parsedFiles);
          setSelectedFileIndex(0);

          // Update review with git info
          if (!review && gitInfo) {
            const newReview: Review = {
              review_id: `review_${Date.now()}`,
              created_at: new Date().toISOString(),
              repo: gitInfo.repo,
              base_ref: gitInfo.baseBranch,
              head_ref: gitInfo.currentBranch,
              comments: [],
            };
            setReview(newReview);
          }

          showToast(`✅ Loaded diff: ${gitInfo?.currentBranch || 'current'} ← ${gitInfo?.baseBranch || 'base'}`);
        }
      }
    } catch (error) {
      console.error('Failed to load current branch diff:', error);
      // Silently fail - user can manually paste diff
    } finally {
      setIsLoadingDiff(false);
    }
  };

  const handleLoadDiff = (diffText: string) => {
    try {
      const parsedFiles = parseGitDiff(diffText);
      if (parsedFiles.length === 0) {
        showToast('❌ No files found in diff');
        return;
      }

      setFiles(parsedFiles);
      setSelectedFileIndex(0);

      // Create new review if none exists
      if (!review) {
        const newReview: Review = {
          review_id: `review_${Date.now()}`,
          created_at: new Date().toISOString(),
          comments: [],
        };
        setReview(newReview);
      }

      setShowDiffInput(false);
      showToast('✅ Diff loaded successfully');
    } catch (error) {
      console.error('Failed to parse diff:', error);
      showToast('❌ Failed to parse diff');
    }
  };

  const handleAddComment = (commentData: Omit<Comment, 'comment_id' | 'created_at' | 'resolved'>) => {
    if (!review) return;

    const newComment: Comment = {
      ...commentData,
      comment_id: `comment_${Date.now()}`,
      created_at: new Date().toISOString(),
      resolved: false,
    };

    setReview({
      ...review,
      comments: [...review.comments, newComment],
    });

    showToast('✅ Comment added');
  };

  const handleToggleResolved = (commentId: string) => {
    if (!review) return;

    setReview({
      ...review,
      comments: review.comments.map(c =>
        c.comment_id === commentId ? { ...c, resolved: !c.resolved } : c
      ),
    });
  };

  const handleDeleteComment = (commentId: string) => {
    if (!review) return;

    setReview({
      ...review,
      comments: review.comments.filter(c => c.comment_id !== commentId),
    });

    showToast('✅ Comment deleted');
  };

  const handleExportJSON = () => {
    if (!review) {
      showToast('❌ No review to export');
      return;
    }
    exportJSON(review);
    showToast('✅ JSON downloaded');
  };

  const handleExportMarkdown = async () => {
    if (!review) {
      showToast('❌ No review to export');
      return;
    }

    const markdown = exportMarkdown(review, files);
    const success = await copyToClipboard(markdown);

    if (success) {
      showToast('✅ Markdown copied to clipboard');
    } else {
      showToast('❌ Failed to copy to clipboard');
    }
  };

  const selectedFile = files[selectedFileIndex] || null;

  return (
    <div className="h-screen flex flex-col">
      {/* Header */}
      <header className="bg-gray-800 text-white p-4 flex items-center justify-between">
        <h1 className="text-xl font-bold">🧩 vibecheck</h1>

        <div className="flex gap-2">
          <button
            onClick={loadCurrentBranchDiff}
            disabled={isLoadingDiff}
            className="px-3 py-1 bg-green-600 rounded hover:bg-green-700 text-sm disabled:bg-gray-500"
          >
            {isLoadingDiff ? '⏳ Loading...' : '🔄 Reload Diff'}
          </button>
          <button
            onClick={() => setShowDiffInput(true)}
            className="px-3 py-1 bg-blue-600 rounded hover:bg-blue-700 text-sm"
          >
            📝 Paste Diff
          </button>
        </div>
      </header>

      {/* Main Content */}
      <div className="flex-1 flex overflow-hidden">
        {files.length === 0 ? (
          <div className="flex-1 flex items-center justify-center text-gray-500">
            <div className="text-center">
              <div className="text-6xl mb-4">🧩</div>
              <h2 className="text-2xl font-semibold mb-2">Welcome to vibecheck</h2>
              <p className="mb-4">Local code review made simple</p>
              <button
                onClick={() => setShowDiffInput(true)}
                className="px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
              >
                Get Started - Paste a Diff
              </button>
            </div>
          </div>
        ) : (
          <>
            <FileList
              files={files}
              selectedFile={selectedFileIndex}
              onSelectFile={setSelectedFileIndex}
            />
            <DiffViewer
              file={selectedFile}
              onAddComment={handleAddComment}
            />
            <CommentPanel
              comments={review?.comments || []}
              onToggleResolved={handleToggleResolved}
              onDeleteComment={handleDeleteComment}
            />
          </>
        )}
      </div>

      {/* Diff Input Modal */}
      {showDiffInput && (
        <DiffInput
          onSubmit={handleLoadDiff}
          onClose={() => setShowDiffInput(false)}
        />
      )}

      {/* Export FAB */}
      {review && review.comments.length > 0 && (
        <div className="fixed bottom-6 right-6 flex flex-col gap-3">
          <button
            onClick={handleExportMarkdown}
            className="w-16 h-16 bg-purple-600 text-white rounded-full shadow-lg hover:bg-purple-700 hover:scale-110 transition-all flex items-center justify-center text-2xl"
            title="Export Markdown"
          >
            📋
          </button>
          <button
            onClick={handleExportJSON}
            className="w-16 h-16 bg-green-600 text-white rounded-full shadow-lg hover:bg-green-700 hover:scale-110 transition-all flex items-center justify-center text-2xl"
            title="Export JSON"
          >
            📦
          </button>
        </div>
      )}

      {/* Toast Notification */}
      {toast && (
        <div className="fixed bottom-6 left-1/2 transform -translate-x-1/2 bg-gray-800 text-white px-4 py-2 rounded shadow-lg">
          {toast}
        </div>
      )}
    </div>
  );
}

export default App;
