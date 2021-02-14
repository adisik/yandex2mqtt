'use strict';

const {users} = require('../config');

module.exports.findById = (id, done) => {
    for (const user of users) {
        if (user.id === id) return done(null, user);
    }
    return done(new Error('User Not Found'));
};

module.exports.findByUsername = (username, done) => {
    for (const user of users) {
        if (user.username === username) return done(null, user);
    }
    return done(new Error('User Not Found'));
};
