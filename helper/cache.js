'use strict';

module.exports = function(app) {
    const Cache = {};

    const get = async key => {
        const redis = app.loadHelper.redis;
        const data = await redis.get(key);
        if (!data) {
            return data;
        }
        return JSON.parse(data);
    };
    Cache.get = get;

    // time 参数可选，秒为单位
    const set = async (key, value, time) => {
        const redis = app.loadHelper.redis;
        value = JSON.stringify(value);
        if (!time) {
            return await redis.set(key, value);
        }
        if (redis.setex) {
            return await redis.setex(key, time, value);
        }
        return await redis.set(key, value);
    };
    Cache.set = set;

    const clear = async key => {
        const redis = app.loadHelper.redis;
        return await redis.del(key);
    };
    Cache.clear = clear;

    const clearAll = async key => {
        const redis = app.loadHelper.redis;
        const aKey = await redis.keys(key);
        if (!!aKey && aKey.length > 0) {
            return await redis.del(aKey);
        }
    };
    Cache.clearAll = clearAll;

    const getAll = async key => {
        const redis = app.loadHelper.redis;
        const aKey = await redis.keys(key);
        if (!!aKey && aKey.length > 0) {
            const datas = await redis.mget(aKey);
            if (datas && Array.isArray(datas)) {
                return datas.map(data => JSON.parse(data));
            }
        }
        return [];
    };
    Cache.getAll = getAll;

    Cache.registerPrefix = function(name, value) {
        const redis = app.loadHelper.redis;
        return redis.registerPrefix(name, value);
    };

    Cache.createKey = function(name, value) {
        const redis = app.loadHelper.redis;
        return redis.createKey(name, value);
    };

    return Cache;
};
