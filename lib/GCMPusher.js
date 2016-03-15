var config = require('./Config')
var _ = require('lodash');
var gcm = require('node-gcm');
var pushAssociations = require('./PushAssociations');


var push = function (tokens, messageText) {
    console.log("token");
    console.log(tokens);

    /*var message = new gcm.Message();

    message.addData('key1', messageText);

    // Set up the sender with you API key
    var sender = new gcm.Sender(config.get('gcm').apiKey);

    // Now the sender can be used to send messages
    sender.sendNoRetry(message, { registrationTokens: tokens }, function (err, response) {
        if(err) console.error(err);


        if (response) {
            console.log("GCm result");
            console.log(response);
            var mappedResults = _.map(_.zip(tokens, response.results), function (arr) {
                return _.merge({token: arr[0]}, arr[1]);
            });

            handleResults(mappedResults);
        }
    });*/

    gcmSender().send(messageText, tokens, 4, function (err, res) {
        if(err) console.log(err);

        if (res) {
            console.log("GCM result");
            console.log(res);
            var mappedResults = _.map(_.zip(tokens, res.results), function (arr) {
                return _.merge({token: arr[0]}, arr[1]);
            });

            handleResults(mappedResults);
        }
    })
};

var handleResults = function (results) {
    var idsToUpdate = [],
        idsToDelete = [];

    results.forEach(function (result) {
        if (!!result.registration_id) {
            idsToUpdate.push({from: result.token, to: result.registration_id});

        } else if (result.error === 'InvalidRegistration' || result.error === 'NotRegistered') {
            idsToDelete.push(result.token);
        }
    });

    if (idsToUpdate.length > 0) pushAssociations.updateTokens(idsToUpdate);
    if (idsToDelete.length > 0) pushAssociations.removeDevices(idsToDelete);
};

var buildPayload = function (options) {
    return new gcm.Message(options);
};

var gcmSender = _.once(function() {
    return new gcm.Sender(config.get('gcm').apiKey);
});

module.exports = {
    push: push,
    buildPayload:buildPayload
}