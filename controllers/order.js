//delete//
const Utils = require('../util/utils');
const statusCode = require('../util/status-code')
const { WEBFUNNY_CONFIG_URI } = require('../config/consts')
//delete//
class OrderController {
    /**
     * 获取订单列表
     * @param ctx
     * @returns {Promise.<void>}
     */
    static async getOrderList(ctx) {
        let { companyId = "" } = JSON.parse(ctx.request.body);
        const orderListRes = await Utils.postJson(`${WEBFUNNY_CONFIG_URI}/config/getSaasOrderList`, { companyId }).catch((e) => {
            console.log(e)
        })
        ctx.response.status = 200;
        ctx.body = statusCode.SUCCESS_200('查询成功', orderListRes.data)
    }
}
//exports//
module.exports = OrderController
//exports//