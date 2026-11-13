// bj-app.js — runtime of the BJ Catalogue pages on GitHub Pages (copied into the site by tools/build-site.mjs).
// The pages (index.html = search, view.html = catalogue page viewer) are the same files as in Apps Script;
// here Apps Script is only the DATA DOOR:  GET <exec>?api=<name>&args=<JSON array>  →  {ok, data}.
//  • google.script.run is replaced by a small stand-in that calls the data door (same handlers, same results)
//  • search page: "📖 Open full page" opens the viewer INSIDE the app (layer on top, Back closes it),
//    🔗 copies the github.io viewer link
//  • install pill, "no internet" bar, service worker (offline start of the app itself)
(function () {
  'use strict';
  var EXEC = 'https://script.google.com/macros/s/AKfycbwxwu1-tkaSeVO5RzF_r6Gij5CSeTzdgTIYZvG3woD9O3cdMmCHdkobK4qbhe-Pl-o/exec';          // filled by the builder (public web-app link)
  var VERSION = 'v2026.11.13-0821';
  var IS_VIEWER = /\/view\.html$/.test(location.pathname);
  window.BJ_APP_VERSION = VERSION;
  window.BJ_EXEC = EXEC;

  // ---------------------------------------------------------------- data door
  var NO_RETRY = { logSearchTerm: 1, logPageView: 1 };
  function api(name, args, retried) {
    var url = EXEC + '?api=' + encodeURIComponent(name) + '&args=' + encodeURIComponent(JSON.stringify(args || []));
    return fetch(url, { method: 'GET', credentials: 'omit', cache: 'no-store' })
      .then(function (r) { if (!r.ok) throw new Error('HTTP ' + r.status); return r.json(); })
      .then(function (j) {
        if (!j || j.ok !== true) { var e = new Error((j && j.error) || 'No answer from the catalogue server'); e.fromServer = true; throw e; }
        return j.data;
      })
      .catch(function (err) {
        // one quiet retry for reads (Apps Script sometimes answers 5xx on a cold start)
        if (!retried && !err.fromServer && !NO_RETRY[name] && navigator.onLine !== false) {
          return new Promise(function (res) { setTimeout(res, 800); }).then(function () { return api(name, args, true); });
        }
        throw err;
      });
  }
  window.BJ_API = api;

  // google.script.run stand-in: google.script.run.withSuccessHandler(f).withFailureHandler(g).name(args…)
  function runner() {
    var ok = null, fail = null, user;
    var p = new Proxy({}, {
      get: function (_, k) {
        if (k === 'withSuccessHandler') return function (f) { ok = f; return p; };
        if (k === 'withFailureHandler') return function (f) { fail = f; return p; };
        if (k === 'withUserObject') return function (u) { user = u; return p; };
        if (typeof k !== 'string' || k === 'then') return undefined;   // never look like a promise
        return function () {
          var args = Array.prototype.slice.call(arguments);
          api(k, args).then(function (d) { if (ok) ok(d, user); }, function (e) { if (fail) fail(e, user); else console.warn('[bj] ' + k + ' failed:', e); });
        };
      }
    });
    return p;
  }
  window.google = window.google || {};
  window.google.script = { run: new Proxy({}, { get: function (_, k) { return (typeof k !== 'string' || k === 'then') ? undefined : runner()[k]; } }) };

  // ------------------------------------------------------------ service worker
  if ('serviceWorker' in navigator) {
    window.addEventListener('load', function () { navigator.serviceWorker.register('sw.js').catch(function () {}); });
  }

  // ------------------------------------------------------- no-internet bar (both pages)
  function netBar() {
    var bar = document.getElementById('bjNet');
    if (!bar) {
      bar = document.createElement('div');
      bar.id = 'bjNet';
      bar.setAttribute('role', 'status');
      bar.style.cssText = 'position:fixed;left:50%;top:calc(10px + env(safe-area-inset-top));transform:translateX(-50%);z-index:2147483600;' +
        'background:#c81e1e;color:#fff;font:600 13px/1.35 system-ui,sans-serif;padding:8px 14px;border-radius:999px;box-shadow:0 6px 20px rgba(0,0,0,.35);' +
        'max-width:calc(100% - 24px);text-align:center;display:none';
      bar.textContent = '📡 ไม่มีอินเทอร์เน็ต — ค้นหาไม่ได้ชั่วคราว · No internet — search needs a connection';
      document.body.appendChild(bar);
    }
    bar.style.display = navigator.onLine === false ? 'block' : 'none';
  }
  window.addEventListener('online', netBar);
  window.addEventListener('offline', netBar);
  document.addEventListener('DOMContentLoaded', netBar);

  if (IS_VIEWER) return;

  // ===================================================== search page (index.html)
  var VIEW_KEYS = ['file', 'page', 'printedPage', 'section', 'term'];
  function viewerHref(url) {
    var q = new URLSearchParams();
    try {
      var p = new URL(url, location.href).searchParams;
      VIEW_KEYS.forEach(function (k) { if (p.has(k)) q.set(k, p.get(k)); });
    } catch (e) { /* keep empty */ }
    return new URL('view.html?' + q.toString(), location.href).href;
  }

  var layer = null;
  function closeViewer() {
    if (!layer) return;
    layer.remove(); layer = null;
    document.documentElement.style.overflow = '';
  }
  function openViewer(url) {
    closeViewer();
    layer = document.createElement('iframe');
    layer.id = 'bjViewerLayer';
    layer.title = 'Catalogue page';
    layer.setAttribute('allow', 'fullscreen; clipboard-write');
    layer.style.cssText = 'position:fixed;inset:0;width:100%;height:100%;border:0;z-index:2147483000;background:#04070c';
    layer.src = viewerHref(url) + '&inapp=1';
    document.body.appendChild(layer);
    document.documentElement.style.overflow = 'hidden';
    history.pushState({ bjViewer: 1 }, '');          // phone Back button closes the viewer
  }
  window.addEventListener('popstate', function () { if (layer) closeViewer(); });
  window.addEventListener('message', function (e) {
    if (e.origin !== location.origin || !e.data || e.data.bj !== 'close-viewer') return;
    if (history.state && history.state.bjViewer) history.back(); else closeViewer();
  });

  window.BJ_APP = { openViewer: openViewer, shareUrl: viewerHref, closeViewer: closeViewer, version: VERSION };

  // -------------------------------------------------------------- install pill
  var standalone = (window.matchMedia && matchMedia('(display-mode: standalone)').matches) || navigator.standalone === true;
  function hidden() { try { return localStorage.getItem('bjInstallHidden') === '1'; } catch (e) { return false; } }
  function pill(html, onGo) {
    if (standalone || hidden() || document.getElementById('bjInstall')) return;
    var box = document.createElement('div');
    box.id = 'bjInstall';
    box.style.cssText = 'position:fixed;left:50%;bottom:calc(14px + env(safe-area-inset-bottom));transform:translateX(-50%);z-index:2147483500;' +
      'display:flex;align-items:center;gap:10px;padding:10px 12px 10px 16px;border-radius:999px;background:rgba(26,20,20,.95);color:#f3eded;' +
      'border:1px solid rgba(255,255,255,.15);box-shadow:0 6px 24px rgba(0,0,0,.45);font:13px/1.35 system-ui,sans-serif;max-width:calc(100% - 28px)';
    var t = document.createElement('span'); t.innerHTML = html; box.appendChild(t);
    if (onGo) {
      var go = document.createElement('button');
      go.type = 'button'; go.textContent = 'ติดตั้ง / Install';
      go.style.cssText = 'border:0;border-radius:999px;padding:7px 12px;background:#c81e1e;color:#fff;font-weight:600;cursor:pointer';
      go.onclick = onGo; box.appendChild(go);
    }
    var x = document.createElement('button');
    x.type = 'button'; x.textContent = '✕'; x.setAttribute('aria-label', 'Close');
    x.style.cssText = 'border:0;background:transparent;color:#f3eded;opacity:.7;cursor:pointer;padding:7px 8px';
    x.onclick = function () { box.remove(); try { localStorage.setItem('bjInstallHidden', '1'); } catch (e) {} };
    box.appendChild(x);
    document.body.appendChild(box);
  }
  var deferred = null;
  window.addEventListener('beforeinstallprompt', function (e) {
    e.preventDefault(); deferred = e;
    pill('📲 <b style="color:#ff6b6b">BJ Catalogue</b> ลงหน้าจอโทรศัพท์', function () {
      if (!deferred) return;
      deferred.prompt();
      deferred.userChoice.then(function () { deferred = null; var b = document.getElementById('bjInstall'); if (b) b.remove(); });
    });
  });
  window.addEventListener('appinstalled', function () { var b = document.getElementById('bjInstall'); if (b) b.remove(); try { localStorage.setItem('bjInstallHidden', '1'); } catch (e) {} });
  var iOS = /iP(hone|ad|od)/.test(navigator.userAgent) || (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1);
  if (iOS) document.addEventListener('DOMContentLoaded', function () {
    pill('📲 ติดตั้ง: กด <b>แชร์ ⬆︎</b> → <b>เพิ่มไปยังหน้าจอโฮม</b> · Share → Add to Home Screen', null);
  });
})();
