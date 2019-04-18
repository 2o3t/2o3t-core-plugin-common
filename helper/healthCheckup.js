// 健康检查
'use strict';

const schedule = require('node-schedule');
const os = require('os');
const _ = require('lodash');

// exports.healthCheckup = {
//     time: '',
//     cacheTime: 0,
// };

module.exports = function(app, opts) {
    const TIME = opts && opts.time || '*/3 * * * *'; // 3分钟上报一次
    const CacheTime = opts && opts.cacheTime || 60 * 3; // 缓存3分钟

    // 收否开启定时器
    const bHealth = opts && opts.health || false;

    const config = app.config;
    const serverConfig = config.server;

    const inner = {};

    const ACTION_NAME = 'HEALTH_CHECKUP';

    // 上报
    inner.uploadStatus = function(info) {
        try {
            app.context.Proxy(ACTION_NAME, Object.assign({
                online: true,
                platform: os.platform(),
                hostname: os.hostname(),
                cwd: process.cwd(),
            }, info));
        } catch (error) {
            app.logger.warn('上报健康检查失败!', error);
        }
    };

    if (bHealth && serverConfig) {
        const info = _.pick(serverConfig, [
            'name', 'ip', 'port', 'url', 'scope', 'passphrase',
        ]);

        // 每 3 分钟一次
        schedule.scheduleJob(TIME, function() {
            inner.uploadStatus(info);
        });

        // 首次启动 10s 后请求
        process.nextTick(() => {
            setTimeout(() => {
                inner.uploadStatus(info);
            }, 10 * 1000);
        });

        // 异常未捕获上报
        process.on('uncaughtException', function(e) {
            inner.uploadStatus({
                ...info,
                error: e,
            });
        });
        process.on('exit', function() {
            inner.uploadStatus({
                ...info,
                online: false,
            });
        });
    }

    inner.register = async function(name, info) {
        const loadHelper = app.loadHelper;
        const KEY = await loadHelper.cache.createKey(ACTION_NAME, `Servers@${name}`);
        const old = await loadHelper.cache.get(KEY);
        await loadHelper.cache.set(KEY, info, CacheTime + 10); // 存3分钟
        return !old; // 新注册返回 true
    };

    // 获取全部
    inner.infos = async function() {
        const loadHelper = app.loadHelper;
        const KEY = await loadHelper.cache.createKey(ACTION_NAME, 'Servers@*');
        return await loadHelper.cache.getAll(KEY);
    };

    return inner;
};

