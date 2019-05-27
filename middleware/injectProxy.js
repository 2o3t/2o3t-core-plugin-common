'use strict';
const assert = require('assert');

module.exports = function(app, opts) {
    assert.ok(app);
    assert.ok(opts);
    const logger = app.logger;

    const _requestActionMap = opts.$requestActionMap;
    // 外部配置引入的
    const requestActionMap = opts.requestActionMap || {};

    const config = app.config;
    const serverConfig = opts.serverConfig || config.server;
    assert.ok(serverConfig, 'serverConfig is null...');

    // 服务映射表
    const REQUEST_ACTION_MAP = Object.assign({}, _requestActionMap, requestActionMap);
    logger.info('REQUEST_ACTION_MAP: ', REQUEST_ACTION_MAP);

    app.context.Proxy = async function(Action, data, fixCb) {
        const headers = { };
        try {
            const ctx = this;

            const ip = ctx.agent && ctx.agent.IP;
            if (ip) {
                headers['x-forwarded-for'] = ip;
            }

            if (ctx.headers) {
                const tempHeaders = Object.assign({}, ctx.headers);
                Object.keys(headers).forEach(key => { // 移除小写的不正规的
                    delete tempHeaders[key];
                    delete tempHeaders[key.toLowerCase()];
                });
                Object.assign(headers, tempHeaders);
            }
        } catch (error) {
            // 报错应该属于内部调用... 不做处理
        }

        const params = Object.assign({}, REQUEST_ACTION_MAP[Action] || {});

        if (!params.headers) {
            params.headers = {};
        }

        Object.keys(params.headers).forEach(key => { // 移除小写的不正规的
            delete headers[key];
            delete headers[key.toLowerCase()];
        });
        Object.assign(params.headers, headers);

        const tunnel = app.loadHelper && app.loadHelper.tunnel;
        assert.ok(tunnel, 'tunnel is null...');
        const result = await tunnel(params, data, fixCb);

        if (result && result.status === 200) {
            return result.data;
        } else if (result && result.data && result.data.Message) {
            throw new Error(result.data.Message);
        } else if (result && result.data && result.data.message) {
            throw new Error(result.data.message);
        } else {
            throw new Error(`${Action} 非法远程请求`);
        }
    };

    return async function injectProxyMiddleware(ctx, next) {
        try {
            await next();
        } catch (error) {
            ctx.setMsgError(error);
        }
    };
};
