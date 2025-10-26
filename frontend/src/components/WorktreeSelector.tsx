import { useEffect } from 'react';
import type { Worktree } from '../lib/git';

type WorktreeSelectorProps = {
  worktrees: Worktree[];
  currentWorktree: Worktree;
  onSelect: (worktree: Worktree) => void;
  onClose: () => void;
};

export default function WorktreeSelector({ worktrees, currentWorktree, onSelect, onClose }: WorktreeSelectorProps) {
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        onClose();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [onClose]);

  const handleSelect = (worktree: Worktree) => {
    onSelect(worktree);
    onClose();
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50" onClick={onClose}>
      <div className="bg-gray-800 rounded-lg shadow-xl w-[600px] max-h-[500px] flex flex-col" onClick={e => e.stopPropagation()}>
        <div className="p-4 border-b border-gray-700">
          <h3 className="text-lg font-semibold text-white">Switch Git Worktree</h3>
          <p className="text-sm text-gray-400 mt-1">Select a worktree to switch workspace</p>
        </div>

        <div className="flex-1 overflow-y-auto">
          {worktrees.length === 0 ? (
            <div className="p-4 text-center text-gray-400">No worktrees found</div>
          ) : (
            <div className="py-2">
              {worktrees.map((worktree) => {
                const isCurrent = worktree.path === currentWorktree.path;
                return (
                  <button
                    key={worktree.path}
                    onClick={() => handleSelect(worktree)}
                    disabled={isCurrent}
                    className={`w-full px-4 py-3 text-left hover:bg-gray-700 transition-colors border-l-4 ${
                      isCurrent
                        ? 'bg-gray-700 border-green-500 cursor-default'
                        : 'border-transparent'
                    }`}
                  >
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-1">
                          {isCurrent && <span className="text-green-400 text-sm">✓ Current</span>}
                          {worktree.isMain && <span className="text-blue-400 text-xs bg-blue-900 px-2 py-0.5 rounded">Main</span>}
                          <code className="text-sm text-white font-semibold">{worktree.branch || '(detached)'}</code>
                        </div>
                        <div className="text-xs text-gray-400 font-mono truncate">
                          {worktree.path}
                        </div>
                        <div className="text-xs text-gray-500 mt-1">
                          {worktree.commit.substring(0, 7)}
                        </div>
                      </div>
                    </div>
                  </button>
                );
              })}
            </div>
          )}
        </div>

        <div className="p-3 border-t border-gray-700 text-xs text-gray-400">
          Press <kbd className="px-1.5 py-0.5 bg-gray-700 rounded">Esc</kbd> to close
        </div>
      </div>
    </div>
  );
}
