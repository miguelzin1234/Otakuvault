/* OtakuVault: service worker (modo offline / PWA) */
const CACHE = 'otakuvault-v4';
const ARQUIVOS = ['./', 'index.html', 'manifest.json', 'icone.jpg'];

/* instala e guarda os arquivos do app */
self.addEventListener('install', e => {
  e.waitUntil(
    caches.open(CACHE).then(c => c.addAll(ARQUIVOS)).then(() => self.skipWaiting())
  );
});

/* apaga caches de versões antigas */
self.addEventListener('activate', e => {
  e.waitUntil(
    caches.keys()
      .then(chaves => Promise.all(chaves.filter(k => k !== CACHE).map(k => caches.delete(k))))
      .then(() => self.clients.claim())
  );
});

self.addEventListener('fetch', e => {
  const r = e.request;
  if (r.method !== 'GET') return;
  const u = new URL(r.url);

  /* página: sempre busca a versão mais nova na internet (ignora o cache do GitHub); sem internet usa a guardada */
  if (r.mode === 'navigate') {
    e.respondWith(
      fetch(r, { cache: 'no-store' })
        .then(res => {
          const copia = res.clone();
          caches.open(CACHE).then(c => c.put('index.html', copia));
          return res;
        })
        .catch(() => caches.match('index.html'))
    );
    return;
  }

  const doApp = u.origin === location.origin;
  const firebaseJs = u.hostname === 'www.gstatic.com' && u.pathname.indexOf('/firebasejs/') === 0;
  const fonte = u.hostname === 'fonts.googleapis.com' || u.hostname === 'fonts.gstatic.com';

  /* arquivos do app, scripts do Firebase e fontes: usa o guardado e atualiza em segundo plano */
  if (doApp || firebaseJs || fonte) {
    e.respondWith(
      caches.match(r).then(guardado => {
        const rede = fetch(r)
          .then(res => {
            if (res && (res.ok || res.type === 'opaque')) {
              const copia = res.clone();
              caches.open(CACHE).then(c => c.put(r, copia));
            }
            return res;
          })
          .catch(() => guardado);
        return guardado || rede;
      })
    );
  }
  /* login e banco de dados do Firebase vão direto para a internet (sem cache) */
});
