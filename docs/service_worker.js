// https://developers.google.com/web/fundamentals/primers/service-workers
// One subtlety with the register() method is the location of the service worker file. You'll notice in this
// case that the service worker file is at the root of the domain. This means that the service worker's scope
// will be the entire origin. In other words, this service worker will receive fetch events for everything on
// this domain. If we register the service worker file at /example/sw.js, then the service worker would only
// see fetch events for pages whose URL starts with /example/ (i.e. /example/page1/, /example/page2/).
// for flask thats /application/static 
//
// for github.io?
// https://gist.github.com/kosamari/7c5d1e8449b2fbc97d372675f16b566e
// depends if you are using /docs/  or /master/
// /hellDiet/

const KEY_SW_INFO = 'sw_info';   // must match in hellDiet.js!

let verion_number_passed_in = '00.01';  // < - - - - - - - - - - - - - - - - - - - - - - //
                                                                                          //
const CACHE_NAME = `hellDiet-gitio-cache_${verion_number_passed_in}`;                     //
                                                                                          //
// * * * * * * * * * * * * * * * * * * * * * * * * * * *                                  //
// run                                                                                    //
// build_cache_file_list.py from /hellDiet/docs                                           //
// to create updated list                                                                 //
// * * * * * * * * * * * * * * * * * * * * * * * * * * *                                  //
// DONT cache SW - changes to SW force an update of SW, and consequently caches - UPDATE VERSION ABOVE
//'/hellDiet/service_worker.js',  // https://stackoverflow.com/questions/55027512/should-i-cache-the-serviceworker-file-in-a-pwa
const FILES_TO_CACHE = [
  '/',
  '/hellDiet/',
  '/hellDiet/favicon.ico',
  '/hellDiet/index.html',
  '/hellDiet/apple-touch-icon.png',
  '/hellDiet/static/focus.js',
  '/hellDiet/static/hellDiet.js',
  '/hellDiet/static/manifest.webmanifest',
  '/hellDiet/static/hellDiet.css',
  '/hellDiet/static/assets/images/QR-code-w-icon-noShort.png',
  '/hellDiet/static/assets/images/screenshot.png',
  '/hellDiet/static/assets/app_icons/favicon.ico',
  '/hellDiet/static/assets/app_icons/payCheckIcon-192.png',
  '/hellDiet/static/assets/app_icons/apple-touch-icon.png',
  '/hellDiet/static/assets/app_icons/mstile-70x70.png',
  '/hellDiet/static/assets/app_icons/payCheckIcon-512.png',
  '/hellDiet/static/assets/app_icons/payCheckIcon.svg',
  '/hellDiet/static/assets/app_icons/mstile-150x150.png',
  '/hellDiet/static/assets/app_icons/browserconfig.xml',
  '/hellDiet/static/assets/icons/hol-right.png',
  '/hellDiet/static/assets/icons/debug.svg',
  '/hellDiet/static/assets/icons/email-svgrepo-com.png',
  '/hellDiet/static/assets/icons/hol-left.svg',
  '/hellDiet/static/assets/icons/hol-left.png',
  '/hellDiet/static/assets/icons/email-svgrepo-com.svg',
  '/hellDiet/static/assets/icons/debug.png',
  '/hellDiet/static/assets/icons/hol-right.svg',
];

console.log(`service_worker.js V:${CACHE_NAME}`);

self.addEventListener('install', (evt) => {
  console.log(`[ServiceWorker] Install V:${CACHE_NAME}`);
  evt.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      console.log('[ServiceWorker] Pre-caching offline page');
      console.log(`[ServiceWorker] No of FILES_TO_CACHE:${FILES_TO_CACHE.length}`);
      FILES_TO_CACHE.forEach( file => {
          console.log(`[SW] caching: ${file}`);
          try {
            cache.add(file);
          } catch(e) {
            consoel.log(`FAILED TO CACHE: ${file} ERR:${e}`);
          }          
        }
      );
      return; //cache.addAll(FILES_TO_CACHE);
    })    
  );

  self.skipWaiting();
});


self.addEventListener('activate', (evt) => {
  console.log('[ServiceWorker] Activate');
  evt.waitUntil(
    caches.keys().then((keyList) => {
      return Promise.all(keyList.map((key) => {
        if (key !== CACHE_NAME) {               // DELETE all caches EXCEPT the one just created!
          console.log('[ServiceWorker] Removing old cache', key);
          return caches.delete(key);
        }
      }));
    })
  );
  //localStorage.setItem(KEY_SW_INFO, {
  //  cacheName: CACHE_NAME,
  //  swVersion: verion_number_passed_in
  //});  
  self.clients.claim();
});



// fetch event - service network requests 
//self.addEventListener('fetch', function(event) {
//  event.respondWith(fetch(event.request));          // pass request to network
//});

// fetch event - network only w/ OFFLINE page
//self.addEventListener('fetch', (evt) => {
//  if (evt.request.mode !== 'navigate') {
//    return;
//  }
//  evt.respondWith(fetch(evt.request).catch(() => {
//      return caches.open(CACHE_NAME).then((cache) => {
//        return cache.match('static/offline.html');
//      });
//    })
//  );
//});

// fetch event - Cache falling back to network
var fc = 0;

self.addEventListener('fetch', function(event) {
  fc += 1;
  console.log(`[SW] fetch:${fc}`);
  console.log(event.request.url);
  console.log(event);
  
  event.respondWith(
    caches.match(event.request).then(function(response) {
      return response || fetch(event.request);
    })
  );
  
});
