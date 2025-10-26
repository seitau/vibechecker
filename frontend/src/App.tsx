import { useState, useEffect } from 'react';
import type { Review, Comment, ParsedFile } from "../types/model";
import { parseGitDiff } from './lib/parseDiff';
import { exportJSON, exportMarkdown, copyToClipboard } from './lib/export';
import { fetchCurrentBranchDiff, fetchGitInfo, fetchBranches, fetchWorktrees, switchWorktree, type Worktree } from './lib/git';
import { loadWorkspace, saveWorkspace, getWorkspaceId, setCurrentWorkspaceId, type Workspace } from './lib/workspace';
import FileList from './components/FileList';
import DiffViewer from './components/DiffViewer';
import CommentPanel from './components/CommentPanel';
import DiffInput from './components/DiffInput';
import BranchSelector from './components/BranchSelector';
import WorktreeSelector from './components/WorktreeSelector';

function App() {
  const [review, setReview] = useState<Review | null>(null);
  const [files, setFiles] = useState<ParsedFile[]>([]);
  const [selectedFileIndex, setSelectedFileIndex] = useState(0);
  const [showDiffInput, setShowDiffInput] = useState(false);
  const [toast, setToast] = useState<string | null>(null);
  const [isLoadingDiff, setIsLoadingDiff] = useState(false);
  const [branches, setBranches] = useState<string[]>([]);
  const [showBaseBranchSelector, setShowBaseBranchSelector] = useState(false);
  const [showHeadBranchSelector, setShowHeadBranchSelector] = useState(false);
  const [worktrees, setWorktrees] = useState<Worktree[]>([]);
  const [currentWorktree, setCurrentWorktree] = useState<Worktree | null>(null);
  const [showWorktreeSelector, setShowWorktreeSelector] = useState(false);
  const [currentWorkspace, setCurrentWorkspace] = useState<Workspace | null>(null);

  // Load workspace on mount
  useEffect(() => {
    initializeWorkspace();
  }, []);

  const initializeWorkspace = async () => {
    // Load worktrees first
    const worktreeData = await fetchWorktrees();
    if (worktreeData) {
      setWorktrees(worktreeData.worktrees);
      setCurrentWorktree(worktreeData.current);

      // Load or create workspace for current worktree
      const workspaceId = getWorkspaceId(worktreeData.current.path);
      let workspace = loadWorkspace(worktreeData.current.path);

      if (!workspace) {
        workspace = {
          id: workspaceId,
          worktreePath: worktreeData.current.path,
          branch: worktreeData.current.branch,
          review: null,
          lastAccessed: new Date().toISOString(),
        };
      }

      setCurrentWorkspace(workspace);
      if (workspace.review) {
        setReview(workspace.review);
      }

      setCurrentWorkspaceId(workspaceId);
    }

    // Load branches and diff
    loadBranches();
    loadCurrentBranchDiff();
  };

  const loadBranches = async () => {
    const branchData = await fetchBranches();
    if (branchData) {
      setBranches(branchData.all);
    }
  };

  // Save workspace whenever review changes
  useEffect(() => {
    if (currentWorkspace && currentWorktree) {
      const updatedWorkspace: Workspace = {
        ...currentWorkspace,
        review: review,
        branch: currentWorktree.branch,
        lastAccessed: new Date().toISOString(),
      };
      saveWorkspace(updatedWorkspace);
      setCurrentWorkspace(updatedWorkspace);
    }
  }, [review, currentWorktree]);

  const showToast = (message: string) => {
    setToast(message);
    setTimeout(() => setToast(null), 3000);
  };

  const loadCurrentBranchDiff = async (customBaseBranch?: string) => {
    setIsLoadingDiff(true);
    try {
      const [gitInfo, diffData] = await Promise.all([
        fetchGitInfo(),
        fetchCurrentBranchDiff(customBaseBranch),
      ]);

      if (diffData) {
        const parsedFiles = parseGitDiff(diffData);
        if (parsedFiles.length > 0) {
          setFiles(parsedFiles);
          setSelectedFileIndex(0);

          // Update review with git info
          if (gitInfo) {
            const baseBranch = customBaseBranch || gitInfo.baseBranch;
            const newReview: Review = {
              review_id: review?.review_id || `review_${Date.now()}`,
              created_at: review?.created_at || new Date().toISOString(),
              repo: gitInfo.repo,
              base_ref: baseBranch,
              head_ref: gitInfo.currentBranch,
              base_commit: gitInfo.baseCommit,
              head_commit: gitInfo.headCommit,
              has_uncommitted_changes: gitInfo.hasUncommittedChanges,
              comments: review?.comments || [],
            };
            setReview(newReview);
            showToast(`✅ Loaded diff: ${gitInfo.currentBranch} ← ${baseBranch}`);
          }
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
  };

  const handleSelectBaseBranch = (branch: string) => {
    const cleanBranch = branch.replace('origin/', '');
    loadCurrentBranchDiff(cleanBranch);
  };

  const handleSelectWorktree = async (worktree: Worktree) => {
    setIsLoadingDiff(true);
    const success = await switchWorktree(worktree.path);

    if (success) {
      // Save current workspace before switching
      if (currentWorkspace && currentWorktree) {
        const updatedWorkspace: Workspace = {
          ...currentWorkspace,
          review: review,
          lastAccessed: new Date().toISOString(),
        };
        saveWorkspace(updatedWorkspace);
      }

      // Load new workspace
      const workspaceId = getWorkspaceId(worktree.path);
      let workspace = loadWorkspace(worktree.path);

      if (!workspace) {
        workspace = {
          id: workspaceId,
          worktreePath: worktree.path,
          branch: worktree.branch,
          review: null,
          lastAccessed: new Date().toISOString(),
        };
      }

      setCurrentWorkspace(workspace);
      setCurrentWorktree(worktree);
      setCurrentWorkspaceId(workspaceId);

      // Load workspace state
      if (workspace.review) {
        setReview(workspace.review);
      } else {
        setReview(null);
      }

      // Reload branches and diff for new worktree
      await loadBranches();
      await loadCurrentBranchDiff();

      showToast(`✅ Switched to worktree: ${worktree.branch}`);
    } else {
      showToast('❌ Failed to switch worktree');
    }
    setIsLoadingDiff(false);
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
        <div className="flex items-center gap-4">
          <h1 className="text-xl font-bold">✅ vibechecker</h1>
          {review?.repo && (
            <span className="text-sm text-gray-400">
              {review.repo.replace(/^.*[:/]([^/]+\/[^/]+?)(\.git)?$/, '$1')}
            </span>
          )}
          {review && (
            <div className="flex items-center gap-3 text-sm">
              <button
                onClick={() => setShowBaseBranchSelector(true)}
                className="flex items-center gap-2 hover:bg-gray-700 px-2 py-1 rounded transition-colors"
              >
                <span className="text-gray-400">{review.base_ref || 'base'}</span>
                {review.base_commit && (
                  <code className="text-xs bg-gray-700 px-1.5 py-0.5 rounded text-gray-300">
                    {review.base_commit.substring(0, 7)}
                  </code>
                )}
                <span className="text-gray-500 text-xs">▼</span>
              </button>
              <span className="text-gray-400">←</span>
              <div className="flex items-center gap-2 px-2 py-1">
                <span className="font-semibold text-green-400">{review.head_ref || 'head'}</span>
                {review.head_commit && (
                  <code className="text-xs bg-gray-700 px-1.5 py-0.5 rounded text-gray-300">
                    {review.head_commit.substring(0, 7)}
                  </code>
                )}
                {review.has_uncommitted_changes && (
                  <span className="text-xs bg-yellow-600 px-1.5 py-0.5 rounded text-white">
                    +uncommitted
                  </span>
                )}
              </div>
            </div>
          )}
        </div>

        <div className="flex gap-2">
          {worktrees.length > 1 && (
            <button
              onClick={() => setShowWorktreeSelector(true)}
              className="px-3 py-1 bg-purple-600 rounded hover:bg-purple-700 text-sm"
              title="Switch Worktree"
            >
              🌳 Worktree
            </button>
          )}
          <button
            onClick={() => loadCurrentBranchDiff()}
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
              <div className="text-6xl mb-4">✅</div>
              <h2 className="text-2xl font-semibold mb-2">Welcome to vibechecker</h2>
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
              comments={review?.comments || []}
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

      {/* Branch Selector Modals */}
      {showBaseBranchSelector && (
        <BranchSelector
          currentBranch={review?.base_ref || ''}
          branches={branches}
          onSelect={handleSelectBaseBranch}
          onClose={() => setShowBaseBranchSelector(false)}
          label="Select Base Branch"
        />
      )}

      {/* Worktree Selector Modal */}
      {showWorktreeSelector && currentWorktree && (
        <WorktreeSelector
          worktrees={worktrees}
          currentWorktree={currentWorktree}
          onSelect={handleSelectWorktree}
          onClose={() => setShowWorktreeSelector(false)}
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
