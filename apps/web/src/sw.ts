/// <reference lib="webworker" />
import { precacheAndRoute } from 'workbox-precaching';
import { registerRoute } from 'workbox-routing';
import { StaleWhileRevalidate, NetworkFirst } from 'workbox-strategies';

declare let self: ServiceWorkerGlobalScope;

// Precache all static assets (injected by vite-plugin-pwa)
precacheAndRoute(self.__WB_MANIFEST);

// API calls: network-first (try server, fallback to cache)
registerRoute(
  ({ url }) => url.pathname.startsWith('/api/'),
  new NetworkFirst({
    cacheName: 'api-cache',
    networkTimeoutSeconds: 5,
  }),
);

// Navigation requests: stale-while-revalidate (SPA)
registerRoute(
  ({ request }) => request.mode === 'navigate',
  new StaleWhileRevalidate({
    cacheName: 'pages-cache',
  }),
);
