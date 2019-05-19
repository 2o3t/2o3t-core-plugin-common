'use strict';

module.exports = {
    uid: {
        type: String,
        unique: true,
        required: [ true, '此参数是必须的' ],
    },
};
