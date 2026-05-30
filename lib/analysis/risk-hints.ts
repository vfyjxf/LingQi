export type RiskHint =
  | "security"
  | "api"
  | "database"
  | "config"
  | "testing"
  | "large-change";

export type RiskHintInput = {
  filename: string;
  additions: number;
  deletions: number;
  patch?: string;
};

export function detectRiskHints(file: RiskHintInput): RiskHint[] {
  const normalizedPath = file.filename.toLowerCase();
  const patch = file.patch?.toLowerCase() ?? "";
  const hints = new Set<RiskHint>();

  if (
    includesPathPart(normalizedPath, "auth") ||
    includesPathPart(normalizedPath, "security") ||
    /\b(permission|role|token|session|password|secret)\b/.test(patch)
  ) {
    hints.add("security");
  }

  if (
    includesPathPart(normalizedPath, "api") ||
    normalizedPath.includes("/route.") ||
    normalizedPath.includes("/controller")
  ) {
    hints.add("api");
  }

  if (
    includesPathPart(normalizedPath, "migration") ||
    includesPathPart(normalizedPath, "migrations") ||
    normalizedPath.endsWith(".sql")
  ) {
    hints.add("database");
  }

  if (
    normalizedPath.includes("config") ||
    normalizedPath.endsWith(".env") ||
    normalizedPath.endsWith(".yml") ||
    normalizedPath.endsWith(".yaml")
  ) {
    hints.add("config");
  }

  if (
    includesPathPart(normalizedPath, "test") ||
    includesPathPart(normalizedPath, "tests") ||
    normalizedPath.includes(".test.") ||
    normalizedPath.includes(".spec.")
  ) {
    hints.add("testing");
  }

  if (file.additions + file.deletions >= 100) {
    hints.add("large-change");
  }

  return Array.from(hints);
}

function includesPathPart(path: string, part: string): boolean {
  return path.split(/[\\/._-]/).includes(part);
}
