# Bitbucket MCP Server — Copilot Instructions

These rules are automatically applied to every Copilot Chat prompt when this project is open in the VS Code workspace.

## Server Configuration

- This is a **Bitbucket Server (on-premise)** MCP server using **Basic Auth** (username + password).
- It connects via the **Bitbucket REST API** (`/rest/api/latest/`), not the Bitbucket Cloud API.
- Authentication is done via the `BITBUCKET_URL`, `BITBUCKET_USERNAME`, and `BITBUCKET_PASSWORD` environment variables in `mcp.json`.

## VS Code MCP Configuration

Each user configures their own credentials in `%APPDATA%\Code\User\mcp.json`:

```json
{
  "servers": {
    "bitbucket": {
      "type": "stdio",
      "command": "node",
      "args": ["C:\\path\\to\\bitbucket-basicauth-mcp\\server.mjs"],
      "env": {
        "BITBUCKET_URL": "https://bitbucket.yourcompany.com",
        "BITBUCKET_USERNAME": "<YOUR_BITBUCKET_USERNAME>",
        "BITBUCKET_PASSWORD": "<YOUR_BITBUCKET_PASSWORD>"
      }
    }
  }
}
```

> Replace the path, URL, username, and password with your own values.

## Available Tools

| Tool | Description | Required Parameters |
|------|-------------|---------------------|
| `bitbucket_getInboxPullRequests` | Get open PRs where you are a reviewer | _(none — uses defaults)_ |
| `bitbucket_getPullRequests` | Get PRs for a specific repo | `projectKey`, `repositorySlug` |
| `bitbucket_getPRComments` | Get all comments/activities on a PR | `projectKey`, `repositorySlug`, `pullRequestId` |
| `bitbucket_getPRDiff` | Get the diff of a PR (changed files/lines) | `projectKey`, `repositorySlug`, `pullRequestId` |
| `bitbucket_addPRComment` | Add a general comment on a PR | `projectKey`, `repositorySlug`, `pullRequestId`, `text` |
| `bitbucket_addPRInlineComment` | Add an inline review comment on a specific file/line | `projectKey`, `repositorySlug`, `pullRequestId`, `text`, `filePath`, `line` |
| `bitbucket_createPullRequest` | Create a new pull request (supports cross-fork PRs) | `toProjectKey`, `toRepositorySlug`, `toBranch`, `fromProjectKey`, `fromRepositorySlug`, `fromBranch`, `title`, `description`, `reviewers` |
| `bitbucket_updatePullRequest` | Update an existing PR's title, description, and/or reviewers | `projectKey`, `repositorySlug`, `pullRequestId`, `version`, (optional: `title`, `description`, `reviewers`, `toRef`) |
| `bitbucket_getProjects` | List all projects accessible to the user | _(none — optional `name` filter)_ |
| `bitbucket_getRepositories` | List repositories in a project | `projectKey` |
| `bitbucket_getBranches` | List branches for a repo (filterable by prefix) | `projectKey`, `repositorySlug` (optional: `filterText`, `orderBy`) |
| `bitbucket_getDefaultBranch` | Get the default branch of a repo | `projectKey`, `repositorySlug` |
| `bitbucket_getTags` | List tags for a repo | `projectKey`, `repositorySlug` (optional: `filterText`) |
| `bitbucket_getCommits` | Get commits for a repo/branch | `projectKey`, `repositorySlug` (optional: `until`, `since`, `path`) |
| `bitbucket_getFileContent` | Get raw file content from a branch/tag/commit | `projectKey`, `repositorySlug`, `filePath` (optional: `at`) |
| `bitbucket_browseRepository` | Browse directory/file listing of a repo | `projectKey`, `repositorySlug` (optional: `path`, `at`) |
| `bitbucket_approvePullRequest` | Approve a PR as the authenticated user | `projectKey`, `repositorySlug`, `pullRequestId` |
| `bitbucket_unapprovePullRequest` | Remove approval from a PR | `projectKey`, `repositorySlug`, `pullRequestId` |
| `bitbucket_mergePullRequest` | Merge a PR (requires version for locking) | `projectKey`, `repositorySlug`, `pullRequestId`, `version` |
| `bitbucket_declinePullRequest` | Decline/close a PR without merging | `projectKey`, `repositorySlug`, `pullRequestId`, `version` |
| `bitbucket_getPRMergeStatus` | Check if a PR can be merged (preconditions) | `projectKey`, `repositorySlug`, `pullRequestId` |

