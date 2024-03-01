//delete//
// const CommonUtil = require('./CommonUtil')
// const statusCode = require('../util/status-code')
const FlowDataInfoByHourModel = require('../modules/flowDataInfoByHour')
const FlowDataInfoByDayModel = require('../modules/flowDataInfoByDay')
const ProductModel = require('../modules/product')
const Utils = require('../util/utils')
const { FLOW_TYPE } = require('../config/consts')
const log = require("../config/log");
//delete//

class TimerCalculateController {

  /**
   * 定时计算每天的流量
   */
  static async calculateCountByDay(dayIndex) {

    const dayName = Utils.addDays(dayIndex)
    const monthName = dayName.substring(0, 7)
    // 归类计算总流量数据
    await FlowDataInfoByHourModel.calculateFlowCountByDay(dayIndex).then(async(flowDataRes) => {
      if (!(flowDataRes && flowDataRes.length > 0)) return
      // 存储当天的流量消耗
      FlowDataInfoByDayModel.createFlowDataInfosByDay(flowDataRes, dayName, monthName)
      // 更新产品的消耗信息
      const totalCountArr = flowDataRes.filter((item) => item.flowType === FLOW_TYPE.TOTAL_FLOW_COUNT)

      for (let i = 0; i < totalCountArr.length; i ++) {
        setTimeout(async() => {
          const { flowCount, companyId } = totalCountArr[i]
          const totalCount = flowCount
          const productRes = await ProductModel.getProductDetailByCompanyId(companyId)
          const { maxFlowCount = 0, usedFlowCount = 0 } = productRes === null ? {} : productRes
          const finalUsedFlowCount = totalCount + usedFlowCount * 1
          // 如果流量超出了最大值，则产品失效
          let isValid = finalUsedFlowCount >= maxFlowCount ? 0 : 1

          // 查询出当前月份的产品信息
          ProductModel.updateProduct(companyId, monthName, {usedFlowCount: finalUsedFlowCount, isValid})
        }, i * 500)
        
      }
    }).catch((e) => {
      log.printError("calculateFlowCountByDay 错误", e)
    })
    // const cusData = await CustomerPVModel.getCusInfoCountForDay(webMonitorId, useDay, tempObj.uploadTypeForHour + userTag);
    // const uploadType = tempObj.uploadTypeForDay + userTag
    // infoCountByDayInfo.uploadType = uploadType
    // infoCountByDayInfo.dayCount = cusData[0].count
    // const result_uv = await InfoCountByDayModel.getInfoCountByDayDetailByDayName(useDay, webMonitorId, uploadType)
    // if (result_uv.length <= 0) {
    //   await InfoCountByDayModel.createInfoCountByDay(infoCountByDayInfo)
    // } else {
    //   const id = result_uv[0].id
    //   await InfoCountByDayModel.updateInfoCountByDay(id, infoCountByDayInfo)
    // }
  }

  static async handleProject(callback) {
    const projectList = await ProjectModel.getAllProjectList();
    for (let p = 0; p < projectList.length; p ++) {
      const { webMonitorId, pageAggregation, httpAggregation} = projectList[p]
      callback({webMonitorId, userTag: "", p, projectList, pageAggregation, httpAggregation})
    }
  }
  static async handleProjectWithTag(callback) {
    const projectList = await ProjectModel.getAllProjectList();
    for (let p = 0; p < projectList.length; p ++) {
      const webMonitorId = projectList[p].webMonitorId
      const userTags = projectList[p].userTag
      const firstTagArray = [""]
      let userTagArray = userTags ? userTags.split(",") : []
      // 如果userTagArray只有一个空字符串，说明用户没有设置userTag
      if (!(userTagArray.length === 1 && userTagArray[0] === "")) {
        userTagArray = firstTagArray.concat(userTagArray)
      }
      for (let tagIndex = 0; tagIndex < userTagArray.length; tagIndex ++) {
        let userTag = userTagArray[tagIndex]
        callback(webMonitorId, userTag)
      }
    }
  }
}

//exports//
module.exports = TimerCalculateController
//exports//