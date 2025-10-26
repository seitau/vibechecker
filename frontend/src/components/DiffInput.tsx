import { useState } from 'react';

type Props = {
  onSubmit: (diffText: string) => void;
  onClose: () => void;
};

const SAMPLE_DIFF = `diff --git a/src/hello.ts b/src/hello.ts
index 1234567..abcdefg 100644
--- a/src/hello.ts
+++ b/src/hello.ts
@@ -1,5 +1,6 @@
 export function greet(name: string): string {
-  return "Hello, " + name;
+  // Updated greeting
+  return "Hello, " + name + "!";
 }

 export function farewell(name: string): string {
@@ -10,3 +11,7 @@ export function farewell(name: string): string {
 console.log(greet("World"));
 console.log(farewell("World"));
+
+// New feature
+export function welcome(name: string): string {
+  return "Welcome, " + name + "!";
+}
`;

export default function DiffInput({ onSubmit, onClose }: Props) {
  const [diffText, setDiffText] = useState('');

  const handleSubmit = () => {
    if (diffText.trim()) {
      onSubmit(diffText);
    }
  };

  const handleLoadSample = () => {
    setDiffText(SAMPLE_DIFF);
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg shadow-xl w-full max-w-4xl max-h-[90vh] flex flex-col">
        <div className="p-4 border-b border-gray-300 flex justify-between items-center">
          <h2 className="text-lg font-semibold">Paste Git Diff</h2>
          <button
            onClick={onClose}
            className="text-gray-500 hover:text-gray-700 text-2xl leading-none"
          >
            ×
          </button>
        </div>

        <div className="p-4 flex-1 overflow-auto">
          <textarea
            className="w-full h-full min-h-[400px] p-3 border border-gray-300 rounded font-mono text-sm"
            placeholder="Paste your git diff output here..."
            value={diffText}
            onChange={(e) => setDiffText(e.target.value)}
            autoFocus
          />
        </div>

        <div className="p-4 border-t border-gray-300 flex gap-2 justify-end">
          <button
            onClick={handleLoadSample}
            className="px-4 py-2 bg-gray-300 rounded hover:bg-gray-400"
          >
            Load Sample
          </button>
          <button
            onClick={onClose}
            className="px-4 py-2 bg-gray-300 rounded hover:bg-gray-400"
          >
            Cancel
          </button>
          <button
            onClick={handleSubmit}
            disabled={!diffText.trim()}
            className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 disabled:bg-gray-300 disabled:cursor-not-allowed"
          >
            Load Diff
          </button>
        </div>
      </div>
    </div>
  );
}
