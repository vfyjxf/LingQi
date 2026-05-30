export type FetchGitHubPrDataParams = {
  owner: string;
  repo: string;
  pullNumber: number;
};

export type GitHubPullRequest = {
  url: string;
  number: number;
  title: string;
  body: string | null;
  author: string;
  baseRef: string;
  headRef: string;
  state: string;
};

export type GitHubPullRequestFile = {
  filename: string;
  status: string;
  additions: number;
  deletions: number;
  changes: number;
  patch?: string;
};

export type GitHubPullRequestCommit = {
  sha: string;
  message: string;
};

export type GitHubPrData = {
  pullRequest: GitHubPullRequest;
  files: GitHubPullRequestFile[];
  commits: GitHubPullRequestCommit[];
};

export type GitHubClientOptions = {
  token?: string;
  fetchImpl?: typeof fetch;
};
