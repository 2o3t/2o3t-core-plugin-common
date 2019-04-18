'use strict';

const BaseExRelationshipService = require('./BaseExRelationshipService');

// 增强 伴生关系
class BaseExRelationshipExService extends BaseExRelationshipService {

    // 批量删除 (!!! IMPORTANT)
    async deleteByIDs(ids) {
        return await super.deleteByID(ids);
    }

    async getByIDs(ids) {
        return await super.getByID(ids);
    }

    async getByParams(params) {
        return await super.getByParam(params);
    }
}

module.exports = BaseExRelationshipExService;
