/**
 * @file
 * Define the controller
 *
 * This code is the property of Epitech
 * Contact: mickael.leclerc@epitech.eu
 */

'use strict';

const Sequelize = require('sequelize');
const jwt_decode = require('jwt-decode');
const query = require('../database/handler');

/**
 * Check if user has write access to the database either by being in the enrolment_nfc or pedago group on the Intranet
 * @param req
 * @param res
 * @param next
 */
exports.checkPrivileges = function(req, res, next) {
    if (req.headers !== undefined && req.headers.authorization !== undefined) {
        fetch('https://intra.epitech.eu/group/pedago/member?format=json&nolimit=1', {headers: {'Cookie': 'user=' + req.headers.authorization.split(' ')[1]}})
            .then((response) => response.json())
            .then((response) => {
                if (response.some(function(el) {return el.login == jwt_decode(req.headers.authorization.split(' ')[1]).login})) {
                    query('INSERT INTO user_corresp_log (action, uid, student, login, query_date) VALUES (?, UNHEX(RPAD(?, 14, "0")), ?, ?, NOW())',
                        [req.method, req.params.uid, req.body.login, jwt_decode(req.headers.authorization.split(' ')[1]).login],
                        Sequelize.QueryTypes.INSERT,
                        function () {
                            next();
                        }, function () {
                            res.sendStatus(500);
                        });
                } else {
                    res.sendStatus(403);
                }
            });
    }
    else if (process.env !== undefined && process.env.API_KEY !== undefined && process.env.API_KEY.split(",").includes(req.headers['x-key'])) {
        next();
    }
    else {
        res.sendStatus(401);
    }
};

/**
 * Send all card registered on the database by sending logins in an array
 * @param req
 * @param res
 */
exports.getAllCard = function(req, res) {
    query('SELECT login FROM user_corresp',
        [],
        Sequelize.QueryTypes.SELECT,
        function (results) {
            res.json(results.map(el => el.login));
        }, function () {
            res.sendStatus(500);
        });
};

/**
 * Send the login associated with the UID asked
 * @param req
 * @param res
 */
exports.getCard = function(req, res) {
    query('SELECT login FROM user_corresp WHERE uid=UNHEX(RPAD(?, 14, "0"))',
        [req.params.uid],
        Sequelize.QueryTypes.SELECT,
        function (results) {
            if (results.length === 0) {
                res.json({'error': 'Wrong Request'});
            } else {
                res.json({'login': results[0].login});
            }
        }, function () {
            res.sendStatus(500);
        });
};

/**
 * Add a new card to the database by associating the UID with the login
 * @param req
 * @param res
 */
exports.addCard = function(req, res) {
    query('INSERT INTO user_corresp (uid, login, last_modified) VALUES (UNHEX(RPAD(?, 14, "0")), ?, NOW()) ON DUPLICATE KEY UPDATE uid=VALUES(uid), login=VALUES(login), last_modified=VALUES(last_modified)',
        [req.params.uid, req.body.login],
        Sequelize.QueryTypes.INSERT,
        function () {
            res.json({'message': 'Added card'});
        }, function () {
            res.sendStatus(500);
        });
};

/**
 * Remove the card associated with the UID
 * @param req
 * @param res
 */
exports.delCard = function(req, res) {
    query('DELETE FROM user_corresp WHERE uid=UNHEX(RPAD(?, 14, "0"))',
        [req.params.uid],
        Sequelize.QueryTypes.DELETE,
        function () {
            res.json({'message': 'Deleted card'});
        }, function () {
            res.sendStatus(500);
        });
};
