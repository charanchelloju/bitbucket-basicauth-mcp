import { Server } from "@modelcontextprotocol/sdk/server/index.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { CallToolRequestSchema, ListToolsRequestSchema } from "@modelcontextprotocol/sdk/types.js";

const BITBUCKET_URL = process.env.BITBUCKET_URL;
const BITBUCKET_USERNAME = process.env.BITBUCKET_USERNAME;
const BITBUCKET_PASSWORD = process.env.BITBUCKET_PASSWORD;

function requireEnv(name, value) {
  if (!value) {
    throw new Error(`Missing required environment variable: ${name}`);
  }
}

function authHeader(username, password) {
  return `Basic ${Buffer.from(`${username}:${password}`, "utf8").toString("base64")}`;
}

async function bbRequest(path, query = {}) {
  const url = new URL(`${BITBUCKET_URL.replace(/\/$/, "")}${path}`);
  for (const [key, value] of Object.entries(query)) {
    if (value !== undefined && value !== null && value !== "") {
      url.searchParams.set(key, String(value));
    }
  }

  const response = await fetch(url, {
    method: "GET",
    headers: {
      Authorization: authHeader(BITBUCKET_USERNAME, BITBUCKET_PASSWORD),
      Accept: "application/json"
    }
  });

  if (!response.ok) {
    const body = await response.text();
    throw new Error(`Bitbucket API error ${response.status}: ${body}`);
  }

  return response.json();
}

async function bbPostRequest(path, body) {
  const url = new URL(`${BITBUCKET_URL.replace(/\/$/, "")}${path}`);

  const response = await fetch(url, {
    method: "POST",
    headers: {
      Authorization: authHeader(BITBUCKET_USERNAME, BITBUCKET_PASSWORD),
      Accept: "application/json",
      "Content-Type": "application/json"
    },
    body: JSON.stringify(body)
  });

  if (!response.ok) {
    const text = await response.text();
    throw new Error(`Bitbucket API error ${response.status}: ${text}`);
  }

  return response.json();
}

async function bbPutRequest(path, body) {
  const url = new URL(`${BITBUCKET_URL.replace(/\/$/, "")}${path}`);

  const response = await fetch(url, {
    method: "PUT",
    headers: {
      Authorization: authHeader(BITBUCKET_USERNAME, BITBUCKET_PASSWORD),
      Accept: "application/json",
      "Content-Type": "application/json"
    },
    body: JSON.stringify(body)
  });

  if (!response.ok) {
    const text = await response.text();
    throw new Error(`Bitbucket API error ${response.status}: ${text}`);
  }

  return response.json();
}

async function bbRawRequest(path, query = {}) {
  const url = new URL(`${BITBUCKET_URL.replace(/\/$/, "")}${path}`);
  for (const [key, value] of Object.entries(query)) {
    if (value !== undefined && value !== null && value !== "") {
      url.searchParams.set(key, String(value));
    }
  }

  const response = await fetch(url, {
    method: "GET",
    headers: {
      Authorization: authHeader(BITBUCKET_USERNAME, BITBUCKET_PASSWORD)
    }
  });

  if (!response.ok) {
    const body = await response.text();
    throw new Error(`Bitbucket API error ${response.status}: ${body}`);
  }

  return response.text();
}

async function bbDeleteRequest(path) {
  const url = new URL(`${BITBUCKET_URL.replace(/\/$/, "")}${path}`);

  const response = await fetch(url, {
    method: "DELETE",
    headers: {
      Authorization: authHeader(BITBUCKET_USERNAME, BITBUCKET_PASSWORD),
      Accept: "application/json"
    }
  });

  if (!response.ok) {
    const text = await response.text();
    throw new Error(`Bitbucket API error ${response.status}: ${text}`);
  }

  // DELETE may return empty body
  const text = await response.text();
  return text ? JSON.parse(text) : { success: true };
}

const server = new Server(
  {
    name: "bitbucket-basicauth-mcp",
    version: "0.1.0"
  },
  {
    capabilities: {
      tools: {}
    }
  }
);

