//delete//
const db = require('../config/db')
const Sequelize = db.sequelize;
//delete//
//Sequelize//
const Config = Sequelize.import('../schema/config');
Config.sync({force: false});
//Sequelize//
class ConfigModel {
  /**
   * 创建Config信息
   * @param data
   * @returns {Promise<*>}
   */
  static async createConfig(data) {
    return await Config.create({
      ...data
    })
  }
     /**
   * 获取Config详情数据
   * @param id  Config的ID
   * @returns {Promise<Model>}
   */
  static async getConfigDetail(id) {
    return await Config.findOne({
      where: {
        id,
      },
    })
  }

  static async getConfigByName(configName) {
    return await Config.findOne({
      where: {
        configName,
      },
    })
  }

  static async updateConfig(configName, data) {
    await Config.update({
      ...data
    }, {
      where: {
        configName
      },
      fields: Object.keys(data)
    })
    return true
  }

  static async getConfigByConfigName(configName) {
    let sql = "select * from Config where configName='" + configName + "'"
    return await Sequelize.query(sql, { type: Sequelize.QueryTypes.SELECT})
  }
  static async getAllConfigList() {
    let sql = "select * from Config"
    return await Sequelize.query(sql, { type: Sequelize.QueryTypes.SELECT})
  }
}
//exports//
module.exports = ConfigModel
//exports//