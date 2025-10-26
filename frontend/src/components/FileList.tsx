import { useState } from "react";
import type { ParsedFile } from "../types/model";

type Props = {
  files: ParsedFile[];
  selectedFile: number;
  onSelectFile: (index: number) => void;
};

type TreeNode = {
  name: string;
  path: string;
  isFile: boolean;
  fileIndex?: number;
  children: Map<string, TreeNode>;
  file?: ParsedFile;
};

function buildFileTree(files: ParsedFile[]): TreeNode {
  const root: TreeNode = {
    name: '',
    path: '',
    isFile: false,
    children: new Map(),
  };

  files.forEach((file, index) => {
    const filePath = file.to || file.from || 'unknown';
    const parts = filePath.split('/');
    let current = root;

    parts.forEach((part, partIndex) => {
      const isLastPart = partIndex === parts.length - 1;
      const pathSoFar = parts.slice(0, partIndex + 1).join('/');

      if (!current.children.has(part)) {
        current.children.set(part, {
          name: part,
          path: pathSoFar,
          isFile: isLastPart,
          fileIndex: isLastPart ? index : undefined,
          file: isLastPart ? file : undefined,
          children: new Map(),
        });
      }

      current = current.children.get(part)!;
    });
  });

  return root;
}

function TreeNodeComponent({
  node,
  selectedFile,
  onSelectFile,
  level = 0,
}: {
  node: TreeNode;
  selectedFile: number;
  onSelectFile: (index: number) => void;
  level?: number;
}) {
  const [isExpanded, setIsExpanded] = useState(true);
  const hasChildren = node.children.size > 0;

  if (node.isFile && node.file && node.fileIndex !== undefined) {
    const isRenamed = node.file.from && node.file.to && node.file.from !== node.file.to;
    const isSelected = node.fileIndex === selectedFile;

    return (
      <button
        onClick={() => onSelectFile(node.fileIndex!)}
        className={`w-full text-left px-2 py-1 text-sm ${
          isSelected ? 'bg-blue-100 border-l-2 border-blue-500' : 'hover:bg-gray-200'
        }`}
        style={{ paddingLeft: `${level * 12 + 8}px` }}
        title={isRenamed ? `${node.file.from} → ${node.file.to}` : node.name}
      >
        {isRenamed ? (
          <div className="font-mono text-xs select-text">
            <div className="text-gray-500 truncate">{node.file.from}</div>
            <div className="text-blue-600 truncate">→ {node.file.to}</div>
          </div>
        ) : (
          <div className="flex items-center justify-between">
            <span className="font-mono text-xs truncate select-text">{node.name}</span>
            <span className="text-xs text-gray-600 ml-2 flex-shrink-0">
              <span className="text-green-600">+{node.file.additions}</span>
              {' '}
              <span className="text-red-600">-{node.file.deletions}</span>
            </span>
          </div>
        )}
      </button>
    );
  }

  if (!hasChildren) return null;

  return (
    <div>
      <button
        onClick={() => setIsExpanded(!isExpanded)}
        className="w-full text-left px-2 py-1 text-sm hover:bg-gray-100 flex items-center"
        style={{ paddingLeft: `${level * 12 + 8}px` }}
      >
        <span className="mr-1 text-gray-500">{isExpanded ? '▼' : '▶'}</span>
        <span className="font-mono text-xs font-semibold">{node.name || '.'}</span>
      </button>
      {isExpanded && (
        <div>
          {Array.from(node.children.values())
            .sort((a, b) => {
              // Folders first, then files
              if (a.isFile !== b.isFile) return a.isFile ? 1 : -1;
              return a.name.localeCompare(b.name);
            })
            .map((child) => (
              <TreeNodeComponent
                key={child.path}
                node={child}
                selectedFile={selectedFile}
                onSelectFile={onSelectFile}
                level={level + 1}
              />
            ))}
        </div>
      )}
    </div>
  );
}

export default function FileList({ files, selectedFile, onSelectFile }: Props) {
  const tree = buildFileTree(files);

  return (
    <div className="w-64 border-r border-gray-300 overflow-y-auto bg-gray-50">
      <div className="p-4 border-b border-gray-300 bg-white">
        <h2 className="font-semibold text-sm">Files Changed ({files.length})</h2>
      </div>
      <div className="py-2">
        {Array.from(tree.children.values())
          .sort((a, b) => {
            if (a.isFile !== b.isFile) return a.isFile ? 1 : -1;
            return a.name.localeCompare(b.name);
          })
          .map((node) => (
            <TreeNodeComponent
              key={node.path}
              node={node}
              selectedFile={selectedFile}
              onSelectFile={onSelectFile}
            />
          ))}
      </div>
    </div>
  );
}
