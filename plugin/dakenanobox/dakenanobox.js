/*!
 * NanoBox v1.1.0
 * 輕量 Lightbox 套件 — 無任何依賴
 *
 * ── HTML 用法 ──────────────────────────────────────────
 *   <link rel="stylesheet" href="nanobox.css">
 *   <script src="nanobox.js"></script>
 *
 *   <!-- 屬性綁定 -->
 *   <a href="https://example.com" data-nanobox>開啟</a>
 *   <a href="https://example.com"
 *      data-nanobox
 *      data-nanobox-title="標題"
 *      data-nanobox-width="70vw"
 *      data-nanobox-height="70vh">開啟</a>
 *
 * ── JS API ─────────────────────────────────────────────
 *   NanoBox.open(url [, options])
 *   NanoBox.close()
 *   NanoBox.config(options)   ← 修改全域預設值
 *   NanoBox.bindAll()         ← 動態插入元素後重新掃描
 *
 * ── options 物件 ───────────────────────────────────────
 *   title          {string}   視窗標題（省略則自動讀 iframe <title>）
 *   width          {string}   視窗寬度，預設 '50vw'
 *   maxWidth       {string}   最大寬度，預設 '760px'
 *   minWidth       {string}   最小寬度，預設 '320px'
 *   height         {string}   視窗高度，預設 '80vh'
 *   closeOnOverlay {boolean}  點擊背景關閉，預設 true
 *   closeOnEsc     {boolean}  按 Esc 關閉，預設 true
 *   animDuration   {number}   動畫毫秒數，預設 280
 *   zIndex         {number}   層級，預設 9999
 */

