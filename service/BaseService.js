'use strict';

const validator = require('validator');

// 格式化过滤参数
// $lt,$lte,$gt,$gte.	分别对应: <,<=,>,>=. 该字段是用在condition中的.如果,你想要链式调用,则需要使用<br/>lt,lte,ge,gte.<br/>eg:<br/> model.find({num:{$gt:12}},cb)<br/>model.where(‘num’).gt(12).exec(cb)
// $in	查询包含键值的文档,<br/>model.find({name:{$in:[“jimmy”,“sam”]}}) //相当于匹配 jimmy或者sam
// $nin	返回不匹配查询条件文档,都是指定数组类型<br/>model.find({name:{$nin:[“jimmy”,“sam”]}})
// $ne	表示不包含指定值<br/>model.find({name:{$ne:“sam”}})
// $or	表示或查询<br/>model.find({$or:[{ color: ‘red’ }, { status: ‘emergency’ }]})
// $exits	表示键值是否存在;<br/>model.find({name:{$exits:true}})
// $all	通常用来匹配数组里面的键值,匹配多个值(同时具有)<br/>$all:[“apple”,“banana”,“peach”]}
// $size	用来查询数组的长度值<br/>model.find({name:{$size:3}}); 匹配name的数组长度为3
// $slice	用来获取数组字段的内容:<br/>query.slice(‘comments’, 5)
function formatFilterParams(filters, schema) {
    const query = {};
    const arr = []; // 模糊查询
    Object.keys(filters).forEach(key => {
        const element = filters[key];
        if (key.startsWith('$')) {
            query[key] = element;
        } else if (element instanceof Array) {
            query[key] = { $in: element };
        } else if (key === '_id' && typeof element === 'string' && validator.isMongoId(element)) {
            query[key] = element;
        } else if (key === 'ssn' && typeof element === 'string' && validator.isMD5(element)) {
            query[key] = element;
        } else if (key === 'uid' && typeof element === 'string' && validator.isUUID(element)) {
            query[key] = element;
        } else if (schema[key] && schema[key].ref) {
            query[key] = element;
        } else if (/time$/ig.test(key) || key === 'status' || key === 'type') {
            query[key] = element;
        } else if ((typeof element === 'string') && element !== '' && !validator.isMongoId(element)) {
            arr.push({ [key]: { $regex: element, $options: 'ig' } });
        } else {
            query[key] = element;
        }
    });
    if (arr.length > 0) {
        query.$or = arr;
    }
    return query;
}

function toObject(result) {
    if (!result) {
        return !!result;
    }
    if (Array.isArray(result)) {
        return result.map(item => (item.toObject ? item.toObject() : item));
    }
    return result.toObject ? result.toObject() : result;
}

