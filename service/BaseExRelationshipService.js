'use strict';

const BaseExService = require('./BaseExService');

// 增强 伴生关系
class BaseExRelationshipService extends BaseExService {

    constructor(modelName, relationshipModelName, relationshipModelKey) {
        super(modelName);
        this.relationshipModelName = relationshipModelName;
        this.relationshipModelKey = relationshipModelKey;
    }

    async create(model) {
        const relationshipModelName = this.context.relationshipModelName;
        const relationshipModelKey = this.context.relationshipModelKey;
        const RelationshipModel = this.plugin.model[relationshipModelName];

        const result = await super.create(model);
        if (result && RelationshipModel) {
            // 校验
            const value = result[relationshipModelKey];
            if (value) {
                const Schema = this.plugin.model.$schemas[relationshipModelName];
                const model = this.helper.validatorParam.bySchema(Schema, { [relationshipModelKey]: value });
                await RelationshipModel.create(model);
            }
        }
        return !!result && result;
    }

    // 删除 (!!! IMPORTANT)
    async deleteByID(ids) {
        const relationshipModelName = this.context.relationshipModelName;
        const relationshipModelKey = this.context.relationshipModelKey;
        const RelationshipModel = this.plugin.model[relationshipModelName];

        const result = await super.deleteByID(ids);
        if (result && RelationshipModel) {
            if (Array.isArray(result)) {
                const keys = result.filter(item => item[relationshipModelKey]);
                await RelationshipModel
                    .findAndDelete({ [relationshipModelKey]: { $in: keys } }, { _id: true })
                    .exec();
            } else if (result) {
                const key = result[relationshipModelKey];
                await RelationshipModel
                    .findOneAndDelete({ [relationshipModelKey]: key }, { _id: true })
                    .exec();
            }
        }
        return !!result && result;
    }

    // 批量删除 (!!! IMPORTANT)
    async deleteByIDs(ids) {
        return this.deleteByID(ids);
    }
}

module.exports = BaseExRelationshipService;