## Project Keys and Repository Slugs

When using Bitbucket tools, you need the **project key** and **repository slug** (not the full URL or display name).

- Project key: the short code in the URL, e.g., `MYPROJ` from `https://bitbucket.yourcompany.com/projects/MYPROJ`
- Repository slug: the repo name in the URL, e.g., `my-service` from `.../repos/my-service`

## Rules for Copilot

### General Rules

- When asked about "my PRs" or "PRs to review", use `bitbucket_getInboxPullRequests` with role `REVIEWER`.
- When asked about PRs for a specific repo, use `bitbucket_getPullRequests` with the correct `projectKey` and `repositorySlug`.
- When reviewing a PR, fetch both the diff (`bitbucket_getPRDiff`) and comments (`bitbucket_getPRComments`) to get full context.
- When adding inline comments, always specify `fileType: "TO"` (new file) unless explicitly asked to comment on the old/removed file.
- The `lineType` for inline comments should be `ADDED` for new lines, `REMOVED` for deleted lines, or `CONTEXT` for unchanged lines.
- PR comment text supports **Markdown formatting**.

## Pull Request Creation Rules

When the user asks to "create PR" or "create pull request" for committed and pushed changes, follow these rules:

### Source and Destination Branches

1. **Source branch**: Always use the **current branch** of the repository.
2. **Destination branch**: Always use the branch from which the source branch was created (the upstream/parent branch). Determine this by running `git log --oneline --decorate` or `git reflog` to identify the parent branch.

### PR Description Template

The PR description should follow a consistent template. Fill in all sections by analyzing the committed changes (use `git log`, `git diff`, and file contents to gather the information).

**CRITICAL FORMATTING RULE**: The description string passed to the Bitbucket API MUST use **real newlines** (multi-line string), NOT escaped `\n` characters. Escaped `\n` renders as literal `\n` text in Bitbucket, breaking the formatting.

Suggested template:

```
**What is the change about?**
<Summarize what was changed — files modified, features added/updated, bugs fixed>

**Why is the change needed?**
<Explain the business reason or technical motivation for the change>

**How is the change implemented?**
<Describe the technical approach — what classes/methods were modified, what logic was added/changed>

**List of related PRs/tasks**
<List any related Jira tickets, PRs, or task references. Use "None" if not applicable>

**How was the change tested?**
<Describe how the changes were tested — unit tests, manual testing, smoke tests, etc.>

**Remarks**
<Any additional notes, caveats, or context for reviewers>
```

### Step-by-Step PR Creation Process

1. **Identify the repository**: Determine which repository the user is working in.
2. **Get current branch**: Run `git branch --show-current` to get the source branch.
3. **Get destination branch**: Run `git log --oneline --graph --all` or check `git config branch.<source>.merge` to find the parent/destination branch.
4. **Analyze changes**: Run `git log <destination>..<source> --oneline` and `git diff <destination>...<source> --stat` to understand the committed changes.
5. **Build description**: Fill in the description template based on the change analysis.
6. **Select reviewers**: Add reviewers per your team's conventions.
7. **Create the PR**: Use the Bitbucket MCP tool with title, source, destination, description, and reviewers.

### PR Title Rules

1. **If the user provides a commit message explicitly**: Use the user-provided message as the PR title exactly as given.
2. **If no commit message is provided**: Derive the title from the **current branch name**:
   - Strip any prefix such as `feature/`, `bugfix/`, `hotfix/`, `release/`, `fix/`, `chore/`, or similar branch-type prefixes.
   - If the branch name contains a Jira-style ticket key (e.g., `PROJ-1234`), start the title from that key (e.g., branch `feature/PROJ-1234-fix-order-api` → title `PROJ-1234-fix-order-api`).
   - Otherwise, use the full branch name after stripping the prefix.

## Important Notes

- This server uses **Basic Auth** — each user uses their own Bitbucket credentials.
- Credentials are stored in `mcp.json` as environment variables, not in the source code.
- **Never commit credentials** to this repository.
- This is for **Bitbucket Server** (on-premise), not Bitbucket Cloud. The API paths differ.
