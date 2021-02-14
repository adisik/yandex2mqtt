'use strict';

const passport = require('passport');
const login = require('connect-ensure-login');

module.exports.index = (req, res) => res.send('OAuth 2.0 Server');

module.exports.loginForm = (req, res) => res.render('login');

module.exports.login = passport.authenticate('local', {successReturnToOrRedirect: '/', failureRedirect: '/login'});

module.exports.logout = (req, res) => {
    req.logout();
    res.redirect('/');
};

module.exports.account = [
    login.ensureLoggedIn(), (req, res) => res.render('account', {user: req.user}),
];
