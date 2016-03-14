var pushId = "web.com.localhost";
var PUSH_SERVER_API_URL = "http://localhost:8000/";

var subscribe = document.querySelector("#subscribe");
subscribe.addEventListener("click", function (evt) {
    pushNotification();
}, false);

var pushNotification = function () {
    "use strict";

    if ('safari' in window && 'pushNotification' in window.safari) {
        var permissionData = window.safari.pushNotification.permission(pushId);
        checkRemotePermission(permissionData);
    } else {
        alert("Push notifications not supported.");
    }
};

var checkRemotePermission = function (permissionData) {
    "use strict";
    var sendButton = document.querySelector('.send-message');
    if (permissionData.permission === 'default') {
        console.log("The user is making a decision");
        window.safari.pushNotification.requestPermission(
            PUSH_SERVER_API_URL + 'subscribe',
            pushId,
            {},
            checkRemotePermission
        );
    }
    else if (permissionData.permission === 'denied') {
        console.dir(arguments);
        sendButton.disabled = true;
    }
    else if (permissionData.permission === 'granted') {

        sendButton.disabled = false;
        console.log("The user said yes, with token: " + permissionData.deviceToken);
        var subscribe_url = PUSH_SERVER_API_URL + "subscribe";
        var user = 'user' + Math.floor((Math.random() * 10000000) + 1);
        var userIdContainer = document.querySelector('#userId');
        userIdContainer.innerHTML = user;

        var data = {
            "user": user,
            "type": "ios",
            "token": permissionData.deviceToken
        };
        jQuery.ajax({
            type: 'POST',
            url: subscribe_url,
            data: JSON.stringify(data), // or JSON.stringify ({name: 'jonas'}),
            success: function (response) {
                console.log(response);
            },
            contentType: "application/json",
            dataType: 'json'
        });
    }
};

var sendButton = document.querySelector('.send-message');
sendButton.addEventListener('click', function () {
    //sending to server
    var userIdContainer = document.querySelector('#userId');


    var send_url = PUSH_SERVER_API_URL + "send";
    var data = {
        "users": userIdContainer.innerHTML,
        "ios": {
            "badge": 0,
            "alert": "Foo bar",
            "sound": "soundName"
        }
    };
    jQuery.ajax({
        type: 'POST',
        url: send_url,
        data: JSON.stringify(data),
        success: function (response) {
            console.log(response);
        },
        contentType: "application/json",
        dataType: 'json'
    });
});