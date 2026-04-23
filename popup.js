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

function formatCodePoint(value) {
  if (typeof value === 'number' && Number.isFinite(value)) {
    return `U+${value.toString(16).toUpperCase().padStart(4, '0')}`;
  }
  if (typeof value === 'string' && /^u\+[0-9a-f]+$/i.test(value)) {
    const hex = value.slice(2).toUpperCase().padStart(4, '0');
    return `U+${hex}`;
  }
  return 'U+0000';
}

function isEmojiCodePoint(cp, char = '') {
  if (!Number.isFinite(cp)) return false;
  if (cp >= 0x1F000 && cp <= 0x1FAFF) return true;
  if (cp >= 0x1F600 && cp <= 0x1F64F) return true;
  if (cp >= 0x1F680 && cp <= 0x1F6FF) return true;
  if (cp >= 0x1F900 && cp <= 0x1F9FF) return true;
  if (cp >= 0x1F300 && cp <= 0x1F5FF) return true;
  if (char && emojiRegex.test(char)) return true;
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

function parseCodePoint(codePoint) {
  if (typeof codePoint === 'number') return codePoint;
  if (typeof codePoint !== 'string') return NaN;
  if (!codePoint.startsWith('U+')) return NaN;
  const hex = codePoint.slice(2);
  return parseInt(hex, 16);
}

function getCodePointMeta(codePoint, entry = {}) {
  const key = typeof codePoint === 'string' ? formatCodePoint(codePoint) : formatCodePoint(codePoint);
  const cpNumber = parseCodePoint(key);
  const db = unicodeDatabase[key];
  const name = db?.name || entry?.char || 'UNKNOWN CHARACTER';
  const category = db?.category || entry?.category || classifyCodePoint(cpNumber);
  const emoji = typeof entry?.emoji === 'boolean'
    ? entry.emoji
    : typeof db?.isEmoji === 'boolean'
      ? db.isEmoji
      : isEmojiCodePoint(cpNumber);
  return { key, name, category, emoji };
}

document.addEventListener('DOMContentLoaded', () => {
  const tableBody = document.querySelector('#statsTable tbody');
  const resetBtn = document.getElementById('resetBtn');
  const removeEmojiToggle = document.getElementById('removeEmojiToggle');
  const siteForm = document.getElementById('siteForm');
  const siteInput = document.getElementById('siteInput');
  const siteList = document.getElementById('siteList');

  const state = {
    stats: {},
    removeEmojis: true,
    siteAllowlist: DEFAULT_SITES.slice()
  };

  function normalizeDomain(input) {
    let value = String(input || '').trim().toLowerCase();
    if (!value) return '';
    value = value.replace(/\s+/g, '');
    value = value.replace(/^[a-z]+:\/\//, '');
    value = value.replace(/\/.*/, '');
    while (value.endsWith('.')) value = value.slice(0, -1);
    if (value.startsWith('www.')) value = value.slice(4);
    return value;
  }

  function uniqueDomains(domains) {
    return Array.from(new Set(domains));
  }

  function isEmojiEntry(code, entry) {
    const meta = getCodePointMeta(code, entry);
    return !!meta.emoji;
  }

  function renderStats() {
    const entries = Object.entries(state.stats);
    if (!entries.length) {
      tableBody.innerHTML = '<tr><td colspan="4" class="muted">No stats yet</td></tr>';
      return;
    }

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

  function syncUI() {
    removeEmojiToggle.checked = state.removeEmojis;
    renderStats();
    renderSites();
  }

  chrome.storage.local.get(
    ['stats', 'removeEmojis', 'siteAllowlist'],
    res => {
      state.stats = res.stats || {};
      state.removeEmojis = res.removeEmojis !== false;
      state.siteAllowlist = Array.isArray(res.siteAllowlist)
        ? uniqueDomains(res.siteAllowlist.map(normalizeDomain).filter(Boolean))
        : DEFAULT_SITES.slice();
      syncUI();
    }
  );

  chrome.storage.onChanged?.addListener((changes, area) => {
    if (area !== 'local') return;
    if ('stats' in changes) {
      state.stats = changes.stats.newValue || {};
    }
    if ('removeEmojis' in changes) {
      state.removeEmojis = !!changes.removeEmojis.newValue;
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

  resetBtn.addEventListener('click', () => {
    if (confirm('Reset all stats?')) {
      chrome.storage.local.set({ stats: {} });
    }
  });

  removeEmojiToggle.addEventListener('change', () => {
    const remove = removeEmojiToggle.checked;
    state.removeEmojis = remove;
    chrome.storage.local.set({ removeEmojis: remove });
    renderStats();
  });

  siteForm.addEventListener('submit', e => {
    e.preventDefault();
    const domain = normalizeDomain(siteInput.value);
    if (!domain) return;
    if (!state.siteAllowlist.includes(domain)) {
      state.siteAllowlist = uniqueDomains([...state.siteAllowlist, domain]);
      chrome.storage.local.set({ siteAllowlist: state.siteAllowlist });
    }
    siteInput.value = '';
    renderSites();
  });

  siteList.addEventListener('click', e => {
    const button = e.target.closest('button[data-remove]');
    if (!button) return;
    const domain = button.getAttribute('data-remove');
    state.siteAllowlist = state.siteAllowlist.filter(item => item !== domain);
    chrome.storage.local.set({ siteAllowlist: state.siteAllowlist });
    renderSites();
  });
});
