export type DiffLineMap = {
  newLines: number[];
  oldLines: number[];
  numberedPatch?: string;
};

export function parseDiffLineMap(patch?: string): DiffLineMap {
  if (!patch?.trim()) {
    return { newLines: [], oldLines: [] };
  }

  const newLines = new Set<number>();
  const oldLines = new Set<number>();
  const numberedPatchLines: string[] = [];
  let oldLine: number | undefined;
  let newLine: number | undefined;

  for (const content of patch.split("\n")) {
    const hunkMatch = content.match(/^@@ -(\d+)(?:,\d+)? \+(\d+)(?:,\d+)? @@/);
    if (hunkMatch) {
      oldLine = Number(hunkMatch[1]);
      newLine = Number(hunkMatch[2]);
      numberedPatchLines.push(content);
      continue;
    }

    if (oldLine === undefined || newLine === undefined) {
      numberedPatchLines.push(content);
      continue;
    }

    if (content.startsWith("\\")) {
      numberedPatchLines.push(content);
      continue;
    }

    if (content.startsWith("+") && !content.startsWith("+++")) {
      newLines.add(newLine);
      numberedPatchLines.push(formatAddedLine(newLine, content));
      newLine += 1;
      continue;
    }

    if (content.startsWith("-") && !content.startsWith("---")) {
      oldLines.add(oldLine);
      numberedPatchLines.push(formatRemovedLine(oldLine, content));
      oldLine += 1;
      continue;
    }

    oldLines.add(oldLine);
    newLines.add(newLine);
    numberedPatchLines.push(formatContextLine(oldLine, newLine, content));
    oldLine += 1;
    newLine += 1;
  }

  return {
    newLines: Array.from(newLines).sort((left, right) => left - right),
    oldLines: Array.from(oldLines).sort((left, right) => left - right),
    numberedPatch: numberedPatchLines.join("\n")
  };
}

function formatAddedLine(line: number, content: string): string {
  return `+ RIGHT ${line} | ${content.slice(1)}`;
}

function formatRemovedLine(line: number, content: string): string {
  return `- LEFT ${line} | ${content.slice(1)}`;
}

function formatContextLine(
  oldLine: number,
  newLine: number,
  content: string
): string {
  const body = content.startsWith(" ") ? content.slice(1) : content;
  return `  LEFT ${oldLine} RIGHT ${newLine} | ${body}`;
}
