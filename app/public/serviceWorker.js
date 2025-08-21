const staticAppUPC = "upc-digitalcredential";
const assets = [
  "/",
  "/index.html",
  "/login.html",
  "/profile.html",
  "/usedqr.html",
  "/signup.html",
  "/css/style.css",
  "/css/login.css",
  "/js/app.js",
  "/js/index.js",
  "/js/profile.js",
  "/js/scripts.js",
  "/images/foto.jpeg",
  "/images/logoupc.png",
  "/images/upc.jpg"
];

self.addEventListener("install", installEvent => {
  installEvent.waitUntil(
    caches.open(staticAppUPC).then(cache => {
      cache.addAll(assets);
    })
  );
});

self.addEventListener("fetch", fetchEvent => {
  fetchEvent.respondWith(
    caches.match(fetchEvent.request).then(res => {
      return res || fetch(fetchEvent.request);
    })
  );
});
