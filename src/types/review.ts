export type Comment = {
  comment_id: string;
  file_path: string;
  hunk_id: string;
  start_line_new?: number;
  start_line_old?: number;
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
  created_at: string;
  comments: Comment[];
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