(function (root, factory) {
  if (typeof module !== 'undefined' && module.exports) {
    module.exports = factory();
  } else {
    root.NanoBox = factory();
  }
})(typeof window !== 'undefined' ? window : this, function () {
  'use strict';

  /* ── 預設設定 ─────────────────────────────────────── */
  var defaults = {
    title:          '',
    width:          '50vw',
    maxWidth:       '760px',
    minWidth:       '320px',
    height:         '90vh',
    closeOnOverlay: true,
    closeOnEsc:     true,
    animDuration:   280,
    zIndex:         9999,
  };

  /* ── 內部狀態 ─────────────────────────────────────── */
  var _overlay = null;
  var _modal   = null;
  var _iframe  = null;
  var _opts    = {};
  var _isOpen  = false;

  /* ── 建立 DOM ─────────────────────────────────────── */
  function _build(opts) {
    /* 遮罩層 */
    _overlay = document.createElement('div');
    _overlay.id = 'nanobox-overlay';
    _overlay.style.setProperty('--nb-dur', opts.animDuration + 'ms');
    _overlay.style.zIndex = opts.zIndex;
    _overlay.setAttribute('role', 'dialog');
    _overlay.setAttribute('aria-modal', 'true');
    _overlay.setAttribute('aria-label', opts.title || 'lightbox');

    /* 視窗（透過 CSS 變數傳遞尺寸，讓 CSS 可以 override） */
    _modal = document.createElement('div');
    _modal.id = 'nanobox-modal';
    _modal.style.setProperty('--nb-w',   opts.width);
    _modal.style.setProperty('--nb-mxw', opts.maxWidth);
    _modal.style.setProperty('--nb-mnw', opts.minWidth);
    _modal.style.setProperty('--nb-h',   opts.height);

    /* 標題列 */
    var header = document.createElement('div');
    header.id = 'nanobox-header';

    var titleEl = document.createElement('div');
    titleEl.id = 'nanobox-title';
    titleEl.textContent = opts.title || '';
    if (!opts.title) titleEl.style.display = 'none';

    /* 關閉按鈕 */
    var closeBtn = document.createElement('button');
    closeBtn.id = 'nanobox-close';
    closeBtn.setAttribute('type', 'button');
    closeBtn.setAttribute('aria-label', '關閉');
    closeBtn.innerHTML =
      '<svg width="26" height="26" viewBox="0 0 16 16" fill="none" ' +
      'xmlns="http://www.w3.org/2000/svg" aria-hidden="true">' +
      '<path d="M12 4L4 12M4 4l8 8" stroke="currentColor" ' +
      'stroke-width="1" stroke-linecap="round"/></svg>';
    closeBtn.addEventListener('click', close);

    header.appendChild(titleEl);
    header.appendChild(closeBtn);

    /* 載入中 spinner */
    var loader = document.createElement('div');
    loader.id = 'nanobox-loader';
    loader.innerHTML = '<div class="nb-spinner"></div>';

    /* iframe */
    _iframe = document.createElement('iframe');
    _iframe.id = 'nanobox-iframe';
    _iframe.setAttribute('allowfullscreen', '');
    _iframe.setAttribute('allow', 'autoplay; fullscreen');
    _iframe.setAttribute('sandbox',
      'allow-scripts allow-same-origin allow-forms allow-popups allow-presentation allow-popups-to-escape-sandbox');

    _iframe.addEventListener('load', function () {
      loader.classList.add('nb-hidden');
      /* 嘗試讀取跨域同源頁面的 <title> 作為標題 */
      try {
        var doc = _iframe.contentDocument || _iframe.contentWindow.document;
        if (!opts.title && doc.title) {
          titleEl.textContent = doc.title;
          titleEl.style.display = '';
        }
      } catch (e) { /* cross-origin，忽略 */ }
    });

    /* 組裝 */
    _modal.appendChild(header);
    _modal.appendChild(loader);
    _modal.appendChild(_iframe);
    _overlay.appendChild(_modal);

    /* 點擊遮罩關閉 */
    if (opts.closeOnOverlay) {
      _overlay.addEventListener('click', function (e) {
        if (e.target === _overlay) close();
      });
    }

    document.body.appendChild(_overlay);
    document.body.style.overflow = 'hidden';
  }

  /* ── open(url, options) ───────────────────────────── */
  function open(url, userOpts) {
    if (!url) return NanoBox;
    if (_isOpen) close(true); /* 若已開啟，先立即關閉 */

    _opts = Object.assign({}, defaults, userOpts || {});
    _build(_opts);

    /* 強制 reflow 再加 class，確保 transition 有效 */
    void _overlay.offsetWidth;
    _overlay.classList.add('nb-visible');
    _isOpen = true;

    if (_opts.closeOnEsc) {
      document.addEventListener('keydown', _escHandler);
    }

    /* 延一幀再設定 src，避免部分瀏覽器 transition 跑不完整 */
    requestAnimationFrame(function () { _iframe.src = url; });

    return NanoBox;
  }

  /* ── close([immediate]) ───────────────────────────── */
  function close(immediate) {
    if (!_isOpen || !_overlay) return;
    _isOpen = false;
    document.removeEventListener('keydown', _escHandler);

    if (immediate) {
      _cleanup();
      return;
    }

    _overlay.classList.remove('nb-visible');
    setTimeout(_cleanup, _opts.animDuration + 40);
  }

  function _cleanup() {
    if (_overlay && _overlay.parentNode) {
      _overlay.parentNode.removeChild(_overlay);
    }
    document.body.style.overflow = '';
    _overlay = _modal = _iframe = null;
  }

  function _escHandler(e) {
    if (e.key === 'Escape' || e.keyCode === 27) close();
  }

  /* ── bindAll() ────────────────────────────────────── */
  /* 掃描所有 [data-nanobox] 元素並綁定點擊事件           */
  function bindAll() {
    document.querySelectorAll('[data-nanobox]').forEach(function (el) {
      if (el._nbBound) return; /* 避免重複綁定 */
      el._nbBound = true;
      el.addEventListener('click', function (e) {
        e.preventDefault();
        var url   = el.getAttribute('href') || el.getAttribute('data-nanobox-src') || '';
        var title = el.getAttribute('data-nanobox-title') || el.getAttribute('title') || '';
        var w     = el.getAttribute('data-nanobox-width')  || '';
        var h     = el.getAttribute('data-nanobox-height') || '';
        if (!url) return;
        open(url, {
          title:  title,
          width:  w || defaults.width,
          height: h || defaults.height,
        });
      });
    });
  }

  /* DOMContentLoaded 後自動掃描 */
  if (typeof document !== 'undefined') {
    if (document.readyState === 'loading') {
      document.addEventListener('DOMContentLoaded', bindAll);
    } else {
      bindAll();
    }
  }

  /* ── 公開 API（物件形式）─────────────────────────── */
  var NanoBox = {
    /**
     * 開啟 lightbox
     * @param {string} url       要載入的網址
     * @param {object} [options] 選項（覆蓋全域預設值）
     * @returns {NanoBox}
     */
    open: open,

    /**
     * 關閉 lightbox
     * @returns {NanoBox}
     */
    close: function () { close(); return NanoBox; },

    /**
     * 修改全域預設值
     * @param {object} options
     * @returns {NanoBox}
     */
    config: function (options) {
      Object.assign(defaults, options);
      return NanoBox;
    },

    /**
     * 重新掃描 [data-nanobox] 元素（動態插入 DOM 後呼叫）
     * @returns {NanoBox}
     */
    bindAll: function () { bindAll(); return NanoBox; },
  };

  return NanoBox;
});
