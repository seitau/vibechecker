export type Comment = {
  comment_id: string;
  file_path: string;
  hunk_id: string;
  start_line_new?: number;
  start_line_old?: number;
  end_line_new?: number;
  end_line_old?: number;
  line_content?: string;
  comment: string;
  tags?: string[];
  resolved: boolean;
  created_at: string;
}

export type Review = {
  review_id: string;
  repo?: string;
  base_ref?: string;
  head_ref?: string;
  base_commit?: string;
  head_commit?: string;
  has_uncommitted_changes?: boolean;
  created_at: string;
  comments: Comment[];
  diff_text?: string; // Store raw diff for reload
  files?: ParsedFile[]; // Store parsed files for reload
}

export type ParsedFile = {
  from?: string;
  to?: string;
  chunks: Chunk[];
  deletions: number;
  additions: number;
}

export type Chunk = {
  content: string;
  changes: Change[];
  oldStart: number;
  oldLines: number;
  newStart: number;
  newLines: number;
}

export type Change = {
  type: 'normal' | 'add' | 'del';
  content: string;
  oldLine?: number;
  newLine?: number;
  ln?: number;
  ln1?: number;
  ln2?: number;
}
