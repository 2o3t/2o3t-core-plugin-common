'use strict';
const assert = require('assert');
const axios = require('axios').default;
const querystring = require('querystring');
const url = require('url');

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

    // scope+passphrase
    const { scope, passphrase = '' } = serverConfig;


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

        let params = Object.assign({}, REQUEST_ACTION_MAP[Action] || {});
        if (!params.method || !params.url) {
            throw new Error('调用操作有误!');
        }
        if (params.method === 'GET' && data && JSON.stringify(data) !== '{}') {
            const query = querystring.stringify(data);
            params.url = `${params.url}?${query}`;
            data = {};
        }
        if (!params.headers) {
            params.headers = {};
        }

        // 网关
        if (params.gateway && typeof params.gateway === 'function') {
            params.gateway(params.headers);
        }
        delete params.gateway;

        if (params.url) {
            // 自动加入 host
            try {
                const URL = url.parse(params.url);
                if (URL) {
                    const host = URL.host;
                    if (host && /[a-zA-Z0-9][a-zA-Z0-9-]{1,61}[a-zA-Z0-9](?:\.[a-zA-Z]{2,})+/.test(host)) {
                        params.headers.Host = host;
                    }
                }
            } catch (error) {
                console.log(error);
            }
        }

        Object.keys(params.headers).forEach(key => { // 移除小写的不正规的
            delete headers[key];
            delete headers[key.toLowerCase()];
        });
        Object.assign(params.headers, headers, {
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

        const result = await axios(Object.assign({}, params, {
            data: bodyInfo,
        }));

        if (result && result.status === 200) {
            const data = result.data;
            return data;
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
