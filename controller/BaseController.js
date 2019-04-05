'use strict';

const validator = require('validator');
const assert = require('assert');

/**
 * Base Controller
 */
class BaseController {

    constructor(modelName) {
        this.modelName = modelName;
    }

    // 添加
    async Create(ctx) {
        const modelName = this.context.modelName;
        assert.ok(ctx);
        try {
            const bodyInfo = ctx.request.body;
            if (!bodyInfo) {
                throw new Error('没有参数');
            }

            const info = await this.service[modelName].create(bodyInfo);
            if (!info) {
                throw new Error('数据不存在');
            }

            this.logger.set('operation', `${modelName} 创建成功`);
            ctx.setBodyResult(info);
        } catch (error) {
            // 名称被占用
            if (error.message.match('E11000 duplicate key')) {
                ctx.setMsgError('名称被占用');
            } else {
                ctx.setMsgError(error);
            }
        }
    }

    async DeleteByID(ctx) {
        const modelName = this.context.modelName;
        assert.ok(ctx);
        try {
            const ID = ctx.query.id;
            if (!ID || validator.isEmpty(ID) || !validator.isMongoId(ID)) {
                throw new Error('ID不正确');
            }

            const info = await this.service[modelName].deleteByID(ID);
            if (!info) {
                throw new Error('数据不存在');
            }

            // 成功
            this.logger.set('operation', `${modelName} 删除成功`);
            ctx.setBodyResult(ID);
        } catch (error) {
            ctx.setMsgError(error);
        }
    }

    async UpdateByID(ctx) {
        const modelName = this.context.modelName;
        assert.ok(ctx);
        try {
            const ID = ctx.query.id;
            if (!ID || validator.isEmpty(ID) || !validator.isMongoId(ID)) {
                throw new Error('ID不正确');
            }

            const bodyInfo = ctx.request.body;
            if (!bodyInfo) {
                throw new Error('没有参数');
            }

            // 更新
            const info = await this.service[modelName].updateByID(ID, bodyInfo);
            if (!info) {
                throw new Error('数据不存在');
            }

            this.logger.set('operation', `${modelName} 更新成功`);
            ctx.setBodyResult(info);
        } catch (error) {
            ctx.setMsgError(error);
        }
    }

    async GetByID(ctx) {
        const modelName = this.context.modelName;
        assert.ok(ctx);
        try {
            const ID = ctx.query.id;
            if (!ID || validator.isEmpty(ID) || !validator.isMongoId(ID)) {
                throw new Error('ID不正确');
            }
            const info = await this.service[modelName].getByID(ID);
            if (!info) {
                throw new Error('数据不存在');
            }
            // 成功
            ctx.setBodyResult(info);
        } catch (error) {
            ctx.setMsgError(error);
        }
    }

    async GetAllByPage(ctx) {
        const modelName = this.context.modelName;
        assert.ok(ctx);
        try {
            const page = ctx.query.page;
            if (page && !validator.isInt(page)) {
                throw new Error('page 不正确');
            }
            const size = ctx.query.pageSize;
            if (size && !validator.isInt(size)) {
                throw new Error('size 格式不正确');
            }
            const query = ctx.query || {};
            const filters = {};
            if (query && JSON.stringify(query) !== '{}') {
                for (const key in query) {
                    if (![ 'page', 'pageSize' ].includes(key)) {
                        filters[key] = query[key];
                    }
                }
            }
            let alls = await this.service[modelName].getAll({ page, size, filters });
            if (!alls) {
                alls = [];
            }
            let allsCount = await this.service[modelName].getAllCount(filters);
            if (!allsCount) {
                allsCount = 0;
            }
            // 成功
            const result = {
                rows: alls,
                count: allsCount,
            };

            if (page) {
                result.page = parseInt(page);
            }
            if (size) {
                result.pageSize = parseInt(size);
            }

            ctx.setBodyResult(result);
        } catch (error) {
            ctx.setMsgError(error);
        }
    }

    async GetAllCount(ctx) {
        const modelName = this.context.modelName;
        assert.ok(ctx);
        try {
            const query = ctx.query || {};
            const filters = {};
            if (query && JSON.stringify(query) !== '{}') {
                for (const key in query) {
                    if (![ 'page', 'pageSize' ].includes(key)) {
                        filters[key] = query[key];
                    }
                }
            }
            let allsCount = await this.service[modelName].getAllCount(filters);
            if (!allsCount) {
                allsCount = 0;
            }
            // 成功
            const result = allsCount;
            ctx.setBodyResult(result);
        } catch (error) {
            ctx.setMsgError(error);
        }
    }
}

module.exports = BaseController;
