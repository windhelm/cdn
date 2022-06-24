
const DNS_RESOLVER_URL = "https://dns.google.com/resolve?type=TXT&name=";
const DEBUG_MODE = true;

var settings = {
    enabled: 1,
    block_id: "<!-- BLOCKED_PROVIDER_CHECK -->", // Часть контента, при отсутствии которого наш воркер будет считать, что страница заблокирована
    redirect_url: "//yandex.ru", // Fallback URL, если не нашли настроек для текущего домена, то куда будем редиректить если enabled: 1
};

self.addEventListener("install", function () {
    self.skipWaiting();
    logDebug("Install event");
});

function logDebug(msg){
    if (DEBUG_MODE)
        console.log(msg);
}

function process(response, requestUrl) {
    logDebug("Process started");
    if (settings.enabled === 1) {
        return response.clone().text()
            .then(function(body) {
                console.log(body.indexOf(settings.block_id) >= 0);
                return (body.indexOf(settings.block_id) >= 0);
            })
            .then(function (result) {
                if (result) {
                    return response;
                } else {
                    logDebug("Check failed. Send redirect to: " + settings.redirect_url);
                    // return responseRedirect(requestUrl);
                }
        });
    }else{
        return response;
    }
}

function responseRedirect(response, requestUrl) {
    logDebug("responseRedirect");

    var redirect = {
        status: 302,
        statusText: "Found",
        headers: {
            Location: settings.redirect_url,
        }
    };
    return new Response('', redirect);
}

self.addEventListener('fetch', function(event) {
    logDebug(event.request);
    if (event.request.redirect === "manual" && navigator.onLine === true) {
        event.respondWith(async function() {
            return fetch(event.request)
                .then(function (response) {
                    return process(response, event.request.url);
                })
                .catch(function (reason) {
                    debugLog("Fetch failed: " + reason);
                    return responseRedirect(event.request.url);
                });
        }());
    }
});