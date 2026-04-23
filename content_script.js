/* eslint-disable prefer-rest-params */
(function () {
  const DEFAULT_SITES = ['*.chatgpt.com', '*.deepseek.com', '*.claude.ai'];
  const emojiRegex = /\p{Extended_Pictographic}/u;

  const unicodeDatabase = {
    'U+0020': { name: 'SPACE', category: 'Whitespace' },
    'U+00A0': { name: 'NO-BREAK SPACE', category: 'Whitespace' },
    'U+00B0': { name: 'DEGREE SIGN', category: 'Symbol' },
    'U+00B2': { name: 'SUPERSCRIPT TWO', category: 'Superscript/Subscript' },
    'U+0394': { name: 'GREEK CAPITAL LETTER DELTA', category: 'Greek Letter' },
    'U+200B': { name: 'ZERO WIDTH SPACE', category: 'Whitespace' },
    'U+200C': { name: 'ZERO WIDTH NON-JOINER', category: 'Whitespace' },
    'U+200D': { name: 'ZERO WIDTH JOINER', category: 'Whitespace' },
    'U+200E': { name: 'LEFT-TO-RIGHT MARK', category: 'Directional Formatting' },
    'U+200F': { name: 'RIGHT-TO-LEFT MARK', category: 'Directional Formatting' },
    'U+2022': { name: 'BULLET', category: 'Punctuation' },
    'U+2026': { name: 'HORIZONTAL ELLIPSIS', category: 'Punctuation' },
    'U+202A': { name: 'LEFT-TO-RIGHT EMBEDDING', category: 'Directional Formatting' },
    'U+202B': { name: 'RIGHT-TO-LEFT EMBEDDING', category: 'Directional Formatting' },
    'U+202C': { name: 'POP DIRECTIONAL FORMATTING', category: 'Directional Formatting' },
    'U+202D': { name: 'LEFT-TO-RIGHT OVERRIDE', category: 'Directional Formatting' },
    'U+202E': { name: 'RIGHT-TO-LEFT OVERRIDE', category: 'Directional Formatting' },
    'U+2060': { name: 'WORD JOINER', category: 'Whitespace' },
    'U+2066': { name: 'LEFT-TO-RIGHT ISOLATE', category: 'Directional Formatting' },
    'U+2067': { name: 'RIGHT-TO-LEFT ISOLATE', category: 'Directional Formatting' },
    'U+2068': { name: 'FIRST STRONG ISOLATE', category: 'Directional Formatting' },
    'U+2069': { name: 'POP DIRECTIONAL ISOLATE', category: 'Directional Formatting' },
    'U+2122': { name: 'TRADE MARK SIGN', category: 'Symbol' },
    'U+2192': { name: 'RIGHTWARDS ARROW', category: 'Arrow' },
    'U+2212': { name: 'MINUS SIGN', category: 'Math Symbol' },
    'U+2218': { name: 'RING OPERATOR', category: 'Math Symbol' },
    'U+2248': { name: 'ALMOST EQUAL TO', category: 'Math Symbol' },
    'U+2264': { name: 'LESS-THAN OR EQUAL TO', category: 'Math Symbol' },
    'U+207A': { name: 'SUPERSCRIPT PLUS SIGN', category: 'Superscript/Subscript' },
    'U+2082': { name: 'SUBSCRIPT TWO', category: 'Superscript/Subscript' },
    'U+2013': { name: 'EN DASH', category: 'Punctuation' },
    'U+2014': { name: 'EM DASH', category: 'Punctuation' },
    'U+2018': { name: 'LEFT SINGLE QUOTATION MARK', category: 'Punctuation' },
    'U+2019': { name: 'RIGHT SINGLE QUOTATION MARK', category: 'Punctuation' },
    'U+201C': { name: 'LEFT DOUBLE QUOTATION MARK', category: 'Punctuation' },
    'U+201D': { name: 'RIGHT DOUBLE QUOTATION MARK', category: 'Punctuation' },
    'U+FEFF': { name: 'ZERO WIDTH NO-BREAK SPACE', category: 'Whitespace' },
    'U+D835': { name: 'HIGH SURROGATE D835 (mathematical alphanumerics lead)', category: 'Surrogate', isEmoji: false },
    'U+D800': { name: 'HIGH SURROGATE (generic)', category: 'Surrogate', isEmoji: true },
    'U+D83C': { name: 'HIGH SURROGATE D83C (emoji lead)', category: 'Surrogate', isEmoji: true },
    'U+D83D': { name: 'HIGH SURROGATE D83D (emoji lead)', category: 'Surrogate', isEmoji: true },
    'U+D83E': { name: 'HIGH SURROGATE D83E (emoji lead)', category: 'Surrogate', isEmoji: true },
    'U+DC47': { name: 'LOW SURROGATE DC47 (part of BACKHAND INDEX POINTING DOWN)', category: 'Surrogate', isEmoji: true },
    'U+DC48': { name: 'LOW SURROGATE DC48 (part of BACKHAND INDEX POINTING LEFT)', category: 'Surrogate', isEmoji: true },
    'U+DC51': { name: 'LOW SURROGATE DC51 (part of CROWN)', category: 'Surrogate', isEmoji: true },
    'U+DC5D': { name: 'LOW SURROGATE DC5D (part of POUCH)', category: 'Surrogate', isEmoji: true },
    'U+DC56': { name: 'LOW SURROGATE DC56 (part of JEANS)', category: 'Surrogate', isEmoji: true },
    'U+1F447': { name: 'BACKHAND INDEX POINTING DOWN', category: 'Emoji', isEmoji: true },
    'U+1F448': { name: 'BACKHAND INDEX POINTING LEFT', category: 'Emoji', isEmoji: true },
    'U+1F451': { name: 'CROWN', category: 'Emoji', isEmoji: true },
    'U+1F45D': { name: 'POUCH', category: 'Emoji', isEmoji: true },
    'U+1F456': { name: 'JEANS', category: 'Emoji', isEmoji: true }
  };

  let stats = {};
  let normalizingStats = false;
  const settings = {
    removeEmojis: true,
    siteAllowlist: DEFAULT_SITES.slice()
  };
  let activeForPage = false;

  chrome.storage.local.get(
    ['stats', 'removeEmojis', 'siteAllowlist'],
    res => {
      stats = res.stats || {};
      settings.removeEmojis = res.removeEmojis !== false;
      const hasStoredSites = Array.isArray(res.siteAllowlist);
      settings.siteAllowlist = normalizeSiteList(
        hasStoredSites ? res.siteAllowlist : DEFAULT_SITES,
        { sourceWasArray: hasStoredSites }
      );
      if (!hasStoredSites) {
        chrome.storage.local.set({ siteAllowlist: settings.siteAllowlist });
      }
      normalizeStatsMetadata();
      updateActivation();
    }
  );

  function normalizeSiteList(list, opts = {}) {
    const wasArray = typeof opts.sourceWasArray === 'boolean' ? opts.sourceWasArray : Array.isArray(list);
    if (!Array.isArray(list)) list = [];
    const cleaned = list
      .map(item => typeof item === 'string' ? sanitizeDomain(item) : '')
      .filter(Boolean);
    if (!cleaned.length) {
      return wasArray ? [] : DEFAULT_SITES.slice();
    }
    return Array.from(new Set(cleaned));
  }

  function sanitizeDomain(input) {
    let value = String(input || '').trim().toLowerCase();
    if (!value) return '';
    value = value.replace(/\s+/g, '');
    value = value.replace(/^[a-z]+:\/\//, '');
    value = value.replace(/\/.*/, '');
    while (value.endsWith('.')) value = value.slice(0, -1);
    if (value.startsWith('www.')) value = value.slice(4);
    return value;
  }

  const domainPatternCache = new Map();

  function escapeRegExp(str) {
    return str.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  }

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

  updateActivation();

  function updateActivation() {
    const hostname = location.hostname.toLowerCase();
    activeForPage = settings.siteAllowlist.some(pattern => matchesSitePattern(hostname, pattern));
  }

  function formatCodePoint(cp) {
    return `U+${cp.toString(16).toUpperCase().padStart(4, '0')}`;
  }

  function isEmojiCodePoint(cp, char) {
    if (!Number.isFinite(cp)) return false;
    if (char && emojiRegex.test(char)) return true;
    if (cp >= 0x1F300 && cp <= 0x1FAFF) return true;
    if (cp >= 0x1F000 && cp <= 0x1F02F) return true;
    if (cp >= 0x1F600 && cp <= 0x1F64F) return true;
    if (cp >= 0x1F680 && cp <= 0x1F6FF) return true;
    if (cp >= 0x1F900 && cp <= 0x1F9FF) return true;
    return false;
  }

  function classifyCodePoint(cp) {
    if (!Number.isFinite(cp)) return 'Unknown';
    if (cp <= 0x1F) return 'Control';
    if (cp === 0x20) return 'Whitespace';
    if (cp <= 0x7F) return 'ASCII';
    if (cp >= 0x0300 && cp <= 0x036F) return 'Combining Mark';
    if (cp >= 0x0370 && cp <= 0x03FF) return 'Greek Letter';
    if (cp >= 0x0400 && cp <= 0x04FF) return 'Cyrillic';
    if (cp >= 0x2000 && cp <= 0x206F) return 'Punctuation';
    if (cp >= 0x2070 && cp <= 0x209F) return 'Superscript/Subscript';
    if (cp >= 0x2100 && cp <= 0x214F) return 'Letterlike Symbol';
    if (cp >= 0x2190 && cp <= 0x21FF) return 'Arrow';
    if (cp >= 0x2200 && cp <= 0x22FF) return 'Math Symbol';
    if (cp >= 0x2300 && cp <= 0x23FF) return 'Technical Symbol';
    if (cp >= 0x2460 && cp <= 0x24FF) return 'Number Form';
    if (cp >= 0x25A0 && cp <= 0x25FF) return 'Geometric Symbol';
    if (cp >= 0x2600 && cp <= 0x26FF) return 'Dingbat';
    if (cp >= 0x2700 && cp <= 0x27BF) return 'Dingbat';
    if (cp >= 0x3000 && cp <= 0x303F) return 'CJK Punctuation';
    if (cp >= 0x3040 && cp <= 0x30FF) return 'Kana';
    if (cp >= 0x4E00 && cp <= 0x9FFF) return 'CJK Ideograph';
    if (cp >= 0xD800 && cp <= 0xDBFF) return 'High Surrogate';
    if (cp >= 0xDC00 && cp <= 0xDFFF) return 'Low Surrogate';
    if (cp >= 0x1F000) return 'Emoji';
    return 'Non-ASCII';
  }

  function getCodePointMeta(codePoint, char) {
    const key = typeof codePoint === 'number' ? formatCodePoint(codePoint) : codePoint;
    const cpNumber = typeof codePoint === 'number' ? codePoint : parseInt(key.slice(2), 16);
    const info = unicodeDatabase[key];
    const isEmoji = typeof info?.isEmoji === 'boolean' ? info.isEmoji : isEmojiCodePoint(cpNumber, char);
    return {
      key,
      name: info?.name || 'UNKNOWN CHARACTER',
      category: info?.category || classifyCodePoint(cpNumber),
      emoji: isEmoji
    };
  }

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
      chrome.storage.local.set({ stats }, () => { normalizingStats = false; });
    }
  }

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
    } catch { }
  }

  function shouldRemove(cp, char) {
    if (cp <= 0x7F) return false;
    const isEmoji = isEmojiCodePoint(cp, char);
    if (isEmoji && !settings.removeEmojis) return false;
    return true;
  }

  function recordRemoval(map, cp, char, amount) {
    const meta = getCodePointMeta(cp, char);
    const existing = map.get(meta.key);
    if (existing) {
      existing.count += amount;
    } else {
      map.set(meta.key, { count: amount, name: meta.name, category: meta.category, emoji: meta.emoji });
    }
  }

  function updateStats(removals) {
    if (!removals.size) return 0;
    let total = 0;
    for (const [key, data] of removals.entries()) {
      const entry = stats[key] || { count: 0, char: data.name, category: data.category, emoji: data.emoji };
      entry.count += data.count;
      entry.char = data.name;
      entry.category = data.category;
      entry.emoji = data.emoji;
      stats[key] = entry;
      total += data.count;
    }
    chrome.storage.local.set({ stats });
    return total;
  }

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

  document.addEventListener('copy', e => {
    if (!activeForPage) return;
    const sel = getSelectedText();
    if (!sel) return;

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

    if (!removals.size && cleaned === sel) return;

    e.clipboardData.setData('text/plain', cleaned);
    e.preventDefault();

    const removedCount = updateStats(removals);
    const message = removedCount > 0 ? `Cleaned ✂️ ${removedCount}` : 'Already Clean!';
    setTimeout(() => showBadge(message), 0);
  }, true);

  chrome.storage.onChanged?.addListener((changes, area) => {
    if (area !== 'local') return;
    if ('stats' in changes) {
      stats = changes.stats.newValue || {};
      normalizeStatsMetadata();
    }
    if ('removeEmojis' in changes) {
      settings.removeEmojis = !!changes.removeEmojis.newValue;
    }
    if ('siteAllowlist' in changes) {
      settings.siteAllowlist = normalizeSiteList(
        changes.siteAllowlist.newValue,
        { sourceWasArray: Array.isArray(changes.siteAllowlist.newValue) }
      );
      domainPatternCache.clear();
      updateActivation();
    }
  });

})();
