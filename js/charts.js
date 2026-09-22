// charts.js
// Responsible for rendering charts with Chart.js.
// Holds chart setup, color mappings, and configuration for language distribution
// and analytics visualizations.

window.App = window.App || {};

App.Charts = (function () {
  let activeChart = null;

  // Authentic GitHub language colors
  const LANGUAGE_COLORS = {
    JavaScript: '#f1e05a',
    TypeScript: '#3178c6',
    Python: '#3572A5',
    HTML: '#e34c26',
    CSS: '#563d7c',
    Go: '#00ADD8',
    Rust: '#dea584',
    Java: '#b07219',
    C: '#555555',
    'C++': '#f34b7d',
    'C#': '#178600',
    PHP: '#4F5D95',
    Ruby: '#701516',
    Shell: '#89e051',
    Bash: '#89e051',
    Swift: '#F05138',
    Kotlin: '#A97BFF',
    Dart: '#00B4AB',
    'Jupyter Notebook': '#DA5B0B',
    Vue: '#41b883',
    Svelte: '#ff3e00',
    Scala: '#c22d40',
    Lua: '#000080',
    R: '#198CE7',
    Dockerfile: '#384d54',
    SCSS: '#c6538c',
    Less: '#1d365d',
    Elixir: '#6e4a7e',
    Haskell: '#5e5086',
    Clojure: '#db5855',
    Zig: '#ec915c',
    Other: '#8b949e'
  };

  const FALLBACK_PALETTE = [
    '#58a6ff',
    '#3fb950',
    '#d29922',
    '#db61a2',
    '#7ee787',
    '#a5d6ff',
    '#ffa657',
    '#f778ba',
    '#79c0ff'
  ];

  function getLanguageColor(language) {
    if (!language) return '#8b949e';
    if (LANGUAGE_COLORS[language]) {
      return LANGUAGE_COLORS[language];
    }
    // Deterministic color selection for unknown languages
    let hash = 0;
    for (let i = 0; i < language.length; i++) {
      hash = language.charCodeAt(i) + ((hash << 5) - hash);
    }
    const index = Math.abs(hash) % FALLBACK_PALETTE.length;
    return FALLBACK_PALETTE[index];
  }

  function destroyChart() {
    if (activeChart) {
      activeChart.destroy();
      activeChart = null;
    }
  }

  /**
   * Renders language distribution doughnut chart onto the specified canvas.
   * @param {HTMLCanvasElement} canvas
   * @param {Object} languageCounts - e.g. { 'JavaScript': 12, 'Python': 5 }
   * @returns {Chart|null}
   */
  function renderLanguageChart(canvas, languageCounts) {
    destroyChart();

    if (!canvas) return null;

    // Check if Chart.js is loaded
    if (typeof Chart === 'undefined') {
      console.warn('Chart.js CDN is not loaded. Cannot render chart.');
      return null;
    }

    const entries = Object.entries(languageCounts || {}).sort((a, b) => b[1] - a[1]);

    if (entries.length === 0) {
      return null;
    }

    // Top 5 languages + lumped "Other" if there are more
    const maxSlices = 5;
    const labels = [];
    const counts = [];
    const colors = [];

    let otherCount = 0;
    entries.forEach(([lang, count], idx) => {
      if (idx < maxSlices) {
        labels.push(lang);
        counts.push(count);
        colors.push(getLanguageColor(lang));
      } else {
        otherCount += count;
      }
    });

    if (otherCount > 0) {
      labels.push('Other');
      counts.push(otherCount);
      colors.push(LANGUAGE_COLORS.Other);
    }

    const totalReposWithLang = counts.reduce((acc, c) => acc + c, 0);

    const ctx = canvas.getContext('2d');
    activeChart = new Chart(ctx, {
      type: 'doughnut',
      data: {
        labels,
        datasets: [
          {
            data: counts,
            backgroundColor: colors,
            borderColor: '#161b22',
            borderWidth: 2,
            hoverOffset: 6
          }
        ]
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        cutout: '72%',
        layout: {
          padding: 4
        },
        plugins: {
          legend: {
            display: true,
            position: window.innerWidth < 640 ? 'bottom' : 'right',
            align: 'center',
            labels: {
              color: '#c9d1d9',
              boxWidth: window.innerWidth < 640 ? 10 : 12,
              boxHeight: window.innerWidth < 640 ? 10 : 12,
              padding: window.innerWidth < 640 ? 8 : 12,
              usePointStyle: true,
              pointStyle: 'circle',
              font: {
                family: 'system-ui, -apple-system, sans-serif',
                size: window.innerWidth < 640 ? 11 : 12
              },
              generateLabels: function (chart) {
                const data = chart.data;
                if (!data.labels.length || !data.datasets.length) return [];
                return data.labels.map((label, i) => {
                  const val = data.datasets[0].data[i];
                  const pct = totalReposWithLang > 0 ? Math.round((val / totalReposWithLang) * 100) : 0;
                  return {
                    text: `${label} (${pct}%)`,
                    fillStyle: data.datasets[0].backgroundColor[i],
                    strokeStyle: 'transparent',
                    lineWidth: 0,
                    fontColor: '#c9d1d9',
                    hidden: isNaN(data.datasets[0].data[i]) || chart.getDatasetMeta(0).data[i].hidden,
                    index: i,
                    pointStyle: 'circle'
                  };
                });
              }
            }
          },
          tooltip: {
            backgroundColor: '#1c2128',
            titleColor: '#f0f6fc',
            bodyColor: '#c9d1d9',
            borderColor: '#30363d',
            borderWidth: 1,
            padding: 10,
            boxPadding: 4,
            usePointStyle: true,
            callbacks: {
              label: function (context) {
                const val = context.parsed;
                const pct = totalReposWithLang > 0 ? ((val / totalReposWithLang) * 100).toFixed(1) : 0;
                return ` ${context.label}: ${val} ${val === 1 ? 'repo' : 'repos'} (${pct}%)`;
              }
            }
          }
        }
      }
    });

    return activeChart;
  }

  return {
    renderLanguageChart,
    destroyChart,
    getLanguageColor
  };
})();
