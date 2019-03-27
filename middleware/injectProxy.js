'use strict';
const assert = require('assert');
const axios = require('axios').default;
const querystring = require('querystring');
const uuid = require('uuid');

module.exports = function(app, opts) {
    assert.ok(app);
    assert.ok(opts);

    const _requestActionMap = opts.$requestActionMap;

    // 外部配置引入的
    const requestActionMap = opts.requestActionMap || {};

    const logger = app.logger;

    const config = app.config;
    const serverConfig = opts.serverConfig || config.server;
    assert.ok(serverConfig, 'serverConfig is null...');

    // 服务映射表
    const REQUEST_ACTION_MAP = Object.assign({}, _requestActionMap, requestActionMap);
    logger.info('REQUEST_ACTION_MAP: ', REQUEST_ACTION_MAP);

    // scope+passphrase
    const { scope, passphrase = '' } = serverConfig;

    app.context.Proxy = async function(Action, data, fixCb) {
        const ctx = this;
        const headers = {
            ...ctx.headers,
        };

        if (ctx.reqId) {
            headers['X-Request-Id'] = ctx.reqId;
        }

        // 前一个id
        const spanId = ctx.get('X-SpanId');
        if (spanId) {
            headers['X-ParentId'] = spanId;
        }
        // 当前 id
        if (ctx.spanId) {
            headers['X-SpanId'] = ctx.spanId;

            let tranceId = ctx.get('X-TranceId');
            if (tranceId) {
                tranceId = tranceId.split(',');
            } else {
                tranceId = [];
            }
            tranceId.push(ctx.spanId);
            headers['X-TranceId'] = tranceId.join(',');
        }

        try {
            const ip = ctx.agent && ctx.agent.IP;
            if (ip) {
                headers['x-forwarded-for'] = ip;
            }
            const ua = ctx.get ? ctx.get('user-agent') : ctx.headers['user-agent'];
            if (ua) {
                headers['user-agent'] = ua;
            }
        } catch (error) {
            // 报错应该属于内部调用... 不做处理
        }

        let params = Object.assign({}, REQUEST_ACTION_MAP[Action] || {});
        if (!params.method || !params.url) {
            throw new Error('调用操作有误!');
        }
        if (params.method === 'GET' && data && JSON.stringify(data) !== '{}') {
            const query = querystring.stringify(data);
            params.url = `${params.url}?${query}`;
            data = {};
        }
        params.headers = Object.assign({}, headers, {
            'X-Authorization-Scope': scope,
            'X-Passphrase': passphrase,
        });
        if (fixCb && typeof fixCb === 'function') {
            const r = fixCb(params);
            if (r && typeof r === 'object') {
                params = r;
            }
        }

        const bodyInfo = data || {};

        try {
            const result = await axios(Object.assign({}, params, {
                data: bodyInfo,
            }));

            if (result && result.data && result.data.code === 200) {
                const data = result.data.data;
                return data;
            } else if (result && result.data && result.data.message) {
                logger.warn(result.data.message);
            } else {
                logger.error(`${Action} 非法远程请求`);
            }
        } catch (error) {
            logger.error(`${Action} 远程请求异常`, error);
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