server.setRequestHandler(ListToolsRequestSchema, async () => ({
  tools: [
    {
      name: "bitbucket_getInboxPullRequests",
      description: "Get open pull requests where the authenticated user is a reviewer.",
      inputSchema: {
        type: "object",
        properties: {
          start: { type: "number", default: 0 },
          limit: { type: "number", default: 50 },
          role: { type: "string", default: "REVIEWER" },
          state: { type: "string", default: "OPEN" }
        }
      }
    },
    {
      name: "bitbucket_getPullRequests",
      description: "Get pull requests for a specific repository.",
      inputSchema: {
        type: "object",
        properties: {
          projectKey: { type: "string" },
          repositorySlug: { type: "string" },
          state: { type: "string", default: "OPEN" },
          start: { type: "number", default: 0 },
          limit: { type: "number", default: 50 }
        },
        required: ["projectKey", "repositorySlug"]
      }
    },
    {
      name: "bitbucket_getPRComments",
      description: "Get all comments and activities on a pull request.",
      inputSchema: {
        type: "object",
        properties: {
          projectKey: { type: "string", description: "Bitbucket project key" },
          repositorySlug: { type: "string", description: "Repository slug" },
          pullRequestId: { type: "number", description: "Pull request ID" },
          start: { type: "number", default: 0 },
          limit: { type: "number", default: 100 }
        },
        required: ["projectKey", "repositorySlug", "pullRequestId"]
      }
    },
    {
      name: "bitbucket_getPRDiff",
      description: "Get the diff of a pull request to see changed files and lines.",
      inputSchema: {
        type: "object",
        properties: {
          projectKey: { type: "string", description: "Bitbucket project key" },
          repositorySlug: { type: "string", description: "Repository slug" },
          pullRequestId: { type: "number", description: "Pull request ID" },
          contextLines: { type: "number", default: 10, description: "Number of context lines around changes" }
        },
        required: ["projectKey", "repositorySlug", "pullRequestId"]
      }
    },
    {
      name: "bitbucket_addPRComment",
      description: "Add a general comment on a pull request.",
      inputSchema: {
        type: "object",
        properties: {
          projectKey: { type: "string", description: "Bitbucket project key" },
          repositorySlug: { type: "string", description: "Repository slug" },
          pullRequestId: { type: "number", description: "Pull request ID" },
          text: { type: "string", description: "Comment text (Markdown supported)" }
        },
        required: ["projectKey", "repositorySlug", "pullRequestId", "text"]
      }
    },
    {
      name: "bitbucket_addPRInlineComment",
      description: "Add an inline review comment on a specific file and line in a pull request.",
      inputSchema: {
        type: "object",
        properties: {
          projectKey: { type: "string", description: "Bitbucket project key" },
          repositorySlug: { type: "string", description: "Repository slug" },
          pullRequestId: { type: "number", description: "Pull request ID" },
          text: { type: "string", description: "Comment text (Markdown supported)" },
          filePath: { type: "string", description: "Path of the file to comment on (e.g. src/main/java/Foo.java)" },
          line: { type: "number", description: "Line number to comment on" },
          lineType: { type: "string", enum: ["ADDED", "REMOVED", "CONTEXT"], default: "ADDED", description: "Type of line: ADDED, REMOVED, or CONTEXT" },
          fileType: { type: "string", enum: ["FROM", "TO"], default: "TO", description: "FROM = old file, TO = new file" }
        },
        required: ["projectKey", "repositorySlug", "pullRequestId", "text", "filePath", "line"]
      }
    },
    {
      name: "bitbucket_createPullRequest",
      description: "Create a new pull request in a Bitbucket repository. Supports cross-fork PRs (from a personal fork to an upstream repo).",
      inputSchema: {
        type: "object",
        properties: {
          toProjectKey: { type: "string", description: "Destination (upstream) project key, e.g. 'MYORG'" },
          toRepositorySlug: { type: "string", description: "Destination repository slug, e.g. 'my-service'" },
          toBranch: { type: "string", description: "Destination branch name, e.g. 'develop'" },
          fromProjectKey: { type: "string", description: "Source project key (use '~username' for personal forks), e.g. '~yourusername'" },
          fromRepositorySlug: { type: "string", description: "Source repository slug, e.g. 'my-service'" },
          fromBranch: { type: "string", description: "Source branch name, e.g. 'feature/PROJ-1234-my-feature'" },
          title: { type: "string", description: "Pull request title" },
          description: { type: "string", description: "Pull request description (Markdown supported)" },
          reviewers: {
            type: "array",
            items: { type: "string" },
            description: "Array of reviewer usernames (slugs), e.g. ['jdoe', 'asmith']"
          }
        },
        required: ["toProjectKey", "toRepositorySlug", "toBranch", "fromProjectKey", "fromRepositorySlug", "fromBranch", "title", "description", "reviewers"]
      }
    },
    {
      name: "bitbucket_updatePullRequest",
      description: "Update an existing pull request's title, description, and/or reviewers.",
      inputSchema: {
        type: "object",
        properties: {
          projectKey: { type: "string", description: "Bitbucket project key (destination repo)" },
          repositorySlug: { type: "string", description: "Repository slug (destination repo)" },
          pullRequestId: { type: "number", description: "Pull request ID to update" },
          version: { type: "number", description: "Current version of the PR (required for optimistic locking)" },
          title: { type: "string", description: "Updated PR title" },
          description: { type: "string", description: "Updated PR description (Markdown supported)" },
          reviewers: {
            type: "array",
            items: { type: "string" },
            description: "Array of reviewer usernames (slugs), e.g. ['jdoe', 'asmith']"
          },
          toRef: {
            type: "object",
            properties: {
              id: { type: "string", description: "Destination branch ref, e.g. 'refs/heads/master'" }
            },
            description: "Destination branch reference (only if changing target branch)"
          }
        },
        required: ["projectKey", "repositorySlug", "pullRequestId", "version"]
      }
    },
    {
      name: "bitbucket_getProjects",
      description: "List all projects the authenticated user has access to.",
      inputSchema: {
        type: "object",
        properties: {
          start: { type: "number", default: 0 },
          limit: { type: "number", default: 25 },
          name: { type: "string", description: "Filter projects by name (substring match)" }
        }
      }
    },
    {
      name: "bitbucket_getRepositories",
      description: "List repositories in a specific project.",
      inputSchema: {
        type: "object",
        properties: {
          projectKey: { type: "string", description: "Bitbucket project key, e.g. 'LSP' or 'TMS'" },
          start: { type: "number", default: 0 },
          limit: { type: "number", default: 25 }
        },
        required: ["projectKey"]
      }
    },
    {
      name: "bitbucket_getBranches",
      description: "List branches for a repository. Can filter by branch name prefix.",
      inputSchema: {
        type: "object",
        properties: {
          projectKey: { type: "string", description: "Bitbucket project key" },
          repositorySlug: { type: "string", description: "Repository slug" },
          filterText: { type: "string", description: "Filter branches by name prefix, e.g. 'release/' or 'feature/'" },
          orderBy: { type: "string", enum: ["ALPHABETICAL", "MODIFICATION"], default: "MODIFICATION", description: "Sort order" },
          start: { type: "number", default: 0 },
          limit: { type: "number", default: 25 }
        },
        required: ["projectKey", "repositorySlug"]
      }
    },
    {
      name: "bitbucket_getDefaultBranch",
      description: "Get the default branch of a repository.",
      inputSchema: {
        type: "object",
        properties: {
          projectKey: { type: "string", description: "Bitbucket project key" },
          repositorySlug: { type: "string", description: "Repository slug" }
        },
        required: ["projectKey", "repositorySlug"]
      }
    },
    {
      name: "bitbucket_getTags",
      description: "List tags for a repository.",
      inputSchema: {
        type: "object",
        properties: {
          projectKey: { type: "string", description: "Bitbucket project key" },
          repositorySlug: { type: "string", description: "Repository slug" },
          filterText: { type: "string", description: "Filter tags by name prefix" },
          orderBy: { type: "string", enum: ["ALPHABETICAL", "MODIFICATION"], default: "MODIFICATION" },
          start: { type: "number", default: 0 },
          limit: { type: "number", default: 25 }
        },
        required: ["projectKey", "repositorySlug"]
      }
    },
    {
      name: "bitbucket_getCommits",
      description: "Get commits for a repository, optionally filtered by branch or path.",
      inputSchema: {
        type: "object",
        properties: {
          projectKey: { type: "string", description: "Bitbucket project key" },
          repositorySlug: { type: "string", description: "Repository slug" },
          until: { type: "string", description: "Branch name or commit hash to get commits from, e.g. 'develop' or 'refs/heads/release/1.0'" },
          since: { type: "string", description: "Exclude commits reachable from this ref (for commit range)" },
          path: { type: "string", description: "Filter commits affecting this file path" },
          start: { type: "number", default: 0 },
          limit: { type: "number", default: 25 }
        },
        required: ["projectKey", "repositorySlug"]
      }
    },
    {
      name: "bitbucket_getFileContent",
      description: "Get raw content of a file from a repository at a specific branch/tag/commit.",
      inputSchema: {
        type: "object",
        properties: {
          projectKey: { type: "string", description: "Bitbucket project key" },
          repositorySlug: { type: "string", description: "Repository slug" },
          filePath: { type: "string", description: "Path to the file, e.g. 'pom.xml' or 'src/main/java/App.java'" },
          at: { type: "string", description: "Branch name, tag, or commit hash, e.g. 'develop', 'release/1.0', 'refs/heads/master'" }
        },
        required: ["projectKey", "repositorySlug", "filePath"]
      }
    },
    {
      name: "bitbucket_browseRepository",
      description: "Browse the directory structure or file listing of a repository at a specific path and branch.",
      inputSchema: {
        type: "object",
        properties: {
          projectKey: { type: "string", description: "Bitbucket project key" },
          repositorySlug: { type: "string", description: "Repository slug" },
          path: { type: "string", default: "", description: "Directory path to browse, e.g. 'src/main/java'. Empty for root." },
          at: { type: "string", description: "Branch name, tag, or commit hash" },
          start: { type: "number", default: 0 },
          limit: { type: "number", default: 100 }
        },
        required: ["projectKey", "repositorySlug"]
      }
    },
    {
      name: "bitbucket_approvePullRequest",
      description: "Approve a pull request as the authenticated user.",
      inputSchema: {
        type: "object",
        properties: {
          projectKey: { type: "string", description: "Bitbucket project key" },
          repositorySlug: { type: "string", description: "Repository slug" },
          pullRequestId: { type: "number", description: "Pull request ID" }
        },
        required: ["projectKey", "repositorySlug", "pullRequestId"]
      }
    },
    {
      name: "bitbucket_unapprovePullRequest",
      description: "Remove approval from a pull request as the authenticated user.",
      inputSchema: {
        type: "object",
        properties: {
          projectKey: { type: "string", description: "Bitbucket project key" },
          repositorySlug: { type: "string", description: "Repository slug" },
          pullRequestId: { type: "number", description: "Pull request ID" }
        },
        required: ["projectKey", "repositorySlug", "pullRequestId"]
      }
    },
    {
      name: "bitbucket_mergePullRequest",
      description: "Merge a pull request. Requires the current PR version for optimistic locking.",
      inputSchema: {
        type: "object",
        properties: {
          projectKey: { type: "string", description: "Bitbucket project key" },
          repositorySlug: { type: "string", description: "Repository slug" },
          pullRequestId: { type: "number", description: "Pull request ID" },
          version: { type: "number", description: "Current version of the PR (required for merge)" }
        },
        required: ["projectKey", "repositorySlug", "pullRequestId", "version"]
      }
    },
    {
      name: "bitbucket_declinePullRequest",
      description: "Decline (close without merging) a pull request.",
      inputSchema: {
        type: "object",
        properties: {
          projectKey: { type: "string", description: "Bitbucket project key" },
          repositorySlug: { type: "string", description: "Repository slug" },
          pullRequestId: { type: "number", description: "Pull request ID" },
          version: { type: "number", description: "Current version of the PR" }
        },
        required: ["projectKey", "repositorySlug", "pullRequestId", "version"]
      }
    },
    {
      name: "bitbucket_getPRMergeStatus",
      description: "Check whether a pull request can be merged (merge preconditions check).",
      inputSchema: {
        type: "object",
        properties: {
          projectKey: { type: "string", description: "Bitbucket project key" },
          repositorySlug: { type: "string", description: "Repository slug" },
          pullRequestId: { type: "number", description: "Pull request ID" }
        },
        required: ["projectKey", "repositorySlug", "pullRequestId"]
      }
    },
    // --- New tools ---
    {
      name: "bitbucket_createBranch",
      description: "Create a new branch in a repository from a given commit or branch.",
      inputSchema: {
        type: "object",
        properties: {
          projectKey: { type: "string", description: "Bitbucket project key" },
          repositorySlug: { type: "string", description: "Repository slug" },
          name: { type: "string", description: "New branch name, e.g. 'feature/PROJ-1234-my-feature'" },
          startPoint: { type: "string", description: "Starting commit hash or branch name, e.g. 'master' or 'refs/heads/develop'" }
        },
        required: ["projectKey", "repositorySlug", "name", "startPoint"]
      }
    },
    {
      name: "bitbucket_deleteBranch",
      description: "Delete a branch from a repository.",
      inputSchema: {
        type: "object",
        properties: {
          projectKey: { type: "string", description: "Bitbucket project key" },
          repositorySlug: { type: "string", description: "Repository slug" },
          name: { type: "string", description: "Branch name to delete, e.g. 'feature/old-branch'" }
        },
        required: ["projectKey", "repositorySlug", "name"]
      }
    },
    {
      name: "bitbucket_getCommitDiff",
      description: "Get the diff (changed files and lines) for a specific commit.",
      inputSchema: {
        type: "object",
        properties: {
          projectKey: { type: "string", description: "Bitbucket project key" },
          repositorySlug: { type: "string", description: "Repository slug" },
          commitId: { type: "string", description: "Commit hash" },
          contextLines: { type: "number", default: 10, description: "Number of context lines around changes" }
        },
        required: ["projectKey", "repositorySlug", "commitId"]
      }
    },
    {
      name: "bitbucket_deletePRComment",
      description: "Delete a comment on a pull request. Requires the comment's version for optimistic locking.",
      inputSchema: {
        type: "object",
        properties: {
          projectKey: { type: "string", description: "Bitbucket project key" },
          repositorySlug: { type: "string", description: "Repository slug" },
          pullRequestId: { type: "number", description: "Pull request ID" },
          commentId: { type: "number", description: "Comment ID to delete" },
          version: { type: "number", description: "Current version of the comment (for optimistic locking)" }
        },
        required: ["projectKey", "repositorySlug", "pullRequestId", "commentId", "version"]
      }
    },
    {
      name: "bitbucket_editPRComment",
      description: "Edit an existing comment on a pull request.",
      inputSchema: {
        type: "object",
        properties: {
          projectKey: { type: "string", description: "Bitbucket project key" },
          repositorySlug: { type: "string", description: "Repository slug" },
          pullRequestId: { type: "number", description: "Pull request ID" },
          commentId: { type: "number", description: "Comment ID to edit" },
          version: { type: "number", description: "Current version of the comment (for optimistic locking)" },
          text: { type: "string", description: "Updated comment text (Markdown supported)" }
        },
        required: ["projectKey", "repositorySlug", "pullRequestId", "commentId", "version", "text"]
      }
    },
    {
      name: "bitbucket_searchRepositories",
      description: "Search for repositories across all projects by name.",
      inputSchema: {
        type: "object",
        properties: {
          name: { type: "string", description: "Repository name to search for (substring match)" },
          start: { type: "number", default: 0 },
          limit: { type: "number", default: 25 }
        },
        required: ["name"]
      }
    },
    {
      name: "bitbucket_createTag",
      description: "Create a new tag in a repository.",
      inputSchema: {
        type: "object",
        properties: {
          projectKey: { type: "string", description: "Bitbucket project key" },
          repositorySlug: { type: "string", description: "Repository slug" },
          name: { type: "string", description: "Tag name, e.g. 'v1.0.0'" },
          startPoint: { type: "string", description: "Commit hash or branch name to tag" },
          message: { type: "string", description: "Optional tag message (for annotated tags)" }
        },
        required: ["projectKey", "repositorySlug", "name", "startPoint"]
      }
    },
    {
      name: "bitbucket_deleteTag",
      description: "Delete a tag from a repository.",
      inputSchema: {
        type: "object",
        properties: {
          projectKey: { type: "string", description: "Bitbucket project key" },
          repositorySlug: { type: "string", description: "Repository slug" },
          name: { type: "string", description: "Tag name to delete" }
        },
        required: ["projectKey", "repositorySlug", "name"]
      }
    },
    {
      name: "bitbucket_getRepository",
      description: "Get detailed information about a single repository.",
      inputSchema: {
        type: "object",
        properties: {
          projectKey: { type: "string", description: "Bitbucket project key" },
          repositorySlug: { type: "string", description: "Repository slug" }
        },
        required: ["projectKey", "repositorySlug"]
      }
    },
    {
      name: "bitbucket_getPRTasks",
      description: "Get all tasks (to-do items) on a pull request.",
      inputSchema: {
        type: "object",
        properties: {
          projectKey: { type: "string", description: "Bitbucket project key" },
          repositorySlug: { type: "string", description: "Repository slug" },
          pullRequestId: { type: "number", description: "Pull request ID" },
          start: { type: "number", default: 0 },
          limit: { type: "number", default: 100 }
        },
        required: ["projectKey", "repositorySlug", "pullRequestId"]
      }
    },
    {
      name: "bitbucket_createPRTask",
      description: "Create a task (to-do item) on a pull request comment.",
      inputSchema: {
        type: "object",
        properties: {
          projectKey: { type: "string", description: "Bitbucket project key" },
          repositorySlug: { type: "string", description: "Repository slug" },
          pullRequestId: { type: "number", description: "Pull request ID" },
          commentId: { type: "number", description: "Comment ID to attach the task to (anchor)" },
          text: { type: "string", description: "Task description" }
        },
        required: ["projectKey", "repositorySlug", "pullRequestId", "commentId", "text"]
      }
    },
    {
      name: "bitbucket_getCommitChanges",
      description: "Get the list of changed files in a specific commit.",
      inputSchema: {
        type: "object",
        properties: {
          projectKey: { type: "string", description: "Bitbucket project key" },
          repositorySlug: { type: "string", description: "Repository slug" },
          commitId: { type: "string", description: "Commit hash" },
          start: { type: "number", default: 0 },
          limit: { type: "number", default: 100 }
        },
        required: ["projectKey", "repositorySlug", "commitId"]
      }
    },
    {
      name: "bitbucket_getCommitDetail",
      description: "Get detailed information about a single commit.",
      inputSchema: {
        type: "object",
        properties: {
          projectKey: { type: "string", description: "Bitbucket project key" },
          repositorySlug: { type: "string", description: "Repository slug" },
          commitId: { type: "string", description: "Commit hash" }
        },
        required: ["projectKey", "repositorySlug", "commitId"]
      }
    },
    {
      name: "bitbucket_getFileHistory",
      description: "Get the commit history for a specific file.",
      inputSchema: {
        type: "object",
        properties: {
          projectKey: { type: "string", description: "Bitbucket project key" },
          repositorySlug: { type: "string", description: "Repository slug" },
          filePath: { type: "string", description: "Path to the file, e.g. 'src/main/java/App.java'" },
          at: { type: "string", description: "Branch name, tag, or commit hash" },
          start: { type: "number", default: 0 },
          limit: { type: "number", default: 25 }
        },
        required: ["projectKey", "repositorySlug", "filePath"]
      }
    },
    {
      name: "bitbucket_replyToPRComment",
      description: "Reply to an existing comment thread on a pull request.",
      inputSchema: {
        type: "object",
        properties: {
          projectKey: { type: "string", description: "Bitbucket project key" },
          repositorySlug: { type: "string", description: "Repository slug" },
          pullRequestId: { type: "number", description: "Pull request ID" },
          parentCommentId: { type: "number", description: "ID of the parent comment to reply to" },
          text: { type: "string", description: "Reply text (Markdown supported)" }
        },
        required: ["projectKey", "repositorySlug", "pullRequestId", "parentCommentId", "text"]
      }
    },
    {
      name: "bitbucket_requestPRChanges",
      description: "Set your review status to 'needs work' on a pull request, requesting changes from the author.",
      inputSchema: {
        type: "object",
        properties: {
          projectKey: { type: "string", description: "Bitbucket project key" },
          repositorySlug: { type: "string", description: "Repository slug" },
          pullRequestId: { type: "number", description: "Pull request ID" }
        },
        required: ["projectKey", "repositorySlug", "pullRequestId"]
      }
    },
    {
      name: "bitbucket_getBuildStatus",
      description: "Get CI/CD build statuses for a specific commit.",
      inputSchema: {
        type: "object",
        properties: {
          commitId: { type: "string", description: "Full commit hash to check build status for" },
          start: { type: "number", default: 0 },
          limit: { type: "number", default: 25 }
        },
        required: ["commitId"]
      }
    },
    {
      name: "bitbucket_compareBranches",
      description: "Compare two branches and get the commits and changes between them (like git diff A..B).",
      inputSchema: {
        type: "object",
        properties: {
          projectKey: { type: "string", description: "Bitbucket project key" },
          repositorySlug: { type: "string", description: "Repository slug" },
          from: { type: "string", description: "Source branch or commit hash" },
          to: { type: "string", description: "Target branch or commit hash" },
          start: { type: "number", default: 0 },
          limit: { type: "number", default: 25 }
        },
        required: ["projectKey", "repositorySlug", "from", "to"]
      }
    },
    {
      name: "bitbucket_forkRepository",
      description: "Fork a repository to your personal project or a specified project.",
      inputSchema: {
        type: "object",
        properties: {
          projectKey: { type: "string", description: "Source project key of the repo to fork" },
          repositorySlug: { type: "string", description: "Source repository slug to fork" },
          targetProjectKey: { type: "string", description: "Target project key to fork into (use '~username' for personal project, e.g. '~yourusername')" },
          name: { type: "string", description: "Optional name for the forked repository (defaults to same name)" }
        },
        required: ["projectKey", "repositorySlug"]
      }
    },
    {
      name: "bitbucket_searchUsers",
      description: "Search for users in the Bitbucket directory by name or username. Useful for finding reviewer usernames.",
      inputSchema: {
        type: "object",
        properties: {
          filter: { type: "string", description: "Search term to filter users by name or username" },
          start: { type: "number", default: 0 },
          limit: { type: "number", default: 25 }
        },
        required: ["filter"]
      }
    }
  ]
}));