function populate(conditions, Schema) {
    Object.keys(Schema).forEach(key => {
        const obj = Schema[key];
        if (obj.ref) {
            conditions = conditions.populate({ path: key, select: { __v: 0 }, model: obj.ref });
        }
    });
    return conditions;
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
        return toObject(result);
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
            const result = await this.plugin.model[modelName]
                .findAndDelete({ _id: { $in: ids } })
                .sort({ _id: -1 })
                .exec();
            return toObject(result);
        }
        if (!validator.isMongoId(ids)) {
            throw new Error('非法的 ID 参数');
        }
        const result = await this.plugin.model[modelName]
            .findByIdAndDelete(ids)
            .exec();
        return toObject(result);
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
        const result = await this.plugin.model[modelName]
            .findByIdAndUpdate(id, { $set: model }, { _id: true })
            .exec();
        return toObject(result);
    }

    async updateByParam(param, model) {
        const modelName = this.context.modelName;
        if (Array.isArray(param)) {
            throw new Error('Not Support');
        }
        if (typeof param !== 'object') {
            throw new Error('非法的 Param 参数');
        }
        if (!param || JSON.stringify(param) === '{}') {
            throw new Error('非法的请求参数');
        }
        // 校验
        const Schema = this.plugin.model.$schemas[modelName];
        model = this.helper.validatorParam.byParam(model, Schema);
        const result = await this.plugin.model[modelName]
            .findOneAndUpdate(param, { $set: model }, { _id: true })
            .exec();
        return toObject(result);
    }

    async getByID(ids) {
        const modelName = this.context.modelName;
        const Schema = this.plugin.model.$schemas[modelName];
        if (Array.isArray(ids)) {
            ids.forEach(id => {
                if (!validator.isMongoId(id)) {
                    throw new Error('非法的 ID 参数');
                }
            });
            const conditions = await this.plugin.model[modelName]
                .find({ _id: { $in: ids } }, { password: false, __v: false });
            const result = conditions
                .sort({ _id: -1 })
                .exec();
            return toObject(result);
        }
        if (!validator.isMongoId(ids)) {
            throw new Error('非法的 ID 参数');
        }
        const conditions = this.plugin.model[modelName]
            .findById(ids, { password: false, __v: false });
        const result = await populate(conditions, Schema).exec();
        return toObject(result);
    }

    async getByParam(params) {
        const modelName = this.context.modelName;
        const Schema = this.plugin.model.$schemas[modelName];
        if (Array.isArray(params)) {
            const query = params.reduce((obj, param) => {
                Object.keys(param).forEach(key => {
                    if (!obj[key]) {
                        obj[key] = { $in: [ param[key] ] };
                    } else {
                        obj[key].$in.push(param[key]);
                    }
                });
                return obj;
            }, {});
            if (!query || JSON.stringify(query) === '{}') {
                throw new Error('非法的请求参数');
            }
            const conditions = this.plugin.model[modelName]
                .find(query, { password: false, __v: false });
            const result = await populate(conditions, Schema).sort({ _id: -1 })
                .exec();
            return toObject(result);
        }
        if (!params || JSON.stringify(params) === '{}') {
            throw new Error('非法的请求参数');
        }
        const conditions = this.plugin.model[modelName]
            .findOne(params, { password: false, __v: false });
        const result = await populate(conditions, Schema).exec();
        return toObject(result);
    }

    // 获取所有 {filters, page, size, sort}
    async getAll(oParam) {
        const modelName = this.context.modelName;
        const Schema = this.plugin.model.$schemas[modelName];
        if (!oParam) {
            return await this.plugin.model[modelName]
                .find({}, { password: false, __v: false })
                .exec();
        }
        const query = {};
        if (oParam && oParam.filters) {
            const filters = Object.assign({}, oParam.filters);
            if (!oParam.sort) {
                delete filters.sort;
            }
            Object.assign(query, formatFilterParams(filters, Schema));
        }
        let conditions = this.plugin.model[modelName].find(query, { password: false, __v: false });
        if (oParam && (oParam.page || oParam.size)) {
            let page = 0;
            let size = 20;
            if (oParam.page && !isNaN(oParam.page)) {
                page = parseInt(oParam.page, 10) - 1; // 外部标记从 1 开始, 数据库从 0 开始, 所以减 1
                if (page < 0) {
                    page = 0;
                }
            }
            if (oParam.size && !isNaN(oParam.size)) {
                size = parseInt(oParam.size, 10);
            }
            conditions = conditions.skip(page * size).limit(size);
        }
        let sort = { _id: -1 };
        if (oParam && oParam.sort && typeof oParam.sort === 'object') {
            sort = oParam.sort || {};
        } else if (oParam.filters && oParam.filters.sort && typeof oParam.filters.sort === 'object') {
            sort = oParam.filters.sort || {};
        }
        const result = await populate(conditions, Schema)
            .sort(sort)
            .exec();
        return toObject(result);
    }

    async getAllCount(filters) {
        const modelName = this.context.modelName;
        const Schema = this.plugin.model.$schemas[modelName];
        const query = {};
        if (filters) {
            Object.assign(query, formatFilterParams(filters, Schema));
        }
        return this.plugin.model[modelName].count(query).exec();
    }


    // 导出所有
    async exportAll() {
        const modelName = this.context.modelName;
        const Schema = this.plugin.model.$schemas[modelName];
        const query = {};
        const conditions = this.plugin.model[modelName].find(query);
        const result = await populate(conditions, Schema).exec();
        return toObject(result);
    }
}

module.exports = BaseService;
