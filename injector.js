/**
 * Injector script for AI Text Sanitiser.
 * Runs in the MAIN world to intercept programmatic clipboard writes.
 */
(function () {
  let settings = {
    removeEmojis: true,
    removeCitations: true,
    activeForPage: false
  };

  /**
   * Performs the sanitization on a string.
   * @param {string} text - The text to sanitize.
   * @returns {{cleaned: string, removals: Map}} The cleaned text and removal stats.
   */
  function sanitize(text) {
    if (!text || typeof text !== 'string') return { cleaned: text, removals: new Map() };
    
    // Safely access utils from window
    const utils = window.AI_TEXT_SANITISER_UTILS;
    if (!utils) return { cleaned: text, removals: new Map() };

    let currentText = text;
    if (settings.removeCitations && utils.citationRegex) {
      currentText = currentText.replace(utils.citationRegex, '');
    }

    const removals = new Map();
    const kept = [];

    for (const char of Array.from(currentText)) {
      const cp = char.codePointAt(0);
      if (typeof cp !== 'number') {
        kept.push(char);
        continue;
      }

      let remove = false;
      if (cp > 0x7F) {
        const isEmoji = utils.isEmojiCodePoint ? utils.isEmojiCodePoint(cp, char) : false;
        if (isEmoji) {
          if (settings.removeEmojis) remove = true;
        } else {
          remove = true;
        }
      }

      if (remove) {
        const meta = utils.getCodePointMeta ? utils.getCodePointMeta(cp, char) : { key: 'U+' + cp.toString(16) };
        const existing = removals.get(meta.key);
        if (existing) {
          existing.count++;
        } else {
          removals.set(meta.key, { 
            count: 1, 
            name: meta.name || 'Unknown', 
            category: meta.category || 'Unknown', 
            emoji: !!meta.emoji 
          });
        }
      } else {
        kept.push(char);
      }
    }

    return {
      cleaned: kept.join(''),
      removals
    };
  }

  /**
   * Reports removals back to the isolated world.
   */
  function reportRemovals(removals, originalText, cleanedText) {
    if (removals.size === 0 && originalText === cleanedText) return;

    const removalsObj = {};
    for (const [key, value] of removals.entries()) {
      removalsObj[key] = value;
    }

    window.postMessage({
      type: 'AI_TEXT_SANITISER_REMOVALS',
      removals: removalsObj,
      isCleaned: true
    }, '*');
  }

  // Intercept navigator.clipboard.writeText
  if (navigator.clipboard && navigator.clipboard.writeText) {
    const originalWriteText = navigator.clipboard.writeText;
    navigator.clipboard.writeText = function (text) {
      let targetText = text;
      try {
        if (settings.activeForPage) {
          const { cleaned, removals } = sanitize(text);
          reportRemovals(removals, text, cleaned);
          targetText = cleaned;
        }
      } catch (err) {
        console.error('AI Text Sanitiser: Error during writeText interception', err);
      }
      return originalWriteText.apply(navigator.clipboard, [targetText]);
    };
  }

  // Intercept DataTransfer.prototype.setData (used in 'copy' events)
  if (typeof DataTransfer !== 'undefined' && DataTransfer.prototype.setData) {
    const originalSetData = DataTransfer.prototype.setData;
    DataTransfer.prototype.setData = function (type, value) {
      let targetValue = value;
      try {
        if (settings.activeForPage && type === 'text/plain') {
          const { cleaned, removals } = sanitize(value);
          reportRemovals(removals, value, cleaned);
          targetValue = cleaned;
        }
      } catch (err) {
        console.error('AI Text Sanitiser: Error during setData interception', err);
      }
      return originalSetData.apply(this, [type, targetValue]);
    };
  }

  // Listen for settings from the isolated world
  window.addEventListener('message', (event) => {
    if (event.source !== window) return;
    if (event.data && event.data.type === 'AI_TEXT_SANITISER_SETTINGS') {
      settings = { ...settings, ...event.data.settings };
    }
  });

  // Periodically request initial settings until received
  let pingCount = 0;
  const pingInterval = setInterval(() => {
    window.postMessage({ type: 'AI_TEXT_SANITISER_PING' }, '*');
    if (++pingCount > 10) clearInterval(pingInterval);
  }, 500);

})();
