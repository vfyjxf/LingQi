import { describe, expect, test } from "vitest";
import { parseDiffLineMap } from "@/lib/analysis/diff-lines";

describe("parseDiffLineMap", () => {
  test("解析 diff hunk 中的新旧行号", () => {
    const result = parseDiffLineMap(
      [
        "@@ -10,4 +10,5 @@",
        " context",
        "-removed",
        "+added",
        " unchanged",
        "+another"
      ].join("\n")
    );

    expect(result.newLines).toEqual([10, 11, 12, 13]);
    expect(result.oldLines).toEqual([10, 11, 12]);
    expect(result.numberedPatch).toContain("  LEFT 10 RIGHT 10 | context");
    expect(result.numberedPatch).toContain("- LEFT 11 | removed");
    expect(result.numberedPatch).toContain("+ RIGHT 11 | added");
  });

  test("忽略 diff 的文件尾换行提示", () => {
    const result = parseDiffLineMap(
      [
        "@@ -20,2 +20,2 @@",
        "-removed",
        "+added",
        "\\ No newline at end of file"
      ].join("\n")
    );

    expect(result.newLines).toEqual([20]);
    expect(result.oldLines).toEqual([20]);
    expect(result.numberedPatch).toContain("\\ No newline at end of file");
  });

  test("没有 patch 时返回空行号集合", () => {
    expect(parseDiffLineMap()).toEqual({ newLines: [], oldLines: [] });
  });
});
