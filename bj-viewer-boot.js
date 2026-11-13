// bj-viewer-boot.js — starts view.html on GitHub Pages (copied into the site by tools/build-site.mjs).
// In Apps Script the viewer page arrives with its values already filled in (template). Here the page is a plain
// file, so this script first asks the data door for the same values (?api=viewer — Code.gs viewerData_()),
// fills them in (%%name%% spots in the page, window.__V for the script), then runs the viewer script.
(function () {
  'use strict';
  var params = new URLSearchParams(location.search);
  var q = {};
  ['file', 'page', 'printedPage', 'section', 'term'].forEach(function (k) { if (params.has(k)) q[k] = params.get(k); });
  var inApp = params.get('inapp') === '1' && window.parent !== window;

  function fill(v) {
    var re = /%%(\w+)%%/g;
    var val = function (m, k) { return v[k] == null ? '' : String(v[k]); };
    var walker = document.createTreeWalker(document.body, NodeFilter.SHOW_TEXT);
    var n;
    while ((n = walker.nextNode())) {
      if (n.parentNode && n.parentNode.id === 'bjViewerMain') continue;   // the viewer script itself
      if (n.nodeValue.indexOf('%%') !== -1) n.nodeValue = n.nodeValue.replace(re, val);
    }
    document.querySelectorAll('*').forEach(function (el) {
      for (var i = 0; i < el.attributes.length; i++) {
        var a = el.attributes[i];
        if (a.value.indexOf('%%') !== -1) el.setAttribute(a.name, a.value.replace(re, val));
      }
    });
    document.title = v.pageTitle || document.title.replace(re, '');
    document.querySelectorAll('[data-bjv]').forEach(function (el) { var k = el.getAttribute('data-bjv'); el.textContent = v[k] == null ? '' : String(v[k]); });
  }

  function runViewer() {
    var src = document.getElementById('bjViewerMain');
    var s = document.createElement('script');
    s.text = src.textContent;
    document.body.appendChild(s);
  }

  function homeButton() {
    var home = document.getElementById('homeBtn');
    if (!home) return;
    if (inApp) {
      home.removeAttribute('target');
      home.addEventListener('click', function (e) {
        e.preventDefault();
        window.parent.postMessage({ bj: 'close-viewer' }, location.origin);
      });
    }
  }

  function failed(err) {
    var old = window.BJ_EXEC + '?view=page&' + params.toString().replace(/(^|&)inapp=1/, '');
    var box = document.createElement('div');
    box.setAttribute('role', 'alert');
    box.style.cssText = 'position:fixed;inset:0;display:flex;flex-direction:column;align-items:center;justify-content:center;gap:12px;' +
      'background:#04070c;color:#f3eded;font:15px/1.5 system-ui,sans-serif;text-align:center;padding:24px;z-index:2147483600';
    var offline = navigator.onLine === false;
    box.innerHTML = '<div style="font-size:42px">' + (offline ? '📡' : '⚠️') + '</div>' +
      '<div style="font-weight:700">' + (offline ? 'ไม่มีอินเทอร์เน็ต' : 'เปิดหน้าแคตตาล็อกไม่สำเร็จ') + '</div>' +
      '<div style="opacity:.75;font-size:13px">' + (offline ? 'No internet connection' : 'Could not open this catalogue page') + '</div>';
    var again = document.createElement('button');
    again.type = 'button'; again.textContent = '⟳ ลองใหม่ / Try again';
    again.style.cssText = 'border:0;border-radius:999px;padding:11px 20px;background:#c81e1e;color:#fff;font-weight:600;cursor:pointer';
    again.onclick = function () { location.reload(); };
    box.appendChild(again);
    if (!offline) {
      var alt = document.createElement('a');
      alt.href = old; alt.target = '_blank'; alt.rel = 'noopener';
      alt.textContent = 'เปิดแบบเดิม / Open the old viewer ⤴';
      alt.style.cssText = 'color:#ff8a80;font-size:13px';
      box.appendChild(alt);
    }
    if (inApp) {
      var back = document.createElement('button');
      back.type = 'button'; back.textContent = '✕ กลับ / Back';
      back.style.cssText = 'border:1px solid rgba(255,255,255,.3);border-radius:999px;padding:9px 18px;background:transparent;color:#f3eded;cursor:pointer';
      back.onclick = function () { window.parent.postMessage({ bj: 'close-viewer' }, location.origin); };
      box.appendChild(back);
    }
    document.body.appendChild(box);
    console.warn('[bj] viewer data failed:', err);
  }

  window.BJ_API('viewer', [q]).then(function (v) {
    v.baseUrl = './';                 // 🏠 = the app's search page (inside the app: closes the viewer)
    window.__V = v;
    fill(v);
    homeButton();
    runViewer();
  }, failed);
})();
