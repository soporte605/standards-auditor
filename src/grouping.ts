/** Rules with more findings than this are shown grouped by folder. */
export const groupThreshold = 15;

export interface FolderGroup {
  dir: string;
  files: string[];
}

/** Groups file paths by their folder (up to `depth` segments), largest group first. */
export function groupByFolder(paths: string[], depth = 4): FolderGroup[] {
  const groups = new Map<string, string[]>();
  for (const file of paths) {
    const parts = file.split('/');
    const dir = parts.slice(0, -1).slice(0, depth).join('/') || '.';
    groups.set(dir, [...(groups.get(dir) ?? []), file]);
  }
  return [...groups]
    .map(([dir, files]) => ({ dir, files: files.sort() }))
    .sort(
      (a, b) => b.files.length - a.files.length || a.dir.localeCompare(b.dir),
    );
}
