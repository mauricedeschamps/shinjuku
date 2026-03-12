// sw.js - 新宿12景 サービスワーカー (キャッシュ戦略: キャッシュファースト)
const CACHE_NAME = 'shinjuku12-v1';
const urlsToCache = [
  './', // ルート（index.html）
  './index.html', // 実際のHTMLファイル名に合わせてください
  './manifest.json'
  // 画像はオリジンのためキャッシュ不可の場合が多いが、必要に応じて追加
];

// インストール: キャッシュに基本ファイルを保存
self.addEventListener('install', event => {
  self.skipWaiting(); // 即時アクティベート
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then(cache => cache.addAll(urlsToCache))
      .catch(err => console.log('キャッシュ追加失敗', err))
  );
});

// アクティベート: 古いキャッシュを削除
self.addEventListener('activate', event => {
  event.waitUntil(
    caches.keys().then(keys => 
      Promise.all(keys.map(key => {
        if (key !== CACHE_NAME) {
          return caches.delete(key);
        }
      }))
    ).then(() => clients.claim())
  );
});

// フェッチ: キャッシュがあればそれを返し、なければネットワーク→キャッシュ保存
self.addEventListener('fetch', event => {
  // 画像や外部ドメインはキャッシュしない（必要に応じて調整）
  if (event.request.url.includes('google') || event.request.url.includes('wikimedia')) {
    event.respondWith(fetch(event.request).catch(() => caches.match(event.request)));
    return;
  }

  event.respondWith(
    caches.match(event.request)
      .then(response => {
        if (response) return response; // キャッシュヒット

        return fetch(event.request).then(networkResponse => {
          // 有効なレスポンスだけキャッシュに保存（opaqueは除外）
          if (networkResponse && networkResponse.status === 200 && networkResponse.type === 'basic') {
            const responseToCache = networkResponse.clone();
            caches.open(CACHE_NAME).then(cache => cache.put(event.request, responseToCache));
          }
          return networkResponse;
        }).catch(() => {
          // オフラインでフォールバック画像など必要ならここで
          if (event.request.url.match(/\.(jpg|jpeg|png|gif|svg)$/)) {
            return caches.match('./fallback-image.svg'); // 必要ならフォールバック画像を用意
          }
        });
      })
  );
});