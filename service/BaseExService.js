'use strict';

const BaseService = require('./BaseService');

// 增强
class BaseExService extends BaseService {

    // 批量删除 (!!! IMPORTANT)
    async deleteByIDs(ids) {
        return super.deleteByID(ids);
    }

    async getByIDs(ids) {
        return super.getByID(ids);
    }

    async getByParams(params) {
        return super.getByParam(params);
    }

}

module.exports = BaseExService;
