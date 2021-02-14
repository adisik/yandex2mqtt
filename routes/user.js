'use strict';

const passport = require('passport');

module.exports.info = [
    passport.authenticate('bearer', {session: true}), (req, res) => {
        const {user} = req;
        res.json({user_id: user.id, name: user.name, scope: req.authInfo.scope});
    }
];

module.exports.ping = [
    passport.authenticate('bearer', {session: true}), (req, res) => {
        res.status(200).send('OK');
    }
];

module.exports.devices = [
    passport.authenticate('bearer', {session: true}), (req, res) => {
        const reqId = req.get('X-Request-Id');
        const r = {
            request_id: reqId,
            payload: {
                user_id: "1",
                devices: []
            }
        };

        for (const d of global.devices) {
            r.payload.devices.push(d.getInfo());
        };
        
        res.status(200).send(r);
    }
];

module.exports.query = [
    passport.authenticate('bearer', {session: true}), (req, res) => {
        const reqId = req.get('X-Request-Id');
        const r = {
            request_id: reqId,
            payload: {
                devices: []
            }
        };

        for (const d of req.body.devices) {
            const ldevice = global.devices.find(device => device.data.id == d.id);
            r.payload.devices.push(ldevice.getState());
        };

        res.status(200).send(r);
    }
];

module.exports.action = [
    passport.authenticate('bearer', {session: true}), (req, res) => {
        const reqId = req.get('X-Request-Id');
        const r = {
            request_id: reqId,
            payload: {
                devices: []
            }
        };

        for (const payloadDevice of req.body.payload.devices) {
            const {id} = payloadDevice;

            const capabilities = [];
            const ldevice = global.devices.find(device => device.data.id == id);

            for (const payloadCapability of payloadDevice.capabilities) {
                capabilities.push(ldevice.setCapabilityState(payloadCapability.state.value , payloadCapability.type, payloadCapability.state.instance));
            }
            
            r.payload.devices.push({id, capabilities});
        };

        res.status(200).send(r);
    }
];

module.exports.unlink = [
    passport.authenticate('bearer', {session: true}), (req, res) => {
        const reqId = req.get('X-Request-Id');
        const r = {
            request_id: reqId,
        }
        
        res.status(200).send(r);
    }
];