// 健康检查
'use strict';

const axios = require('axios').default;
const url = require('url');
const _ = require('lodash');

module.exports = function tunnel(app, opts) {
    const config = app.config;
    const serverConfig = opts.serverConfig || config.server;

    return async function(params, data, fixCb) {
        let query = {};

        if (!params.method || !params.url) {
            throw new Error('params 缺少 method 或 url');
        }
        if (params.method === 'GET' || params.method === 'DELETE') {
            query = data || {};
            data = {};
        }
        if (!params.headers) {
            params.headers = {};
        }

        if (serverConfig) {
            // scope+passphrase
            const { scope, passphrase = '' } = serverConfig;
            Object.assign(params.headers, {
                'X-Authorization-Scope': scope,
                'X-Passphrase': passphrase,
            });
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

        if (fixCb && typeof fixCb === 'function') {
            const r = fixCb(params);
            if (r && typeof r === 'object') {
                params = r;
            }
        }

        const bodyInfo = data || {};

        return await axios(_.merge({}, params, {
            data: bodyInfo,
            params: query,
        }));
    };
};

