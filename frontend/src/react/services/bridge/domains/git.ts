import { bridgeInvoke } from "../http";

export interface GitRepo {
  path: string;
  name: string;
}

export interface GitBranch {
  name: string;
  current: boolean;
}

export interface GitCommit {
  hash: string;
  message: string;
  author: string;
  date: string;
}

export interface GitFile {
  path: string;
  status: "staged" | "unstaged" | "untracked";
}

export const git = {
  async listRepos(): Promise<GitRepo[]> {
    return bridgeInvoke<GitRepo[]>("git_list_repos");
  },
  async openRepo(path: string) {
    return bridgeInvoke<{ success: boolean }>("git_open_repo", { path });
  },
  async status() {
    return bridgeInvoke<{ staged: GitFile[]; unstaged: GitFile[]; untracked: GitFile[] }>(
      "git_status"
    );
  },
  async log(limit: number = 50) {
    return bridgeInvoke<GitCommit[]>("git_log", { limit });
  },
  async branchList() {
    return bridgeInvoke<GitBranch[]>("git_branch_list");
  },
  async branchCreate(name: string) {
    return bridgeInvoke<{ success: boolean }>("git_branch_create", { name });
  },
  async branchCheckout(name: string) {
    return bridgeInvoke<{ success: boolean }>("git_branch_checkout", { name });
  },
  async stage(files: string[]) {
    return bridgeInvoke<{ success: boolean }>("git_stage", { files });
  },
  async unstage(files: string[]) {
    return bridgeInvoke<{ success: boolean }>("git_unstage", { files });
  },
  async commit(message: string) {
    return bridgeInvoke<{ success: boolean; hash?: string }>("git_commit", { message });
  },
  async diff(file?: string) {
    return bridgeInvoke<{ diff: string }>("git_diff", { file });
  },
  async push(remote?: string, branch?: string) {
    return bridgeInvoke<{ success: boolean }>("git_push", { remote, branch });
  },
  async pull(remote?: string, branch?: string) {
    return bridgeInvoke<{ success: boolean }>("git_pull", { remote, branch });
  },
};
