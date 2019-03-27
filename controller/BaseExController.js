'use strict';

const validator = require('validator');
const assert = require('assert');
const BaseController = require('./BaseController');

/**
 * BaseEx Controller
 */
class BaseExController extends BaseController {

    async DeleteByIDs(ctx) {
        const modelName = this.context.modelName;
        assert.ok(ctx);
        try {
            const IDs = ctx.query.ids;
            if (!IDs || !Array.isArray(IDs) || IDs.some(ID => !validator.isMongoId(ID))) {
                throw new Error('ID不正确');
            }

            const info = await this.service[modelName].dseleteByIDs(IDs);
            if (!info) {
                throw new Error('数据不存在');
            }

            // 成功
            this.logger.set('operation', `${modelName} 批量删除成功`);
            ctx.setBodyResult(IDs);
        } catch (error) {
            ctx.setMsgError(error);
        }
    }

    async UpdateByParam(ctx) {
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

            this.logger.set('operation', `${modelName} 更新成功`);
            ctx.setBodyResult(info);
        } catch (error) {
            ctx.setMsgError(error);
        }
    }

    async GetByIDs(ctx) {
        const modelName = this.context.modelName;
        assert.ok(ctx);
        try {
            const IDs = ctx.query.ids;
            if (!IDs || !Array.isArray(IDs) || IDs.some(ID => !validator.isMongoId(ID))) {
                throw new Error('ID不正确');
            }
            const info = await this.service[modelName].getByIDs(IDs);
            if (!info) {
                throw new Error('数据不存在');
            }
            // 成功
            this.logger.set('operation', `${modelName} 获取成功`);
            ctx.setBodyResult(info);
        } catch (error) {
            ctx.setMsgError(error);
        }
    }

    async GetByParam(ctx) {
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

            this.logger.set('operation', `${modelName} 获取成功`);
            ctx.setBodyResult(info);
        } catch (error) {
            ctx.setMsgError(error);
        }
    }
}

module.exports = BaseExController;
