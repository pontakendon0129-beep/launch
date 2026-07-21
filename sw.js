/* ============================================================
   LAUNCH 通知用サービスワーカー
   置き場所: /launch/sw.js （スコープ = /launch/ 配下すべて）
   役割: プッシュを受け取り、最新動画の情報を取得して通知を出す
   ============================================================ */

// ▼ Cloudflare Worker のURL（デプロイ後に差し替える）
const WORKER_URL = 'https://launch-push.example.workers.dev';

const FALLBACK = {
  title: 'LAUNCH',
  body: '新しい動画を公開しました',
  url: 'https://www.youtube.com/@launch-jp',
};

self.addEventListener('install', () => self.skipWaiting());
self.addEventListener('activate', (e) => e.waitUntil(self.clients.claim()));

self.addEventListener('push', (event) => {
  event.waitUntil((async () => {
    var data = Object.assign({}, FALLBACK);
    try {
      // ペイロード付きで来た場合はそれを使う
      if (event.data) {
        Object.assign(data, event.data.json());
      } else {
        // 空プッシュ：最新情報をWorkerから取得
        const r = await fetch(WORKER_URL + '/latest', { cache: 'no-store' });
        if (r.ok) Object.assign(data, await r.json());
      }
    } catch (e) { /* 取得失敗時はフォールバック文言で出す */ }

    await self.registration.showNotification(data.title, {
      body: data.body,
      icon: './icon-192.png',
      badge: './icon-192.png',
      data: { url: data.url },
      tag: 'launch-new-video',
      renotify: true,
    });
  })());
});

self.addEventListener('notificationclick', (event) => {
  event.notification.close();
  const url = (event.notification.data && event.notification.data.url) || FALLBACK.url;
  event.waitUntil((async () => {
    // すでに開いているタブがあればそれを使う
    const wins = await clients.matchAll({ type: 'window', includeUncontrolled: true });
    for (const w of wins) {
      if (w.url === url && 'focus' in w) return w.focus();
    }
    return clients.openWindow(url);
  })());
});
