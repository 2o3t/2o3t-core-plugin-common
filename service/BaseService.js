'use strict';

const validator = require('validator');

// 格式化过滤参数
function formatFilterParams(filters) {
    const query = {};
    const arr = []; // 模糊查询
    for (const key in filters) {
        if (filters.hasOwnProperty(key)) {
            const element = filters[key];
            if (element instanceof Array) {
                arr.push({ [key]: { $in: element } });
            } else if (key === '_id') {
                if (validator.isMongoId(element)) {
                    query[key] = element;
                }
            } else if (key === 'ssn') {
                if (validator.isMD5(element)) {
                    query[key] = element;
                }
            } else if (key === 'time' || key === 'type') {
                arr.push({ [key]: element });
            } else if ((typeof element !== 'undefined') && element !== '') {
                arr.push({ [key]: { $regex: element, $options: 'ig' } });
            }
        }
    }
    if (arr.length > 0) {
        query.$or = arr;
    }
    return query;
}

class BaseService {

    constructor(modelName) {
        this.modelName = modelName;
    }

    // 注册一个用户
    async create(model) {
        const modelName = this.context.modelName;
        // 校验
        const Schema = this.plugin.model.$schemas[modelName];
        model = this.helper.validatorParam.bySchema(Schema, model);
        const result = await this.plugin.model[modelName]
            .create(model);
        return !!result && result;
    }

    // 删除 (!!! IMPORTANT)
    async deleteByID(ids) {
        const modelName = this.context.modelName;
        if (Array.isArray(ids)) {
            ids.forEach(id => {
                if (!validator.isMongoId(id)) {
                    throw new Error('非法的 ID 参数');
                }
            });
            return await this.plugin.model[modelName]
                .findAndDelete({ _id: { $in: ids } })
                .sort({ _id: -1 })
                .exec();
        }
        if (!validator.isMongoId(ids)) {
            throw new Error('非法的 ID 参数');
        }
        return await this.plugin.model[modelName]
            .findByIdAndDelete(ids)
            .exec();
    }

    async updateByID(id, model) {
        const modelName = this.context.modelName;
        if (Array.isArray(id)) {
            throw new Error('Not Support');
        }
        if (!validator.isMongoId(id)) {
            throw new Error('非法的 ID 参数');
        }
        // 校验
        const Schema = this.plugin.model.$schemas[modelName];
        model = this.helper.validatorParam.byParam(model, Schema);
        return await this.plugin.model[modelName]
            .findByIdAndUpdate(id, { $set: model }, { _id: true })
            .exec();
    }

    async updateByParam(param, model) {
        const modelName = this.context.modelName;
        if (Array.isArray(param)) {
            throw new Error('Not Support');
        }
        if (typeof param !== 'object') {
            throw new Error('非法的 Param 参数');
        }
        // 校验
        const Schema = this.plugin.model.$schemas[modelName];
        model = this.helper.validatorParam.byParam(model, Schema);
        return await this.plugin.model[modelName]
            .findOneAndUpdate(param, { $set: model }, { _id: true })
            .exec();
    }

    async getByID(ids) {
        const modelName = this.context.modelName;
        if (Array.isArray(ids)) {
            ids.forEach(id => {
                if (!validator.isMongoId(id)) {
                    throw new Error('非法的 ID 参数');
                }
            });
            return await this.plugin.model[modelName]
                .find({ _id: { $in: ids } }, { password: false, __v: false })
                .sort({ _id: -1 })
                .exec();
        }
        if (!validator.isMongoId(ids)) {
            throw new Error('非法的 ID 参数');
        }
        return await this.plugin.model[modelName]
            .findById(ids, { password: false, __v: false })
            .exec();
    }

    async getByParam(params) {
        const modelName = this.context.modelName;
        if (Array.isArray(params)) {
            const query = params.map(param => {
                // 校验
                const Schema = this.plugin.model.$schemas[modelName];
                return this.helper.validatorParam.byParam(param, Object.keys(Schema).reduce((obj, key) => {
                    const value = Schema[key];
                    if (value && typeof value === 'object') {
                        obj[key] = Object.assign({}, value);
                        delete obj[key].unique;
                    }
                    return obj;
                }, {}));
            }).reduce((obj, param) => {
                Object.keys(param).forEach(key => {
                    if (!obj[key]) {
                        obj[key] = { $in: [ param[key] ] };
                    } else {
                        obj[key].$in.push(param[key]);
                    }
                });
                return obj;
            }, {});
            return await this.plugin.model[modelName]
                .find(query, { password: false, __v: false })
                .sort({ _id: -1 })
                .exec();
        }
        // 校验
        const Schema = this.plugin.model.$schemas[modelName];
        const param = this.helper.validatorParam.byParam(params, Object.keys(Schema).reduce((obj, key) => {
            const value = Schema[key];
            if (value && typeof value === 'object') {
                obj[key] = Object.assign({}, value);
                delete obj[key].unique;
            }
            return obj;
        }, {}));
        return await this.plugin.model[modelName]
            .findOne(param, { password: false, __v: false })
            .exec();
    }

    // 获取所有 {filters, page, size, sort}
    async getAll(oParam) {
        const modelName = this.context.modelName;
        if (!oParam) {
            return await this.plugin.model[modelName]
                .find({}, { password: false, __v: false })
                .exec();
        }
        const query = {};
        if (oParam && oParam.filters) {
            const filters = Object.assign({}, oParam.filters);
            Object.assign(query, formatFilterParams(filters));
        }
        let conditions = this.plugin.model[modelName].find(query, { password: false, __v: false });
        if (oParam && (oParam.page || oParam.size)) {
            let page = 0;
            let size = 20;
            if (oParam.page && !isNaN(oParam.page)) {
                page = parseInt(oParam.page, 10) - 1; // 外部标记从 1 开始, 数据库从 0 开始, 所以减 1
            }
            if (oParam.size && !isNaN(oParam.size)) {
                size = parseInt(oParam.size, 10);
            }
            conditions = conditions.skip(page * size).limit(size);
        }
        let sort = { _id: -1 };
        if (oParam && oParam.sort && typeof oParam.sort === 'object') {
            sort = oParam.sort || {};
        }
        return await conditions
            .sort(sort)
            .exec();
    }

    async getAllCount(filters) {
        const modelName = this.context.modelName;
        const query = {};
        if (filters) {
            Object.assign(query, formatFilterParams(filters));
        }
        return this.plugin.model[modelName].count(query).exec();
    }


    // 导出所有
    async exportAll() {
        const query = {};
        const conditions = this.plugin.model.Reply.find(query);
        return await conditions.exec();
    }
}

module.exports = BaseService;
