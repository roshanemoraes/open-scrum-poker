let cached = null;

async function getJiraConfig() {
  if (!cached) {
    const res = await fetch('/api/jira-config');
    cached = await res.json();
  }
  return cached;
}

export async function getJiraBaseUrl() {
  return (await getJiraConfig()).baseUrl;
}

export async function isJiraConfigured() {
  return (await getJiraConfig()).configured;
}
