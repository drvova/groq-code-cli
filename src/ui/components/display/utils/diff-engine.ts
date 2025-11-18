/**
 * Unified diff generation engine using LCS algorithm
 * Constitutional compliance: ARTICLE I - Minimalism, AMENDMENT IV - Avoid Over-Abstraction
 */

export interface DiffChunk {
  header: string;
  lines: string[];
}

interface DiffOperation {
  type: 'equal' | 'delete' | 'insert';
  oldLine?: string;
  newLine?: string;
  oldIndex?: number;
  newIndex?: number;
}

interface DiffHunk {
  oldStart: number;
  oldCount: number;
  newStart: number;
  newCount: number;
  operations: DiffOperation[];
}

/**
 * Compute Longest Common Subsequence matrix
 */
function computeLCS(a: string[], b: string[]): number[][] {
  const m = a.length;
  const n = b.length;
  const lcs = Array(m + 1).fill(null).map(() => Array(n + 1).fill(0));

  for (let i = 1; i <= m; i++) {
    for (let j = 1; j <= n; j++) {
      if (a[i - 1] === b[j - 1]) {
        lcs[i][j] = lcs[i - 1][j - 1] + 1;
      } else {
        lcs[i][j] = Math.max(lcs[i - 1][j], lcs[i][j - 1]);
      }
    }
  }

  return lcs;
}

/**
 * Generate diff operations from LCS matrix
 */
function generateOperations(originalLines: string[], newLines: string[]): DiffOperation[] {
  const lcs = computeLCS(originalLines, newLines);
  const operations: DiffOperation[] = [];

  let i = originalLines.length;
  let j = newLines.length;

  while (i > 0 || j > 0) {
    if (i > 0 && j > 0 && originalLines[i - 1] === newLines[j - 1]) {
      operations.unshift({
        type: 'equal',
        oldLine: originalLines[i - 1],
        newLine: newLines[j - 1],
        oldIndex: i - 1,
        newIndex: j - 1,
      });
      i--;
      j--;
    } else if (j > 0 && (i === 0 || lcs[i][j - 1] >= lcs[i - 1][j])) {
      operations.unshift({
        type: 'insert',
        newLine: newLines[j - 1],
        newIndex: j - 1,
      });
      j--;
    } else if (i > 0 && (j === 0 || lcs[i][j - 1] < lcs[i - 1][j])) {
      operations.unshift({
        type: 'delete',
        oldLine: originalLines[i - 1],
        oldIndex: i - 1,
      });
      i--;
    }
  }

  return operations;
}

/**
 * Group operations into hunks with context
 */
function groupIntoHunks(operations: DiffOperation[], contextLines: number): DiffHunk[] {
  const hunks: DiffHunk[] = [];
  let currentHunk: DiffHunk | null = null;

  for (let k = 0; k < operations.length; k++) {
    const op = operations[k];

    if (op.type !== 'equal') {
      if (!currentHunk) {
        const contextStart = Math.max(0, k - contextLines);
        const oldStart = operations[contextStart].oldIndex !== undefined ? operations[contextStart].oldIndex! + 1 : 1;
        const newStart = operations[contextStart].newIndex !== undefined ? operations[contextStart].newIndex! + 1 : 1;

        currentHunk = {
          oldStart,
          oldCount: 0,
          newStart,
          newCount: 0,
          operations: operations.slice(contextStart, k + 1),
        };
      } else {
        currentHunk.operations.push(op);
      }
    } else if (currentHunk) {
      currentHunk.operations.push(op);

      let contextAfter = 0;
      for (let l = k + 1; l < operations.length && l <= k + contextLines; l++) {
        if (operations[l].type === 'equal') {
          contextAfter++;
          currentHunk.operations.push(operations[l]);
        } else {
          break;
        }
      }

      let hasMoreChanges = false;
      for (let l = k + contextAfter + 1; l < Math.min(operations.length, k + contextLines * 2); l++) {
        if (operations[l].type !== 'equal') {
          hasMoreChanges = true;
          break;
        }
      }

      if (!hasMoreChanges) {
        currentHunk.oldCount = currentHunk.operations.filter(op => op.type === 'equal' || op.type === 'delete').length;
        currentHunk.newCount = currentHunk.operations.filter(op => op.type === 'equal' || op.type === 'insert').length;
        hunks.push(currentHunk);
        currentHunk = null;
        k += contextAfter;
      }
    }
  }

  if (currentHunk) {
    currentHunk.oldCount = currentHunk.operations.filter(op => op.type === 'equal' || op.type === 'delete').length;
    currentHunk.newCount = currentHunk.operations.filter(op => op.type === 'equal' || op.type === 'insert').length;
    hunks.push(currentHunk);
  }

  return hunks;
}

/**
 * Generate unified diff output
 */
export function generateUnifiedDiff(
  originalLines: string[],
  newLines: string[],
  fromFile: string,
  toFile: string,
  contextLines: number = 5
): string[] {
  const result: string[] = [];

  if (originalLines.join('\n') === newLines.join('\n')) {
    return result;
  }

  const operations = generateOperations(originalLines, newLines);
  const hunks = groupIntoHunks(operations, contextLines);

  result.push(`--- ${fromFile}`);
  result.push(`+++ ${toFile}`);

  for (const hunk of hunks) {
    result.push(`@@ -${hunk.oldStart},${hunk.oldCount} +${hunk.newStart},${hunk.newCount} @@`);

    for (const op of hunk.operations) {
      if (op.type === 'equal') {
        result.push(` ${op.oldLine}`);
      } else if (op.type === 'delete') {
        result.push(`-${op.oldLine}`);
      } else if (op.type === 'insert') {
        result.push(`+${op.newLine}`);
      }
    }
  }

  return result;
}

/**
 * Parse diff output into chunks for rendering
 */
export function parseDiffIntoChunks(diffLines: string[]): DiffChunk[] {
  const chunks: DiffChunk[] = [];
  let currentChunk: DiffChunk | null = null;

  for (const line of diffLines) {
    if (line.startsWith('@@')) {
      if (currentChunk) {
        chunks.push(currentChunk);
      }
      currentChunk = { header: line, lines: [line] };
    } else if (currentChunk) {
      currentChunk.lines.push(line);
    }
  }

  if (currentChunk) {
    chunks.push(currentChunk);
  }

  return chunks;
}
