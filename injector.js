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
   * Similar logic to content_script.js but adapted for the main world.
   * @param {string} text - The text to sanitize.
   * @returns {{cleaned: string, removals: Map}} The cleaned text and removal stats.
   */
  function sanitize(text) {
    if (!text || typeof text !== 'string') return { cleaned: text, removals: new Map() };
    
    let currentText = text;
    if (settings.removeCitations) {
      currentText = currentText.replace(citationRegex, '');
    }

    const removals = new Map();
    const kept = [];

    for (const char of Array.from(currentText)) {
      const cp = char.codePointAt(0);
      if (typeof cp !== 'number') {
        kept.push(char);
        continue;
      }

      // shouldRemove logic
      let remove = false;
      if (cp > 0x7F) {
        const isEmoji = isEmojiCodePoint(cp, char);
        if (isEmoji) {
          if (settings.removeEmojis) remove = true;
        } else {
          remove = true;
        }
      }

      if (remove) {
        const meta = getCodePointMeta(cp, char);
        const existing = removals.get(meta.key);
        if (existing) {
          existing.count++;
        } else {
          removals.set(meta.key, { count: 1, name: meta.name, category: meta.category, emoji: meta.emoji });
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
   * @param {Map} removals - The map of removals.
   * @param {string} originalText - The original text.
   * @param {string} cleanedText - The cleaned text.
   */
  function reportRemovals(removals, originalText, cleanedText) {
    if (removals.size === 0 && originalText === cleanedText) return;

    // Convert Map to Object for postMessage
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
      if (settings.activeForPage) {
        const { cleaned, removals } = sanitize(text);
        reportRemovals(removals, text, cleaned);
        return originalWriteText.call(this, cleaned);
      }
      return originalWriteText.call(this, text);
    };
  }

  // Intercept DataTransfer.prototype.setData (used in 'copy' events)
  const originalSetData = DataTransfer.prototype.setData;
  DataTransfer.prototype.setData = function (type, value) {
    if (settings.activeForPage && type === 'text/plain') {
      const { cleaned, removals } = sanitize(value);
      reportRemovals(removals, value, cleaned);
      return originalSetData.call(this, type, cleaned);
    }
    return originalSetData.call(this, type, value);
  };

  // Listen for settings from the isolated world
  window.addEventListener('message', (event) => {
    if (event.source !== window) return;
    if (event.data && event.data.type === 'AI_TEXT_SANITISER_SETTINGS') {
      settings = { ...settings, ...event.data.settings };
    }
  });

  // Request initial settings
  window.postMessage({ type: 'AI_TEXT_SANITISER_PING' }, '*');

})();
