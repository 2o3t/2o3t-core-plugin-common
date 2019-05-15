'use strict';

const validator = require('validator');
const assert = require('assert');

/**
 * Base Controller
 */
class BaseController {

    constructor(modelName, deleteBans) {
        this.modelName = modelName;
        // { key: '', value: '' }
        this.deleteBanList = deleteBans;
    }

    // 添加
    async Create(ctx, next) {
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

            if (ctx.state._NeedNext_) {
                ctx.state._LastResult_ = info;
                if (Array.isArray(ctx.state._NeedNext_)) {
                    ctx.state._NeedNext_.push(info);
                }
                await next(); // 跳转至下一步
            } else {
                ctx.setBodyResult({ ID: info._id });
            }
        } catch (error) {
            // 名称被占用
            if (error.message.match('E11000 duplicate key')) {
                ctx.setMsgError('关键字被占用');
            } else {
                ctx.setMsgError(error);
            }
        }
    }

    async DeleteByID(ctx, next) {
        const modelName = this.context.modelName;
        const deleteBanList = this.context.deleteBanList;
        assert.ok(ctx);
        try {
            const ID = ctx.query.id;
            if (!ID || validator.isEmpty(ID) || !validator.isMongoId(ID)) {
                throw new Error('ID不正确');
            }

            if (deleteBanList) {
                const info = await this.service[modelName].getByID(ID);
                if (!info) {
                    throw new Error('数据不存在');
                }
                if (deleteBanList.some(item => {
                    if (typeof item === 'object') {
                        return info[item.key] === item.value;
                    }
                    return false;
                })) {
                    throw new Error('数据禁止操作');
                }
            }

            const info = await this.service[modelName].deleteByID(ID);
            if (!info) {
                throw new Error('数据不存在');
            }

            const result = { ID };
            if (ctx.state._NeedNext_) {
                ctx.state._LastResult_ = result;
                if (Array.isArray(ctx.state._NeedNext_)) {
                    ctx.state._NeedNext_.push(result);
                }
                await next(); // 跳转至下一步
            } else {
                // 成功
                ctx.setBodyResult(result);
            }
        } catch (error) {
            ctx.setMsgError(error);
        }
    }

    async UpdateByID(ctx, next) {
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

            const result = { ID };
            // 更新
            const info = await this.service[modelName].updateByID(ID, bodyInfo);
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
                ctx.setBodyResult(result);
            }
        } catch (error) {
            ctx.setMsgError(error);
        }
    }

    async GetByID(ctx, next) {
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

    async GetAllByPage(ctx, next) {
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

            // 减少传输
            alls.forEach(item => {
                Object.keys(item).forEach(key => {
                    if (typeof item[key] === 'string') {
                        if (item[key].length > 200) {
                            item[key] = item[key].substr(0, 200) + ' ...';
                        }
                    }
                });
            });

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

            if (ctx.state._NeedNext_) {
                ctx.state._LastResult_ = result;
                if (Array.isArray(ctx.state._NeedNext_)) {
                    ctx.state._NeedNext_.push(result);
                }
                await next(); // 跳转至下一步
            } else {
                // 成功
                ctx.setBodyResult(result);
            }
        } catch (error) {
            ctx.setMsgError(error);
        }
    }

    async GetAllCount(ctx, next) {
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

            if (ctx.state._NeedNext_) {
                ctx.state._LastResult_ = result;
                if (Array.isArray(ctx.state._NeedNext_)) {
                    ctx.state._NeedNext_.push(result);
                }
                await next(); // 跳转至下一步
            } else {
                // 成功
                ctx.setBodyResult(result);
            }
        } catch (error) {
            ctx.setMsgError(error);
        }
    }
}

module.exports = BaseController;
