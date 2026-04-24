/**
 * Popup script for AI Text Sanitiser extension.
 * Manages the UI, settings, and removal statistics.
 */
document.addEventListener('DOMContentLoaded', () => {
  const tableBody = document.querySelector('#statsTable tbody');
  const resetBtn = document.getElementById('resetBtn');
  const removeEmojiToggle = document.getElementById('removeEmojiToggle');
  const removeCitationToggle = document.getElementById('removeCitationToggle');
  const siteForm = document.getElementById('siteForm');
  const siteInput = document.getElementById('siteInput');
  const siteList = document.getElementById('siteList');

  /** @type {Object} State for the popup UI */
  const state = {
    stats: {},
    removeEmojis: true,
    removeCitations: true,
    siteAllowlist: DEFAULT_SITES.slice()
  };

  /**
   * Filters out duplicate domains from an array.
   * @param {string[]} domains - The array of domains.
   * @returns {string[]} An array with unique domains.
   */
  function uniqueDomains(domains) {
    return Array.from(new Set(domains));
  }

  /**
   * Checks if a code point entry represents an emoji.
   * @param {string} code - The formatted code point.
   * @param {Object} entry - The entry data from stats.
   * @returns {boolean} True if it's an emoji entry.
   */
  function isEmojiEntry(code, entry) {
    const meta = getCodePointMeta(code, entry);
    return !!meta.emoji;
  }

  /**
   * Renders the statistics table based on the current state.
   */
  function renderStats() {
    const entries = Object.entries(state.stats);
    if (!entries.length) {
      tableBody.innerHTML = '<tr><td colspan="4" class="muted">No stats yet</td></tr>';
      return;
    }

    // Sort by count descending
    entries.sort((a, b) => (b[1]?.count || 0) - (a[1]?.count || 0));

    tableBody.innerHTML = '';
    for (const [codePoint, info] of entries) {
      const meta = getCodePointMeta(codePoint, info);
      if (!state.removeEmojis && isEmojiEntry(codePoint, info)) continue;

      const row = document.createElement('tr');
      row.innerHTML = `
        <td>${codePoint}</td>
        <td>${meta.name}</td>
        <td>${meta.category}</td>
        <td>${info?.count || 0}</td>
      `;
      tableBody.appendChild(row);
    }

    if (!tableBody.children.length) {
      tableBody.innerHTML = '<tr><td colspan="4" class="muted">No stats match the current filters</td></tr>';
    }
  }

  /**
   * Renders the site allowlist.
   */
  function renderSites() {
    siteList.innerHTML = '';
    if (!state.siteAllowlist.length) {
      const item = document.createElement('li');
      item.className = 'muted';
      item.textContent = 'No sites selected. Add one below.';
      siteList.appendChild(item);
      return;
    }

    for (const domain of state.siteAllowlist) {
      const li = document.createElement('li');
      li.innerHTML = `
        <span>${domain}</span>
        <button type="button" data-remove="${domain}">Remove</button>
      `;
      siteList.appendChild(li);
    }
  }

  /**
   * Synchronizes the UI elements with the current state.
   */
  function syncUI() {
    removeEmojiToggle.checked = state.removeEmojis;
    removeCitationToggle.checked = state.removeCitations;
    renderStats();
    renderSites();
  }

  /**
   * Loads settings from storage using Promises.
   */
  function loadSettings() {
    chrome.storage.local.get(['stats', 'removeEmojis', 'removeCitations', 'siteAllowlist'])
      .then(res => {
        state.stats = res.stats || {};
        state.removeEmojis = res.removeEmojis !== false;
        state.removeCitations = res.removeCitations !== false;

        const rawList = Array.isArray(res.siteAllowlist) ? res.siteAllowlist : DEFAULT_SITES;
        state.siteAllowlist = uniqueDomains(rawList.map(normalizeDomain).filter(Boolean));

        syncUI();
      })
      .catch(err => console.error('AI Text Sanitiser Popup: Failed to load settings', err));
  }

  // Storage Change Listener
  chrome.storage.onChanged.addListener((changes, area) => {
    if (area !== 'local') return;

    if ('stats' in changes) {
      state.stats = changes.stats.newValue || {};
    }
    if ('removeEmojis' in changes) {
      state.removeEmojis = !!changes.removeEmojis.newValue;
    }
    if ('removeCitations' in changes) {
      state.removeCitations = !!changes.removeCitations.newValue;
    }
    if ('siteAllowlist' in changes) {
      if (Array.isArray(changes.siteAllowlist.newValue)) {
        state.siteAllowlist = uniqueDomains(
          changes.siteAllowlist.newValue.map(normalizeDomain).filter(Boolean)
        );
      } else {
        state.siteAllowlist = [];
      }
    }
    syncUI();
  });

  // UI Event Listeners
  resetBtn.addEventListener('click', () => {
    if (confirm('Reset all stats?')) {
      chrome.storage.local.set({ stats: {} })
        .catch(err => console.error('AI Text Sanitiser Popup: Failed to reset stats', err));
    }
  });

  removeEmojiToggle.addEventListener('change', () => {
    const remove = removeEmojiToggle.checked;
    state.removeEmojis = remove;
    chrome.storage.local.set({ removeEmojis: remove })
      .then(() => renderStats())
      .catch(err => console.error('AI Text Sanitiser Popup: Failed to save emoji setting', err));
  });

  removeCitationToggle.addEventListener('change', () => {
    const remove = removeCitationToggle.checked;
    state.removeCitations = remove;
    chrome.storage.local.set({ removeCitations: remove })
      .catch(err => console.error('AI Text Sanitiser Popup: Failed to save citation setting', err));
  });

  siteForm.addEventListener('submit', e => {
    e.preventDefault();
    const domain = normalizeDomain(siteInput.value);
    if (!domain) return;

    if (!state.siteAllowlist.includes(domain)) {
      state.siteAllowlist = uniqueDomains([...state.siteAllowlist, domain]);
      chrome.storage.local.set({ siteAllowlist: state.siteAllowlist })
        .then(() => {
          siteInput.value = '';
          renderSites();
        })
        .catch(err => console.error('AI Text Sanitiser Popup: Failed to add site', err));
    } else {
      siteInput.value = '';
    }
  });

  siteList.addEventListener('click', e => {
    const button = e.target.closest('button[data-remove]');
    if (!button) return;

    const domain = button.getAttribute('data-remove');
    state.siteAllowlist = state.siteAllowlist.filter(item => item !== domain);
    chrome.storage.local.set({ siteAllowlist: state.siteAllowlist })
      .then(() => renderSites())
      .catch(err => console.error('AI Text Sanitiser Popup: Failed to remove site', err));
  });

  // Initial Load
  loadSettings();
});
