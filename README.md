# bitbucket-basicauth-mcp

A Model Context Protocol (MCP) server that gives AI assistants like Claude Desktop or VS Code Copilot Chat full access to a self-hosted **Bitbucket Server / Data Center** via Basic Auth.

Built for on-premise Bitbucket installations that use username + password (or personal access token). **Not compatible** with Bitbucket Cloud — that uses a different API.

## Features

- **Pull request management** — list, view, create (incl. cross-fork), update, approve, decline, merge, request changes
- **Inline & general PR comments** — add, edit, delete, reply to threads
- **PR tasks** — list and create to-do items on PR comments
- **PR diffs** — fetch unified diffs with configurable context lines
- **Repository browsing** — list projects/repos, search repos, browse directories, read raw file contents, view file history
- **Branch & tag management** — list, create, delete branches and tags
- **Commit operations** — view commits, diffs, changed files, build statuses, branch comparison
- **User search** — find users in the Bitbucket directory
- **Forking** — fork repos to personal or team projects
- **Works with Claude Desktop, VS Code Copilot, Cursor, and any MCP-compatible client**

## Prerequisites

- Node.js 18 or higher
- npm
- A **Bitbucket Server / Data Center** (on-premise) instance with REST API access
- A Bitbucket account with Basic Auth credentials (username + password, or an HTTP access token)

## Installation

```bash
git clone <repo-url> bitbucket-basicauth-mcp
cd bitbucket-basicauth-mcp
npm install
```

No build step — the server runs directly from `server.mjs`.

## Configuration

Set three environment variables:

| Variable | Description |
|----------|-------------|
| `BITBUCKET_URL` | Base URL of your Bitbucket Server (e.g. `https://bitbucket.yourcompany.com`) |
| `BITBUCKET_USERNAME` | Your Bitbucket username |
| `BITBUCKET_PASSWORD` | Your Bitbucket password or HTTP access token |

### Claude Desktop

Open Claude Desktop → Settings → Developer → Edit MCP configuration, and add:

```json
{
  "mcpServers": {
    "bitbucket": {
      "command": "node",
      "args": ["/absolute/path/to/bitbucket-basicauth-mcp/server.mjs"],
      "env": {
        "BITBUCKET_URL": "https://bitbucket.yourcompany.com",
        "BITBUCKET_USERNAME": "your-username",
        "BITBUCKET_PASSWORD": "your-password-or-token"
      }
    }
  }
}
```

### VS Code (Copilot Chat / MCP extension)

Add to `%APPDATA%\Code\User\mcp.json` (Windows) or `~/.config/Code/User/mcp.json` (Linux/macOS):

```json
{
  "servers": {
    "bitbucket": {
      "type": "stdio",
      "command": "node",
      "args": ["/absolute/path/to/bitbucket-basicauth-mcp/server.mjs"],
      "env": {
        "BITBUCKET_URL": "https://bitbucket.yourcompany.com",
        "BITBUCKET_USERNAME": "your-username",
        "BITBUCKET_PASSWORD": "your-password-or-token"
      }
    }
  }
}
```

> Replace the path, URL, username, and password with your own values. **Never commit credentials.**

## Available Tools

40 tools total, grouped by category. All tools use a Bitbucket `projectKey` (the short URL code, e.g. `MYPROJ`) and `repositorySlug` (the repo URL slug, e.g. `my-service`) unless noted.

### Pull request lifecycle

| Tool | Description |
|------|-------------|
| `bitbucket_getInboxPullRequests` | List open PRs where you are a reviewer |
| `bitbucket_getPullRequests` | List PRs for a repo (filter by `OPEN` / `MERGED` / `DECLINED`) |
| `bitbucket_createPullRequest` | Create a PR (supports cross-fork from `~username/repo` to upstream) |
| `bitbucket_updatePullRequest` | Update title, description, reviewers, or target branch |
| `bitbucket_approvePullRequest` | Approve a PR |
| `bitbucket_unapprovePullRequest` | Remove your approval |
| `bitbucket_requestPRChanges` | Mark PR as "needs work" |
| `bitbucket_mergePullRequest` | Merge a PR (requires version for optimistic locking) |
| `bitbucket_declinePullRequest` | Close without merging |
| `bitbucket_getPRMergeStatus` | Check merge preconditions |
| `bitbucket_getPRDiff` | Get unified diff (configurable context lines) |

### PR comments

| Tool | Description |
|------|-------------|
| `bitbucket_getPRComments` | List all comments and activities on a PR |
| `bitbucket_addPRComment` | Add a general (PR-level) comment, Markdown supported |
| `bitbucket_addPRInlineComment` | Add a comment on a specific file + line |
| `bitbucket_replyToPRComment` | Reply to an existing comment thread |
| `bitbucket_editPRComment` | Edit a comment (requires version) |
| `bitbucket_deletePRComment` | Delete a comment (requires version) |

