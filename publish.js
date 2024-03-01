var fs = require('fs');
var version = require("./version")
var utils = require("./util/utils")
const pathApp = require('path')
// 原路径往上跳2层
const originPath = pathApp.resolve(__dirname, '../../')

function handleControllers(success) {
    let path = './controllers';
    let files = fs.readdirSync(path);
    let deleteReg = /\/\/delete\/\/[\d\D]*\/\/delete\/\//g
    let exportsReg = /\/\/exports\/\/[\d\D]*\/\/exports\/\//g
    let result = ""
    let exportNames = []
    const versionArr = version.split(".")
    let v1 = versionArr[0] * 1
    let v2 = versionArr[1] * 1
    let v3 = versionArr[2] * 1
    v3 += 1
    if (v3 >= 100) {
        v3 = 0
        v2 += 1
        if (v2 >= 100) {
            v2 = 0
            v1 += 1
        }
    }
    let webfunnyVersion = v1 + "." + v2 + "." + v3

    fs.writeFile(`./version.js`, `module.exports = "${webfunnyVersion}"`, function(err) {
        if (err) {
            throw err;
        }
    });
    for(let i = 0; i < files.length; i++){
        fs.readFile(path + "/" + files[i], function(err, data){
            let code = data.toString()
            let exportsResult = code.match(exportsReg)[0]
            if (exportsResult) {
                exportNames.push(exportsResult.replace(/ /g, "").split("=")[1].split("\n")[0])
            }
            result = code.replace(deleteReg, "").replace(exportsReg, "")
            
            if (result.indexOf("webfunny-version-flag") != -1) {
                result = result.replace(/webfunny-version-flag/g, webfunnyVersion)
            }
            fs.writeFile('./dist/controllers.js', result, { 'flag': 'a' }, function(err) {
                if (err) {
                    throw err;
                }
                if (i === files.length - 1) {
                    setTimeout(function() {
                        success(exportNames)
                    }, 3000)
                }
            });
        })
    }
}

