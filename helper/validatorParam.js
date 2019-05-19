'use strict';

const validator = require('validator');
const _ = require('lodash');

// 私有化的校验数据封装

function validatorParam(param, key, fnCb) {
    const value = param[key];
    if (typeof value === 'undefined') {
        throw new Error(`非法参数 ${key}`);
    }
    if (fnCb && typeof fnCb === 'function') {
        const result = fnCb(value, key);
        if (!result) {
            throw new Error(`非法参数 ${key}`);
        }
    } else if (fnCb && typeof fnCb === 'string') {
        if (typeof value !== fnCb) {
            throw new Error(`非法参数类型 ${key}`);
        }
    }
    return true;
}

// TODO 可增强
function diff(key, schema, param, fnCb) {
    const value = schema[key];
    // const value = _.at(schema, key);
    if (value && typeof value === 'object') {
        if (value.required) { // 必须的
            if (value.type === String) {
                validatorParam(param, key, 'string');
            } else if (value.type === Number) {
                validatorParam(param, key, 'number');
            } else if (value.type === Date) {
                validatorParam(param, key, value => {
                    return value && !isNaN(Date.parse(value));
                });
            } else {
                validatorParam(param, key);
            }
        }
        if (typeof param[key] !== 'undefined') {
            const v = param[key];
            if (value.type === Boolean && typeof v !== 'boolean') { // 验证 boolean 类型
                throw new Error(`非法参数类型 ${key}`);
            } else if (Array.isArray(value) && !Array.isArray(v)) { // 验证数组类型
                throw new Error(`非法参数类型 ${key}`);
            } else if (Array.isArray(value.enum) && !value.enum.includes(v)) { // 验证枚举参数
                throw new Error(`非法参数值 ${key}`);
            } else if (value.email && !validator.isEmail(v)) { // 验证邮箱
                throw new Error('非法邮箱格式');
            } else if ((value.minlength || value.maxlength) && !validator.isLength(v, { min: value.minlength || 0, max: value.maxlength || Number.MAX_VALUE })) {
                // 验证长度
                const min = value.minlength;
                const max = value.maxlength;
                if (!isNaN(min) && !isNaN(max)) {
                    throw new Error(`非法长度, 请限制在 ${min}-${max} 个字符`);
                } else if (!isNaN(min)) {
                    throw new Error(`非法长度, 请限制在 ${min} 个字符以上`);
                } else if (!isNaN(max)) {
                    throw new Error(`非法长度, 请限制在 ${max} 个字符以内`);
                } else {
                    throw new Error('非法长度');
                }
            } else if (fnCb && typeof fnCb === 'function') {
                const result = fnCb(v, key, value);
                if (result !== true) {
                    throw new Error(result && result.message || `非法参数 ${key}`);
                }
            }
        }
    }
}

module.exports = function() {

    const inner = validatorParam;

    // 全量匹配 (创建时)
    const bySchemaFn = (schema, param, fnCb = false) => {
        if (!param || typeof param !== 'object') {
            throw new Error('非法的 param');
        }
        if (!schema || typeof schema !== 'object') {
            throw new Error('非法的 schema');
        }
        const keys = Object.keys(schema);
        while (keys.length) {
            const key = keys.shift();
            diff(key, schema, param, fnCb);
        }
        // 筛选正确的结果返回
        const finalResult = _.pick(param, Object.keys(schema));
        return finalResult;
    };
    inner.bySchema = bySchemaFn;

    // 增量匹配 (更新时)
    const byParamFn = (param, schema, fnCb = false) => {
        if (!param || typeof param !== 'object') {
            throw new Error('非法的 param');
        }
        if (!schema || typeof schema !== 'object') {
            throw new Error('非法的 schema');
        }
        const keys = Object.keys(param);
        while (keys.length) {
            const key = keys.shift();
            // unique 控制
            const value = schema[key];
            if (value && typeof value === 'object' && value.unique && typeof param[key] !== 'undefined') {
                throw new Error('非法操作, 唯一值不可修改');
            }
            diff(key, schema, param, fnCb);
        }
        // 筛选正确的结果返回
        const finalResult = _.pick(param, Object.keys(schema));
        return finalResult;
    };
    inner.byParam = byParamFn;

    // 旧的接口
    const schemaFn = (param, schema, fnCb = false) => {
        return bySchemaFn(schema, param, fnCb);
    };
    inner.schema = schemaFn;

    return inner;
};

