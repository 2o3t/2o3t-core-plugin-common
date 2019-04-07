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
    inner.uploadStatus = async function(info) {
        try {
            await app.context.Proxy(ACTION_NAME, Object.assign({
                online: true,
                platform: os.platform(),
                hostname: os.hostname(),
                cwd: process.cwd(),
            }, info));
        } catch (error) {
            app.logger.error('上报健康检查失败!', error);
        }
    };

    if (bHealth && serverConfig) {
        // 每 3 分钟一次
        schedule.scheduleJob(TIME, async function() {
            await inner.uploadStatus(_.pick(serverConfig, [
                'name', 'ip', 'port', 'url', 'scope', 'passphrase',
            ]));
        });

        // 首次启动 3s 后请求
        process.nextTick(() => {
            setTimeout(async () => {
                await inner.uploadStatus(_.pick(serverConfig, [
                    'name', 'ip', 'port', 'url', 'scope', 'passphrase',
                ]));
            }, 3000);
        });
    }

    inner.register = async function(name, info) {
        const loadHelper = app.loadHelper;
        const KEY = await loadHelper.cache.createKey(ACTION_NAME, `Servers@${name}`);
        const old = await loadHelper.cache.get(KEY);
        await loadHelper.cache.set(KEY, info, CacheTime + 10); // 存3分钟
        return !old; // 新注册返回 true
    };

    return inner;
};

