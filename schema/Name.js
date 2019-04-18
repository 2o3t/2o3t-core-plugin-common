'use strict';

module.exports = {
    name: {
        type: String,
        unique: true,
        required: [ true, '此参数是必须的' ],
        match: [ /^[a-zA-Z][a-zA-Z0-9_\-\/\\]{2,}$/, '以英文字母开头, 由英文字母和数字下划线斜杠组成的3个字符以上' ],
    },
};
