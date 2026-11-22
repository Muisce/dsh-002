/* 化学实验室安全题库 · Service Worker
   全 ES5 + Promise 链（兼容较老的 WebView；不用 async/await、箭头函数）。
   策略：HTML 网络优先（微信/QQ 强缓存下保证更新），静态资源缓存优先。 */
var CACHE = 'dsh001-bank-v4';
var CORE = ['./', './index.html', './bank.js', './manifest.json', './icon.svg'];

self.addEventListener('install', function (e) {
  e.waitUntil(
    caches.open(CACHE)
      .then(function (c) { return c.addAll(CORE).then(null, function () {}); })
      .then(function () { return self.skipWaiting(); })
  );
});

self.addEventListener('activate', function (e) {
  e.waitUntil(
    caches.keys().then(function (keys) {
      return Promise.all(keys.map(function (k) {
        if (k.indexOf('dsh001-') === 0 && k !== CACHE) return caches["delete"](k);
        return null;
      }));
    }).then(function () { return self.clients.claim(); })
  );
});

function cachePut(req, res) {
  if (!res || !res.ok) return null;
  return caches.open(CACHE).then(function (c) { return c.put(req, res.clone()); }).then(null, function () {});
}

self.addEventListener('fetch', function (e) {
  var req = e.request;
  if (req.method !== 'GET') return;
  var url;
  try { url = new URL(req.url); } catch (err) { return; }
  if (url.origin !== self.location.origin) return;

  var isDoc = req.mode === 'navigate' ||
    url.pathname.indexOf('index.html') >= 0 ||
    /\/$/.test(url.pathname);

  if (isDoc) {
    e.respondWith(
      fetch(req).then(function (fresh) {
        if (fresh && fresh.ok) { e.waitUntil(cachePut(new Request('./index.html'), fresh)); return fresh; }
        return caches.open(CACHE).then(function (c) {
          return c.match('./index.html').then(function (hit) {
            return hit || new Response('\u5f53\u524d\u65e0\u7f51\u7edc\u4e14\u65e0\u79bb\u7ebf\u7f13\u5b58\uff0c\u8bf7\u8054\u7f51\u6253\u5f00\u4e00\u6b21\u3002', {
              status: 503, headers: { 'Content-Type': 'text/html; charset=utf-8' }
            });
          });
        });
      }).then(null, function () {
        return caches.open(CACHE).then(function (c) {
          return c.match('./index.html').then(function (hit) {
            return hit || new Response('\u5f53\u524d\u65e0\u7f51\u7edc\u4e14\u65e0\u79bb\u7ebf\u7f13\u5b58\uff0c\u8bf7\u8054\u7f51\u6253\u5f00\u4e00\u6b21\u3002', {
              status: 503, headers: { 'Content-Type': 'text/html; charset=utf-8' }
            });
          });
        });
      })
    );
    return;
  }

  e.respondWith(
    caches.open(CACHE).then(function (c) {
      return c.match(req).then(function (hit) {
        var update = fetch(req).then(function (res) { return cachePut(req, res); }).then(null, function () {});
        if (hit) { e.waitUntil(update); return hit; }
        return update.then(function () {
          return c.match(req).then(function (h2) {
            return h2 || fetch(req);
          });
        });
      });
    })
  );
});
