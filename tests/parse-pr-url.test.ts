import { describe, expect, test } from "vitest";
import { parsePrUrl } from "@/lib/github/parse-pr-url";

const invalidPrUrlMessage = "请输入有效的 GitHub Pull Request 链接";

describe("parsePrUrl", () => {
  test("解析标准 GitHub PR 链接", () => {
    const result = parsePrUrl("https://github.com/octocat/hello-world/pull/42");

    expect(result).toEqual({
      owner: "octocat",
      repo: "hello-world",
      pullNumber: 42,
      url: "https://github.com/octocat/hello-world/pull/42"
    });
  });

  test("解析带末尾斜杠的 GitHub PR 链接", () => {
    const result = parsePrUrl("https://github.com/vercel/next.js/pull/123/");

    expect(result).toEqual({
      owner: "vercel",
      repo: "next.js",
      pullNumber: 123,
      url: "https://github.com/vercel/next.js/pull/123"
    });
  });

  test("拒绝非 GitHub 链接", () => {
    expect(() =>
      parsePrUrl("https://gitlab.com/octocat/hello-world/merge_requests/42")
    ).toThrow(invalidPrUrlMessage);
  });

  test("拒绝不是 PR 的 GitHub 链接", () => {
    expect(() =>
      parsePrUrl("https://github.com/octocat/hello-world/issues/42")
    ).toThrow(invalidPrUrlMessage);
  });

  test("拒绝 pull number 不是正整数的链接", () => {
    expect(() =>
      parsePrUrl("https://github.com/octocat/hello-world/pull/0")
    ).toThrow(invalidPrUrlMessage);
  });

  test("拒绝非十进制数字格式的 pull number", () => {
    expect(() =>
      parsePrUrl("https://github.com/octocat/hello-world/pull/1e2")
    ).toThrow(invalidPrUrlMessage);
  });
});
