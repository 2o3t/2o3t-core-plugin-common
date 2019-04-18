'use strict';

module.exports = {
    createTime: {
        type: Date,
        required: [ true, '此参数是必须的' ],
        default: '',
    },
    updateTime: {
        type: Date,
        required: [ true, '此参数是必须的' ],
        default: '',
    },
};
