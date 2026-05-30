import type {
  FetchGitHubPrDataParams,
  GitHubClientOptions,
  GitHubPrData
} from "./github-types";

type GitHubPullResponse = {
  html_url: string;
  number: number;
  title: string;
  body: string | null;
  user: { login: string };
  base: { ref: string };
  head: { ref: string };
  state: string;
};

type GitHubFileResponse = {
  filename: string;
  status: string;
  additions: number;
  deletions: number;
  changes: number;
  patch?: string;
};

type GitHubCommitResponse = {
  sha: string;
  commit: {
    message: string;
  };
};

export async function fetchGitHubPrData(
  params: FetchGitHubPrDataParams,
  options: GitHubClientOptions = {}
): Promise<GitHubPrData> {
  const fetchImpl = options.fetchImpl ?? fetch;
  const baseUrl = `https://api.github.com/repos/${params.owner}/${params.repo}/pulls/${params.pullNumber}`;
  const requestInit = createRequestInit(options.token);

  const pullRequest = await fetchJson<GitHubPullResponse>(
    fetchImpl,
    baseUrl,
    requestInit
  );
  const [files, commits] = await Promise.all([
    fetchJson<GitHubFileResponse[]>(
      fetchImpl,
      `${baseUrl}/files?per_page=100`,
      requestInit
    ),
    fetchJson<GitHubCommitResponse[]>(
      fetchImpl,
      `${baseUrl}/commits?per_page=100`,
      requestInit
    )
  ]);

  return {
    pullRequest: {
      url: pullRequest.html_url,
      number: pullRequest.number,
      title: pullRequest.title,
      body: pullRequest.body,
      author: pullRequest.user.login,
      baseRef: pullRequest.base.ref,
      headRef: pullRequest.head.ref,
      state: pullRequest.state
    },
    files: files.map((file) => ({
      filename: file.filename,
      status: file.status,
      additions: file.additions,
      deletions: file.deletions,
      changes: file.changes,
      patch: file.patch
    })),
    commits: commits.map((commit) => ({
      sha: commit.sha,
      message: commit.commit.message
    }))
  };
}

function createRequestInit(token?: string): RequestInit {
  const headers: Record<string, string> = {
    accept: "application/vnd.github+json",
    "x-github-api-version": "2022-11-28"
  };

  if (token) {
    headers.authorization = `Bearer ${token}`;
  }

  return { headers };
}

async function fetchJson<T>(
  fetchImpl: typeof fetch,
  url: string,
  init: RequestInit
): Promise<T> {
  const response = await fetchImpl(url, init);

  if (!response.ok) {
    throw new Error(`GitHub API 请求失败：${response.status}`);
  }

  return (await response.json()) as T;
}
