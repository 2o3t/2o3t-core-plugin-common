'use strict';

const Limiter = require('ratelimiter');
const ms = require('ms');


/**
 * Helper function to convert a callback to a Promise.
 */

async function thenify(fn) {
    return await new Promise(function(resolve, reject) {
        function callback(err, res) {
            if (err) return reject(err);
            return resolve(res);
        }

        fn(callback);
    });
}

/**
 * Initialize ratelimit middleware with the given `opts`:
 *
 * - `duration` limit duration in milliseconds [1 hour]
 * - `max` max requests per `id` [2500]
 * - `db` database connection
 * - `id` id to compare requests [ip]
 * - `headers` custom header names
 *  - `remaining` remaining number of requests ['X-RateLimit-Remaining']
 *  - `reset` reset timestamp ['X-RateLimit-Reset']
 *  - `total` total number of requests ['X-RateLimit-Limit']
 *
 * @param {Object} opts
 * @return {Function}
 * @api public
 */

// https://github.com/koajs/ratelimit

module.exports = function(app, opts = {}) {

    const loadHelper = app.loadHelper;

    const {
        remaining = 'X-RateLimit-Remaining',
        reset = 'X-RateLimit-Reset',
        total = 'X-RateLimit-Limit',
    } = opts.headers || {};

    return async function onRatelimiterMiddleware(ctx, next) {
        const id = opts.id ? opts.id(ctx) : ctx.ip;

        if (id === false) return await next();

        // initialize limiter
        const limiter = new Limiter(Object.assign({
            db: loadHelper.redis,
        }, opts, { id }));

        // check limit
        const limit = await thenify(limiter.get.bind(limiter));

        // check if current call is legit
        const calls = limit.remaining > 0 ? limit.remaining - 1 : 0;

        // check if header disabled
        const disableHeader = opts.disableHeader || false;

        let headers = {};
        if (!disableHeader) {
            // header fields
            headers = {
                [remaining]: calls,
                [reset]: limit.reset,
                [total]: limit.total,
            };

            ctx.set(headers);
        }

        if (limit.remaining) return await next();

        const delta = (limit.reset * 1000) - Date.now() | 0;
        const after = limit.reset - (Date.now() / 1000) | 0;
        ctx.set('Retry-After', after);

        ctx.status = 429;
        ctx.body = opts.errorMessage || `Rate limit exceeded, retry in ${ms(delta, { long: true })}.`;

        if (opts.throw) {
            ctx.throw(ctx.status, ctx.body, { headers });
        }
    };
};
