'use strict';

const validator = require('validator');
const assert = require('assert');
const BaseController = require('./BaseController');

/**
 * BaseEx Controller
 */
class BaseExController extends BaseController {

    async DeleteByIDs(ctx, next) {
        const modelName = this.context.modelName;
        const deleteBanList = this.context.deleteBanList;
        assert.ok(ctx);
        try {
            let IDs = ctx.query.ids;
            if (!IDs || !IDs.indexOf(',')) {
                throw new Error('ID不正确');
            }
            IDs = IDs.split(',');
            if (!IDs || !Array.isArray(IDs) || IDs.some(ID => !validator.isMongoId(ID))) {
                throw new Error('ID不正确');
            }

            if (deleteBanList) {
                const info = await this.service[modelName].getByIDs(IDs);
                if (!info) {
                    throw new Error('数据不存在');
                }
                if (deleteBanList.some(item => {
                    if (typeof item === 'object') {
                        if (Array.isArray(info)) {
                            return info.some(i => i[item.key] === item.value);
                        }
                        return info[item.key] === item.value;
                    }
                    return false;
                })) {
                    throw new Error('数据禁止操作');
                }
            }

            const info = await this.service[modelName].dseleteByIDs(IDs);
            if (!info) {
                throw new Error('数据不存在');
            }

            if (ctx.state._NeedNext_) {
                ctx.state._LastResult_ = IDs;
                if (Array.isArray(ctx.state._NeedNext_)) {
                    ctx.state._NeedNext_.push(IDs);
                }
                await next(); // 跳转至下一步
            } else {
                // 成功
                ctx.setBodyResult(IDs);
            }
        } catch (error) {
            ctx.setMsgError(error);
        }
    }

    async UpdateByParam(ctx, next) {
        const modelName = this.context.modelName;
        assert.ok(ctx);
        try {
            const param = ctx.query;
            if (!param || typeof param !== 'object') {
                throw new Error('Params 不正确');
            }

            const bodyInfo = ctx.request.body;
            if (!bodyInfo) {
                throw new Error('没有参数');
            }

            // 更新
            const info = await this.service[modelName].updateByParam(param, bodyInfo);
            if (!info) {
                throw new Error('数据不存在');
            }

            if (ctx.state._NeedNext_) {
                ctx.state._LastResult_ = info;
                if (Array.isArray(ctx.state._NeedNext_)) {
                    ctx.state._NeedNext_.push(info);
                }
                await next(); // 跳转至下一步
            } else {
                // 成功
                ctx.setBodyResult(param);
            }
        } catch (error) {
            ctx.setMsgError(error);
        }
    }

    async GetByIDs(ctx, next) {
        const modelName = this.context.modelName;
        assert.ok(ctx);
        try {
            let IDs = ctx.query.ids;
            if (!IDs || !IDs.indexOf(',')) {
                throw new Error('ID不正确');
            }
            IDs = IDs.split(',');
            if (!IDs || !Array.isArray(IDs) || IDs.some(ID => !validator.isMongoId(ID))) {
                throw new Error('ID不正确');
            }

            const info = await this.service[modelName].getByIDs(IDs);
            if (!info) {
                throw new Error('数据不存在');
            }

            if (ctx.state._NeedNext_) {
                ctx.state._LastResult_ = info;
                if (Array.isArray(ctx.state._NeedNext_)) {
                    ctx.state._NeedNext_.push(info);
                }
                await next(); // 跳转至下一步
            } else {
                // 成功
                ctx.setBodyResult(info);
            }
        } catch (error) {
            ctx.setMsgError(error);
        }
    }

    async GetByParam(ctx, next) {
        const modelName = this.context.modelName;
        assert.ok(ctx);
        try {
            const param = ctx.query;
            if (!param || typeof param !== 'object') {
                throw new Error('Params 不正确');
            }

            // 更新
            const info = await this.service[modelName].getByParam(param);
            if (!info) {
                throw new Error('数据不存在');
            }

            if (ctx.state._NeedNext_) {
                ctx.state._LastResult_ = info;
                if (Array.isArray(ctx.state._NeedNext_)) {
                    ctx.state._NeedNext_.push(info);
                }
                await next(); // 跳转至下一步
            } else {
                // 成功
                ctx.setBodyResult(info);
            }
        } catch (error) {
            ctx.setMsgError(error);
        }
    }

    async GetByParams(ctx, next) {
        const modelName = this.context.modelName;
        assert.ok(ctx);
        try {
            const param = ctx.query;
            if (!param || typeof param !== 'object') {
                throw new Error('Params 不正确');
            }

            const keys = Object.keys(param);
            const params = keys.reduce((arr, key) => {
                let val = param[key];
                if (val && val.indexOf(',')) {
                    val = val.split(',');
                }
                if (Array.isArray(val)) {
                    return arr.concat(val.map(v => {
                        return { [key]: v };
                    }));
                }
                return arr.concat([{ [key]: val }]);
            }, []);

            // 更新
            const info = await this.service[modelName].getByParams(params);
            if (!info) {
                throw new Error('数据不存在');
            }

            if (ctx.state._NeedNext_) {
                ctx.state._LastResult_ = info;
                if (Array.isArray(ctx.state._NeedNext_)) {
                    ctx.state._NeedNext_.push(info);
                }
                await next(); // 跳转至下一步
            } else {
                // 成功
                ctx.setBodyResult(info);
            }
        } catch (error) {
            ctx.setMsgError(error);
        }
    }
}

module.exports = BaseExController;
