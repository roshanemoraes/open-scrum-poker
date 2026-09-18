const JIRA_BASE_URL = (process.env.JIRA_BASE_URL || 'https://<your-organization>.atlassian.net').replace(/\/+$/, '');
const JIRA_EMAIL = process.env.JIRA_EMAIL;
const JIRA_API_TOKEN = process.env.JIRA_API_TOKEN;

// Display names of the Jira custom fields to sync final values into.
// Override via env if your site names them differently.
const RCI_FIELD_NAME = process.env.RCI_FIELD_NAME || 'Requirement Clarity Index';
const STORY_POINTS_FIELD_NAME = process.env.STORY_POINTS_FIELD_NAME || 'Story Points';

export function isJiraConfigured() {
  return !!(JIRA_EMAIL && JIRA_API_TOKEN);
}

export function getJiraBaseUrl() {
  return JIRA_BASE_URL;
}

function authHeader() {
  return `Basic ${Buffer.from(`${JIRA_EMAIL}:${JIRA_API_TOKEN}`).toString('base64')}`;
}

// Scoped API tokens (Atlassian's "API tokens with scopes") don't work against
// <site>.atlassian.net at all — they only work through the API gateway at
// api.atlassian.com/ex/jira/{cloudId}/..., which needs the site's cloudId resolved
// first. Classic (unscoped) tokens also work fine through the gateway, so we route
// every call through it unconditionally rather than branching on token type.
let cloudIdPromise = null;

function getCloudId() {
  if (!cloudIdPromise) {
    cloudIdPromise = fetch(`${JIRA_BASE_URL}/_edge/tenant_info`)
      .then((res) => {
        if (!res.ok) throw new Error(`Could not resolve Jira cloud id (${res.status})`);
        return res.json();
      })
      .then((data) => data.cloudId)
      .catch((err) => {
        cloudIdPromise = null; // allow a retry on the next call instead of caching a failure
        throw err;
      });
  }
  return cloudIdPromise;
}

async function apiBase() {
  const cloudId = await getCloudId();
  return `https://api.atlassian.com/ex/jira/${cloudId}`;
}

// Field name -> id lookup is cached for the life of the process (cheap,
// rarely changes) and refetched if a name isn't found, in case a field
// was added/renamed on the Jira side after we started.
let fieldCache = null;

async function getAllFields(forceRefresh = false) {
  if (fieldCache && !forceRefresh) return fieldCache;
  const res = await fetch(`${await apiBase()}/rest/api/3/field`, {
    headers: { Authorization: authHeader(), Accept: 'application/json' },
  });
  if (!res.ok) throw new Error(`Jira field lookup failed (${res.status})`);
  fieldCache = await res.json();
  return fieldCache;
}

async function resolveFieldId(displayName) {
  let fields = await getAllFields();
  let match = fields.find((f) => f.name?.toLowerCase() === displayName.toLowerCase());
  if (!match) {
    fields = await getAllFields(true);
    match = fields.find((f) => f.name?.toLowerCase() === displayName.toLowerCase());
  }
  if (!match) throw new Error(`No Jira field named "${displayName}" found on this site`);
  return match.id;
}

// Pushes a poker "final" value (rci or effort) into the matching Jira
// custom field on the issue. Throws with a message safe to show the host
// if the value isn't numeric or the update is rejected by Jira.
export async function pushFinalValue(issueKey, pollType, value) {
  const numeric = Number(value);
  if (Number.isNaN(numeric)) {
    throw new Error(`"${value}" isn't a number — can't sync it to Jira`);
  }

  const fieldName = pollType === 'rci' ? RCI_FIELD_NAME : STORY_POINTS_FIELD_NAME;
  const fieldId = await resolveFieldId(fieldName);

  const res = await fetch(`${await apiBase()}/rest/api/3/issue/${encodeURIComponent(issueKey)}`, {
    method: 'PUT',
    headers: { Authorization: authHeader(), 'Content-Type': 'application/json' },
    body: JSON.stringify({ fields: { [fieldId]: numeric } }),
  });

  if (!res.ok) {
    const body = await res.text().catch(() => '');
    throw new Error(`Jira rejected the update (${res.status})${body ? `: ${body.slice(0, 200)}` : ''}`);
  }
}

// Best-effort attribution comment — the actual field write above always runs as the
// service account, so this is how the "who really set this" audit trail is recorded
// when ENABLE_JIRA_ATTRIBUTION_COMMENT is on. Callers should treat failures here as
// non-fatal (the final value itself already synced successfully).
export async function postAttributionComment(issueKey, text) {
  const res = await fetch(`${await apiBase()}/rest/api/3/issue/${encodeURIComponent(issueKey)}/comment`, {
    method: 'POST',
    headers: { Authorization: authHeader(), 'Content-Type': 'application/json' },
    body: JSON.stringify({
      body: {
        type: 'doc',
        version: 1,
        content: [{ type: 'paragraph', content: [{ type: 'text', text }] }],
      },
    }),
  });

  if (!res.ok) {
    const body = await res.text().catch(() => '');
    throw new Error(`Jira rejected the comment (${res.status})${body ? `: ${body.slice(0, 200)}` : ''}`);
  }
}

export async function fetchIssue(key) {
  const auth = Buffer.from(`${JIRA_EMAIL}:${JIRA_API_TOKEN}`).toString('base64');
  const fields = 'summary,status,issuetype,priority,assignee,reporter,created,updated,description,comment';
  const res = await fetch(`${await apiBase()}/rest/api/3/issue/${encodeURIComponent(key)}?fields=${fields}`, {
    headers: {
      Authorization: `Basic ${auth}`,
      Accept: 'application/json',
    },
  });

  if (res.status === 404) return { notFound: true };
  if (!res.ok) throw new Error(`Jira API error ${res.status}`);

  const data = await res.json();
  const f = data.fields || {};

  return {
    key: data.key,
    url: `${JIRA_BASE_URL}/browse/${data.key}`,
    summary: f.summary,
    status: f.status?.name,
    statusCategory: f.status?.statusCategory?.key, // 'new' | 'indeterminate' | 'done'
    type: f.issuetype?.name,
    priority: f.priority?.name,
    assignee: f.assignee?.displayName || 'Unassigned',
    reporter: f.reporter?.displayName || null,
    created: f.created,
    updated: f.updated,
    // Sent as raw Atlassian Document Format — the client renders it directly
    // so nested lists, numbering and bold text match Jira's own rendering.
    description: f.description || null,
    comments: (f.comment?.comments || []).map((c) => ({
      id: c.id,
      author: c.author?.displayName || 'Unknown',
      body: c.body || null,
      created: c.created,
    })),
  };
}