server.setRequestHandler(CallToolRequestSchema, async (request) => {
  const { name, arguments: args = {} } = request.params;

  try {
    if (name === "bitbucket_getInboxPullRequests") {
      const data = await bbRequest("/rest/api/latest/dashboard/pull-requests", {
        start: args.start ?? 0,
        limit: args.limit ?? 50,
        role: args.role ?? "REVIEWER",
        state: args.state ?? "OPEN"
      });

      return {
        content: [
          {
            type: "text",
            text: JSON.stringify(data, null, 2)
          }
        ]
      };
    }

    if (name === "bitbucket_getPullRequests") {
      const data = await bbRequest(
        `/rest/api/latest/projects/${encodeURIComponent(args.projectKey)}/repos/${encodeURIComponent(args.repositorySlug)}/pull-requests`,
        {
          state: args.state ?? "OPEN",
          start: args.start ?? 0,
          limit: args.limit ?? 50
        }
      );

      return {
        content: [
          {
            type: "text",
            text: JSON.stringify(data, null, 2)
          }
        ]
      };
    }

    if (name === "bitbucket_getPRComments") {
      const data = await bbRequest(
        `/rest/api/latest/projects/${encodeURIComponent(args.projectKey)}/repos/${encodeURIComponent(args.repositorySlug)}/pull-requests/${encodeURIComponent(args.pullRequestId)}/activities`,
        {
          start: args.start ?? 0,
          limit: args.limit ?? 100
        }
      );

      return {
        content: [
          {
            type: "text",
            text: JSON.stringify(data, null, 2)
          }
        ]
      };
    }

    if (name === "bitbucket_getPRDiff") {
      const url = new URL(
        `${BITBUCKET_URL.replace(/\/$/, "")}/rest/api/latest/projects/${encodeURIComponent(args.projectKey)}/repos/${encodeURIComponent(args.repositorySlug)}/pull-requests/${encodeURIComponent(args.pullRequestId)}/diff`
      );
      if (args.contextLines !== undefined) {
        url.searchParams.set("contextLines", String(args.contextLines));
      }

      const response = await fetch(url, {
        method: "GET",
        headers: {
          Authorization: authHeader(BITBUCKET_USERNAME, BITBUCKET_PASSWORD),
          Accept: "application/json"
        }
      });

      if (!response.ok) {
        const body = await response.text();
        throw new Error(`Bitbucket API error ${response.status}: ${body}`);
      }

      const data = await response.json();
      return {
        content: [
          {
            type: "text",
            text: JSON.stringify(data, null, 2)
          }
        ]
      };
    }

    if (name === "bitbucket_addPRComment") {
      const data = await bbPostRequest(
        `/rest/api/latest/projects/${encodeURIComponent(args.projectKey)}/repos/${encodeURIComponent(args.repositorySlug)}/pull-requests/${encodeURIComponent(args.pullRequestId)}/comments`,
        { text: args.text }
      );

      return {
        content: [
          {
            type: "text",
            text: JSON.stringify(data, null, 2)
          }
        ]
      };
    }

    if (name === "bitbucket_addPRInlineComment") {
      const body = {
        text: args.text,
        anchor: {
          path: args.filePath,
          line: args.line,
          lineType: args.lineType ?? "ADDED",
          fileType: args.fileType ?? "TO"
        }
      };

      const data = await bbPostRequest(
        `/rest/api/latest/projects/${encodeURIComponent(args.projectKey)}/repos/${encodeURIComponent(args.repositorySlug)}/pull-requests/${encodeURIComponent(args.pullRequestId)}/comments`,
        body
      );

      return {
        content: [
          {
            type: "text",
            text: JSON.stringify(data, null, 2)
          }
        ]
      };
    }

    if (name === "bitbucket_createPullRequest") {
      const body = {
        title: args.title,
        description: args.description ?? "",
        fromRef: {
          id: `refs/heads/${args.fromBranch}`,
          repository: {
            slug: args.fromRepositorySlug,
            project: {
              key: args.fromProjectKey
            }
          }
        },
        toRef: {
          id: `refs/heads/${args.toBranch}`,
          repository: {
            slug: args.toRepositorySlug,
            project: {
              key: args.toProjectKey
            }
          }
        },
        reviewers: (args.reviewers ?? []).map((slug) => ({ user: { name: slug } }))
      };

      const data = await bbPostRequest(
        `/rest/api/latest/projects/${encodeURIComponent(args.toProjectKey)}/repos/${encodeURIComponent(args.toRepositorySlug)}/pull-requests`,
        body
      );

      return {
        content: [
          {
            type: "text",
            text: JSON.stringify(data, null, 2)
          }
        ]
      };
    }

    if (name === "bitbucket_updatePullRequest") {
      const body = {
        version: args.version
      };
      if (args.title) body.title = args.title;
      if (args.description !== undefined) body.description = args.description;
      if (args.reviewers) {
        body.reviewers = args.reviewers.map((slug) => ({ user: { name: slug } }));
      }
      if (args.toRef) body.toRef = args.toRef;

      const data = await bbPutRequest(
        `/rest/api/latest/projects/${encodeURIComponent(args.projectKey)}/repos/${encodeURIComponent(args.repositorySlug)}/pull-requests/${encodeURIComponent(args.pullRequestId)}`,
        body
      );

      return {
        content: [
          {
            type: "text",
            text: JSON.stringify(data, null, 2)
          }
        ]
      };
    }

    if (name === "bitbucket_getProjects") {
      const query = { start: args.start ?? 0, limit: args.limit ?? 25 };
      if (args.name) query.name = args.name;
      const data = await bbRequest("/rest/api/latest/projects", query);
      return { content: [{ type: "text", text: JSON.stringify(data, null, 2) }] };
    }

    if (name === "bitbucket_getRepositories") {
      const data = await bbRequest(
        `/rest/api/latest/projects/${encodeURIComponent(args.projectKey)}/repos`,
        { start: args.start ?? 0, limit: args.limit ?? 25 }
      );
      return { content: [{ type: "text", text: JSON.stringify(data, null, 2) }] };
    }

    if (name === "bitbucket_getBranches") {
      const query = {
        start: args.start ?? 0,
        limit: args.limit ?? 25,
        orderBy: args.orderBy ?? "MODIFICATION"
      };
      if (args.filterText) query.filterText = args.filterText;
      const data = await bbRequest(
        `/rest/api/latest/projects/${encodeURIComponent(args.projectKey)}/repos/${encodeURIComponent(args.repositorySlug)}/branches`,
        query
      );
      return { content: [{ type: "text", text: JSON.stringify(data, null, 2) }] };
    }

    if (name === "bitbucket_getDefaultBranch") {
      const data = await bbRequest(
        `/rest/api/latest/projects/${encodeURIComponent(args.projectKey)}/repos/${encodeURIComponent(args.repositorySlug)}/default-branch`
      );
      return { content: [{ type: "text", text: JSON.stringify(data, null, 2) }] };
    }

    if (name === "bitbucket_getTags") {
      const query = {
        start: args.start ?? 0,
        limit: args.limit ?? 25,
        orderBy: args.orderBy ?? "MODIFICATION"
      };
      if (args.filterText) query.filterText = args.filterText;
      const data = await bbRequest(
        `/rest/api/latest/projects/${encodeURIComponent(args.projectKey)}/repos/${encodeURIComponent(args.repositorySlug)}/tags`,
        query
      );
      return { content: [{ type: "text", text: JSON.stringify(data, null, 2) }] };
    }

    if (name === "bitbucket_getCommits") {
      const query = { start: args.start ?? 0, limit: args.limit ?? 25 };
      if (args.until) query.until = args.until;
      if (args.since) query.since = args.since;
      if (args.path) query.path = args.path;
      const data = await bbRequest(
        `/rest/api/latest/projects/${encodeURIComponent(args.projectKey)}/repos/${encodeURIComponent(args.repositorySlug)}/commits`,
        query
      );
      return { content: [{ type: "text", text: JSON.stringify(data, null, 2) }] };
    }

    if (name === "bitbucket_getFileContent") {
      const query = {};
      if (args.at) query.at = args.at;
      const text = await bbRawRequest(
        `/rest/api/latest/projects/${encodeURIComponent(args.projectKey)}/repos/${encodeURIComponent(args.repositorySlug)}/raw/${args.filePath}`,
        query
      );
      return { content: [{ type: "text", text }] };
    }

    if (name === "bitbucket_browseRepository") {
      const query = { start: args.start ?? 0, limit: args.limit ?? 100 };
      if (args.at) query.at = args.at;
      const pathPart = args.path ? `/${args.path}` : "";
      const data = await bbRequest(
        `/rest/api/latest/projects/${encodeURIComponent(args.projectKey)}/repos/${encodeURIComponent(args.repositorySlug)}/browse${pathPart}`,
        query
      );
      return { content: [{ type: "text", text: JSON.stringify(data, null, 2) }] };
    }

    if (name === "bitbucket_approvePullRequest") {
      const data = await bbPostRequest(
        `/rest/api/latest/projects/${encodeURIComponent(args.projectKey)}/repos/${encodeURIComponent(args.repositorySlug)}/pull-requests/${encodeURIComponent(args.pullRequestId)}/approve`,
        {}
      );
      return { content: [{ type: "text", text: JSON.stringify(data, null, 2) }] };
    }

    if (name === "bitbucket_unapprovePullRequest") {
      const data = await bbDeleteRequest(
        `/rest/api/latest/projects/${encodeURIComponent(args.projectKey)}/repos/${encodeURIComponent(args.repositorySlug)}/pull-requests/${encodeURIComponent(args.pullRequestId)}/approve`
      );
      return { content: [{ type: "text", text: JSON.stringify(data, null, 2) }] };
    }

    if (name === "bitbucket_mergePullRequest") {
      const data = await bbPostRequest(
        `/rest/api/latest/projects/${encodeURIComponent(args.projectKey)}/repos/${encodeURIComponent(args.repositorySlug)}/pull-requests/${encodeURIComponent(args.pullRequestId)}/merge`,
        { version: args.version }
      );
      return { content: [{ type: "text", text: JSON.stringify(data, null, 2) }] };
    }

    if (name === "bitbucket_declinePullRequest") {
      const data = await bbPostRequest(
        `/rest/api/latest/projects/${encodeURIComponent(args.projectKey)}/repos/${encodeURIComponent(args.repositorySlug)}/pull-requests/${encodeURIComponent(args.pullRequestId)}/decline`,
        { version: args.version }
      );
      return { content: [{ type: "text", text: JSON.stringify(data, null, 2) }] };
    }

    if (name === "bitbucket_getPRMergeStatus") {
      const data = await bbRequest(
        `/rest/api/latest/projects/${encodeURIComponent(args.projectKey)}/repos/${encodeURIComponent(args.repositorySlug)}/pull-requests/${encodeURIComponent(args.pullRequestId)}/merge`
      );
      return { content: [{ type: "text", text: JSON.stringify(data, null, 2) }] };
    }

    // --- New tool handlers ---

    if (name === "bitbucket_createBranch") {
      const data = await bbPostRequest(
        `/rest/api/latest/projects/${encodeURIComponent(args.projectKey)}/repos/${encodeURIComponent(args.repositorySlug)}/branches`,
        { name: args.name, startPoint: args.startPoint }
      );
      return { content: [{ type: "text", text: JSON.stringify(data, null, 2) }] };
    }

    if (name === "bitbucket_deleteBranch") {
      // Bitbucket Server uses POST to branch-utils endpoint for branch deletion
      const url = new URL(
        `${BITBUCKET_URL.replace(/\/$/, "")}/rest/branch-utils/latest/projects/${encodeURIComponent(args.projectKey)}/repos/${encodeURIComponent(args.repositorySlug)}/branches`
      );
      const response = await fetch(url, {
        method: "DELETE",
        headers: {
          Authorization: authHeader(BITBUCKET_USERNAME, BITBUCKET_PASSWORD),
          Accept: "application/json",
          "Content-Type": "application/json"
        },
        body: JSON.stringify({ name: `refs/heads/${args.name}`, dryRun: false })
      });
      if (!response.ok) {
        const text = await response.text();
        throw new Error(`Bitbucket API error ${response.status}: ${text}`);
      }
      const text = await response.text();
      const data = text ? JSON.parse(text) : { success: true };
      return { content: [{ type: "text", text: JSON.stringify(data, null, 2) }] };
    }

    if (name === "bitbucket_getCommitDiff") {
      const query = {};
      if (args.contextLines !== undefined) query.contextLines = args.contextLines;
      const data = await bbRequest(
        `/rest/api/latest/projects/${encodeURIComponent(args.projectKey)}/repos/${encodeURIComponent(args.repositorySlug)}/commits/${encodeURIComponent(args.commitId)}/diff`,
        query
      );
      return { content: [{ type: "text", text: JSON.stringify(data, null, 2) }] };
    }

    if (name === "bitbucket_deletePRComment") {
      const url = new URL(
        `${BITBUCKET_URL.replace(/\/$/, "")}/rest/api/latest/projects/${encodeURIComponent(args.projectKey)}/repos/${encodeURIComponent(args.repositorySlug)}/pull-requests/${encodeURIComponent(args.pullRequestId)}/comments/${encodeURIComponent(args.commentId)}`
      );
      url.searchParams.set("version", String(args.version));

      const response = await fetch(url, {
        method: "DELETE",
        headers: {
          Authorization: authHeader(BITBUCKET_USERNAME, BITBUCKET_PASSWORD),
          Accept: "application/json"
        }
      });

      if (!response.ok) {
        const text = await response.text();
        throw new Error(`Bitbucket API error ${response.status}: ${text}`);
      }

      return { content: [{ type: "text", text: JSON.stringify({ success: true, commentId: args.commentId }, null, 2) }] };
    }

    if (name === "bitbucket_editPRComment") {
      const data = await bbPutRequest(
        `/rest/api/latest/projects/${encodeURIComponent(args.projectKey)}/repos/${encodeURIComponent(args.repositorySlug)}/pull-requests/${encodeURIComponent(args.pullRequestId)}/comments/${encodeURIComponent(args.commentId)}`,
        { text: args.text, version: args.version }
      );
      return { content: [{ type: "text", text: JSON.stringify(data, null, 2) }] };
    }

    if (name === "bitbucket_searchRepositories") {
      const data = await bbRequest("/rest/api/latest/repos", {
        name: args.name,
        start: args.start ?? 0,
        limit: args.limit ?? 25
      });
      return { content: [{ type: "text", text: JSON.stringify(data, null, 2) }] };
    }

    if (name === "bitbucket_createTag") {
      const body = {
        name: args.name,
        startPoint: args.startPoint
      };
      if (args.message) body.message = args.message;
      const data = await bbPostRequest(
        `/rest/api/latest/projects/${encodeURIComponent(args.projectKey)}/repos/${encodeURIComponent(args.repositorySlug)}/tags`,
        body
      );
      return { content: [{ type: "text", text: JSON.stringify(data, null, 2) }] };
    }

    if (name === "bitbucket_deleteTag") {
      const data = await bbDeleteRequest(
        `/rest/git/latest/projects/${encodeURIComponent(args.projectKey)}/repos/${encodeURIComponent(args.repositorySlug)}/tags/${encodeURIComponent(args.name)}`
      );
      return { content: [{ type: "text", text: JSON.stringify(data, null, 2) }] };
    }

    if (name === "bitbucket_getRepository") {
      const data = await bbRequest(
        `/rest/api/latest/projects/${encodeURIComponent(args.projectKey)}/repos/${encodeURIComponent(args.repositorySlug)}`
      );
      return { content: [{ type: "text", text: JSON.stringify(data, null, 2) }] };
    }

    if (name === "bitbucket_getPRTasks") {
      const data = await bbRequest(
        `/rest/api/latest/projects/${encodeURIComponent(args.projectKey)}/repos/${encodeURIComponent(args.repositorySlug)}/pull-requests/${encodeURIComponent(args.pullRequestId)}/tasks`,
        { start: args.start ?? 0, limit: args.limit ?? 100 }
      );
      return { content: [{ type: "text", text: JSON.stringify(data, null, 2) }] };
    }

    if (name === "bitbucket_createPRTask") {
      const data = await bbPostRequest(
        `/rest/api/latest/projects/${encodeURIComponent(args.projectKey)}/repos/${encodeURIComponent(args.repositorySlug)}/pull-requests/${encodeURIComponent(args.pullRequestId)}/tasks`,
        {
          anchor: { id: args.commentId, type: "COMMENT" },
          text: args.text
        }
      );
      return { content: [{ type: "text", text: JSON.stringify(data, null, 2) }] };
    }

    if (name === "bitbucket_getCommitChanges") {
      const data = await bbRequest(
        `/rest/api/latest/projects/${encodeURIComponent(args.projectKey)}/repos/${encodeURIComponent(args.repositorySlug)}/commits/${encodeURIComponent(args.commitId)}/changes`,
        { start: args.start ?? 0, limit: args.limit ?? 100 }
      );
      return { content: [{ type: "text", text: JSON.stringify(data, null, 2) }] };
    }

    if (name === "bitbucket_getCommitDetail") {
      const data = await bbRequest(
        `/rest/api/latest/projects/${encodeURIComponent(args.projectKey)}/repos/${encodeURIComponent(args.repositorySlug)}/commits/${encodeURIComponent(args.commitId)}`
      );
      return { content: [{ type: "text", text: JSON.stringify(data, null, 2) }] };
    }

    if (name === "bitbucket_getFileHistory") {
      const query = { start: args.start ?? 0, limit: args.limit ?? 25 };
      if (args.at) query.at = args.at;
      const data = await bbRequest(
        `/rest/api/latest/projects/${encodeURIComponent(args.projectKey)}/repos/${encodeURIComponent(args.repositorySlug)}/commits`,
        { ...query, path: args.filePath }
      );
      return { content: [{ type: "text", text: JSON.stringify(data, null, 2) }] };
    }

    if (name === "bitbucket_replyToPRComment") {
      const data = await bbPostRequest(
        `/rest/api/latest/projects/${encodeURIComponent(args.projectKey)}/repos/${encodeURIComponent(args.repositorySlug)}/pull-requests/${encodeURIComponent(args.pullRequestId)}/comments`,
        {
          text: args.text,
          parent: { id: args.parentCommentId }
        }
      );
      return { content: [{ type: "text", text: JSON.stringify(data, null, 2) }] };
    }

    if (name === "bitbucket_requestPRChanges") {
      const url = new URL(
        `${BITBUCKET_URL.replace(/\/$/, "")}/rest/api/latest/projects/${encodeURIComponent(args.projectKey)}/repos/${encodeURIComponent(args.repositorySlug)}/pull-requests/${encodeURIComponent(args.pullRequestId)}/participants/${encodeURIComponent(BITBUCKET_USERNAME)}`
      );
      const response = await fetch(url, {
        method: "PUT",
        headers: {
          Authorization: authHeader(BITBUCKET_USERNAME, BITBUCKET_PASSWORD),
          Accept: "application/json",
          "Content-Type": "application/json"
        },
        body: JSON.stringify({
          user: { name: BITBUCKET_USERNAME },
          role: "REVIEWER",
          status: "NEEDS_WORK"
        })
      });
      if (!response.ok) {
        const text = await response.text();
        throw new Error(`Bitbucket API error ${response.status}: ${text}`);
      }
      const data = await response.json();
      return { content: [{ type: "text", text: JSON.stringify(data, null, 2) }] };
    }

    if (name === "bitbucket_getBuildStatus") {
      const data = await bbRequest(
        `/rest/build-status/latest/commits/${encodeURIComponent(args.commitId)}`,
        { start: args.start ?? 0, limit: args.limit ?? 25 }
      );
      return { content: [{ type: "text", text: JSON.stringify(data, null, 2) }] };
    }

    if (name === "bitbucket_compareBranches") {
      const data = await bbRequest(
        `/rest/api/latest/projects/${encodeURIComponent(args.projectKey)}/repos/${encodeURIComponent(args.repositorySlug)}/compare/changes`,
        { from: args.from, to: args.to, start: args.start ?? 0, limit: args.limit ?? 25 }
      );
      return { content: [{ type: "text", text: JSON.stringify(data, null, 2) }] };
    }

    if (name === "bitbucket_forkRepository") {
      const body = {};
      if (args.targetProjectKey) body.project = { key: args.targetProjectKey };
      if (args.name) body.name = args.name;
      const data = await bbPostRequest(
        `/rest/api/latest/projects/${encodeURIComponent(args.projectKey)}/repos/${encodeURIComponent(args.repositorySlug)}`,
        body
      );
      return { content: [{ type: "text", text: JSON.stringify(data, null, 2) }] };
    }

    if (name === "bitbucket_searchUsers") {
      const data = await bbRequest("/rest/api/latest/users", {
        filter: args.filter,
        start: args.start ?? 0,
        limit: args.limit ?? 25
      });
      return { content: [{ type: "text", text: JSON.stringify(data, null, 2) }] };
    }

    return {
      isError: true,
      content: [
        {
          type: "text",
          text: `Unknown tool: ${name}`
        }
      ]
    };
  } catch (error) {
    return {
      isError: true,
      content: [
        {
          type: "text",
          text: error instanceof Error ? error.message : String(error)
        }
      ]
    };
  }
});

async function main() {
  requireEnv("BITBUCKET_URL", BITBUCKET_URL);
  requireEnv("BITBUCKET_USERNAME", BITBUCKET_USERNAME);
  requireEnv("BITBUCKET_PASSWORD", BITBUCKET_PASSWORD);

  const transport = new StdioServerTransport();
  await server.connect(transport);
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
