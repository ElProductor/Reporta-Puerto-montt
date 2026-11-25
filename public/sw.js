const SHELL_CACHE='reporta-shell-v2';
const PUBLIC_API_CACHE='reporta-public-api-v1';
const MAX_PUBLIC_RESPONSE_BYTES=1_000_000;
const MAX_PUBLIC_API_ENTRIES=40;
const SHELL=['/','/app','/admin','/citizen.html','/municipal.html','/styles.css','/citizen-react.css','/offline.css','/app.js','/citizen.bundle.js','/manifest.webmanifest','/icon.svg','/vendor/leaflet/leaflet.css','/vendor/leaflet/leaflet.js','/vendor/leaflet/images/marker-icon.png','/vendor/leaflet/images/marker-icon-2x.png','/vendor/leaflet/images/marker-shadow.png','/vendor/markercluster/MarkerCluster.css','/vendor/markercluster/MarkerCluster.Default.css','/vendor/markercluster/leaflet.markercluster.js','/vendor/chartjs/chart.umd.js'];
const publicApiPath=pathname=>pathname==='/api/meta'||pathname==='/api/reports'||/^\/api\/reports\/[^/]+(?:\/comments)?$/.test(pathname);
self.addEventListener('install',event=>event.waitUntil(caches.open(SHELL_CACHE).then(cache=>cache.addAll(SHELL)).then(()=>self.skipWaiting())));
self.addEventListener('activate',event=>event.waitUntil(caches.keys().then(keys=>Promise.all(keys.filter(key=>key!==SHELL_CACHE&&key!==PUBLIC_API_CACHE).map(key=>caches.delete(key)))).then(()=>self.clients.claim())));
self.addEventListener('fetch',event=>{
  const request=event.request,url=new URL(request.url);
  if(url.origin!==self.location.origin)return;
  if(url.pathname.startsWith('/api/')){
    if(request.method!=='GET'||!publicApiPath(url.pathname))return;
    event.respondWith(fetch(request).then(response=>{if(response.ok){const copy=response.clone();copy.blob().then(blob=>{if(blob.size<=MAX_PUBLIC_RESPONSE_BYTES)caches.open(PUBLIC_API_CACHE).then(async cache=>{await cache.put(request,new Response(blob,{status:response.status,statusText:response.statusText,headers:response.headers}));const keys=await cache.keys();for(const old of keys.slice(0,Math.max(0,keys.length-MAX_PUBLIC_API_ENTRIES)))await cache.delete(old);});});}return response;}).catch(async()=>await caches.match(request)||new Response(JSON.stringify({error:'Sin conexión. Vuelve a conectarte para actualizar los datos.'}),{status:503,headers:{'Content-Type':'application/json; charset=utf-8'}})));
    return;
  }
  if(request.method!=='GET')return;
  event.respondWith(fetch(request).then(response=>{if(response.ok)caches.open(SHELL_CACHE).then(cache=>cache.put(request,response.clone()));return response;}).catch(async()=>await caches.match(request)||await caches.match('/')));
});
