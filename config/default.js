'use strict';

module.exports = {
    middleware: {
        mixins: [
            'loggerRequest',
            'handleResult',
            'injectProxy',
        ],

        loggerRequest: {
            enable: true,
        },

        handleResult: {
            enable: true,
        },

        injectProxy: {
            enable: true,
            $requestActionMap: {},
        },
    },

    helper: {
        mixins: [
            'cache',
            'jwt',
            'redis',
            'validatorParam',
            'healthCheckup',
            'tunnel',
        ],

        redis: {
            $redisCachePrefixMap: {
                // 健康检查
                HEALTH_CHECKUP: 'HEALTH_CHECKUP_CACHE_PREFIX_SendHealthInfo',
            },
        },
    },
};
