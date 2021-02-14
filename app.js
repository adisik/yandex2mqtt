'use strict';

const fs = require('fs');
const path = require('path');
/* express and https */
const ejs = require('ejs');
const express = require('express');
const app = express();
const https = require('https');
/* parsers */
const cookieParser = require('cookie-parser');
const bodyParser = require('body-parser');
/* error handler */
const errorHandler = require('errorhandler');
/* seesion and passport */
const session = require('express-session');
const passport = require('passport');
/* mqtt client for devices */
const mqtt = require('mqtt');
/* */
const config = require('./config');
const Device = require('./device');

app.engine('ejs', ejs.__express);
app.set('view engine', 'ejs');
app.set('views', path.join(__dirname, './views'));
app.use(express.static('views'));
app.use(cookieParser());
app.use(bodyParser.json({
    extended: false
}));
app.use(bodyParser.urlencoded({
    extended: true
}));
app.use(errorHandler());
app.use(session({
    secret: 'keyboard cat',
    resave: false,
    saveUninitialized: false
}));

/* passport */
app.use(passport.initialize());
app.use(passport.session());

/* passport auth */
require('./auth');

/* routers */
const {site: r_site, oauth2: r_oauth2, user: r_user, client: r_client} = require('./routes');
app.get('/', r_site.index);
app.get('/login', r_site.loginForm);
app.post('/login', r_site.login);
app.get('/logout', r_site.logout);
app.get('/account', r_site.account);
app.get('/dialog/authorize', r_oauth2.authorization);
app.post('/dialog/authorize/decision', r_oauth2.decision);
app.post('/oauth/token', r_oauth2.token);
app.get('/api/userinfo', r_user.info);
app.get('/api/clientinfo', r_client.info);
app.get('/provider/v1.0', r_user.ping);
app.get('/provider', r_user.ping);
app.get('/provider/v1.0/user/devices', r_user.devices);
app.post('/provider/v1.0/user/devices/query', r_user.query);
app.post('/provider/v1.0/user/devices/action', r_user.action);
app.post('/provider/v1.0/user/unlink', r_user.unlink);

/* create https server */
const privateKey = fs.readFileSync(config.https.privateKey, 'utf8');
const certificate = fs.readFileSync(config.https.certificate, 'utf8');
const credentials = {
    key: privateKey,
    cert: certificate
};
const httpsServer = https.createServer(credentials, app);
httpsServer.listen(config.https.port);

/* cache devices from config to global */
global.devices = [];
if (config.devices) {
    config.devices.forEach(opts => {
        global.devices.push(new Device(opts));
    });
}

/* create subscriptions array */
const subscriptions = [];
global.devices.forEach(device => {
    device.data.custom_data.mqtt.forEach(mqtt => {
        const {instance, state: topic} = mqtt;
        if (instance != undefined && topic != undefined) {
            subscriptions.push({deviceId: device.data.id, instance, topic});
        }
    });
});

/* Create MQTT client (variable) in global */
global.mqttClient = mqtt.connect(`mqtt://${config.mqtt.host}`, {
    port: config.mqtt.port,
    username: config.mqtt.user,
    password: config.mqtt.password
})
/* on connect event handler */
.on('connect', () => {
    mqttClient.subscribe(subscriptions.map(pair => pair.topic));
})
/* on offline event handler */
.on('offline', () => {
    /* */
})
/* on get message event handler */
.on('message', (topic, message) => {
    const subscription = subscriptions.find(sub => topic.toLowerCase() === sub.topic.toLowerCase());
    if (subscription == undefined) return;

    const {deviceId, instance} = subscription;
    const ldevice = global.devices.find(d => d.data.id == deviceId);  
    ldevice.updateState(`${message}`, instance);
});

module.exports = app;
