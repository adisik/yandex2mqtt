'use strict';

const {clients} = require('../config'); 

module.exports.findById = (id, done) => {
    for (const client of clients) {
        if (client.id === id) return done(null, client);
    }
    return done(new Error('Client Not Found'));
};

module.exports.findByClientId = (clientId, done) => {
    for (const client of clients) {
        if (client.clientId === clientId) return done(null, client);
    }
    return done(new Error('Client Not Found'));
};
