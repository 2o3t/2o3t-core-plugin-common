'use strict';

const BaseService = require('./BaseService');

// 增强
class BaseExService extends BaseService {

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

module.exports = BaseExService;
