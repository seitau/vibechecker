import type { ParsedFile } from "../types/model";

type Props = {
  files: ParsedFile[];
  selectedFile: number;
  onSelectFile: (index: number) => void;
};

export default function FileList({ files, selectedFile, onSelectFile }: Props) {
  return (
    <div className="w-64 border-r border-gray-300 overflow-y-auto bg-gray-50">
      <div className="p-4 border-b border-gray-300 bg-white">
        <h2 className="font-semibold text-sm">Files Changed ({files.length})</h2>
      </div>
      <div className="p-2">
        {files.map((file, index) => {
          const fileName = file.to || file.from || 'unknown';
          const isRenamed = file.from && file.to && file.from !== file.to;
          const isSelected = index === selectedFile;
          return (
            <button
              key={index}
              onClick={() => onSelectFile(index)}
              className={`w-full text-left p-2 mb-1 rounded text-sm truncate ${
                isSelected
                  ? 'bg-blue-100 border border-blue-300'
                  : 'hover:bg-gray-200'
              }`}
              title={isRenamed ? `${file.from} → ${file.to}` : fileName}
            >
              {isRenamed ? (
                <div className="font-mono text-xs">
                  <div className="text-gray-500 truncate">{file.from}</div>
                  <div className="text-blue-600 truncate">→ {file.to}</div>
                </div>
              ) : (
                <div className="font-mono text-xs truncate">{fileName}</div>
              )}
              <div className="text-xs text-gray-600 mt-1">
                <span className="text-green-600">+{file.additions}</span>
                {' '}
                <span className="text-red-600">-{file.deletions}</span>
              </div>
            </button>
          );
        })}
      </div>
    </div>
  );
}
