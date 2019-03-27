'use strict';

const assert = require('assert');
const Redis = require('ioredis');
const LRU = require('lru-cache');

// redis: {
//     redisCachePrefixMap: redisCachePrefixMap,
// },
module.exports = function(app, redisConfig) {
    assert.ok(app);

    assert.ok(redisConfig);

    const _redisCachePrefixMap = redisConfig.$redisCachePrefixMap;

    // 外部配置引入的
    const redisCachePrefixMap = Object.assign({}, _redisCachePrefixMap, redisConfig.redisCachePrefixMap || {});

    const config = app.config;
    const serverName = config.name || '';

    const options = {
        max: 100,
        maxAge: redisConfig.maxAge,
    };
    const store = config.dev ? new LRU(options) : new Redis({
        port: redisConfig.port,
        host: redisConfig.host,
        db: redisConfig.db,
        password: redisConfig.password,
    });

    if (!config.dev) {
        store.on('error', function(err) {
            if (err) {
                app.logger.error('connect to redis error, check your redis config', err);
                process.exit(1);
            }
        });
    } else {
        app.logger.warn('in dev, this LRU store...');
    }

    store.registerPrefix = function(name, value) {
        const prefix = redisCachePrefixMap[name];
        if (prefix) {
            throw new Error('Prefix Name has exist!');
        }
        redisCachePrefixMap[name] = value;
    };

    store.createKey = function(name, value) {
        const prefix = redisCachePrefixMap[name];
        if (!prefix) {
            throw new Error('Not Prefix');
        }
        return `${serverName}@${prefix}@${value}`;
    };

    return store;
};
