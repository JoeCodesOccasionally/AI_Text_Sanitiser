/* eslint-disable prefer-rest-params */
/**
 * Content script for AI Text Sanitiser.
 * Handles the 'copy' event and coordinates with the main world injector.
 */
(function () {
  /**
   * Internal state for the content script.
   */
  let stats = {};
  let normalizingStats = false;
  const settings = {
    removeEmojis: true,
    removeCitations: true,
    siteAllowlist: DEFAULT_SITES.slice()
  };
  let activeForPage = false;

  const domainPatternCache = new Map();

  /**
   * Updates the injector in the main world with current settings.
   */
  function updateInjector() {
    window.postMessage({
      type: 'AI_TEXT_SANITISER_SETTINGS',
      settings: {
        removeEmojis: settings.removeEmojis,
        removeCitations: settings.removeCitations,
        activeForPage: activeForPage
      }
    }, '*');
  }

  /**
   * Initializes settings from chrome.storage.local using Promises.
   */
  function initialize() {
    chrome.storage.local.get(['stats', 'removeEmojis', 'removeCitations', 'siteAllowlist'])
      .then(res => {
        stats = res.stats || {};
        settings.removeEmojis = res.removeEmojis !== false;
        settings.removeCitations = res.removeCitations !== false;

        const hasStoredSites = Array.isArray(res.siteAllowlist);
        const rawList = hasStoredSites ? res.siteAllowlist : DEFAULT_SITES;

        // Normalize the site list
        const cleaned = rawList
          .map(item => typeof item === 'string' ? normalizeDomain(item) : '')
          .filter(Boolean);

        settings.siteAllowlist = cleaned.length > 0 ? Array.from(new Set(cleaned)) : (hasStoredSites ? [] : DEFAULT_SITES.slice());

        if (!hasStoredSites) {
          chrome.storage.local.set({ siteAllowlist: settings.siteAllowlist });
        }

        normalizeStatsMetadata();
        updateActivation();
        updateInjector();
      })
      .catch(err => console.error('AI Text Sanitiser: Failed to load settings', err));
  }

  /**
   * Escapes a string for use in a regular expression.
   * @param {string} str - The string to escape.
   * @returns {string} The escaped string.
   */
  function escapeRegExp(str) {
    return str.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  }

  /**
   * Matches a hostname against a wildcard pattern.
   * @param {string} hostname - The hostname to check.
   * @param {string} pattern - The pattern (e.g., '*.example.com').
   * @returns {boolean} True if the hostname matches the pattern.
   */
  function matchesSitePattern(hostname, pattern) {
    const host = String(hostname || '').toLowerCase().replace(/\s+/g, '').replace(/\.+$/, '');
    let normalized = String(pattern || '').toLowerCase().replace(/\s+/g, '').replace(/\.+$/, '');
    if (!host || !normalized) return false;
    if (normalized === '*') return true;

    if (normalized.startsWith('*.') && normalized.indexOf('*', 1) === -1) {
      const suffix = normalized.slice(2);
      if (!suffix) return true;
      return host === suffix || host.endsWith(`.${suffix}`);
    }

    if (!normalized.includes('*')) {
      return host === normalized || host.endsWith(`.${normalized}`);
    }

    let regex = domainPatternCache.get(normalized);
    if (!regex) {
      const escaped = normalized.split('*').map(escapeRegExp).join('.*');
      regex = new RegExp(`^${escaped}$`, 'i');
      domainPatternCache.set(normalized, regex);
    }
    return regex.test(host);
  }

  /**
   * Updates whether the extension is active for the current page.
   */
  function updateActivation() {
    const hostname = location.hostname.toLowerCase();
    activeForPage = settings.siteAllowlist.some(pattern => matchesSitePattern(hostname, pattern));
  }

  /**
   * Normalizes character metadata in the stats to ensure consistency.
   */
  function normalizeStatsMetadata() {
    let mutated = false;
    for (const [key, entry] of Object.entries(stats)) {
      if (!entry || typeof entry !== 'object') continue;
      const meta = getCodePointMeta(key, entry?.char);
      if (entry.char !== meta.name) {
        entry.char = meta.name;
        mutated = true;
      }
      if (entry.category !== meta.category) {
        entry.category = meta.category;
        mutated = true;
      }
      if (typeof entry.emoji !== 'boolean' && typeof meta.emoji === 'boolean') {
        entry.emoji = meta.emoji;
        mutated = true;
      }
    }
    if (mutated && !normalizingStats) {
      normalizingStats = true;
      chrome.storage.local.set({ stats }).then(() => { normalizingStats = false; });
    }
  }

  /**
   * Displays a brief visual indicator when text is cleaned.
   * @param {string} message - The message to display.
   */
  function showBadge(message) {
    try {
      const badge = document.createElement('div');
      badge.textContent = message;
      Object.assign(badge.style, {
        position: 'fixed',
        bottom: '20px',
        right: '20px',
        padding: '8px 12px',
        background: 'rgba(40,167,69,0.9)',
        color: '#fff',
        fontSize: '14px',
        fontFamily: 'sans-serif',
        borderRadius: '4px',
        boxShadow: '0 2px 6px rgba(0,0,0,0.3)',
        zIndex: 2147483647,
        opacity: '0',
        transition: 'opacity 0.2s ease-in-out'
      });
      document.body.appendChild(badge);
      requestAnimationFrame(() => badge.style.opacity = '1');
      setTimeout(() => {
        badge.style.opacity = '0';
        badge.addEventListener('transitionend', () => badge.remove(), { once: true });
      }, 800);
    } catch (err) {
      console.warn('AI Text Sanitiser: Failed to show badge', err);
    }
  }

  /**
   * Determines if a specific character should be removed based on settings.
   * @param {number} cp - The code point.
   * @param {string} char - The character.
   * @returns {boolean} True if the character should be removed.
   */
  function shouldRemove(cp, char) {
    if (cp <= 0x7F) return false;
    const isEmoji = isEmojiCodePoint(cp, char);
    if (isEmoji && !settings.removeEmojis) return false;
    return true;
  }

  /**
   * Records a character removal in the provided map.
   * @param {Map} map - The map to store removal counts.
   * @param {number} cp - The code point.
   * @param {string} char - The character.
   * @param {number} amount - The number of characters removed.
   */
  function recordRemoval(map, cp, char, amount) {
    const meta = getCodePointMeta(cp, char);
    const existing = map.get(meta.key);
    if (existing) {
      existing.count += amount;
    } else {
      map.set(meta.key, { count: amount, name: meta.name, category: meta.category, emoji: meta.emoji });
    }
  }

  /**
   * Updates the persistent stats in storage.
   * @param {Map|Object} removals - The map or object of removed characters.
   * @returns {number} The total number of characters removed.
   */
  function updateStats(removals) {
    const entries = removals instanceof Map ? removals.entries() : Object.entries(removals);
    let total = 0;
    let hasRemovals = false;

    for (const [key, data] of entries) {
      hasRemovals = true;
      const entry = stats[key] || { count: 0, char: data.name, category: data.category, emoji: data.emoji };
      entry.count += data.count;
      entry.char = data.name;
      entry.category = data.category;
      entry.emoji = data.emoji;
      stats[key] = entry;
      total += data.count;
    }

    if (hasRemovals) {
      chrome.storage.local.set({ stats });
    }
    return total;
  }

  /**
   * Gets the currently selected text from the page.
   * Handles regular selection and input/textarea fields.
   * @returns {string} The selected text.
   */
  function getSelectedText() {
    const selection = window.getSelection?.();
    const text = selection?.toString() || '';
    if (text) return text;

    const active = document.activeElement;
    if (!active) return '';

    if (active instanceof HTMLInputElement || active instanceof HTMLTextAreaElement) {
      const value = active.value || '';
      if (typeof active.selectionStart === 'number' && typeof active.selectionEnd === 'number') {
        return value.slice(active.selectionStart, active.selectionEnd);
      }
      return value;
    }
    return '';
  }

  // Event Listeners
  document.addEventListener('copy', e => {
    if (!activeForPage) return;
    
    // Check if the event is being handled by the main world (programmatic copy)
    // We only handle standard browser-level copies here.
    const originalSel = getSelectedText();
    if (!originalSel) return;

    let sel = originalSel;
    if (settings.removeCitations) {
      sel = sel.replace(citationRegex, '');
    }

    const removals = new Map();
    const kept = [];

    for (const char of Array.from(sel)) {
      const cp = char.codePointAt(0);
      if (typeof cp !== 'number') {
        kept.push(char);
        continue;
      }
      if (shouldRemove(cp, char)) {
        recordRemoval(removals, cp, char, 1);
      } else {
        kept.push(char);
      }
    }

    const cleaned = kept.join('');

    if (!removals.size && cleaned === originalSel) return;

    e.clipboardData.setData('text/plain', cleaned);
    e.preventDefault();

    const removedCount = updateStats(removals);
    const message = (removedCount > 0 || (settings.removeCitations && cleaned !== originalSel)) ? `Cleaned ✂️ ${removedCount}` : 'Already Clean!';
    setTimeout(() => showBadge(message), 0);
  }, true);

  // Listen for messages from the main world
  window.addEventListener('message', (event) => {
    if (event.source !== window) return;

    if (event.data && event.data.type === 'AI_TEXT_SANITISER_REMOVALS') {
      const removedCount = updateStats(event.data.removals);
      const message = removedCount > 0 ? `Cleaned ✂️ ${removedCount}` : 'Already Clean!';
      showBadge(message);
    } else if (event.data && event.data.type === 'AI_TEXT_SANITISER_PING') {
      updateInjector();
    }
  });

  chrome.storage.onChanged?.addListener((changes, area) => {
    if (area !== 'local') return;
    let settingsChanged = false;

    if ('stats' in changes) {
      stats = changes.stats.newValue || {};
      normalizeStatsMetadata();
    }
    if ('removeEmojis' in changes) {
      settings.removeEmojis = !!changes.removeEmojis.newValue;
      settingsChanged = true;
    }
    if ('removeCitations' in changes) {
      settings.removeCitations = !!changes.removeCitations.newValue;
      settingsChanged = true;
    }
    if ('siteAllowlist' in changes) {
      const newList = Array.isArray(changes.siteAllowlist.newValue) ? changes.siteAllowlist.newValue : [];
      const cleaned = newList
        .map(item => typeof item === 'string' ? normalizeDomain(item) : '')
        .filter(Boolean);
      settings.siteAllowlist = Array.from(new Set(cleaned));
      domainPatternCache.clear();
      updateActivation();
      settingsChanged = true;
    }

    if (settingsChanged) {
      updateInjector();
    }
  });

  // Run initialization
  initialize();

})();
