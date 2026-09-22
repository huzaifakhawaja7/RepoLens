// analyzer.js
// Responsible for turning raw API data into insights: sorting, filtering,
// stats/frequency calculations, top-repository ranking, and activity
// insights based on repository push dates. Pure functions only, no DOM
// access here; ui.js is responsible for rendering whatever these return.

window.App = window.App || {};

App.Analyzer = (function () {
  function sortRepos(repos, sortKey) {
    const sorted = [...repos];

    switch (sortKey) {
      case 'stars':
        sorted.sort((a, b) => (b.stars || 0) - (a.stars || 0) || (b.forks || 0) - (a.forks || 0));
        break;
      case 'forks':
        sorted.sort((a, b) => (b.forks || 0) - (a.forks || 0) || (b.stars || 0) - (a.stars || 0));
        break;
      case 'name':
        sorted.sort((a, b) => a.name.localeCompare(b.name));
        break;
      case 'updated':
      default:
        sorted.sort((a, b) => new Date(b.pushedAt) - new Date(a.pushedAt));
        break;
    }

    return sorted;
  }

  function sortByRecentlyUpdated(repos) {
    return sortRepos(repos, 'updated');
  }

  function filterRepos(repos, { query = '', language = 'all' } = {}) {
    let filtered = repos;

    if (query) {
      const q = query.toLowerCase();
      filtered = filtered.filter((r) => {
        const nameMatch = r.name && r.name.toLowerCase().includes(q);
        const descMatch = r.description && r.description.toLowerCase().includes(q);
        return nameMatch || descMatch;
      });
    }

    if (language && language !== 'all') {
      filtered = filtered.filter((r) => r.language === language);
    }

    return filtered;
  }

  // Total stars/forks, language frequency count, and the primary
  // (most-used) language, all derived from a single pass over the repos.
  function computeStats(repos) {
    let totalStars = 0;
    let totalForks = 0;
    const languageCounts = {};

    repos.forEach((repo) => {
      totalStars += repo.stars || 0;
      totalForks += repo.forks || 0;
      if (repo.language) {
        languageCounts[repo.language] = (languageCounts[repo.language] || 0) + 1;
      }
    });

    let topLanguage = 'N/A';
    let maxCount = 0;
    let totalTaggedRepos = 0;

    Object.entries(languageCounts).forEach(([lang, count]) => {
      totalTaggedRepos += count;
      if (count > maxCount) {
        maxCount = count;
        topLanguage = lang;
      }
    });

    const topLanguagePct = totalTaggedRepos > 0 ? Math.round((maxCount / totalTaggedRepos) * 100) : 0;

    return {
      totalRepos: repos.length,
      totalStars,
      totalForks,
      languageCounts,
      topLanguage,
      topLanguagePct,
      topLanguageCount: maxCount,
      // Repos that have a primary language set at all, and how many
      // distinct primary languages appear across the repo list.
      taggedRepoCount: totalTaggedRepos,
      distinctLanguageCount: Object.keys(languageCounts).length
    };
  }

  // Ranks repositories by star count (ties broken by forks) and returns at
  // most `limit` of them. Does not mutate the array passed in.
  function getTopRepositories(repos, limit = 5) {
    return [...repos]
      .sort((a, b) => (b.stars || 0) - (a.stars || 0) || (b.forks || 0) - (a.forks || 0))
      .slice(0, limit);
  }

  // Activity insights derived from each repo's `pushed_at` (last push to
  // the repository, not commit or contribution history). Time windows are
  // rolling from the current moment: "today" = last 24h, "last 7 days" =
  // last 7*24h, "last 30 days" = last 30*24h. Repos with a missing or
  // unparseable pushedAt are excluded from every calculation below.
  function getActivityInsights(repos) {
    const now = Date.now();
    const DAY_MS = 24 * 60 * 60 * 1000;

    const withDates = repos
      .map((repo) => ({ repo, pushedAt: repo.pushedAt ? new Date(repo.pushedAt) : null }))
      .filter((entry) => entry.pushedAt && !Number.isNaN(entry.pushedAt.getTime()));

    let updatedToday = 0;
    let updatedLast7Days = 0;
    let updatedLast30Days = 0;
    let mostRecent = null;
    let oldest = null;

    withDates.forEach(({ repo, pushedAt }) => {
      const ageMs = now - pushedAt.getTime();
      if (ageMs <= DAY_MS) updatedToday += 1;
      if (ageMs <= 7 * DAY_MS) updatedLast7Days += 1;
      if (ageMs <= 30 * DAY_MS) updatedLast30Days += 1;

      if (!mostRecent || pushedAt.getTime() > mostRecent.pushedAt.getTime()) {
        mostRecent = { name: repo.name, htmlUrl: repo.htmlUrl, pushedAt };
      }
      if (!oldest || pushedAt.getTime() < oldest.pushedAt.getTime()) {
        oldest = { name: repo.name, htmlUrl: repo.htmlUrl, pushedAt };
      }
    });

    return {
      reposWithDateCount: withDates.length,
      updatedToday,
      updatedLast7Days,
      updatedLast30Days,
      mostRecentUpdate: mostRecent
        ? { name: mostRecent.name, htmlUrl: mostRecent.htmlUrl, pushedAt: mostRecent.pushedAt.toISOString() }
        : null,
      oldestUpdate: oldest
        ? { name: oldest.name, htmlUrl: oldest.htmlUrl, pushedAt: oldest.pushedAt.toISOString() }
        : null
    };
  }

  return {
    sortRepos,
    sortByRecentlyUpdated,
    filterRepos,
    computeStats,
    getTopRepositories,
    getActivityInsights
  };
})();
