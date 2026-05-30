export type ParsedPrUrl = {
  owner: string;
  repo: string;
  pullNumber: number;
  url: string;
};

const INVALID_PR_URL_MESSAGE = "请输入有效的 GitHub Pull Request 链接";

export function parsePrUrl(input: string): ParsedPrUrl {
  let url: URL;

  try {
    url = new URL(input.trim());
  } catch {
    throw new Error(INVALID_PR_URL_MESSAGE);
  }

  if (url.protocol !== "https:" || url.hostname !== "github.com") {
    throw new Error(INVALID_PR_URL_MESSAGE);
  }

  const segments = url.pathname.split("/").filter(Boolean);
  const [owner, repo, pullKeyword, pullNumberText] = segments;

  if (
    segments.length !== 4 ||
    !owner ||
    !repo ||
    pullKeyword !== "pull" ||
    !pullNumberText
  ) {
    throw new Error(INVALID_PR_URL_MESSAGE);
  }

  if (!/^[1-9]\d*$/.test(pullNumberText)) {
    throw new Error(INVALID_PR_URL_MESSAGE);
  }

  const pullNumber = Number(pullNumberText);

  return {
    owner,
    repo,
    pullNumber,
    url: `https://github.com/${owner}/${repo}/pull/${pullNumber}`
  };
}
