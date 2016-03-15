var config = require('./Config');
var express = require('express');
var _ = require('lodash');
var pushAssociations = require('./PushAssociations');
var push = require('./PushController');

var app = express();

var userId = 1234;

//CORS middleware
var allowCrossDomain = function(req, res, next) {
    res.header("Access-Control-Allow-Origin", "*");
    res.header('Access-Control-Allow-Methods', 'GET,POST,PUT,HEAD,DELETE,OPTIONS');
    res.header('Access-Control-Allow-Headers', 'Content-type,Accept,X-Access-Token,X-Key,x-requested-with');

    if (req.method == 'OPTIONS') {
        res.status(200).end();
    } else {
        next();
    }
}


// Middleware

var compression = require('compression');
var bodyParser = require('body-parser');


// compress all requests
app.use(compression());
// parse application/x-www-form-urlencoded
app.use(bodyParser.urlencoded({ extended: false }));
// parse application/json
app.use(bodyParser.json());

// CORS
app.all('/*', function (req, res, next) {
    res.header("Access-Control-Allow-Origin", "*");
    res.header('Access-Control-Allow-Methods', 'GET,POST,PUT,HEAD,DELETE,OPTIONS');
    res.header('Access-Control-Allow-Headers', 'Content-type,Accept,X-Access-Token,X-Key,x-requested-with');

    if (req.method == 'OPTIONS') {
        res.status(200).end();
    } else {
        next();
    }
});

app.use(allowCrossDomain);

app.use(express.static(__dirname + '/../public'));

app.use(function(err, req, res, next) {
    res.status(500);
    res.render('error', { error: err });
});

app.post('/*', function (req, res, next) {
    if (req.is('application/json')) {
        next();
    } else {
        res.status(406).send();
    }
});

// Main API
app.post('/subscribe', function (req, res) {
    var deviceInfo = req.body;

    push.subscribe(deviceInfo);

    console.log("deviceInfo    " +deviceInfo);

    var data = {
        "users": [deviceInfo.user],
        "android": {
            "collapseKey": "optional",
            "data": {
                "message": "You have been subscribed!"
            }
        }
    };

    var notifs = [data];
    var notificationsValid = sendNotifications(notifs);

    console.log(notificationsValid)
    //res.status(notificationsValid ? 200 : 400).send();

    res.header("Access-Control-Allow-Origin", "*");
    res.header('Access-Control-Allow-Methods', 'GET,POST,PUT,HEAD,DELETE,OPTIONS');
    res.header('Access-Control-Allow-Headers', 'Content-type,Accept,X-Access-Token,X-Key,x-requested-with');
    res.send();
});

app.post('/unsubscribe', function (req, res) {
    var data = req.body;

    if (data.user) {
        push.unsubscribeUser(data.user);
    } else if (data.token) {
        push.unsubscribeDevice(data.token);
    } else {
        return res.status(503).send();
    }

    res.header("Access-Control-Allow-Origin", "*");
    res.header('Access-Control-Allow-Methods', 'GET,POST,PUT,HEAD,DELETE,OPTIONS');
    res.header('Access-Control-Allow-Headers', 'Content-type,Accept,X-Access-Token,X-Key,x-requested-with');
    res.send();
});

app.post('/send', function (req, res) {
    var notifs = [req.body];
    //console.log(notifs);

    var notificationsValid = sendNotifications(notifs);

    res.header("Access-Control-Allow-Origin", "*");
    res.header('Access-Control-Allow-Methods', 'GET,POST,PUT,HEAD,DELETE,OPTIONS');
    res.header('Access-Control-Allow-Headers', 'Content-type,Accept,X-Access-Token,X-Key,x-requested-with');

    res.status(notificationsValid ? 200 : 400).send();
});

app.post('/sendBatch', function (req, res) {
    var notifs = req.body.notifications;

    var notificationsValid = sendNotifications(notifs);

    res.status(notificationsValid ? 200 : 400).send();
});

// Utils API
app.get('/users/:user/associations', function (req, res) {
    pushAssociations.getForUser(req.params.user, function (err, items) {
        if (!err) {
            res.send({"associations": items});
        } else {
            res.status(503).send();
        }
    });
});

app.get('/users', function (req, res) {
    pushAssociations.getAll(function (err, pushAss) {
        if (!err) {
            var users = _.chain(pushAss).map('user').value();
            res.send({
                "users": users
            });
        } else {
            res.status(503).send()
        }
    });
});

app.delete('/users/:user', function (req, res) {
    pushController.unsubscribeUser(req.params.user);
    res.send('ok');
});


// Helpers
function sendNotifications(notifs) {
    //console.log(notifs);
    var areNotificationsValid = _.chain(notifs).map(validateNotification).min().value();

    var areNotificationsValid = true;

    if (!areNotificationsValid) return false;

    notifs.forEach(function (notif) {
        var users = notif.users,
            androidPayload = notif.android,
            iosPayload = notif.ios,
            target;

        if (androidPayload && iosPayload) {
            target = 'all'
        } else if (iosPayload) {
            target = 'ios'
        } else if (androidPayload) {
            target = 'android';
        }

        var fetchUsers = users ? pushAssociations.getForUsers : pushAssociations.getAll,
            callback = function (err, pushAssociations) {
                if (err) return;

                if (target !== 'all') {
                    // TODO: do it in mongo instead of here ...
                    //pushAssociations = _(pushAssociations).where({'type': target});
                    pushAssociations = _.filter(pushAssociations, {type: target});
                }
                console.log(pushAssociations);

                push.send(pushAssociations, androidPayload, iosPayload);
            },
            args = users ? [users, callback] : [callback];

        // TODO: optim. -> mutualise user fetching ?
        fetchUsers.apply(null, args);
    });

    return true;
}

function validateNotification(notif) {
    var valid = true;

    valid = valid && (!!notif.ios || !!notif.android);
    // TODO: validate content

    return valid;
}

var https = require('http');
var fs = require('fs');
//var privateKey  = fs.readFileSync('sslcert/server.key', 'utf8');
//var certificate = fs.readFileSync('sslcert/server.crt', 'utf8');
//var credentials = {key: privateKey, cert: certificate};


exports.start = function () {
    https.createServer(app).listen(config.get('webPort'));
    //https.createServer(credentials, app).listen(config.get('webPort'));
    //app.listen(config.get('webPort'));
    console.log('Listening on port ' + config.get('webPort') + "...");
};