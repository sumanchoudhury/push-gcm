'use strict';

var API_KEY = window.GoogleSamples.Config.gcmAPIKey;
var GCM_ENDPOINT = 'https://android.googleapis.com/gcm/send';

var curlCommandDiv = document.querySelector('.js-curl-command');
var isPushEnabled = false;

var PUSH_SERVER_API_URL = "http://192.168.0.100:8000/";

var userId = 'user' + Math.floor((Math.random() * 10000000) + 1);

// This method handles the removal of subscriptionId
// in Chrome 44 by concatenating the subscription Id
// to the subscription endpoint
function endpointWorkaround(pushSubscription) {
    console.log(pushSubscription);
    if (pushSubscription.subscriptionId) {
        return pushSubscription.subscriptionId;
    }

    var endpoint = 'https://android.googleapis.com/gcm/send/';
    var parts = pushSubscription.endpoint.split(endpoint);
    console.log(parts);
    if(parts.length > 1)
    {
        return parts[1];
    }
}

function sendSubscriptionToServer(subscription) {
    // TODO: Send the subscription.endpoint
    // to your server and save it to send a
    // push message at a later date
    //
    // For compatibly of Chrome 43, get the endpoint via
    // endpointWorkaround(subscription)

    var mergedEndpoint = endpointWorkaround(subscription);

    // This is just for demo purposes / an easy to test by
    // generating the appropriate cURL command
    //showCurlCommand(mergedEndpoint);

    console.log(subscription);
    //sending to server
    var subscribe_url = PUSH_SERVER_API_URL + "subscribe";
    //alert(subscribe_url);
    var data = {
        "user": userId,
        "type": "android",
        "token": mergedEndpoint
    };
    jQuery.ajax({
        type: 'POST',
        contentType: "application/json",
        dataType: 'json',
        url: subscribe_url,
        data: JSON.stringify(data), // or JSON.stringify ({name: 'jonas'}),
        success: function (response) {
            console.log(response);
        }
    });

}

// NOTE: This code is only suitable for GCM endpoints,
// When another browser has a working version, alter
// this to send a PUSH request directly to the endpoint
function showCurlCommand(mergedEndpoint) {
    // The curl command to trigger a push message straight from GCM
    if (mergedEndpoint.indexOf(GCM_ENDPOINT) !== 0) {
        window.Demo.debug.log('This browser isn\'t currently ' +
        'supported for this demo');
        return;
    }

    var endpointSections = mergedEndpoint.split('/');
    var subscriptionId = endpointSections[endpointSections.length - 1];

    var curlCommand = 'curl --header "Authorization: key=' + API_KEY +
        '" --header Content-Type:"application/json" ' + GCM_ENDPOINT +
        ' -d "{\\"registration_ids\\":[\\"' + subscriptionId + '\\"]}"';

    curlCommandDiv.textContent = curlCommand;
}

function unsubscribe() {
    var pushButton = document.querySelector('.js-push-button');
    pushButton.disabled = true;
    curlCommandDiv.textContent = '';
    var sendButton = document.querySelector('.send-message');
    sendButton.disabled = true;
    var push_text = document.querySelector('#push_text');
    push_text.disabled = true;

    navigator.serviceWorker.ready.then(function (serviceWorkerRegistration) {
        // To unsubscribe from push messaging, you need get the
        // subcription object, which you can call unsubscribe() on.
        serviceWorkerRegistration.pushManager.getSubscription().then(
            function (pushSubscription) {
                // Check we have a subscription to unsubscribe
                if (!pushSubscription) {
                    // No subscription object, so set the state
                    // to allow the user to subscribe to push
                    isPushEnabled = false;
                    pushButton.disabled = false;
                    pushButton.textContent = 'Enable Push Messages';
                    return;
                }

                // TODO: Make a request to your server to remove
                // the users data from your data store so you
                // don't attempt to send them push messages anymore
                console.log(pushSubscription);
                //sending to server
                var unsubscribe_url = PUSH_SERVER_API_URL + "unsubscribe";
                var data = {
                    "user": userId,
                    "token": pushSubscription.subscriptionId
                };
                jQuery.ajax({
                    type: 'POST',
                    url: unsubscribe_url,
                    data: JSON.stringify(data), // or JSON.stringify ({name: 'jonas'}),
                    success: function (response) {
                        console.log(response);
                    },
                    contentType: "application/json",
                    dataType: 'json'
                });

                // We have a subcription, so call unsubscribe on it
                pushSubscription.unsubscribe().then(function (successful) {
                    pushButton.disabled = false;
                    pushButton.textContent = 'Enable Push Messages';
                    isPushEnabled = false;
                }).catch(function (e) {
                    // We failed to unsubscribe, this can lead to
                    // an unusual state, so may be best to remove
                    // the subscription id from your data store and
                    // inform the user that you disabled push

                    window.Demo.debug.log('Unsubscription error: ', e);
                    pushButton.disabled = false;
                });
            }).catch(function (e) {
                window.Demo.debug.log('Error thrown while unsubscribing from ' +
                'push messaging.', e);
            });
    });
}

