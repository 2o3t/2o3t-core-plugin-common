'use strict';
const assert = require('assert');
const is = require('is-type-of');
const _ = require('lodash');

const RESPONSE_CODE = {
    Success: 200,
    Unauthorized: 401,
    Invalid: 403,
    NotFound: 404,
    NotAccept: 406,
    InternalError: 500,
    PathLimited: 441,
    NotLogged: 451,
    NotPermission: 452,
    NotFullInfo: 461,
    SessionExpire: 499,
};

module.exports = function(app) {
    assert.ok(app);

    // 统一格式 BODY
    function hooksBody(body, ctx) {
        const code = body.code;
        ctx.status = code;

        let result = {};
        if (body.data) {
            if (typeof body.data === 'string') {
                result.Message = body.data;
            } else {
                result = body.data;
            }
        }
        if (body.message) {
            result.Message = body.message;
        }

        const RequestId = ctx.reqId;
        if (RequestId) {
            result.ResponseId = RequestId;
        }
        ctx.body = result;
        // app.logger.info.hook(body);
    }

    function hooksErrorMsg(message) {
        app.logger.set('SYSTEM_MESSAGE', message);
    }

    // 全局
    app.context.RESPONSE_CODE = RESPONSE_CODE;

    /**
     * 将code/message/设置到this.body上，但并不打断程序运行。
     * @param {string} message - 消息
     * @param {number} code - 默认为 ResponseCode.Invalid
     */
    app.context.setMsgError = function setMsgError(message, code = RESPONSE_CODE.Invalid) {
        if (message && !isNaN(message.code)) { // 先重写 code;
            code = message.code;
        }
        if (!message) {
            message = codeMapMsg(code);
        } else if (message instanceof Error) {
            message = message.message;
        } else if (message.message) {
            message = message.message;
        }
        // 记录日志
        hooksErrorMsg(message);
        // 正常设置信息
        hooksBody({
            code,
            message,
        }, this);
    };

    /**
     * 将this.body的code设置为 RESPONSE_CODE.Success
     * @param {*} result - 结果
     */
    app.context.setBodyResult = function setBodyResult(result) {
        hooksBody({
            code: RESPONSE_CODE.Success,
            data: result,
        }, this);
    };

    /**
     * 将code/message/设置到this.body上，并打断程序运行。
     * error只会在日志进行记录，不会抛出
     * @param {string} message - 错误信息
     * @param {number} code - 默认为 ResponseCode.Invalid
     */
    app.context.throwMsgError = function throwMsgError(message, code = RESPONSE_CODE.Invalid) {
        if (typeof code === 'string') {
            code = RESPONSE_CODE[code] || RESPONSE_CODE.Invalid;
        }
        if (typeof message !== 'string') {
            message = '内部异常错误!';
        }
        // 记录日志
        hooksErrorMsg(message);
        // 正常设置信息
        hooksBody({
            code,
            message,
        }, this);
        // 立刻打断进程
        const obj = { _inner_: true };
        throw obj;
    };

    /**
     * 将this.body的code设置为RESPONSE_CODE.Success,设置为this.，将result设置到this.body.result
     * @param {string} content - 信息
     * @param {number} repCode - 错误code
     * @param {object} extend - 继承对象
     */
    app.context.setBodyContent = function setBodyContent(content, repCode, extend) {
        let code = 200;
        if (repCode && is.number(repCode)) { code = repCode; }
        if (repCode && is.string(repCode)) { code = RESPONSE_CODE[repCode]; }

        if (code >= 200 && code < 300) {
            hooksBody({
                code,
                data: content,
            }, this);
        } else {
            hooksBody({
                code,
                message: content,
            }, this);
        }
        if (is.object(extend)) {
            hooksBody(Object.assign(this.body, extend, { }), this);
        }
    };

    return async function handleResultMiddleware(ctx, next) {
        try {
            await next();
        } catch (error) {
            if (error._inner_) { // 返回自定义错误code
                this.status = 200;
            } else {
                throw error;
            }
        }
    };
};


function codeMapMsg(code) {
    return `message error code ${code}`;
}