function handleModels(success) {
    let path = './modules';
    let files = fs.readdirSync(path);
    let deleteReg = /\/\/delete\/\/[\d\D]*\/\/delete\/\//g
    let sequelizeReg = /\/\/Sequelize\/\/[\d\D]*\/\/Sequelize\/\//g
    let exportsReg = /\/\/exports\/\/[\d\D]*\/\/exports\/\//g
    let result = ""
    let exportNames = []
    for(let i = 0; i < files.length; i++){
        fs.readFile(path + "/" + files[i], function(err, data){
            let code = data.toString()
            let exportsResult = code.match(exportsReg)[0]
            if (exportsResult) {
                exportNames.push(exportsResult.replace(/ /g, "").split("=")[1].split("\n")[0])
            }
            let sequelizeResult = ""
            let sequelizeName = ""
            if (code.match(sequelizeReg) && code.match(sequelizeReg).length){
                sequelizeResult = code.match(sequelizeReg)[0].replace(/\/\/Sequelize\/\//g, "")
                sequelizeName = sequelizeResult.split(" = ")[0].split(" ")[1]
                // sequelizeResult = sequelizeResult.replace(/\'\.\.\/schema\/[a-zA-Z]*\'/g, sequelizeName + "Schema")
            }
            result = sequelizeResult + code.replace(deleteReg, "").replace(sequelizeReg, "").replace(exportsReg, "")
            fs.writeFile('./dist/models.js', result, { 'flag': 'a' }, function(err) {
                if (err) {
                    throw err;
                }
                if (i === files.length - 1) {
                    setTimeout(() => {
                        success(exportNames)
                    }, 3000)
                }
            });
        })
    }
}


function handleSchema(success) {
    let baseInfo = "const baseInfo = require('./baseInfo'); const moment = require('moment');"
    fs.writeFile('./dist/schemas.js', baseInfo, { 'flag': 'a' }, function(err) {
        if (err) {
            throw err;
        }
        let path = './schema';
        let files = fs.readdirSync(path);
        let deleteReg = /\/\/delete\/\/[\d\D]*\/\/delete\/\//g
        let exportsReg = /\/\/exports\/\/[\d\D]*\/\/exports\/\//g
        let result = ""
        let exportNames = []
        for(let i = 0; i < files.length; i++){
            if (files[i] === "baseInfo.js") continue
            fs.readFile(path + "/" + files[i], function(err, data){
                let code = data.toString()
                let exportsResult = code.match(exportsReg)[0]
                if (exportsResult) {
                    let exportName = exportsResult.replace(/ /g, "").split("=")[1].split("\n")[0]
                    exportNames.push(exportName)
                }
                result = code.replace(deleteReg, "").replace(exportsReg, "")
                fs.writeFile('./dist/schemas.js', result, { 'flag': 'a' }, function(err) {
                    if (err) {
                        throw err;
                    }
                    if (i === files.length - 1) {
                        success(exportNames)
                    }
                });
            })
        }
    });
}


// 执行开始
// 删除原来的文件
let path = './dist';
let files = fs.readdirSync(path);
files.forEach(function(fileName) {
    fs.unlink(path + "/" + fileName,() => {
        console.log("成功删除 " + fileName)
    });
})

handleSchema(function(schemas) {
    let result = "module.exports = {"
    schemas.forEach((element, index) => {
        if (index === schemas.length - 1) {
            result += element + "Schema" + ":" + element 
        } else {
            result += element + "Schema" + ":" + element + ","
        }
    })
    result += "}"

    fs.writeFile('./dist/schemas.js', result, { 'flag': 'a' }, function(err) {
        if (err) {
            throw err;
        }
    });

    // 通用文件的引入
    let importResult = `const db = require('../config/db');
                        const Sequelize = db.sequelize;
                        const Utils = require('../util/utils');
                        const utils = require('../util/utils');
                        const CommonSql = require('../util/commonSql')
                        const geoip = require('geoip-lite');
                        const log = require("../../../config/log");
                        const { UPLOAD_TYPE, FLOW_TYPE, START_YEAR } = require('../config/consts')
                        const AccountConfig = require('../config/AccountConfig')
                        const { accountInfo } = AccountConfig
                        const infoSchemaList = require("../schema/infoSchemaListByDay")
                        const infoSchemaListByYear = require("../schema/infoSchemaListByYear")
                        const fs = require('fs');
                        const fetch = require('node-fetch');`
    fs.writeFile('./dist/models.js', importResult, { 'flag': 'a' }, function(err) {
        if (err) { throw err; }
        // 合并models
        handleModels(function(models) {
            let result = "module.exports = {"
            models.forEach((element, index) => {
                // result += element + ","
                if (index === models.length - 1) {
                    result += element
                } else {
                    result += element + ","
                }
            })
            result += "}"
            console.log("models 导出列表：")
            console.log(result)

            setTimeout(function() {
                fs.writeFile('./dist/models.js', result, { 'flag': 'a' }, function(err) {
                    if (err) { throw err; }
                    
                    // controller.js通用文件的引入
                    let importResult = `const db = require('../config/db');
                                        const Sequelize = db.sequelize;
                                        const colors = require('colors');
                                        const Utils = require('../util/utils');
                                        const utils = require('../util/utils');
                                        const CusUtils = require('../../../util_cus')
                                        const log = require("../../../config/log");
                                        const statusCode = require('../util/status-code');
                                        const { UPLOAD_TYPE, FLOW_TYPE, PROJECT_INFO, USER_INFO, WEBFUNNY_CONFIG_URI, PRODUCT_INFO_URI } = require('../config/consts');
                                        const fetch = require('node-fetch');
                                        const jwt = require('jsonwebtoken')
                                        const secret = require('../config/secret')
                                        const xlsx = require('node-xlsx');
                                        const fs = require('fs');
                                        const nodemailer = require('nodemailer');
                                        const formidable = require("formidable");
                                        const AccountConfig = require('../config/AccountConfig');
                                        const process = require('child_process')
                                        const getmac = require('getmac')
                                        const { spawn, exec, execFile } = require('child_process');
                                        const { accountInfo } = AccountConfig
                                        const { feiShuConfig } = require("../../../sso")
                                        const Consts = require('../config/consts')
                                        const { PROJECT_API } = Consts
                                        const ProductTypeMap = { monitor: '监控', event: '埋点' }
                                        `
                    let controllerResult = "const {"
                    models.forEach(element => {
                        controllerResult += element + ","
                    })
                    controllerResult += "} = require('../modules/models.js');"
                    controllerResult = importResult + "\n" + controllerResult
                    fs.writeFile('./dist/controllers.js', controllerResult, { 'flag': 'a' }, function(err) {
                        if (err) { throw err; }
                        handleControllers(function(controllers) {
                            let result = "module.exports = {"
                            controllers.forEach((element, index) => {
                                // result += element + ","
                                if (index === controllers.length - 1) {
                                    result += element
                                } else {
                                    result += element + ","
                                }
                            })
                            result += "}"
                            console.log("controllers 导出列表：")
                            console.log(result)
                            setTimeout(function() {
                                fs.writeFile('./dist/controllers.js', result, { 'flag': 'a' }, function(err) {
                                    if (err) { throw err; }

                                    // 将controllers.js复制到webfunny_monitor/servers/monitor/controllers目录下
                                    setTimeout(() => {
                                        fs.copyFile('./dist/controllers.js', originPath + '/专业版/0_pre_publish/webfunny_monitor/servers/center/controllers/controllers.js', (err) => {
                                            if (err) { throw err; }
                                            console.log("【controllers.js已复制！】")
                                        });
                                        fs.copyFile('./dist/models.js', originPath + '/专业版/0_pre_publish/webfunny_monitor/servers/center/modules/models.js', (err) => {
                                            if (err) { throw err; }
                                            console.log("【models.js已复制！】")
                                        });

                                        fs.copyFile('./dist/controllers.js', originPath + '/企业版/0_pre_publish/webfunny_monitor_cluster/servers/center/controllers/controllers.js', (err) => {
                                            if (err) { throw err; }
                                            console.log("【controllers.js企业版已复制！】")
                                        });
                                        fs.copyFile('./dist/models.js', originPath + '/企业版/0_pre_publish/webfunny_monitor_cluster/servers/center/modules/models.js', (err) => {
                                            if (err) { throw err; }
                                            console.log("【models.js企业版已复制！】")
                                        });
                                    }, 3000)

                                    // // 压缩models
                                    // setTimeout(() => {
                                    //     fs.readFile('/Users/jeffery/MonitorProjects/webfunny_manage/dist/models.js', function(err, data){
                                    //         if (err) throw err
                                    //         let code = data.toString()
                                    //         // 对代码进行加密
                                    //         jsHamanParams.js_code = code
                                    //         utils.postJson(jsHamanUrl, jsHamanParams).then((res) => {
                                    //             fs.writeFile('/Users/jeffery/MonitorProjects/webfunny_manage/dist/models.min.js', res.content, function(err) {
                                    //                 if (err) { throw err; }
                                    //                 console.log("models压缩完成，压缩后长度为：", res.content.length)
                                    //             });
                                    //         }).catch((e) => {
                                    //             console.log(e)
                                    //         })
                                    //     })
                                    // }, 3000)
                                    // // 写入完成后, 3秒钟后开始加密
                                    // setTimeout(() => {
                                    //     fs.readFile('/Users/jeffery/MonitorProjects/webfunny_manage/dist/controllers.js', function(err, data){
                                    //         if (err) throw err
                                    //         let code = data.toString()
                                    //         // 对代码进行加密
                                    //         jsHamanParams.js_code = code
                                    //         utils.postJson(jsHamanUrl, jsHamanParams).then((res) => {
                                    //             fs.writeFile('/Users/jeffery/MonitorProjects/webfunny_manage/dist/controllers.min.js', res.content, function(err) {
                                    //                 if (err) { throw err; }
                                    //                 console.log("controller压缩完成，压缩后长度为：", res.content.length)
                                    //             });
                                    //         }).catch((e) => {
                                    //             console.log(e)
                                    //         })
                                    //     })
                                    // }, 6000)
                                });
                            }, 2000)
                        })
                    });
    
                });
            }, 2000)
        })
    });
})