function subscribe() {
    // Disable the button so it can't be changed while
    // we process the permission request
    var pushButton = document.querySelector('.js-push-button');
    pushButton.disabled = true;

    var sendButton = document.querySelector('.send-message');
    sendButton.disabled = true;
    var push_text = document.querySelector('#push_text');
    push_text.disabled = true;

    navigator.serviceWorker.ready.then(function (serviceWorkerRegistration) {
        serviceWorkerRegistration.pushManager.subscribe({userVisibleOnly: true})
            .then(function (subscription) {
                // The subscription was successful
                isPushEnabled = true;
                pushButton.textContent = 'Disable Push Messages';
                pushButton.disabled = false;

                sendButton.disabled = false;

                push_text.disabled = false;

                // TODO: Send the subscription subscription.endpoint
                // to your server and save it to send a push message
                // at a later date
                return sendSubscriptionToServer(subscription);
            })
            .catch(function (e) {
                if (Notification.permission === 'denied') {
                    // The user denied the notification permission which
                    // means we failed to subscribe and the user will need
                    // to manually change the notification permission to
                    // subscribe to push messages
                    window.Demo.debug.log('Permission for Notifications was denied');
                    pushButton.disabled = true;
                } else {
                    // A problem occurred with the subscription, this can
                    // often be down to an issue or lack of the gcm_sender_id
                    // and / or gcm_user_visible_only
                    window.Demo.debug.log('Unable to subscribe to push.', e);
                    pushButton.disabled = false;
                    pushButton.textContent = 'Enable Push Messages';
                }
            });
    });
}

// Once the service worker is registered set the initial state
function initialiseState() {
    // check if current browser is Chrome
    var is_chrome = navigator.userAgent.toLowerCase().indexOf('chrome') > -1;
    if(!is_chrome) {
        window.Demo.debug.log('Notifications aren\'t supported.');
        return;
    } else {
        window.Demo.debug.log('We are using chrome.');
    }

    // Are Notifications supported in the service worker?
    if (!('showNotification' in ServiceWorkerRegistration.prototype)) {
        window.Demo.debug.log('Notifications aren\'t supported.');
        return;
    }

    // Check the current Notification permission.
    // If its denied, it's a permanent block until the
    // user changes the permission
    if (Notification.permission === 'denied') {
        window.Demo.debug.log('The user has blocked notifications.');
        return;
    }

    // Check if push messaging is supported
    if (!('PushManager' in window)) {
        window.Demo.debug.log('Push messaging isn\'t supported.');
        return;
    }

    // We need the service worker registration to check for a subscription
    navigator.serviceWorker.ready.then(function (serviceWorkerRegistration) {
        console.log(serviceWorkerRegistration);
        // Do we already have a push message subscription?
        serviceWorkerRegistration.pushManager.getSubscription()
            .then(function (subscription) {

                // Enable any UI which subscribes / unsubscribes from
                // push messages.
                var pushButton = document.querySelector('.js-push-button');
                pushButton.disabled = false;

                if (!subscription) {
                    // We aren’t subscribed to push, so set UI
                    // to allow the user to enable push
                    return;
                }

                var sendButton = document.querySelector('.send-message');
                sendButton.disabled = false;

              var push_text = document.querySelector('#push_text');
              push_text.disabled = false;

                // Keep your server in sync with the latest subscription
                sendSubscriptionToServer(subscription);

                // Set your UI to show they have subscribed for
                // push messages
                pushButton.textContent = 'Disable Push Messages';
                isPushEnabled = true;
            })
            .catch(function (err) {
                window.Demo.debug.log('Error during getSubscription()', err);
            });
    });
}

window.addEventListener('load', function () {
    var pushButton = document.querySelector('.js-push-button');
    pushButton.addEventListener('click', function () {
        if (isPushEnabled) {
            unsubscribe();
        } else {
            subscribe();
        }
    });

    var sendButton = document.querySelector('.send-message');
    var push_text = document.querySelector('#push_text');

    sendButton.addEventListener('click', function () {
        //sending to server
        var users_url = PUSH_SERVER_API_URL + "users";
        jQuery.ajax({
            type: 'GET',
            url: users_url,
            //data: JSON.stringify(data), // or JSON.stringify ({name: 'jonas'}),
            success: function (response) {
                console.log(response);
            },
            contentType: "application/json",
            dataType: 'json'
        });
        console.log(push_text.value);


        jQuery.ajax({
            type: 'GET',
            url: PUSH_SERVER_API_URL + 'users',
            success: function (data) {
                console.log(data);
            },
            contentType: "application/json",
            dataType: 'json'
        });

        var send_url = PUSH_SERVER_API_URL + "send";
        var data = {
            "users": [userId],
            "android": {
                "collapseKey": "optional",
                "data": {
                    "message": push_text.value
                }
            }
        };
        jQuery.ajax({
            type: 'POST',
            url: send_url,
            data: JSON.stringify(data), // or JSON.stringify ({name: 'jonas'}),
            success: function (response) {
                console.log(response);
            },
            contentType: "application/json",
            dataType: 'json'
        });
    });

    // Check that service workers are supported, if so, progressively
    // enhance and add push messaging support, otherwise continue without it.
    if ('serviceWorker' in navigator) {
        navigator.serviceWorker.register('./service-worker.js')
            .then(initialiseState);
    } else {
        window.Demo.debug.log('Service workers aren\'t supported in this browser.');
    }
});