### PR tasks

| Tool | Description |
|------|-------------|
| `bitbucket_getPRTasks` | List tasks (to-dos) on a PR |
| `bitbucket_createPRTask` | Create a task on a PR comment |

### Repositories

| Tool | Description |
|------|-------------|
| `bitbucket_getProjects` | List projects you have access to |
| `bitbucket_getRepositories` | List repos in a project |
| `bitbucket_getRepository` | Get detail on a single repo |
| `bitbucket_searchRepositories` | Search repos across all projects by name |
| `bitbucket_browseRepository` | List directory contents at a path/ref |
| `bitbucket_getFileContent` | Get raw file content at a ref |
| `bitbucket_getFileHistory` | Get commit history for a single file |
| `bitbucket_forkRepository` | Fork to personal (`~username`) or team project |

### Branches & tags

| Tool | Description |
|------|-------------|
| `bitbucket_getBranches` | List branches (filterable by prefix) |
| `bitbucket_getDefaultBranch` | Get the repo's default branch |
| `bitbucket_createBranch` | Create a branch from a commit/branch |
| `bitbucket_deleteBranch` | Delete a branch |
| `bitbucket_getTags` | List tags |
| `bitbucket_createTag` | Create a tag (annotated if `message` provided) |
| `bitbucket_deleteTag` | Delete a tag |

### Commits

| Tool | Description |
|------|-------------|
| `bitbucket_getCommits` | List commits (filterable by branch, path) |
| `bitbucket_getCommitDetail` | Get full detail for a single commit |
| `bitbucket_getCommitChanges` | List changed files in a commit |
| `bitbucket_getCommitDiff` | Get the diff for a commit |
| `bitbucket_compareBranches` | Compare two refs (commits + changes) |
| `bitbucket_getBuildStatus` | Get CI/CD build statuses for a commit |

### Users

| Tool | Description |
|------|-------------|
| `bitbucket_searchUsers` | Search users by name or username |

## Usage Examples (with an AI assistant)

```
Show me all pull requests I need to review
```

```
Get the diff and comments for PR #280 in project MYPROJ repo my-service
```

```
Create a PR from my fork ~johndoe/my-service branch feature/PROJ-1234 to upstream my-org/my-service branch develop
```

```
Add a comment on line 42 of src/main/java/App.java in PR #280 saying "Consider using Optional here"
```

```
Show me the files in src/main/java for project MYPROJ repo my-service on the develop branch
```

```
Compare branch feature/PROJ-1234 with develop in project MYPROJ repo my-service
```

```
Search for repositories matching "my-service"
```

## Notes & Caveats

- **Bitbucket Server / Data Center only.** This uses `/rest/api/latest/` paths. Bitbucket Cloud uses `api.bitbucket.org/2.0/` and a different auth model — not compatible.
- **Optimistic locking.** Several mutating tools (`mergePullRequest`, `declinePullRequest`, `updatePullRequest`, `editPRComment`, `deletePRComment`) require the current `version` from a prior `get*` call. Pass that version through or you'll get a conflict error.
- **Inline comments need both `lineType` and `fileType`.** Defaults are `ADDED` + `TO` (a new line in the new file). For comments on removed lines, set `lineType: "REMOVED"` and `fileType: "FROM"`.
- **Personal-project keys start with `~`.** A user's personal fork lives under project key `~username` (e.g. `~jdoe/my-repo`).

## Security

- Store credentials as environment variables, never in source code.
- Use an **HTTP access token** (Bitbucket → Personal settings → HTTP access tokens) with the minimum scopes you need, instead of your account password.
- Use a dedicated service account with least-privilege access for bot/automation workflows.
- **Ensure your Bitbucket URL uses HTTPS** — Basic Auth sends credentials with every request.
- Never commit your `mcp.json` or any file containing live credentials.

## Troubleshooting

| Symptom | Fix |
|---------|-----|
| `Missing required environment variable` | Set `BITBUCKET_URL`, `BITBUCKET_USERNAME`, and `BITBUCKET_PASSWORD` in the MCP `env` block |
| `Bitbucket API error 401` | Username/password (or token) is wrong; or the token has expired |
| `Bitbucket API error 404` | Wrong project key or repository slug — double-check the URL on Bitbucket |
| `Bitbucket API error 409` (conflict) | Stale `version` on a mutating call — fetch the current PR/comment first |
| Cloud-style tools/errors | This server is for **Bitbucket Server / Data Center**, not Bitbucket Cloud |
| Tools not appearing in Claude / Copilot | Ensure the `args` path is absolute, then restart the client |

## Development

```bash
npm start   # runs node server.mjs
```

The entire server lives in [`server.mjs`](server.mjs) — no build step.
