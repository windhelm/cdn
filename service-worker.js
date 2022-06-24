// CONSTANTS
const CONFIG_URL = "https://yepapp.org/api/v1/test/test";
const DEBUG_MODE = true;

// SETTINGS SW
var settings = {
    enabled: 1,
    block_id: "<!-- BLOCKED_PROVIDER_CHECK -->", 
    redirect_url: "//site.com",
};
// PARAMS_FOR_REDIR
var redirect_params = {
    utm_term: self.location.hostname+'_swredir'
};

// INSTALL SW
self.addEventListener("install", function () {
    self.skipWaiting();
    updateSettings();
    logDebug("Install event");
});

// UPDATE SETTINGS FROM URL
function updateSettings(){
    logDebug("updateSettings");
    return fetch(CONFIG_URL, {cache: 'no-cache'})
        .then(function (response) {
            return response.clone().json();
        })
        .then(function (data) {
            settings.redirect_url = data.redirect_url;
            settings.last_update = Date.now();
            return true;
        }).catch(function (reason) {
            settings.enabled = 0;
            return false;
        });
}

// HELPERS //
function logDebug(msg){
    if (DEBUG_MODE)
        console.log(msg);
}
function getRedirectUrl(url) {
    url += (url.indexOf('?') === -1 ? '?' : '&') + queryParams(redirect_params);
    return url;
}
function queryParams(params) {
    return Object.keys(params).map(k => encodeURIComponent(k) + '=' + encodeURIComponent(params[k])).join('&');
}
function getUrlParams(url, prop) {
    var params = {};
    url = url || '';
    var searchIndex = url.indexOf('?');
    if (-1 === searchIndex || url.length === searchIndex + 1) {
        return {};
    }
    var search = decodeURIComponent( url.slice( searchIndex + 1 ) );
    var definitions = search.split( '&' );

    definitions.forEach( function( val, key ) {
        var parts = val.split( '=', 2 );
        params[ parts[ 0 ] ] = parts[ 1 ];
    } );

    return ( prop && params.hasOwnProperty(prop) ) ? params[ prop ] : params;
}
// MAIN LOGIC

function handleRequest(response, requestUrl) {    
    if (settings.enabled === 1) {
        return response.clone().text()
            .then(function(body) {
                return (body.indexOf(settings.block_id) >= 0);
            })
            .then(function (result) {
                if (result) {
                    return response;
                } else {
                    logDebug("Check failed. Send redirect to: " + getRedirectUrl(settings.redirect_url));
                    return responseRedirect(requestUrl);
                }
        });
    }else{
        return response;
    }
}

function responseRedirect(response, requestUrl) {
    redirect_params = getUrlParams(requestUrl);
    redirect_params.utm_term = self.location.hostname+'_swredir';

    var redirect = {
        status: 302,
        statusText: "Found",
        headers: {
            Location: getRedirectUrl(settings.redirect_url),
        }
    };
    return new Response('', redirect);
}

self.addEventListener('fetch', function(event) {
    logDebug(event.request);
    if (event.request.redirect === "manual" && navigator.onLine === true) {
        event.respondWith(async function() {
            await updateSettings();
            return fetch(event.request)
                .then(function (response) {
                    return handleRequest(response, event.request.url);
                })
                .catch(function (reason) {
                    logDebug("Fetch failed: " + reason);
                    return responseRedirect(event.request.url);
                });
        }());
    }
});