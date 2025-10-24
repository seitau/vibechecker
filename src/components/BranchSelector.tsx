import { useState, useEffect, useRef } from 'react';
import Fuse from 'fuse.js';

type BranchSelectorProps = {
  currentBranch: string;
  branches: string[];
  onSelect: (branch: string) => void;
  onClose: () => void;
  label: string;
};

export default function BranchSelector({ currentBranch, branches, onSelect, onClose, label }: BranchSelectorProps) {
  const [search, setSearch] = useState('');
  const [filteredBranches, setFilteredBranches] = useState(branches);
  const inputRef = useRef<HTMLInputElement>(null);
  const listRef = useRef<HTMLDivElement>(null);

  const fuse = useRef(new Fuse(branches, {
    threshold: 0.3,
    ignoreLocation: true,
  }));

  useEffect(() => {
    inputRef.current?.focus();
  }, []);

  useEffect(() => {
    fuse.current = new Fuse(branches, {
      threshold: 0.3,
      ignoreLocation: true,
    });
    setFilteredBranches(branches);
  }, [branches]);

  useEffect(() => {
    if (search.trim() === '') {
      setFilteredBranches(branches);
    } else {
      const results = fuse.current.search(search);
      setFilteredBranches(results.map(r => r.item));
    }
  }, [search, branches]);

  const handleSelect = (branch: string) => {
    onSelect(branch);
    onClose();
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Escape') {
      onClose();
    }
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50" onClick={onClose}>
      <div className="bg-gray-800 rounded-lg shadow-xl w-[500px] max-h-[600px] flex flex-col" onClick={e => e.stopPropagation()}>
        <div className="p-4 border-b border-gray-700">
          <h3 className="text-lg font-semibold text-white mb-2">{label}</h3>
          <input
            ref={inputRef}
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="Search branches..."
            className="w-full px-3 py-2 bg-gray-700 text-white rounded border border-gray-600 focus:outline-none focus:border-blue-500"
          />
        </div>

        <div ref={listRef} className="flex-1 overflow-y-auto">
          {filteredBranches.length === 0 ? (
            <div className="p-4 text-center text-gray-400">No branches found</div>
          ) : (
            <div className="py-2">
              {filteredBranches.map((branch) => (
                <button
                  key={branch}
                  onClick={() => handleSelect(branch)}
                  className={`w-full px-4 py-2 text-left hover:bg-gray-700 transition-colors ${
                    branch === currentBranch ? 'bg-gray-700 text-green-400' : 'text-white'
                  }`}
                >
                  <div className="flex items-center gap-2">
                    {branch === currentBranch && <span className="text-green-400">✓</span>}
                    <code className="text-sm">{branch}</code>
                  </div>
                </button>
              ))}
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
