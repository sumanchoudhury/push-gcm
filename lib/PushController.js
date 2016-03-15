var _ = require('lodash'),
    pushAssociations = require('./PushAssociations'),
    apnPusher = require('./APNPusher'),
    gcmPusher = require('./GCMPusher');

var send = function (pushAssociations, androidPayload, iosPayload) {
    console.log(pushAssociations);
    var androidTokens1 = _.filter(pushAssociations, {type: 'android'});
    //var androidTokens = _.find(pushAssociations, _.matchesProperty('type', 'android'));
    var androidTokens = _.map(androidTokens1, 'token');
    //var androidTokens = androidTokens1.map( function(obj) { return obj.token; } );

    var iosTokens1 = _.filter(pushAssociations, {type: 'ios'});
    //var iosTokens = _.find(pushAssociations, _.matchesProperty('type', 'ios'));
    //iosTokens = _.map(iosTokens, 'token');
    var iosTokens = _.map(iosTokens1, 'token');

    console.log("Tokens");
    console.log(androidTokens);
    //console.log(iosTokens);

    if (androidPayload && androidTokens.length > 0) {
        var gcmPayload = gcmPusher.buildPayload(androidPayload);
        gcmPusher.push(androidTokens, gcmPayload);
    }

    if (iosPayload && iosTokens.length > 0) {
        var apnPayload = apnPusher.buildPayload(iosPayload);
        apnPusher.push(iosTokens, apnPayload);
    }
};

var sendUsers = function (users, payload) {
    pushAssociations.getForUsers(users, function (err, pushAss) {
        if (err) return;
        send(pushAss, payload);
    });
};

var subscribe = function (deviceInfo) {
    pushAssociations.add(deviceInfo.user, deviceInfo.type, deviceInfo.token);
};

var unsubscribeDevice = function (deviceToken) {
    pushAssociations.removeDevice(deviceToken);
};

var unsubscribeUser = function (user) {
    pushAssociations.removeForUser(user);
};

module.exports = {
    send: send,
    sendUsers: sendUsers,
    subscribe: subscribe,
    unsubscribeDevice: unsubscribeDevice,
    unsubscribeUser: unsubscribeUser
};