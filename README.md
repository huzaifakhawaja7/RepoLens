# RepoLens

A GitHub Profile and Repository Analyzer. Enter a public GitHub username and see
useful profile and repository analytics, computed live from GitHub's public
REST API.

## Features

* Landing page with an "Explore GitHub" section — curated example developers
  browsable by category (Web, Python, AI, Mobile, Systems, and more)
* GitHub profile lookup with avatar, bio, and stats
* Repository stats: total repos, stars, forks
* Top 5 repositories ranked by stars
* Repository activity insights (updated today / last 7 / last 30 days,
  most recent and oldest push)
* Primary-language distribution chart and language analytics
* Repository search, language filter, and sorting
* Shareable links via a `?u=username` URL parameter
* Handles pagination for accounts with hundreds or thousands of repositories

## How to Run

This is a static site with no build step. Any local static server works:

1. Clone or download this repository
2. Serve the folder with any static file server, for example:
   * VS Code's "Live Server" extension — right-click `index.html` → "Open with Live Server"
   * Python: `python -m http.server 8080`
   * Node: `npx http-server . -p 8080`
3. Open the served URL (e.g. `http://127.0.0.1:8080/index.html`) in your browser
4. Enter any public GitHub username and click Analyze

No API key, login, or build tools are required.

## Stack

* HTML, CSS, vanilla JavaScript — no frameworks
* GitHub REST API
* Chart.js (via CDN), used only where it genuinely adds value

## Project Structure

* `index.html` — page markup (landing page and dashboard)
* `css/style.css` — all styling
* `js/api.js` — GitHub API communication and pagination
* `js/analyzer.js` — data processing: stats, sorting, filtering, activity insights
* `js/ui.js` — DOM rendering and UI interactions
* `js/charts.js` — Chart.js language-distribution chart
* `js/main.js` — application entry point and event wiring

## Scope

This started as a small, one-week portfolio project. No backend, no database,
no build tools — everything runs client-side.

## Author

Huzaifa Khawaja
