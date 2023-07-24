const FlowDataInfoByDayController = require('../../controllers/flowDataInfoByDay')

module.exports = (router) => {
    // 获取总流量信息
    router.get('/getTotalFlowData', FlowDataInfoByDayController.getTotalFlowData);
    // 获取流量趋势数据
    router.get('/getFlowTrendData', FlowDataInfoByDayController.getFlowTrendData);
}
