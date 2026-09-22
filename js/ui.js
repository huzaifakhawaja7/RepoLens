// ui.js
// Responsible for DOM rendering and updates.
// Takes processed data from api.js and analyzer.js and renders the dashboard:
// profile card, stat cards, language chart, top repositories, activity
// insights, and repository browser with filtering/sorting, as well as
// initial, loading, error, and empty states.

window.App = window.App || {};

App.UI = (function () {
  let currentRepos = [];
  let activeFilter = '';
  let activeLanguage = 'all';
  let activeSort = 'updated';

  function getEl(id) {
    return document.getElementById(id);
  }

  function escapeHtml(str) {
    if (str == null) return '';
    const div = document.createElement('div');
    div.textContent = String(str);
    return div.innerHTML;
  }

  function formatDate(dateStr) {
    if (!dateStr) return '';
    try {
      const d = new Date(dateStr);
      return d.toLocaleDateString('en-US', {
        month: 'short',
        day: 'numeric',
        year: 'numeric'
      });
    } catch {
      return dateStr;
    }
  }

  function formatRelativeTime(dateStr) {
    if (!dateStr) return '';
    try {
      const date = new Date(dateStr);
      const now = new Date();
      const diffSec = Math.floor((now - date) / 1000);
      if (diffSec < 60) return 'just now';
      const diffMin = Math.floor(diffSec / 60);
      if (diffMin < 60) return `${diffMin}m ago`;
      const diffHour = Math.floor(diffMin / 60);
      if (diffHour < 24) return `${diffHour}h ago`;
      const diffDay = Math.floor(diffHour / 24);
      if (diffDay < 30) return `${diffDay}d ago`;
      const diffMonth = Math.floor(diffDay / 30);
      if (diffMonth < 12) return `${diffMonth}mo ago`;
      const diffYear = Math.floor(diffDay / 365);
      return `${diffYear}y ago`;
    } catch {
      return formatDate(dateStr);
    }
  }

  function animateCountUp(element, endVal, duration = 600) {
    if (!element) return;
    const num = Number(endVal);
    if (isNaN(num) || num <= 0) {
      element.textContent = (num || 0).toLocaleString();
      return;
    }

    const start = 0;
    const startTime = performance.now();

    function update(now) {
      const elapsed = now - startTime;
      const progress = Math.min(elapsed / duration, 1);
      const ease = 1 - Math.pow(1 - progress, 3); // ease-out cubic
      const current = Math.round(start + (num - start) * ease);
      element.textContent = current.toLocaleString();

      if (progress < 1) {
        requestAnimationFrame(update);
      } else {
        element.textContent = num.toLocaleString();
      }
    }

    requestAnimationFrame(update);
  }

  function clearStatus() {
    const statusContainer = getEl('status-container');
    if (statusContainer) {
      statusContainer.style.display = 'none';
      statusContainer.innerHTML = '<p id="status-message" class="status" role="status" aria-live="polite"></p>';
    }
  }

  function showLanding() {
    const landingView = getEl('landing-view');
    const dashboardView = getEl('dashboard-view');
    const statusContainer = getEl('status-container');

    document.body.classList.add('landing-active');

    if (landingView) landingView.style.display = 'block';
    if (dashboardView) dashboardView.style.display = 'none';
    if (statusContainer) statusContainer.style.display = 'none';

    const heroInput = getEl('hero-username-input');
    const mainInput = getEl('username-input');
    if (heroInput) heroInput.value = '';
    if (mainInput) mainInput.value = '';

    if (window.history && window.history.replaceState) {
      const url = new URL(window.location.href);
      url.searchParams.delete('u');
      url.searchParams.delete('user');
      window.history.replaceState({}, '', url.pathname + (url.search ? url.search : ''));
    }
  }

  function hideLanding() {
    const landingView = getEl('landing-view');
    const dashboardView = getEl('dashboard-view');

    document.body.classList.remove('landing-active');

    if (landingView) landingView.style.display = 'none';
    if (dashboardView) dashboardView.style.display = 'flex';
  }

  function showLoading() {
    hideLanding();

    if (App.Charts && App.Charts.destroyChart) {
      App.Charts.destroyChart();
    }

    const statusContainer = getEl('status-container');
    if (statusContainer) {
      statusContainer.style.display = 'block';
      statusContainer.innerHTML = `
        <div class="loading-bar-wrapper">
          <div class="loading-bar"></div>
          <p id="status-message" class="status status-loading status-loading-text" role="status" aria-live="polite">Fetching profile &amp; repositories from GitHub...</p>
        </div>
      `;
    }

    // Skeleton placeholders for a smooth, flicker-free developer dashboard loading experience
    const profileSection = getEl('profile-section');
    const analyticsSection = getEl('analytics-section');
    const chartsSection = getEl('charts-section');
    const activitySection = getEl('activity-section');
    const topReposSection = getEl('top-repos-section');
    const reposSection = getEl('repos-section');

    if (profileSection) {
      profileSection.innerHTML = `
        <div class="profile-card skeleton-card">
          <div class="skeleton-avatar skeleton-shimmer"></div>
          <div class="skeleton-line-title skeleton-shimmer"></div>
          <div class="skeleton-line-subtitle skeleton-shimmer"></div>
          <div class="skeleton-line-bio skeleton-shimmer"></div>
          <div class="skeleton-stats-row">
            <div class="skeleton-stat-box skeleton-shimmer"></div>
            <div class="skeleton-stat-box skeleton-shimmer"></div>
            <div class="skeleton-stat-box skeleton-shimmer"></div>
          </div>
        </div>
      `;
    }

    if (analyticsSection) {
      analyticsSection.innerHTML = `
        <div class="metrics-grid">
          <div class="metric-card skeleton-card skeleton-shimmer" style="height: 74px;"></div>
          <div class="metric-card skeleton-card skeleton-shimmer" style="height: 74px;"></div>
          <div class="metric-card skeleton-card skeleton-shimmer" style="height: 74px;"></div>
          <div class="metric-card skeleton-card skeleton-shimmer" style="height: 74px;"></div>
        </div>
      `;
    }

    if (chartsSection) {
      chartsSection.innerHTML = `
        <div class="chart-card skeleton-card skeleton-shimmer" style="height: 240px;"></div>
      `;
    }

    if (activitySection) {
      activitySection.innerHTML = `
        <div class="chart-card skeleton-card skeleton-shimmer" style="height: 240px;"></div>
      `;
    }

    if (topReposSection) {
      topReposSection.innerHTML = `
        <div class="chart-card skeleton-card skeleton-shimmer" style="height: 220px;"></div>
      `;
    }

    if (reposSection) {
      reposSection.innerHTML = `
        <div class="repos-toolbar skeleton-card skeleton-shimmer" style="height: 40px; margin-bottom: 0.85rem;"></div>
        <div class="repo-list">
          <div class="repo-card skeleton-card skeleton-shimmer" style="height: 76px;"></div>
          <div class="repo-card skeleton-card skeleton-shimmer" style="height: 76px;"></div>
          <div class="repo-card skeleton-card skeleton-shimmer" style="height: 76px;"></div>
        </div>
      `;
    }
  }

  function showError(message) {
    hideLanding();

    if (App.Charts && App.Charts.destroyChart) {
      App.Charts.destroyChart();
    }

    const statusContainer = getEl('status-container');
    if (statusContainer) {
      statusContainer.style.display = 'block';
      statusContainer.innerHTML = `
        <div class="alert-card alert-error">
          <div class="alert-icon" aria-hidden="true">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
              <circle cx="12" cy="12" r="10"></circle>
              <line x1="12" y1="8" x2="12" y2="12"></line>
              <line x1="12" y1="16" x2="12.01" y2="16"></line>
            </svg>
          </div>
          <div class="alert-body">
            <h3 class="alert-title">Unable to complete analysis</h3>
            <p id="status-message" class="status status-error alert-message" role="status" aria-live="polite">${escapeHtml(message)}</p>
          </div>
        </div>
      `;
    }

    const profile = getEl('profile-section');
    const analytics = getEl('analytics-section');
    const charts = getEl('charts-section');
    const activity = getEl('activity-section');
    const topRepos = getEl('top-repos-section');
    const repos = getEl('repos-section');

    if (profile) profile.innerHTML = '';
    if (analytics) analytics.innerHTML = '';
    if (charts) charts.innerHTML = '';
    if (activity) activity.innerHTML = '';
    if (topRepos) topRepos.innerHTML = '';
    if (repos) repos.innerHTML = '';
  }

  function renderInitialState() {
    showLanding();
  }

  function renderProfile(user) {
    const section = getEl('profile-section');
    if (!section) return;

    const displayName = user.name ? escapeHtml(user.name) : escapeHtml(user.login);
    const joinedYear = user.createdAt ? new Date(user.createdAt).getFullYear() : null;

    section.innerHTML = `
      <div class="profile-card">
        <div class="profile-header">
          <img
            class="profile-avatar"
            src="${escapeHtml(user.avatarUrl)}"
            alt="${escapeHtml(user.login)}'s avatar"
            loading="lazy"
            onerror="this.src='https://github.githubassets.com/images/modules/logos_page/GitHub-Mark.png'"
          >
          <div class="profile-titles">
            <h2 class="profile-name">${displayName}</h2>
            <p class="profile-handle">
              <a href="${escapeHtml(user.htmlUrl)}" target="_blank" rel="noopener noreferrer">@${escapeHtml(user.login)}</a>
            </p>
          </div>
        </div>

        ${user.bio ? `<p class="profile-bio">${escapeHtml(user.bio)}</p>` : ''}

        <div class="profile-stats-grid">
          <div class="profile-stat-item">
            <span class="profile-stat-number" id="profile-stat-repos">0</span>
            <span class="profile-stat-label">Repos</span>
          </div>
          <div class="profile-stat-item">
            <span class="profile-stat-number" id="profile-stat-followers">0</span>
            <span class="profile-stat-label">Followers</span>
          </div>
          <div class="profile-stat-item">
            <span class="profile-stat-number" id="profile-stat-following">0</span>
            <span class="profile-stat-label">Following</span>
          </div>
        </div>

        <ul class="profile-meta-list">
          ${user.company ? `
            <li class="profile-meta-item">
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
                <rect x="2" y="7" width="20" height="14" rx="2" ry="2"></rect>
                <path d="M16 21V5a2 2 0 0 0-2-2h-4a2 2 0 0 0-2 2v16"></path>
              </svg>
              <span>${escapeHtml(user.company)}</span>
            </li>` : ''}
          ${user.location ? `
            <li class="profile-meta-item">
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
                <path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z"></path>
                <circle cx="12" cy="10" r="3"></circle>
              </svg>
              <span>${escapeHtml(user.location)}</span>
            </li>` : ''}
          ${user.blog ? `
            <li class="profile-meta-item">
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
                <circle cx="12" cy="12" r="10"></circle>
                <line x1="2" y1="12" x2="22" y2="12"></line>
                <path d="M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z"></path>
              </svg>
              <a href="${escapeHtml(user.blog.startsWith('http') ? user.blog : 'https://' + user.blog)}" target="_blank" rel="noopener noreferrer" class="profile-meta-link">
                ${escapeHtml(user.blog.replace(/^https?:\/\//, ''))}
              </a>
            </li>` : ''}
          ${joinedYear ? `
            <li class="profile-meta-item">
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
                <rect x="3" y="4" width="18" height="18" rx="2" ry="2"></rect>
                <line x1="16" y1="2" x2="16" y2="6"></line>
                <line x1="8" y1="2" x2="8" y2="6"></line>
                <line x1="3" y1="10" x2="21" y2="10"></line>
              </svg>
              <span>Joined ${joinedYear}</span>
            </li>` : ''}
        </ul>

        <div class="profile-actions">
          <a class="btn-profile-link" href="${escapeHtml(user.htmlUrl)}" target="_blank" rel="noopener noreferrer">
            <span>View on GitHub</span>
            <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
              <path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6"></path>
              <polyline points="15 3 21 3 21 9"></polyline>
              <line x1="10" y1="14" x2="21" y2="3"></line>
            </svg>
          </a>
          <button type="button" class="btn-copy-link" id="btn-copy-link" title="Copy shareable link">
            <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
              <path d="M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71"></path>
              <path d="M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71"></path>
            </svg>
            <span>Copy Link</span>
          </button>
        </div>
      </div>
    `;

    animateCountUp(getEl('profile-stat-repos'), user.publicRepos || 0);
    animateCountUp(getEl('profile-stat-followers'), user.followers || 0);
    animateCountUp(getEl('profile-stat-following'), user.following || 0);

    const copyBtn = getEl('btn-copy-link');
    if (copyBtn) {
      copyBtn.addEventListener('click', async () => {
        const url = new URL(window.location.href);
        url.searchParams.set('u', user.login);
        try {
          await navigator.clipboard.writeText(url.toString());
          copyBtn.innerHTML = `
            <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="#3fb950" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><polyline points="20 6 9 17 4 12"></polyline></svg>
            <span style="color: #3fb950;">Copied!</span>
          `;
          setTimeout(() => {
            copyBtn.innerHTML = `
              <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71"></path><path d="M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71"></path></svg>
              <span>Copy Link</span>
            `;
          }, 1800);
        } catch (err) {
          console.error('Failed to copy to clipboard', err);
        }
      });
    }
  }

  function renderAnalytics(stats) {
    const section = getEl('analytics-section');
    if (!section) return;

    const langColor = App.Charts && App.Charts.getLanguageColor ? App.Charts.getLanguageColor(stats.topLanguage) : '#58a6ff';

    section.innerHTML = `
      <div class="metrics-grid">
        <div class="metric-card">
          <div class="metric-card-top">
            <span class="metric-label">Repositories</span>
            <span class="metric-subtext">Analyzed</span>
          </div>
          <div class="metric-main">
            <span class="metric-value" id="stat-val-repos">0</span>
            <div class="metric-icon metric-icon-repos" aria-hidden="true">
              <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                <path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20"></path>
                <path d="M6.5 2H20v20H6.5A2.5 2.5 0 0 1 4 19.5v-15A2.5 2.5 0 0 1 6.5 2z"></path>
              </svg>
            </div>
          </div>
        </div>

        <div class="metric-card">
          <div class="metric-card-top">
            <span class="metric-label">Total Stars</span>
            <span class="metric-subtext">Earned</span>
          </div>
          <div class="metric-main">
            <span class="metric-value" id="stat-val-stars">0</span>
            <div class="metric-icon metric-icon-stars" aria-hidden="true">
              <svg width="15" height="15" viewBox="0 0 24 24" fill="currentColor">
                <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"></polygon>
              </svg>
            </div>
          </div>
        </div>

        <div class="metric-card">
          <div class="metric-card-top">
            <span class="metric-label">Total Forks</span>
            <span class="metric-subtext">Community</span>
          </div>
          <div class="metric-main">
            <span class="metric-value" id="stat-val-forks">0</span>
            <div class="metric-icon metric-icon-forks" aria-hidden="true">
              <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                <circle cx="12" cy="18" r="3"></circle>
                <circle cx="6" cy="6" r="3"></circle>
                <circle cx="18" cy="6" r="3"></circle>
                <path d="M18 9v1a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2V9"></path>
                <path d="M12 12v3"></path>
              </svg>
            </div>
          </div>
        </div>

        <div class="metric-card">
          <div class="metric-card-top">
            <span class="metric-label">Primary Language</span>
            <span class="metric-subtext">${stats.topLanguage !== 'N/A' ? `${stats.topLanguagePct}% of tagged` : 'None'}</span>
          </div>
          <div class="metric-main">
            <div class="metric-value metric-value-lang">
              ${stats.topLanguage !== 'N/A' ? `<span class="lang-color-dot" style="background-color: ${langColor};"></span>` : ''}
              <span>${escapeHtml(stats.topLanguage)}</span>
            </div>
            <div class="metric-icon metric-icon-lang" aria-hidden="true">
              <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                <polyline points="16 18 22 12 16 6"></polyline>
                <polyline points="8 6 2 12 8 18"></polyline>
              </svg>
            </div>
          </div>
        </div>
      </div>
    `;

    animateCountUp(getEl('stat-val-repos'), stats.totalRepos);
    animateCountUp(getEl('stat-val-stars'), stats.totalStars);
    animateCountUp(getEl('stat-val-forks'), stats.totalForks);
  }

  function renderChartsArea(stats) {
    const chartsSection = getEl('charts-section');
    if (!chartsSection) return;

    const languageCounts = stats.languageCounts || {};
    const hasLanguages = Object.keys(languageCounts).length > 0;

    chartsSection.innerHTML = `
      <div class="chart-card language-card">
        <div class="chart-card-header">
          <div class="chart-title-group">
            <h3 class="chart-title">Language Distribution</h3>
            <p class="chart-subtitle">Primary languages across public repositories</p>
          </div>
          ${hasLanguages ? `<span class="card-header-badge">${stats.distinctLanguageCount} Detected</span>` : ''}
        </div>
        
        <div class="language-card-body">
          <div class="chart-container" id="chart-container">
            ${
              hasLanguages
                ? '<canvas id="language-chart-canvas" aria-label="Language distribution doughnut chart"></canvas>'
                : '<p class="empty-chart-msg">No language data found in public repositories.</p>'
            }
          </div>

          ${
            hasLanguages
              ? `
              <div class="lang-telemetry-row">
                <div class="lang-telemetry-item">
                  <span class="lang-telemetry-label">Languages</span>
                  <span class="lang-telemetry-num">${stats.distinctLanguageCount}</span>
                </div>
                <div class="lang-telemetry-item">
                  <span class="lang-telemetry-label">Tagged</span>
                  <span class="lang-telemetry-num">${stats.taggedRepoCount}/${stats.totalRepos}</span>
                </div>
                <div class="lang-telemetry-item">
                  <span class="lang-telemetry-label">Primary</span>
                  <span class="lang-telemetry-num" title="${stats.topLanguage}">${escapeHtml(stats.topLanguage)} (${stats.topLanguagePct}%)</span>
                </div>
              </div>`
              : ''
          }
        </div>
      </div>
    `;

    if (hasLanguages && App.Charts && App.Charts.renderLanguageChart) {
      const canvas = getEl('language-chart-canvas');
      App.Charts.renderLanguageChart(canvas, languageCounts);
    }
  }

  function renderActivityInsights(activity) {
    const section = getEl('activity-section');
    if (!section) return;

    if (!activity || activity.reposWithDateCount === 0) {
      section.innerHTML = `
        <div class="chart-card activity-card">
          <div class="chart-card-header">
            <div class="chart-title-group">
              <h3 class="chart-title">Repository Activity</h3>
              <p class="chart-subtitle">Recent push frequency • rolling windows</p>
            </div>
          </div>
          <p class="empty-chart-msg">No push activity data available.</p>
        </div>
      `;
      return;
    }

    const mostRecent = activity.mostRecentUpdate;
    const oldest = activity.oldestUpdate;

    section.innerHTML = `
      <div class="chart-card activity-card">
        <div class="chart-card-header">
          <div class="chart-title-group">
            <h3 class="chart-title">Repository Activity</h3>
            <p class="chart-subtitle">Recent push frequency • rolling windows</p>
          </div>
          <span class="card-header-badge">Telemetry</span>
        </div>

        <div class="activity-card-body">
          <div class="activity-grid">
            <div class="activity-stat">
              <span class="activity-stat-label">Today</span>
              <span class="activity-stat-value">${activity.updatedToday}</span>
            </div>
            <div class="activity-stat">
              <span class="activity-stat-label">Last 7 Days</span>
              <span class="activity-stat-value">${activity.updatedLast7Days}</span>
            </div>
            <div class="activity-stat">
              <span class="activity-stat-label">Last 30 Days</span>
              <span class="activity-stat-value">${activity.updatedLast30Days}</span>
            </div>
          </div>

          <ul class="activity-timeline">
            ${
              mostRecent
                ? `<li class="activity-timeline-item">
                    <span class="timeline-tag">Most Recent</span>
                    <a class="timeline-repo-link" href="${escapeHtml(mostRecent.htmlUrl)}" target="_blank" rel="noopener noreferrer">${escapeHtml(mostRecent.name)}</a>
                    <span class="timeline-date" title="${escapeHtml(formatDate(mostRecent.pushedAt))}">${escapeHtml(formatRelativeTime(mostRecent.pushedAt))}</span>
                  </li>`
                : ''
            }
            ${
              oldest
                ? `<li class="activity-timeline-item">
                    <span class="timeline-tag">Oldest Update</span>
                    <a class="timeline-repo-link" href="${escapeHtml(oldest.htmlUrl)}" target="_blank" rel="noopener noreferrer">${escapeHtml(oldest.name)}</a>
                    <span class="timeline-date" title="${escapeHtml(formatDate(oldest.pushedAt))}">${escapeHtml(formatRelativeTime(oldest.pushedAt))}</span>
                  </li>`
                : ''
            }
          </ul>

          <p class="activity-footnote">Reflects repository push activity, not contribution history.</p>
        </div>
      </div>
    `;
  }

  function renderTopRepos(topRepos) {
    const section = getEl('top-repos-section');
    if (!section) return;

    if (!topRepos || topRepos.length === 0) {
      section.innerHTML = `
        <div class="chart-card top-repos-card">
          <div class="chart-card-header">
            <div class="chart-title-group">
              <h3 class="chart-title">Top Repositories</h3>
              <p class="chart-subtitle">Ranked by star count</p>
            </div>
          </div>
          <p class="empty-chart-msg">No repositories to rank.</p>
        </div>
      `;
      return;
    }

    const items = topRepos
      .map((repo, index) => {
        const rank = String(index + 1).padStart(2, '0');
        const langColor = App.Charts && App.Charts.getLanguageColor ? App.Charts.getLanguageColor(repo.language) : '#8b949e';
        return `
          <li class="top-repo-row">
            <span class="top-repo-rank">${rank}</span>
            <div class="top-repo-info">
              <a class="top-repo-name" href="${escapeHtml(repo.htmlUrl)}" target="_blank" rel="noopener noreferrer">
                <svg class="repo-icon" width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
                  <path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20"></path>
                  <path d="M6.5 2H20v20H6.5A2.5 2.5 0 0 1 4 19.5v-15A2.5 2.5 0 0 1 6.5 2z"></path>
                </svg>
                ${escapeHtml(repo.name)}
              </a>
              <span class="top-repo-desc">${repo.description ? escapeHtml(repo.description) : '<span class="no-desc">No description provided</span>'}</span>
            </div>
            <div class="top-repo-meta">
              ${
                repo.language
                  ? `<span class="repo-meta-item repo-lang-pill">
                      <span class="lang-color-dot" style="background-color: ${langColor};"></span>
                      <span>${escapeHtml(repo.language)}</span>
                    </span>`
                  : '<span class="repo-lang-spacer" aria-hidden="true"></span>'
              }
              <span class="repo-meta-item top-repo-stars" title="${repo.stars} stars">
                <svg width="13" height="13" viewBox="0 0 24 24" fill="currentColor" class="icon-star" aria-hidden="true">
                  <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"></polygon>
                </svg>
                ${(repo.stars || 0).toLocaleString()}
              </span>
              <span class="repo-meta-item top-repo-forks" title="${repo.forks} forks">
                <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="icon-fork" aria-hidden="true">
                  <circle cx="12" cy="18" r="3"></circle>
                  <circle cx="6" cy="6" r="3"></circle>
                  <circle cx="18" cy="6" r="3"></circle>
                  <path d="M18 9v1a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2V9"></path>
                  <path d="M12 12v3"></path>
                </svg>
                ${(repo.forks || 0).toLocaleString()}
              </span>
            </div>
          </li>
        `;
      })
      .join('');

    section.innerHTML = `
      <div class="chart-card top-repos-card">
        <div class="chart-card-header">
          <div class="chart-title-group">
            <h3 class="chart-title">Top Repositories</h3>
            <p class="chart-subtitle">Ranked by star count and community forks</p>
          </div>
          <span class="card-header-badge">Top ${topRepos.length}</span>
        </div>
        <ol class="top-repos-list">${items}</ol>
      </div>
    `;
  }

  function filterAndSortRepos() {
    const filtered = App.Analyzer.filterRepos(currentRepos, {
      query: activeFilter,
      language: activeLanguage
    });
    return App.Analyzer.sortRepos(filtered, activeSort);
  }

  function renderRepoCards(filteredList) {
    const listContainer = getEl('repo-list-container');
    const countBadge = getEl('filtered-count-badge');

    if (countBadge) {
      countBadge.textContent = `${filteredList.length} of ${currentRepos.length}`;
    }

    if (!listContainer) return;

    if (filteredList.length === 0) {
      listContainer.innerHTML = `
        <div class="repo-empty-filter">
          <p>No repositories match your current search or filter.</p>
          <button type="button" class="btn-reset-filters" id="btn-reset-filters">Reset filters</button>
        </div>
      `;

      const resetBtn = getEl('btn-reset-filters');
      if (resetBtn) {
        resetBtn.addEventListener('click', () => {
          activeFilter = '';
          activeLanguage = 'all';
          const searchInput = getEl('repo-search-input');
          const langSelect = getEl('repo-lang-filter');
          if (searchInput) searchInput.value = '';
          if (langSelect) langSelect.value = 'all';
          renderRepoCards(filterAndSortRepos());
        });
      }
      return;
    }

    listContainer.innerHTML = filteredList
      .map((repo) => {
        const langColor = App.Charts && App.Charts.getLanguageColor ? App.Charts.getLanguageColor(repo.language) : '#8b949e';
        const formattedDate = formatDate(repo.pushedAt);
        const relativeDate = formatRelativeTime(repo.pushedAt);

        return `
          <li class="repo-card">
            <div class="repo-card-top">
              <div class="repo-name-group">
                <svg class="repo-icon" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
                  <path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20"></path>
                  <path d="M6.5 2H20v20H6.5A2.5 2.5 0 0 1 4 19.5v-15A2.5 2.5 0 0 1 6.5 2z"></path>
                </svg>
                <a class="repo-name" href="${escapeHtml(repo.htmlUrl)}" target="_blank" rel="noopener noreferrer">
                  ${escapeHtml(repo.name)}
                </a>
              </div>
              <div class="repo-badges">
                ${repo.isFork ? '<span class="badge badge-fork">Fork</span>' : ''}
                ${repo.isArchived ? '<span class="badge badge-archived">Archived</span>' : ''}
              </div>
            </div>

            <p class="repo-description">
              ${repo.description ? escapeHtml(repo.description) : '<span class="no-desc">No description provided</span>'}
            </p>

            <div class="repo-meta">
              ${
                repo.language
                  ? `<span class="repo-meta-item repo-lang-pill">
                      <span class="lang-color-dot" style="background-color: ${langColor};"></span>
                      ${escapeHtml(repo.language)}
                    </span>`
                  : ''
              }
              <span class="repo-meta-item" title="${repo.stars} stars">
                <svg width="13" height="13" viewBox="0 0 24 24" fill="currentColor" class="icon-star" aria-hidden="true">
                  <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"></polygon>
                </svg>
                ${(repo.stars || 0).toLocaleString()}
              </span>
              <span class="repo-meta-item" title="${repo.forks} forks">
                <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="icon-fork" aria-hidden="true">
                  <circle cx="12" cy="18" r="3"></circle>
                  <circle cx="6" cy="6" r="3"></circle>
                  <circle cx="18" cy="6" r="3"></circle>
                  <path d="M18 9v1a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2V9"></path>
                  <path d="M12 12v3"></path>
                </svg>
                ${(repo.forks || 0).toLocaleString()}
              </span>
              ${
                formattedDate
                  ? `<span class="repo-meta-item repo-updated" title="Last push: ${escapeHtml(formattedDate)} (${escapeHtml(repo.pushedAt)})">
                      Updated ${escapeHtml(relativeDate)}
                    </span>`
                  : ''
              }
            </div>
          </li>
        `;
      })
      .join('');
  }

  function renderRepoList(repos) {
    currentRepos = repos || [];
    activeFilter = '';
    activeLanguage = 'all';
    activeSort = 'updated';

    const section = getEl('repos-section');

    // Calculate analytics and render overview, middle row, and top repos
    const analytics = App.Analyzer.computeStats(currentRepos);
    renderAnalytics(analytics);
    renderChartsArea(analytics);
    renderActivityInsights(App.Analyzer.getActivityInsights(currentRepos));
    renderTopRepos(App.Analyzer.getTopRepositories(currentRepos, 5));

    if (currentRepos.length === 0) {
      if (section) {
        section.innerHTML = `
          <div class="empty-repos-card">
            <div class="empty-icon" aria-hidden="true">
              <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                <path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20"></path>
                <path d="M6.5 2H20v20H6.5A2.5 2.5 0 0 1 4 19.5v-15A2.5 2.5 0 0 1 6.5 2z"></path>
              </svg>
            </div>
            <h3>No Public Repositories</h3>
            <p class="empty-message">This GitHub user does not currently have any public repositories to analyze.</p>
          </div>
        `;
      }
      return;
    }

    const languages = Object.keys(analytics.languageCounts).sort();

    const langOptions = languages
      .map((l) => `<option value="${escapeHtml(l)}">${escapeHtml(l)} (${analytics.languageCounts[l]})</option>`)
      .join('');

    if (section) {
      section.innerHTML = `
        <div class="repos-header-bar">
          <div class="repos-title-group">
            <h3 class="repos-title">Repositories</h3>
            <span class="repos-badge" id="filtered-count-badge">${currentRepos.length}</span>
          </div>
        </div>

        <div class="repos-controls-bar">
          <div class="repo-search-box">
            <svg class="control-search-icon" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
              <circle cx="11" cy="11" r="8"></circle>
              <line x1="21" y1="21" x2="16.65" y2="16.65"></line>
            </svg>
            <input
              type="text"
              id="repo-search-input"
              class="control-input"
              placeholder="Filter repositories by name or description..."
              autocomplete="off"
            >
          </div>

          <div class="repo-filter-selects">
            <select id="repo-lang-filter" class="control-select" aria-label="Filter by language">
              <option value="all">All Languages</option>
              ${langOptions}
            </select>

            <select id="repo-sort-select" class="control-select" aria-label="Sort repositories">
              <option value="updated">Recently Updated</option>
              <option value="stars">Most Stars</option>
              <option value="forks">Most Forks</option>
              <option value="name">Name (A-Z)</option>
            </select>
          </div>
        </div>

        <ul id="repo-list-container" class="repo-list"></ul>
      `;
    }

    // Render initial list
    renderRepoCards(filterAndSortRepos());

    // Attach live filter & sort event listeners
    const searchInput = getEl('repo-search-input');
    const langSelect = getEl('repo-lang-filter');
    const sortSelect = getEl('repo-sort-select');

    if (searchInput) {
      searchInput.addEventListener('input', (e) => {
        activeFilter = e.target.value.trim();
        renderRepoCards(filterAndSortRepos());
      });
    }

    if (langSelect) {
      langSelect.addEventListener('change', (e) => {
        activeLanguage = e.target.value;
        renderRepoCards(filterAndSortRepos());
      });
    }

    if (sortSelect) {
      sortSelect.addEventListener('change', (e) => {
        activeSort = e.target.value;
        renderRepoCards(filterAndSortRepos());
      });
    }
  }

  // Data for "Explore by Developer Type" (14 curated profiles per category)
  const EXPLORER_CATEGORIES = [
    {
      id: 'systems',
      num: '01',
      name: 'Systems & Infrastructure',
      interests: ['Linux', 'C/C++', 'Rust', 'Git', 'Kernel', 'Networking', 'Distributed Systems'],
      profiles: [
        {
          username: 'torvalds',
          displayName: 'Linus Torvalds',
          avatar: 'https://avatars.githubusercontent.com/torvalds?s=96',
          descriptor: 'Creator of the Linux kernel and Git. Fundamental systems architecture and OS kernel design.',
          tags: ['Linux', 'C', 'Kernel'],
          featured: true
        },
        {
          username: 'antirez',
          displayName: 'Salvatore Sanfilippo',
          avatar: 'https://avatars.githubusercontent.com/antirez?s=96',
          descriptor: 'Creator of Redis. High-throughput in-memory databases, networking, and C systems.',
          tags: ['Redis', 'C', 'Databases']
        },
        {
          username: 'mitchellh',
          displayName: 'Mitchell Hashimoto',
          avatar: 'https://avatars.githubusercontent.com/mitchellh?s=96',
          descriptor: 'Co-founder of HashiCorp. Creator of Vagrant, Packer, and Ghostty terminal.',
          tags: ['Go', 'Zig', 'Infrastructure']
        },
        {
          username: 'brendangregg',
          displayName: 'Brendan Gregg',
          avatar: 'https://avatars.githubusercontent.com/brendangregg?s=96',
          descriptor: 'Systems performance engineer. eBPF, flame graphs, and Linux kernel observability.',
          tags: ['eBPF', 'Linux', 'Performance']
        },
        {
          username: 'kelseyhightower',
          displayName: 'Kelsey Hightower',
          avatar: 'https://avatars.githubusercontent.com/kelseyhightower?s=96',
          descriptor: 'Distributed systems pioneer, Kubernetes educator, and cloud-native architecture leader.',
          tags: ['Kubernetes', 'Go', 'DevOps']
        },
        {
          username: 'jpetazzo',
          displayName: 'Jérôme Petazzoni',
          avatar: 'https://avatars.githubusercontent.com/jpetazzo?s=96',
          descriptor: 'Container systems pioneer, Docker architect, and container orchestration educator.',
          tags: ['Docker', 'Containers', 'Linux']
        },
        {
          username: 'bnoordhuis',
          displayName: 'Ben Noordhuis',
          avatar: 'https://avatars.githubusercontent.com/bnoordhuis?s=96',
          descriptor: 'Core libuv, Node.js runtime, and low-level V8 asynchronous I/O systems.',
          tags: ['C/C++', 'libuv', 'Async I/O']
        },
        {
          username: 'solomonstre',
          displayName: 'Solomon Hykes',
          avatar: 'https://avatars.githubusercontent.com/solomonstre?s=96',
          descriptor: 'Creator of Docker and Dagger. Programmable CI/CD and container delivery engines.',
          tags: ['Docker', 'Dagger', 'Containers']
        },
        {
          username: 'ibraheemdev',
          displayName: 'Ibraheem Ahmed',
          avatar: 'https://avatars.githubusercontent.com/ibraheemdev?s=96',
          descriptor: 'Rust async runtime internals, Tokio contributor, and high-performance networking.',
          tags: ['Rust', 'Tokio', 'Async']
        },
        {
          username: 'alexcrichton',
          displayName: 'Alex Crichton',
          avatar: 'https://avatars.githubusercontent.com/alexcrichton?s=96',
          descriptor: 'Longtime Rust compiler team, Wasmtime, WebAssembly, and Cargo architect.',
          tags: ['Rust', 'Wasm', 'Cargo']
        },
        {
          username: 'danieldk',
          displayName: 'Daniël de Kok',
          avatar: 'https://avatars.githubusercontent.com/danieldk?s=96',
          descriptor: 'Rust low-level machine learning runtimes, high-performance C++ storage and caching.',
          tags: ['Rust', 'C++', 'Concurrency']
        },
        {
          username: 'davecheney',
          displayName: 'Dave Cheney',
          avatar: 'https://avatars.githubusercontent.com/davecheney?s=96',
          descriptor: 'Go language contributor, high-performance concurrency patterns, and architecture.',
          tags: ['Go', 'Concurrency', 'Systems']
        },
        {
          username: 'kristoff-it',
          displayName: 'Loris Cro',
          avatar: 'https://avatars.githubusercontent.com/kristoff-it?s=96',
          descriptor: 'VP of Community at Zig Software Foundation. Systems programming and async I/O.',
          tags: ['Zig', 'Systems', 'Async']
        },
        {
          username: 'cloudflare',
          displayName: 'Cloudflare',
          avatar: 'https://avatars.githubusercontent.com/cloudflare?s=96',
          descriptor: 'Edge networking, DNS, Workers V8 runtime, and open-source cryptographic infra.',
          tags: ['Edge', 'Networking', 'Rust'],
          isOrg: true
        }
      ]
    },
    {
      id: 'web',
      num: '02',
      name: 'Web & JavaScript',
      interests: ['JavaScript', 'TypeScript', 'React', 'Node.js', 'Vue', 'Next.js', 'Toolchains'],
      profiles: [
        {
          username: 'sindresorhus',
          displayName: 'Sindre Sorhus',
          avatar: 'https://avatars.githubusercontent.com/sindresorhus?s=96',
          descriptor: 'Full-time open sourcer. 1,000+ npm packages powering the modern JavaScript ecosystem.',
          tags: ['JavaScript', 'Node.js', 'CLI'],
          featured: true
        },
        {
          username: 'gaearon',
          displayName: 'Dan Abramov',
          avatar: 'https://avatars.githubusercontent.com/gaearon?s=96',
          descriptor: 'Co-author of Redux and Create React App. React architecture & frontend mental models.',
          tags: ['React', 'Redux', 'JavaScript']
        },
        {
          username: 'tj',
          displayName: 'TJ Holowaychuk',
          avatar: 'https://avatars.githubusercontent.com/tj?s=96',
          descriptor: 'Prolific author of Express, Koa, Commander, and modern microservices tooling.',
          tags: ['Node.js', 'Express', 'Go']
        },
        {
          username: 'yyx990803',
          displayName: 'Evan You',
          avatar: 'https://avatars.githubusercontent.com/yyx990803?s=96',
          descriptor: 'Creator of Vue.js and Vite. High-performance frontend toolchains & reactivity systems.',
          tags: ['Vue', 'Vite', 'TypeScript']
        },
        {
          username: 'antfu',
          displayName: 'Anthony Fu',
          avatar: 'https://avatars.githubusercontent.com/antfu?s=96',
          descriptor: 'Prolific open sourcer. Vue/Vite/Nuxt core team, creator of UnoCSS, Vitest, and Slidev.',
          tags: ['Vue', 'Vite', 'Nuxt']
        },
        {
          username: 'rauchg',
          displayName: 'Guillermo Rauch',
          avatar: 'https://avatars.githubusercontent.com/rauchg?s=96',
          descriptor: 'CEO of Vercel. Creator of Socket.io, Mongoose, and early Next.js architecture.',
          tags: ['Next.js', 'React', 'Cloud']
        },
        {
          username: 'wesbos',
          displayName: 'Wes Bos',
          avatar: 'https://avatars.githubusercontent.com/wesbos?s=96',
          descriptor: 'Full-stack JavaScript educator, web tooling advocate, and podcast host.',
          tags: ['JavaScript', 'React', 'Node.js']
        },
        {
          username: 'kentcdodds',
          displayName: 'Kent C. Dodds',
          avatar: 'https://avatars.githubusercontent.com/kentcdodds?s=96',
          descriptor: 'Creator of Testing Library, Remix co-founder, and full-stack React educator.',
          tags: ['Testing', 'React', 'Remix']
        },
        {
          username: 'addyosmani',
          displayName: 'Addy Osmani',
          avatar: 'https://avatars.githubusercontent.com/addyosmani?s=96',
          descriptor: 'Engineering leader at Google Chrome. Web performance, design patterns, and browser runtimes.',
          tags: ['Performance', 'Chrome', 'JavaScript']
        },
        {
          username: 'paulirish',
          displayName: 'Paul Irish',
          avatar: 'https://avatars.githubusercontent.com/paulirish?s=96',
          descriptor: 'Web developer performance advocate at Google Chrome and DevTools pioneer.',
          tags: ['DevTools', 'Performance', 'Browsers']
        },
        {
          username: 'developit',
          displayName: 'Jason Miller',
          avatar: 'https://avatars.githubusercontent.com/developit?s=96',
          descriptor: 'Creator of Preact and WMR. Micro-frameworks and web component runtimes.',
          tags: ['Preact', 'JavaScript', 'Performance']
        },
        {
          username: 'lukeed',
          displayName: 'Luke Edwards',
          avatar: 'https://avatars.githubusercontent.com/lukeed?s=96',
          descriptor: 'Author of Polka, Tctx, and ultra-lightweight high-throughput Node.js micro-modules.',
          tags: ['Node.js', 'Performance', 'Micro-libs']
        },
        {
          username: 'Rich-Harris',
          displayName: 'Rich Harris',
          avatar: 'https://avatars.githubusercontent.com/Rich-Harris?s=96',
          descriptor: 'Creator of Svelte, Rollup, and SvelteKit. Compile-time UI and reactivity paradigms.',
          tags: ['Svelte', 'Rollup', 'Compilers']
        },
        {
          username: 'expressjs',
          displayName: 'Express.js',
          avatar: 'https://avatars.githubusercontent.com/expressjs?s=96',
          descriptor: 'Fast, unopinionated, minimalist web framework for Node.js.',
          tags: ['Express', 'Node.js', 'APIs'],
          isOrg: true
        }
      ]
    },
    {
      id: 'python',
      num: '03',
      name: 'Python & Data',
      interests: ['Python', 'FastAPI', 'Data Science', 'Machine Learning', 'Async', 'Web Frameworks'],
      profiles: [
        {
          username: 'tiangolo',
          displayName: 'Sebastián Ramírez',
          avatar: 'https://avatars.githubusercontent.com/tiangolo?s=96',
          descriptor: 'Creator of FastAPI, Typer, and SQLModel. Modern high-performance async Python APIs.',
          tags: ['FastAPI', 'Async', 'Pydantic'],
          featured: true
        },
        {
          username: 'gvanrossum',
          displayName: 'Guido van Rossum',
          avatar: 'https://avatars.githubusercontent.com/gvanrossum?s=96',
          descriptor: 'Creator of the Python programming language (BDFL emeritus). Core runtime design.',
          tags: ['Python', 'CPython', 'Compilers']
        },
        {
          username: 'mitsuhiko',
          displayName: 'Armin Ronacher',
          avatar: 'https://avatars.githubusercontent.com/mitsuhiko?s=96',
          descriptor: 'Creator of Flask, Jinja, Click, Rye, and founding engineer at Sentry.',
          tags: ['Flask', 'Python', 'Rust']
        },
        {
          username: 'treyhunner',
          displayName: 'Trey Hunner',
          avatar: 'https://avatars.githubusercontent.com/treyhunner?s=96',
          descriptor: 'Python educator, author of Python Morsels, and iterative Python patterns expert.',
          tags: ['Python', 'Iterators', 'Education']
        },
        {
          username: 'kennethreitz',
          displayName: 'Kenneth Reitz',
          avatar: 'https://avatars.githubusercontent.com/kennethreitz?s=96',
          descriptor: 'Creator of Requests, Pipenv, and author of Python for Humans philosophy.',
          tags: ['Requests', 'HTTP', 'APIs']
        },
        {
          username: 'faassen',
          displayName: 'Martijn Faassen',
          avatar: 'https://avatars.githubusercontent.com/faassen?s=96',
          descriptor: 'Longtime Python core contributor, author of Morepath, and declarative systems pioneer.',
          tags: ['Python', 'Architecture', 'Web']
        },
        {
          username: 'glyph',
          displayName: 'Glyph Lefkowitz',
          avatar: 'https://avatars.githubusercontent.com/glyph?s=96',
          descriptor: 'Creator of Twisted. Pioneer of asynchronous networking in Python.',
          tags: ['Twisted', 'Async', 'Networking']
        },
        {
          username: 'hugovk',
          displayName: 'Hugo van Kemenade',
          avatar: 'https://avatars.githubusercontent.com/hugovk?s=96',
          descriptor: 'Prolific CPython release manager and Python open-source maintenance leader.',
          tags: ['CPython', 'Packaging', 'Open Source']
        },
        {
          username: 'hynek',
          displayName: 'Hynek Schlawack',
          avatar: 'https://avatars.githubusercontent.com/hynek?s=96',
          descriptor: 'Creator of attrs, structlog, and Python production engineering advocate.',
          tags: ['attrs', 'Structlog', 'Typing']
        },
        {
          username: 'encukou',
          displayName: 'Petr Viktorin',
          avatar: 'https://avatars.githubusercontent.com/encukou?s=96',
          descriptor: 'CPython core developer, Python multi-phase initialization and C-API architect.',
          tags: ['CPython', 'C-API', 'Internals']
        },
        {
          username: 'psf',
          displayName: 'Python Software Foundation',
          avatar: 'https://avatars.githubusercontent.com/psf?s=96',
          descriptor: 'Home of CPython, PyPI, and global Python language stewardship.',
          tags: ['CPython', 'PyPI', 'Ecosystem'],
          isOrg: true
        },
        {
          username: 'pallets',
          displayName: 'Pallets Projects',
          avatar: 'https://avatars.githubusercontent.com/pallets?s=96',
          descriptor: 'Maintainers of Flask, Jinja, Werkzeug, Click, and itsdangerous.',
          tags: ['Flask', 'Jinja', 'Werkzeug'],
          isOrg: true
        },
        {
          username: 'pydantic',
          displayName: 'Pydantic',
          avatar: 'https://avatars.githubusercontent.com/pydantic?s=96',
          descriptor: 'Data validation and parsing library powered by Rust core extensions.',
          tags: ['Validation', 'Rust', 'Type Safety'],
          isOrg: true
        },
        {
          username: 'pandas-dev',
          displayName: 'pandas',
          avatar: 'https://avatars.githubusercontent.com/pandas-dev?s=96',
          descriptor: 'Fundamental high-performance data analysis and data structures library for Python.',
          tags: ['Data Science', 'DataFrames', 'NumPy'],
          isOrg: true
        }
      ]
    },
    {
      id: 'ai',
      num: '04',
      name: 'AI & Machine Learning',
      interests: ['LLMs', 'PyTorch', 'Transformers', 'Deep Learning', 'Computer Vision', 'Generative AI'],
      profiles: [
        {
          username: 'karpathy',
          displayName: 'Andrej Karpathy',
          avatar: 'https://avatars.githubusercontent.com/karpathy?s=96',
          descriptor: 'Former Tesla AI Director & OpenAI founding member. nanoGPT, micrograd, and LLM education.',
          tags: ['Deep Learning', 'LLMs', 'nanoGPT'],
          featured: true
        },
        {
          username: 'rasbt',
          displayName: 'Sebastian Raschka',
          avatar: 'https://avatars.githubusercontent.com/rasbt?s=96',
          descriptor: 'AI researcher, author of Build a Large Language Model from Scratch, and PyTorch lead.',
          tags: ['PyTorch', 'LLMs', 'Transformers']
        },
        {
          username: 'geohot',
          displayName: 'George Hotz',
          avatar: 'https://avatars.githubusercontent.com/geohot?s=96',
          descriptor: 'Creator of tinygrad and comma.ai. Hardware-accelerated tensor runtimes.',
          tags: ['tinygrad', 'CUDA', 'Accelerators']
        },
        {
          username: 'hwchase17',
          displayName: 'Harrison Chase',
          avatar: 'https://avatars.githubusercontent.com/hwchase17?s=96',
          descriptor: 'Co-founder and CEO of LangChain. LLM application chains and orchestration agents.',
          tags: ['LangChain', 'Agents', 'LLMs']
        },
        {
          username: 'lucidrains',
          displayName: 'Phil Wang',
          avatar: 'https://avatars.githubusercontent.com/lucidrains?s=96',
          descriptor: 'Renowned for reproducing cutting-edge generative AI, diffusion, and transformer papers.',
          tags: ['PyTorch', 'Diffusion', 'Transformers']
        },
        {
          username: 'drprofiler',
          displayName: 'Alex Dimakis',
          avatar: 'https://avatars.githubusercontent.com/drprofiler?s=96',
          descriptor: 'AI professor, researcher in generative diffusion models and error-correcting codes.',
          tags: ['Diffusion', 'Research', 'Theory']
        },
        {
          username: 'facebookresearch',
          displayName: 'Meta Research',
          avatar: 'https://avatars.githubusercontent.com/facebookresearch?s=96',
          descriptor: 'Creators of LLaMA, PyTorch, FAISS, and fundamental open AI research.',
          tags: ['LLaMA', 'PyTorch', 'FAISS'],
          isOrg: true
        },
        {
          username: 'huggingface',
          displayName: 'Hugging Face',
          avatar: 'https://avatars.githubusercontent.com/huggingface?s=96',
          descriptor: 'Hub and reference implementations for Transformers, Diffusers, and open datasets.',
          tags: ['Transformers', 'Diffusers', 'Datasets'],
          isOrg: true
        },
        {
          username: 'openai',
          displayName: 'OpenAI',
          avatar: 'https://avatars.githubusercontent.com/openai?s=96',
          descriptor: 'OpenAI public research repositories, Triton language, and Whisper models.',
          tags: ['Triton', 'Whisper', 'GPT SDKs'],
          isOrg: true
        },
        {
          username: 'ggerganov',
          displayName: 'Georgi Gerganov',
          avatar: 'https://avatars.githubusercontent.com/ggerganov?s=96',
          descriptor: 'Creator of llama.cpp, whisper.cpp, and edge-native quantized tensor inference.',
          tags: ['llama.cpp', 'C/C++', 'Inference']
        },
        {
          username: 'vllm-project',
          displayName: 'vLLM',
          avatar: 'https://avatars.githubusercontent.com/vllm-project?s=96',
          descriptor: 'High-throughput, memory-efficient LLM serving engine with PagedAttention.',
          tags: ['LLM Serving', 'PagedAttention', 'CUDA'],
          isOrg: true
        },
        {
          username: 'tatsu-lab',
          displayName: 'Stanford CRFM / Alpaca',
          avatar: 'https://avatars.githubusercontent.com/tatsu-lab?s=96',
          descriptor: 'Stanford Center for Research on Foundation Models and Alpaca instruction tuning.',
          tags: ['Alpaca', 'Tuning', 'Research'],
          isOrg: true
        },
        {
          username: 'run-llama',
          displayName: 'LlamaIndex',
          avatar: 'https://avatars.githubusercontent.com/run-llama?s=96',
          descriptor: 'Data framework and contextual retrieval pipelines for LLM applications.',
          tags: ['RAG', 'Retrieval', 'LLMs'],
          isOrg: true
        },
        {
          username: 'mistralai',
          displayName: 'Mistral AI',
          avatar: 'https://avatars.githubusercontent.com/mistralai?s=96',
          descriptor: 'European open-weights foundation models including Mistral 7B and Mixtral.',
          tags: ['Foundation Models', 'MoE', 'Inference'],
          isOrg: true
        }
      ]
    },
    {
      id: 'frontend',
      num: '05',
      name: 'Frontend & UI',
      interests: ['React', 'Vue', 'Design Systems', 'Tailwind', 'Accessibility', 'Component Libraries'],
      profiles: [
        {
          username: 'shadcn',
          displayName: 'shadcn',
          avatar: 'https://avatars.githubusercontent.com/shadcn?s=96',
          descriptor: 'Creator of shadcn/ui. Beautifully crafted accessible components built with Radix & Tailwind.',
          tags: ['UI Components', 'Radix UI', 'Tailwind'],
          featured: true
        },
        {
          username: 'kentcdodds',
          displayName: 'Kent C. Dodds',
          avatar: 'https://avatars.githubusercontent.com/kentcdodds?s=96',
          descriptor: 'Creator of Testing Library, Remix co-founder, and modern React component design.',
          tags: ['Testing Library', 'React', 'Remix']
        },
        {
          username: 'yyx990803',
          displayName: 'Evan You',
          avatar: 'https://avatars.githubusercontent.com/yyx990803?s=96',
          descriptor: 'Creator of Vue.js and Vite. Reactive component architectures and declarative templates.',
          tags: ['Vue', 'Vite', 'Reactivity']
        },
        {
          username: 'antfu',
          displayName: 'Anthony Fu',
          avatar: 'https://avatars.githubusercontent.com/antfu?s=96',
          descriptor: 'Creator of UnoCSS, Slidev, and VueUse component collection.',
          tags: ['UnoCSS', 'VueUse', 'Tooling']
        },
        {
          username: 'gaearon',
          displayName: 'Dan Abramov',
          avatar: 'https://avatars.githubusercontent.com/gaearon?s=96',
          descriptor: 'Co-author of Redux and Create React App. Modern UI architectures.',
          tags: ['React', 'UI Design', 'JavaScript']
        },
        {
          username: 'leerob',
          displayName: 'Lee Robinson',
          avatar: 'https://avatars.githubusercontent.com/leerob?s=96',
          descriptor: 'VP of Developer Experience at Vercel. Next.js, React Server Components, and UI patterns.',
          tags: ['Next.js', 'React', 'Frontend']
        },
        {
          username: 'peduarte',
          displayName: 'Pedro Duarte',
          avatar: 'https://avatars.githubusercontent.com/peduarte?s=96',
          descriptor: 'Design engineer at Vercel, former creator of Radix UI and Modulz component systems.',
          tags: ['Radix UI', 'Design Systems', 'CSS']
        },
        {
          username: 'SaraVieira',
          displayName: 'Sara Vieira',
          avatar: 'https://avatars.githubusercontent.com/SaraVieira?s=96',
          descriptor: 'International speaker, creative frontend developer, author of The Opinionated Guide to React.',
          tags: ['React', 'Creative UI', 'CSS']
        },
        {
          username: 'bchiang7',
          displayName: 'Brittany Chiang',
          avatar: 'https://avatars.githubusercontent.com/bchiang7?s=96',
          descriptor: 'Software engineer and designer known for refined minimal portfolio templates.',
          tags: ['Design', 'Portfolio', 'CSS']
        },
        {
          username: 'mxstbr',
          displayName: 'Max Stoiber',
          avatar: 'https://avatars.githubusercontent.com/mxstbr?s=96',
          descriptor: 'Creator of Styled Components, Bedrock, and component-driven styling systems.',
          tags: ['Styled Components', 'React', 'CSS-in-JS']
        },
        {
          username: 'tailwindlabs',
          displayName: 'Tailwind Labs',
          avatar: 'https://avatars.githubusercontent.com/tailwindlabs?s=96',
          descriptor: 'Creators of Tailwind CSS, Headless UI, and Heroicons.',
          tags: ['Tailwind CSS', 'Headless UI', 'Icons'],
          isOrg: true
        },
        {
          username: 'radix-ui',
          displayName: 'Radix UI',
          avatar: 'https://avatars.githubusercontent.com/radix-ui?s=96',
          descriptor: 'Unstyled, accessible UI components for building high-quality design systems.',
          tags: ['Accessibility', 'Primitives', 'React'],
          isOrg: true
        },
        {
          username: 'ariakit',
          displayName: 'Ariakit',
          avatar: 'https://avatars.githubusercontent.com/ariakit?s=96',
          descriptor: 'Accessible, unstyled React components for building inclusive design systems and widgets.',
          tags: ['WAI-ARIA', 'Accessibility', 'Primitives'],
          isOrg: true
        },
        {
          username: 'chakra-ui',
          displayName: 'Chakra UI',
          avatar: 'https://avatars.githubusercontent.com/chakra-ui?s=96',
          descriptor: 'Simple, modular, and accessible component library for React applications.',
          tags: ['Chakra UI', 'React', 'Design Tokens'],
          isOrg: true
        }
      ]
    },
    {
      id: 'mobile',
      num: '06',
      name: 'Mobile & Cross-Platform',
      interests: ['React Native', 'Flutter', 'iOS/Swift', 'Android/Kotlin', 'Expo', 'Cross-Platform'],
      profiles: [
        {
          username: 'brentvatne',
          displayName: 'Brent Vatne',
          avatar: 'https://avatars.githubusercontent.com/brentvatne?s=96',
          descriptor: 'Core engineer at Expo. Universal React Native platform, navigation, and mobile tooling.',
          tags: ['Expo', 'React Native', 'Mobile'],
          featured: true
        },
        {
          username: 'flutter',
          displayName: 'Flutter',
          avatar: 'https://avatars.githubusercontent.com/flutter?s=96',
          descriptor: 'Google\'s open-source multi-platform framework for iOS, Android, web, and desktop.',
          tags: ['Flutter', 'Dart', 'Cross-Platform'],
          isOrg: true
        },
        {
          username: 'expo',
          displayName: 'Expo',
          avatar: 'https://avatars.githubusercontent.com/expo?s=96',
          descriptor: 'The open-source platform and framework for universal native apps with React.',
          tags: ['Expo', 'React Native', 'Universal Apps'],
          isOrg: true
        },
        {
          username: 'reactwg',
          displayName: 'React Native Core WG',
          avatar: 'https://avatars.githubusercontent.com/reactwg?s=96',
          descriptor: 'Official working group guiding the New Architecture (Fabric & TurboModules).',
          tags: ['React Native', 'Fabric', 'C++'],
          isOrg: true
        },
        {
          username: 'software-mansion',
          displayName: 'Software Mansion',
          avatar: 'https://avatars.githubusercontent.com/software-mansion?s=96',
          descriptor: 'Creators of React Native Reanimated, Gesture Handler, and Screens.',
          tags: ['Reanimated', 'Gestures', 'Native'],
          isOrg: true
        },
        {
          username: 'invertase',
          displayName: 'Invertase',
          avatar: 'https://avatars.githubusercontent.com/invertase?s=96',
          descriptor: 'Creators of React Native Firebase, Notifee, and mobile cloud tooling.',
          tags: ['Firebase', 'Push Notifications', 'Mobile'],
          isOrg: true
        },
        {
          username: 'mrousavy',
          displayName: 'Marc Rousavy',
          avatar: 'https://avatars.githubusercontent.com/mrousavy?s=96',
          descriptor: 'Creator of React Native VisionCamera, Nitro Modules, and high-performance native bridges.',
          tags: ['VisionCamera', 'JSI', 'Native Bridges']
        },
        {
          username: 'EvanBacon',
          displayName: 'Evan Bacon',
          avatar: 'https://avatars.githubusercontent.com/EvanBacon?s=96',
          descriptor: 'Director of Eng at Expo. Universal Expo Router, Webpack/Metro bundlers, and native CLI.',
          tags: ['Expo Router', 'Metro', 'React Native']
        },
        {
          username: 'wcandillon',
          displayName: 'William Candillon',
          avatar: 'https://avatars.githubusercontent.com/wcandillon?s=96',
          descriptor: 'Creator of Can it be done in React Native?, Skia for React Native, and animations.',
          tags: ['Skia', '2D Graphics', 'Animations']
        },
        {
          username: 'oblador',
          displayName: 'Joel Arvidsson',
          avatar: 'https://avatars.githubusercontent.com/oblador?s=96',
          descriptor: 'Author of react-native-vector-icons, keychain, and essential mobile utility packages.',
          tags: ['Icons', 'Security', 'Native Modules']
        },
        {
          username: 'facebook',
          displayName: 'Meta / React Native',
          avatar: 'https://avatars.githubusercontent.com/facebook?s=96',
          descriptor: 'Meta open-source home of the core React Native runtime and Hermes JavaScript engine.',
          tags: ['React Native', 'Hermes', 'Core Engine'],
          isOrg: true
        },
        {
          username: 'ionic-team',
          displayName: 'Ionic',
          avatar: 'https://avatars.githubusercontent.com/ionic-team?s=96',
          descriptor: 'Creators of Capacitor and Ionic Framework for cross-platform hybrid apps.',
          tags: ['Capacitor', 'Web Native', 'Hybrid'],
          isOrg: true
        },
        {
          username: 'GeekyAnts',
          displayName: 'GeekyAnts',
          avatar: 'https://avatars.githubusercontent.com/GeekyAnts?s=96',
          descriptor: 'Creators of NativeBase and gluestack-ui mobile component libraries.',
          tags: ['NativeBase', 'Mobile UI', 'Components'],
          isOrg: true
        },
        {
          username: 'callstack',
          displayName: 'Callstack',
          avatar: 'https://avatars.githubusercontent.com/callstack?s=96',
          descriptor: 'React Native consultancy, authors of React Native Paper and Repack bundler.',
          tags: ['Paper', 'Repack', 'Bundlers'],
          isOrg: true
        }
      ]
    },
    {
      id: 'devtools',
      num: '07',
      name: 'Developer Tools',
      interests: ['CLI', 'Rust Tools', 'Productivity', 'Terminal', 'Compilers', 'Linters'],
      profiles: [
        {
          username: 'charmbracelet',
          displayName: 'Charm',
          avatar: 'https://avatars.githubusercontent.com/charmbracelet?s=96',
          descriptor: 'Creators of Gum, Bubble Tea, Lip Gloss, and gorgeous terminal developer applications.',
          tags: ['Terminal UI', 'Go', 'Bubble Tea'],
          featured: true,
          isOrg: true
        },
        {
          username: 'sharkdp',
          displayName: 'David Peter',
          avatar: 'https://avatars.githubusercontent.com/sharkdp?s=96',
          descriptor: 'Creator of bat (cat with wings), hyperfine, fd, and vivid modern terminal utilities.',
          tags: ['Rust', 'CLI', 'bat']
        },
        {
          username: 'junegunn',
          displayName: 'Junegunn Choi',
          avatar: 'https://avatars.githubusercontent.com/junegunn?s=96',
          descriptor: 'Creator of fzf (command-line fuzzy finder), vim-plug, and terminal interactive tools.',
          tags: ['fzf', 'Fuzzy Finder', 'Go']
        },
        {
          username: 'BurntSushi',
          displayName: 'Andrew Gallant',
          avatar: 'https://avatars.githubusercontent.com/BurntSushi?s=96',
          descriptor: 'Creator of ripgrep, regex, and ultra-fast Rust text processing tools.',
          tags: ['ripgrep', 'Rust', 'Text Search']
        },
        {
          username: 'antfu',
          displayName: 'Anthony Fu',
          avatar: 'https://avatars.githubusercontent.com/antfu?s=96',
          descriptor: 'Prolific author of dev utilities: Vitest, Type Challenges, and taze dependency manager.',
          tags: ['Vitest', 'Developer Tools', 'CLI']
        },
        {
          username: 'sindresorhus',
          displayName: 'Sindre Sorhus',
          avatar: 'https://avatars.githubusercontent.com/sindresorhus?s=96',
          descriptor: 'Hundreds of CLI tools, pure-prompt, electron utilities, and desktop apps.',
          tags: ['CLI', 'Productivity', 'Utilities']
        },
        {
          username: 'astral-sh',
          displayName: 'Astral',
          avatar: 'https://avatars.githubusercontent.com/astral-sh?s=96',
          descriptor: 'Creators of Ruff (ultra-fast Python linter/formatter) and uv (fast Python package manager).',
          tags: ['Ruff', 'uv', 'Rust'],
          isOrg: true
        },
        {
          username: 'denoland',
          displayName: 'Deno',
          avatar: 'https://avatars.githubusercontent.com/denoland?s=96',
          descriptor: 'Creators of Deno modern JavaScript/TypeScript runtime with built-in test, lint, and bundle.',
          tags: ['Deno', 'Rust', 'V8 Runtimes'],
          isOrg: true
        },
        {
          username: 'mitsuhiko',
          displayName: 'Armin Ronacher',
          avatar: 'https://avatars.githubusercontent.com/mitsuhiko?s=96',
          descriptor: 'Rye (Python workflow tool), Insta (snapshot testing), and Sentry CLI tools.',
          tags: ['Rye', 'Insta', 'Rust Tooling']
        },
        {
          username: 'neovim',
          displayName: 'Neovim',
          avatar: 'https://avatars.githubusercontent.com/neovim?s=96',
          descriptor: 'Vim-fork focused on extensibility, Lua plugins, LSP integration, and embeddability.',
          tags: ['Neovim', 'Lua', 'Editor'],
          isOrg: true
        },
        {
          username: 'alacritty',
          displayName: 'Alacritty',
          avatar: 'https://avatars.githubusercontent.com/alacritty?s=96',
          descriptor: 'Fast, cross-platform, OpenGL/GPU-accelerated terminal emulator in Rust.',
          tags: ['Terminal Emulator', 'Rust', 'GPU'],
          isOrg: true
        },
        {
          username: 'zellij-org',
          displayName: 'Zellij',
          avatar: 'https://avatars.githubusercontent.com/zellij-org?s=96',
          descriptor: 'Modern terminal workspace and multiplexer with built-in layouts and WebAssembly plugins.',
          tags: ['Terminal Multiplexer', 'Rust', 'Wasm'],
          isOrg: true
        },
        {
          username: 'oven-sh',
          displayName: 'Bun',
          avatar: 'https://avatars.githubusercontent.com/oven-sh?s=96',
          descriptor: 'Incredibly fast JavaScript package manager, test runner, bundler, and runtime in Zig.',
          tags: ['Bun', 'Zig', 'Package Manager'],
          isOrg: true
        },
        {
          username: 'biomejs',
          displayName: 'Biome',
          avatar: 'https://avatars.githubusercontent.com/biomejs?s=96',
          descriptor: 'One toolchain for your web project: fast linter, formatter, and more, written in Rust.',
          tags: ['Biome', 'Linter', 'Formatter'],
          isOrg: true
        }
      ]
    },
    {
      id: 'opensource',
      num: '08',
      name: 'Open Source & Tooling',
      interests: ['Foundational OSS', 'Languages', 'Ecosystems', 'Frameworks', 'Compilers', 'Community'],
      profiles: [
        {
          username: 'torvalds',
          displayName: 'Linus Torvalds',
          avatar: 'https://avatars.githubusercontent.com/torvalds?s=96',
          descriptor: 'Founder of the Linux kernel and Git. The foundation of modern open-source collaboration.',
          tags: ['Linux', 'Git', 'Kernel'],
          featured: true
        },
        {
          username: 'dhh',
          displayName: 'David Heinemeier Hansson',
          avatar: 'https://avatars.githubusercontent.com/dhh?s=96',
          descriptor: 'Creator of Ruby on Rails and co-founder of 37signals (Basecamp, HEY).',
          tags: ['Ruby on Rails', 'Web Architecture', 'Ruby']
        },
        {
          username: 'jashkenas',
          displayName: 'Jeremy Ashkenas',
          avatar: 'https://avatars.githubusercontent.com/jashkenas?s=96',
          descriptor: 'Creator of Backbone.js, Underscore.js, and CoffeeScript. JavaScript pioneer.',
          tags: ['Backbone', 'Underscore', 'CoffeeScript']
        },
        {
          username: 'octocat',
          displayName: 'The Octocat',
          avatar: 'https://avatars.githubusercontent.com/octocat?s=96',
          descriptor: 'Official GitHub mascot repository. Public benchmark for fork, issue, and star spreads.',
          tags: ['GitHub Benchmark', 'Community']
        },
        {
          username: 'sindresorhus',
          displayName: 'Sindre Sorhus',
          avatar: 'https://avatars.githubusercontent.com/sindresorhus?s=96',
          descriptor: 'The most depended-upon individual open-source maintainer in software history.',
          tags: ['Ecosystem Scale', 'Open Source', 'NPM']
        },
        {
          username: 'tj',
          displayName: 'TJ Holowaychuk',
          avatar: 'https://avatars.githubusercontent.com/tj?s=96',
          descriptor: 'Creator of thousands of open-source libraries that defined the Node.js era.',
          tags: ['Node.js', 'Express', 'Open Source']
        },
        {
          username: 'yyx990803',
          displayName: 'Evan You',
          avatar: 'https://avatars.githubusercontent.com/yyx990803?s=96',
          descriptor: 'Independent open-source creator successfully funded entirely by community patronage.',
          tags: ['Vue', 'Vite', 'Independent OSS']
        },
        {
          username: 'tiangolo',
          displayName: 'Sebastián Ramírez',
          avatar: 'https://avatars.githubusercontent.com/tiangolo?s=96',
          descriptor: 'Creator of FastAPI. Masterclass in community engagement and open-source documentation.',
          tags: ['FastAPI', 'Documentation', 'Community']
        },
        {
          username: 'gvanrossum',
          displayName: 'Guido van Rossum',
          avatar: 'https://avatars.githubusercontent.com/gvanrossum?s=96',
          descriptor: 'Over three decades guiding one of the world\'s most widely adopted programming languages.',
          tags: ['Python', 'Language Design', 'Community']
        },
        {
          username: 'karpathy',
          displayName: 'Andrej Karpathy',
          avatar: 'https://avatars.githubusercontent.com/karpathy?s=96',
          descriptor: 'Advancing open AI literacy with transparent educational implementations.',
          tags: ['Open AI', 'Education', 'Deep Learning']
        },
        {
          username: 'charmbracelet',
          displayName: 'Charm',
          avatar: 'https://avatars.githubusercontent.com/charmbracelet?s=96',
          descriptor: 'Open-source team proving developer tools can have extraordinary design aesthetics.',
          tags: ['Open Source', 'Design', 'Go'],
          isOrg: true
        },
        {
          username: 'astral-sh',
          displayName: 'Astral',
          avatar: 'https://avatars.githubusercontent.com/astral-sh?s=96',
          descriptor: 'Modern open tooling redefining the Python ecosystem velocity.',
          tags: ['Open Source', 'Rust', 'Speed'],
          isOrg: true
        },
        {
          username: 'huggingface',
          displayName: 'Hugging Face',
          avatar: 'https://avatars.githubusercontent.com/huggingface?s=96',
          descriptor: 'The open-source collaborative home for machine learning and AI research.',
          tags: ['Open Science', 'Transformers', 'Community'],
          isOrg: true
        },
        {
          username: 'flutter',
          displayName: 'Flutter',
          avatar: 'https://avatars.githubusercontent.com/flutter?s=96',
          descriptor: 'Worldwide open-source contributor community building for any screen.',
          tags: ['Cross-Platform', 'Dart', 'Community'],
          isOrg: true
        }
      ]
    }
  ];

  let activeExplorerCategory = 'web';
  let isExplorerExpanded = false;

  function renderExplorerInterests(categoryId) {
    const container = getEl('interests-tags');
    if (!container) return;

    const cat = EXPLORER_CATEGORIES.find(c => c.id === categoryId) || EXPLORER_CATEGORIES[1];
    const interests = cat.interests || [];

    container.innerHTML = interests
      .map(topic => `<span class="interest-tag">${escapeHtml(topic)}</span>`)
      .join('');
  }

  function renderExplorerCards(categoryId, animate = false, expanded = false) {
    const container = getEl('explorer-cards');
    if (!container) return;

    const cat = EXPLORER_CATEGORIES.find(c => c.id === categoryId) || EXPLORER_CATEGORIES[1];
    const allProfiles = cat.profiles || [];
    const visibleProfiles = expanded ? allProfiles : allProfiles.slice(0, 8);

    // Update Counter badge
    const countBadge = getEl('explorer-count-badge');
    if (countBadge) {
      countBadge.innerHTML = `Showing <span class="count-current">${visibleProfiles.length}</span> of <span class="count-total">${allProfiles.length}</span>`;
    }

    // Update View more / Show less button
    const toggleBtn = getEl('explorer-toggle-btn');
    const footerControls = getEl('explorer-footer-controls');
    if (footerControls) {
      if (allProfiles.length <= 8) {
        footerControls.style.display = 'none';
      } else {
        footerControls.style.display = 'flex';
      }
    }

    if (toggleBtn) {
      toggleBtn.setAttribute('aria-expanded', expanded ? 'true' : 'false');
      const textSpan = toggleBtn.querySelector('.expand-btn-text');
      if (textSpan) {
        textSpan.textContent = expanded ? 'Show less' : 'View more';
      }
      if (expanded) {
        toggleBtn.classList.add('is-expanded');
      } else {
        toggleBtn.classList.remove('is-expanded');
      }
    }

    const cardsHtml = visibleProfiles.map((p, idx) => {
      const isStaggered = expanded && idx >= 8;
      const topicTags = (p.tags || []).slice(0, 3)
        .map(t => `<span class="card-topic-tag">${escapeHtml(t)}</span>`)
        .join('');

      return `
        <button
          type="button"
          class="example-profile-card ${p.featured ? 'is-featured' : ''} ${isStaggered ? 'card-revealed' : ''}"
          data-user="${escapeHtml(p.username)}"
          aria-label="Analyze ${escapeHtml(p.displayName)} (@${escapeHtml(p.username)})"
        >
          ${p.featured ? '<div class="card-featured-badge">Featured</div>' : ''}
          <div class="example-card-header">
            <img
              class="example-avatar"
              src="${escapeHtml(p.avatar)}"
              alt="${escapeHtml(p.displayName)}"
              loading="lazy"
              onerror="this.onerror=null; this.src='https://github.com/identicons/${escapeHtml(p.username)}.png';"
            >
            <div class="example-titles">
              <div class="example-name-row">
                <span class="example-name">${escapeHtml(p.displayName)}</span>
                ${p.isOrg ? '<span class="example-org-badge">Org</span>' : ''}
              </div>
              <div class="example-handle-row">
                <span class="example-handle">@${escapeHtml(p.username)}</span>
              </div>
            </div>
          </div>
          <p class="example-bio">${escapeHtml(p.descriptor)}</p>
          <div class="example-tags-row">
            ${topicTags}
          </div>
          <div class="example-footer">
            <span class="example-action">Analyze &rarr;</span>
          </div>
        </button>
      `;
    }).join('');

    const isReduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

    if (!animate || isReduced) {
      container.innerHTML = cardsHtml;
      return;
    }

    container.classList.add('is-switching');
    setTimeout(() => {
      container.innerHTML = cardsHtml;
      container.classList.remove('is-switching');
    }, 120);
  }

  function setupExplorerInteractions() {
    const catContainer = getEl('explorer-categories');
    if (catContainer) {
      catContainer.addEventListener('click', (e) => {
        const btn = e.target.closest('.category-btn');
        if (!btn) return;
        const catId = btn.getAttribute('data-category');
        if (!catId || catId === activeExplorerCategory) return;

        activeExplorerCategory = catId;
        // Always reset expansion state when switching categories
        isExplorerExpanded = false;

        const allBtns = catContainer.querySelectorAll('.category-btn');
        allBtns.forEach(b => {
          const isMatch = b.getAttribute('data-category') === catId;
          b.classList.toggle('active', isMatch);
          b.setAttribute('aria-selected', isMatch ? 'true' : 'false');
        });

        renderExplorerInterests(catId);
        renderExplorerCards(catId, true, false);
      });
    }

    // Wire View more / Show less toggle button
    const toggleBtn = getEl('explorer-toggle-btn');
    if (toggleBtn) {
      toggleBtn.addEventListener('click', () => {
        isExplorerExpanded = !isExplorerExpanded;
        renderExplorerCards(activeExplorerCategory, false, isExplorerExpanded);

        // If collapsing and user has scrolled past top of cards, gently scroll to explorer header
        if (!isExplorerExpanded) {
          const section = getEl('explore-developers');
          if (section) {
            const rect = section.getBoundingClientRect();
            if (rect.top < 0) {
              section.scrollIntoView({ behavior: 'smooth', block: 'start' });
            }
          }
        }
      });
    }
  }

  // Setup event interactions for landing page (Hero form, suggestion chips, example cards, brand logo)
  function setupLandingInteractions() {
    setupExplorerInteractions();

    // Hero Search Form submission -> forward to main search-form
    const heroForm = getEl('hero-search-form');
    const heroInput = getEl('hero-username-input');
    if (heroForm && heroInput) {
      heroForm.addEventListener('submit', (e) => {
        e.preventDefault();
        const username = heroInput.value.trim();
        if (username) {
          const mainInput = getEl('username-input');
          const mainForm = getEl('search-form');
          if (mainInput && mainForm) {
            mainInput.value = username;
            if (typeof mainForm.requestSubmit === 'function') {
              mainForm.requestSubmit();
            } else {
              mainForm.dispatchEvent(new Event('submit', { cancelable: true, bubbles: true }));
            }
          }
        }
      });
    }

    // Click handler for suggestion chips and example profile cards
    document.addEventListener('click', (e) => {
      const trigger = e.target.closest('.suggestion-chip, .example-profile-card');
      if (trigger) {
        const username = trigger.getAttribute('data-user');
        if (username) {
          const mainInput = getEl('username-input');
          const heroInput = getEl('hero-username-input');
          if (mainInput) mainInput.value = username;
          if (heroInput) heroInput.value = username;
          const mainForm = getEl('search-form');
          if (mainForm) {
            if (typeof mainForm.requestSubmit === 'function') {
              mainForm.requestSubmit();
            } else {
              mainForm.dispatchEvent(new Event('submit', { cancelable: true, bubbles: true }));
            }
          }
        }
      }
    });

    // Brand logo click -> return to landing view
    const brandLink = getEl('brand-home-link');
    if (brandLink) {
      brandLink.addEventListener('click', (e) => {
        e.preventDefault();
        showLanding();
      });
    }
  }

  // Global '/' keyboard shortcut to focus search
  document.addEventListener('keydown', (e) => {
    if (
      e.key === '/' &&
      document.activeElement !== getEl('username-input') &&
      document.activeElement !== getEl('hero-username-input') &&
      document.activeElement !== getEl('repo-search-input')
    ) {
      e.preventDefault();
      const isLanding = document.body.classList.contains('landing-active');
      const targetInput = isLanding ? getEl('hero-username-input') : getEl('username-input');
      if (targetInput) {
        targetInput.focus();
        targetInput.select();
      }
    }
  });

  // Initialize landing motion: IntersectionObserver for preview window and steps flow
  function initLandingMotion() {
    const isReduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    const previewSection = document.querySelector('.landing-preview-section');
    const stepsWrapper = document.querySelector('.steps-flow-wrapper');

    if (isReduced) {
      if (previewSection) previewSection.classList.add('preview-revealed');
      if (stepsWrapper) stepsWrapper.classList.add('steps-revealed');
      return;
    }

    if (previewSection) {
      if ('IntersectionObserver' in window) {
        let previewRevealed = false;
        const previewObserver = new IntersectionObserver((entries) => {
          entries.forEach(entry => {
            if (entry.isIntersecting && !previewRevealed) {
              previewRevealed = true;
              previewSection.classList.add('preview-revealed');

              const sampleElements = previewSection.querySelectorAll('[data-sample-val]');
              sampleElements.forEach((el, idx) => {
                const val = parseInt(el.getAttribute('data-sample-val'), 10);
                if (!isNaN(val)) {
                  el.textContent = '0';
                  setTimeout(() => {
                    animateCountUp(el, val, 750);
                  }, idx * 20);
                }
              });

              previewObserver.unobserve(previewSection);
            }
          });
        }, { threshold: 0.15 });

        previewObserver.observe(previewSection);
      } else {
        previewSection.classList.add('preview-revealed');
      }
    }

    if (stepsWrapper) {
      if ('IntersectionObserver' in window) {
        const stepsObserver = new IntersectionObserver((entries) => {
          entries.forEach(entry => {
            if (entry.isIntersecting) {
              stepsWrapper.classList.add('steps-revealed');
              stepsObserver.unobserve(stepsWrapper);
            }
          });
        }, { threshold: 0.15 });

        stepsObserver.observe(stepsWrapper);
      } else {
        stepsWrapper.classList.add('steps-revealed');
      }
    }
  }

  // Initialize landing state or auto-search from URL query param
  function initOnReady() {
    setupLandingInteractions();
    initLandingMotion();

    const params = new URLSearchParams(window.location.search);
    const userParam = params.get('u') || params.get('user');
    if (userParam) {
      hideLanding();
      setTimeout(() => {
        const input = getEl('username-input');
        const form = getEl('search-form');
        if (input && form) {
          input.value = userParam;
          if (typeof form.requestSubmit === 'function') {
            form.requestSubmit();
          } else {
            form.dispatchEvent(new Event('submit', { cancelable: true, bubbles: true }));
          }
        }
      }, 50);
      return;
    }

    showLanding();
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initOnReady);
  } else {
    initOnReady();
  }

  return {
    showLoading,
    showError,
    clearStatus,
    renderProfile,
    renderAnalytics,
    renderTopRepos,
    renderActivityInsights,
    renderRepoList,
    renderInitialState,
    showLanding,
    hideLanding
  };
})();
