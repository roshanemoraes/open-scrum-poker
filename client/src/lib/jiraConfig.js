let cached = null;

export async function getJiraBaseUrl() {
  if (cached) return cached;
  const res = await fetch('/api/jira-config');
  const data = await res.json();
  cached = data.baseUrl;
  return cached;
}
