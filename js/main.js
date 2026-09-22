// main.js
// Entry point. Wires api.js, analyzer.js, and ui.js together.
// Handles the search flow and top level error handling.

window.App = window.App || {};

(function () {
  function init() {
    const form = document.getElementById('search-form');
    form.addEventListener('submit', handleSubmit);
  }

  async function handleSubmit(event) {
    event.preventDefault();

    const input = document.getElementById('username-input');
    const username = input.value.trim();

    if (!username) {
      App.UI.showError('Please enter a GitHub username.');
      return;
    }

    App.UI.showLoading();

    try {
      const user = await App.API.fetchUser(username);
      const repos = await App.API.fetchAllRepos(username);
      const sortedRepos = App.Analyzer.sortByRecentlyUpdated(repos);

      App.UI.clearStatus();
      App.UI.renderProfile(user);
      App.UI.renderRepoList(sortedRepos);
    } catch (err) {
      App.UI.showError(getErrorMessage(err));
    }
  }

  function getErrorMessage(err) {
    if (err instanceof App.API.ApiError) {
      switch (err.type) {
        case 'not_found':
          return 'No GitHub user found with that username.';
        case 'rate_limit': {
          const resetText = err.resetDate
            ? ` Try again after ${err.resetDate.toLocaleTimeString()}.`
            : '';
          return `GitHub API rate limit exceeded.${resetText}`;
        }
        case 'network':
          return 'Could not reach GitHub. Check your internet connection.';
        case 'forbidden':
          return 'GitHub blocked this request. Please try again shortly.';
        default:
          return err.message || 'Something went wrong talking to GitHub.';
      }
    }
    return 'An unexpected error occurred.';
  }

  document.addEventListener('DOMContentLoaded', init);
})();
