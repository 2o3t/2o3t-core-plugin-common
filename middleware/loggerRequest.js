'use strict';

const assert = require('assert');
const uuid = require('uuid');

module.exports = function(app) {
    assert.ok(app);
    const logger = app.logger;

    const levelFn = function(ctx) {
        if (ctx.status >= 500) {
            return 'error';
        } else if (ctx.body && ctx.body.code >= 500) {
            return 'error';
        } else if (ctx.status >= 400) {
            return 'warn';
        } else if (ctx.body && ctx.body.code >= 400) {
            return 'warn';
        }
        return 'system';
    };

    const formatRequestMessage = function(ctx) {
        const reqId = ctx.get('X-Request-Id') || uuid.v4();
        ctx.reqId = reqId;
        const spanId = uuid.v4();
        ctx.spanId = spanId;
        const result = [
            `【 X-Request-Id 】${reqId}`,
            `【 X-SpanId 】${spanId}`,
            `【 method 】${ctx.request.method}`,
            `【 path 】${ctx.path}`,
            `【 originalUrl 】${ctx.request.originalUrl}`,
        ];
        const parentId = ctx.get('X-ParentId');
        if (parentId) {
            result.unshift(`【 X-ParentId 】${parentId}`);
        }
        const scope = ctx.get('X-Authorization-Scope');
        if (scope) {
            result.unshift(`【 X-Authorization-Scope 】${scope}`);
        }
        if (ctx.query) {
            let query;
            try {
                query = JSON.stringify(ctx.query, null, 4);
            } catch (error) {
                query = Object.prototype.toString.call(ctx.query);
            }
            result.push(`【 query 】${query}`);
        }
        return result;
    };

    const formatResponseMessage = function(ctx, duration) {
        let body = ctx.body;
        if (body && typeof body === 'object') {
            try {
                body = JSON.stringify(body, null, 4);
            } catch (error) {
                body = null;
            }
        }

        const result = [
            `【 X-Response-Id 】${ctx.reqId}`,
            `【 X-SpanId 】${ctx.spanId}`,
            `【 method 】${ctx.request.method}`,
            `【 path 】${ctx.path}`,
            `【 originalUrl 】${ctx.request.originalUrl}`,
            `【 status 】${ctx.status}`,
            `【 duration 】${duration} ms`,
        ];

        // const token = ctx.get('X-Authorization');
        // if (token) {
        //     result.unshift(`【 X-Authorization 】${token}`);
        // }
        const scope = ctx.get('X-Authorization-Scope');
        if (scope) {
            result.unshift(`【 X-Authorization-Scope 】${scope}`);
        }

        if (ctx.agent) {
            result.push(`【 IP 】${ctx.agent.IP}`);
            result.push(`【 UA 】${ctx.agent.UA.ua}`);
        }

        const code = ctx.body && ctx.body.code;
        if (code) {
            result.push(`【 code 】${code}`);
        }
        if (body) {
            if (typeof body === 'string' && body.length > 300) {
                body = `${body.substr(0, 200)} ...`;
            }
            result.push(`【 body 】${body}`);
        }

        return result;
    };

    return async function loggerRequestMiddleware(ctx, next) {
        const startTime = Date.now();
        const reqMessage = formatRequestMessage(ctx);
        if (Array.isArray(reqMessage)) {
            logger.info('\n' + reqMessage.join('\n'));
        } else {
            logger.info(reqMessage);
        }

        await next();

        const duration = Date.now() - startTime;
        const level = levelFn(ctx);
        const resMessage = formatResponseMessage(ctx, duration);
        if (Array.isArray(resMessage)) {
            logger[level]('\n' + resMessage.join('\n'));
        } else {
            logger[level](resMessage);
        }
    };
};
