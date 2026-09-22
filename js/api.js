// api.js
// Responsible for all communication with the GitHub REST API.
// Fetches user profiles and repositories, handles pagination via the
// Link header, and turns HTTP/network failures into typed ApiError
// objects the rest of the app can react to.

window.App = window.App || {};

const GITHUB_API_BASE = 'https://api.github.com';

class ApiError extends Error {
  constructor(type, message, extra = {}) {
    super(message);
    this.name = 'ApiError';
    this.type = type; // 'not_found' | 'rate_limit' | 'network' | 'forbidden' | 'unknown'
    Object.assign(this, extra);
  }
}

async function githubRequest(pathOrUrl) {
  const url = pathOrUrl.startsWith('http')
    ? pathOrUrl
    : `${GITHUB_API_BASE}${pathOrUrl}`;

  let response;
  try {
    response = await fetch(url, {
      headers: {
        Accept: 'application/vnd.github+json',
        'X-GitHub-Api-Version': '2022-11-28'
      }
    });
  } catch (networkErr) {
    throw new ApiError(
      'network',
      'Could not reach GitHub. Check your internet connection.'
    );
  }

  if (response.status === 404) {
    throw new ApiError('not_found', 'No GitHub user found with that username.');
  }

  if (response.status === 403 || response.status === 429) {
    const remaining = response.headers.get('X-RateLimit-Remaining');
    if (remaining === '0') {
      const resetHeader = response.headers.get('X-RateLimit-Reset');
      const resetDate = resetHeader
        ? new Date(Number(resetHeader) * 1000)
        : null;
      throw new ApiError(
        'rate_limit',
        'GitHub API rate limit exceeded.',
        { resetDate }
      );
    }
    throw new ApiError('forbidden', 'GitHub blocked this request (403).');
  }

  if (!response.ok) {
    throw new ApiError(
      'unknown',
      `GitHub API error (status ${response.status}).`
    );
  }

  return { data: await response.json(), headers: response.headers };
}

function parseNextPageUrl(linkHeader) {
  if (!linkHeader) return null;

  const links = linkHeader.split(',');
  for (const link of links) {
    const [urlPart, relPart] = link.split(';').map((part) => part.trim());
    if (relPart === 'rel="next"') {
      return urlPart.slice(1, -1); // strip surrounding < >
    }
  }
  return null;
}

function mapUser(raw) {
  return {
    login: raw.login,
    name: raw.name,
    avatarUrl: raw.avatar_url,
    bio: raw.bio,
    location: raw.location,
    company: raw.company,
    blog: raw.blog,
    followers: raw.followers,
    following: raw.following,
    publicRepos: raw.public_repos,
    htmlUrl: raw.html_url,
    createdAt: raw.created_at
  };
}

function mapRepo(raw) {
  return {
    name: raw.name,
    fullName: raw.full_name,
    description: raw.description,
    htmlUrl: raw.html_url,
    language: raw.language,
    stars: raw.stargazers_count,
    forks: raw.forks_count,
    watchers: raw.watchers_count,
    openIssues: raw.open_issues_count,
    isFork: raw.fork,
    isArchived: raw.archived,
    createdAt: raw.created_at,
    updatedAt: raw.updated_at,
    pushedAt: raw.pushed_at
  };
}

async function fetchUser(username) {
  const { data } = await githubRequest(`/users/${encodeURIComponent(username)}`);
  return mapUser(data);
}

async function fetchAllRepos(username) {
  const repos = [];
  const MAX_PAGES = 20; // safety cap: 20 * 100 = 2000 repos, avoids a runaway loop

  let nextUrl = `/users/${encodeURIComponent(username)}/repos?per_page=100&type=owner&sort=updated`;

  for (let page = 0; nextUrl && page < MAX_PAGES; page += 1) {
    const { data, headers } = await githubRequest(nextUrl);
    data.forEach((raw) => repos.push(mapRepo(raw)));
    nextUrl = parseNextPageUrl(headers.get('Link'));
  }

  return repos;
}

App.API = {
  ApiError,
  fetchUser,
  fetchAllRepos
};
