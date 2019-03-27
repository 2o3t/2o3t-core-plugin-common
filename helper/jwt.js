'use strict';

const assert = require('assert');
const jwt = require('jsonwebtoken');
const crypto = require('crypto');// 生成口令的散列值

// 加密
const crypted = function(text, key) {
    const cipher = crypto.createCipher('aes-256-cbc', key);
    let crypted = cipher.update(text, 'utf8', 'hex');
    crypted += cipher.final('hex');
    return crypted; // 加密之后的值
};

// 解密
const decipher = function(text, key) {
    const decipher = crypto.createDecipher('aes-256-cbc', key);
    let dec = decipher.update(text, 'hex', 'utf8');
    dec += decipher.final('utf8'); // 解密之后的值
    return dec;
};

module.exports = function(app, jwtConfig) {
    assert.ok(app);
    assert.ok(jwtConfig);

    const privateKey = jwtConfig && jwtConfig.private || '2o3t';
    assert.ok(privateKey, 'helper config must require "private"!!!');

    const inter = {};

    // 签名
    inter.sign = function(data, expiresIn, key = privateKey) { // 默认永久
        data = crypted(JSON.stringify(data), key);
        const option = {};
        if (expiresIn) {
            option.expiresIn = expiresIn; // '24h'
        }
        const token = jwt.sign(
            {
                data,
            },
            key, option);
        return new Buffer(token).toString('base64');
    };

    inter.verify = function(token, key = privateKey) {
        try {
            token = new Buffer(token, 'base64').toString();
            const decoded = jwt.verify(token, key);
            if (decoded.data) {
                return JSON.parse(decipher(decoded.data, key));
            }
        } catch (error) {
            app.logger.warn(error);
        }
        return null;
    };

    return inter;
};
