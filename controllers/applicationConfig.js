//delete//
const ApplicationConfigModel = require('../modules/applicationConfig')
const statusCode = require('../util/status-code')
const Utils = require('../util/utils');
var { accountInfo } = require("../config/AccountConfig")
var { feiShuConfig } = require("../sso")
const Consts = require('../config/consts')
const { PROJECT_API } = Consts
const log = require("../config/log")
const fetch = require('node-fetch');
const UserModel = require('../modules/user');
const UserController = require('./user');
const feishu = require('../sso/feishu');
//delete//
class ApplicationConfigController {
    /**
     * 创建信息
     * @param ctx
     * @returns {Promise.<void>}
     */
    static async create(ctx) {
        let req = ctx.request.body;

        if (req.title && req.author && req.content && req.category) {
            let ret = await ApplicationConfigModel.createApplicationConfig(req);
            let data = await ApplicationConfigModel.getApplicationConfigDetail(ret.id);

            ctx.response.status = 200;
            ctx.body = statusCode.SUCCESS_200('创建信息成功', data)
        } else {

            ctx.response.status = 412;
            ctx.body = statusCode.ERROR_412('创建信息失败，请求参数不能为空！')
        }
    }
    /**
     * 创建信息
     * @param ctx
     * @returns {Promise.<void>}
     */
    static async updateSysConfigInfo(ctx) {
        let param = JSON.parse(ctx.request.body);
        const { serverDomain, adminDomain, editType } = param

        // 先检查对应配置是否存在
        const checkRes = await ApplicationConfigModel.getApplicationConfigByConfigName(editType)
        if (checkRes && checkRes.length) {
            // 如果存在，则更新
            await ApplicationConfigModel.updateApplicationConfig(editType, {configValue: JSON.stringify({serverDomain, adminDomain})})
        } else {
            // 如果不存在，则新建
            await ApplicationConfigModel.createApplicationConfig({systemName: editType, configValue: JSON.stringify({serverDomain, adminDomain})})
        }

        ctx.response.status = 200;
        ctx.body = statusCode.SUCCESS_200('创建信息成功', 0)
    }

    /**
     * 更新域名配置信息
     * @param ctx
     * @returns {Promise.<void>}
     */
    static async setInitSysConfigInfo(serverDomain, adminDomain, editType) {
        // 如果对应配置不存在，则新建
        const checkRes = await ApplicationConfigModel.getApplicationConfigByConfigName(editType)
        if (checkRes && checkRes.length === 0) {
            await ApplicationConfigModel.createApplicationConfig({systemName: editType, configValue: JSON.stringify({serverDomain, adminDomain})})
        }
    }

    /**
     * 创建信息
     * @param ctx
     * @returns {Promise.<void>}
     */
    static async getSysConfigInfo(ctx) {
        const { monitorServerDomain, monitorAssetsDomain, eventServerDomain, eventAssetsDomain, emailNeeded, phoneNeeded, activationRequired } = accountInfo
        const res = {
            monitor: {
                serverDomain: monitorServerDomain,
                adminDomain: monitorAssetsDomain,
            },
            event: {
                serverDomain: eventServerDomain,
                adminDomain: eventAssetsDomain,
            },
            emailNeeded,
            phoneNeeded,
            activationRequired
        }
        ctx.response.status = 200;
        ctx.body = statusCode.SUCCESS_200('创建信息成功', res)
    }
    /**
     * 获取基础配置
     */
    static async handleAllApplicationConfig() {
        const systemRes = await ApplicationConfigModel.getAllApplicationConfig()
        let monitor = {}
        let event = {}
        systemRes.forEach((sysItem) => {
            const configValue = JSON.parse(sysItem.configValue)
            switch(sysItem.systemName) {
                case "monitor":
                    monitor = configValue
                    break
                case "event":
                    event = configValue
                    break
                default:
                    break
            }
        })
        return {
            monitor, event
        }
    }
    /**
     * 获取监控的基本信息
     * @param ctx
     * @returns {Promise.<void>}
     */
    static async monitorBaseInfo(ctx) {
        const appConfig = await ApplicationConfigController.handleAllApplicationConfig()
        const { monitor } = appConfig

        const monitorBaseRes = await Utils.requestForTwoProtocol("post", `${monitor.serverDomain}${PROJECT_API.MONITOR_BASE_INFO}`, {})
        if (!monitorBaseRes) {
            ctx.response.status = 412;
            ctx.body = statusCode.ERROR_412('监控系统基本信息获取失败!')
        } else {
            ctx.response.status = 200;
            ctx.body = statusCode.SUCCESS_200('success', monitorBaseRes.data)
        }
    }
    /**
     * 获取埋点的基本信息
     * @param ctx
     * @returns {Promise.<void>}
     */
    static async eventBaseInfo(ctx) {
        const appConfig = await ApplicationConfigController.handleAllApplicationConfig()
        const { event } = appConfig

        const eventBaseRes = await Utils.requestForTwoProtocol("post", `${event.serverDomain}${PROJECT_API.EVENT_BASE_INFO}`, {})
        if (!eventBaseRes) {
            ctx.response.status = 412;
            ctx.body = statusCode.ERROR_412('监控系统基本信息获取失败!')
        } else {
            ctx.response.status = 200;
            ctx.body = statusCode.SUCCESS_200('success', eventBaseRes.data)
        }
    }

    /**
     * 获取第三方token
     * @param ctx
     * @returns {Promise.<void>}
     */
    static async getOtherAccessTokenWithCode(ctx) {
        const { code } = JSON.parse(ctx.request.body)
        const { getTenantTokenConfig, getUserInfoConfig } = feiShuConfig
        const params = {
            grant_type: "authorization_code",
            client_id: feiShuConfig.appId,
            client_secret: feiShuConfig.appSecret,
            redirect_uri: feiShuConfig.redirectUri,
            code
        }
        const tokenRes = await Utils.postForm(getTenantTokenConfig.url, params).catch((e) => {
            ctx.response.status = 412;
            ctx.body = statusCode.ERROR_412(e.msg, 0)
        })
        console.log(tokenRes)
        if (tokenRes && tokenRes.code === 200) {
            const { access_token } = tokenRes.data
            // 根据access_token获取用户信息
            const userInfoRes = await Utils.postForm(getUserInfoConfig.url, {access_token}).catch((e) => {
                ctx.response.status = 412;
                ctx.body = statusCode.ERROR_412(e.msg, 0)
            })
            console.log(userInfoRes)
            if (userInfoRes && userInfoRes.code === 200) {
                const { username = "", mobile = "", email = "" } = userInfoRes.data
                if (!mobile && !email) {
                    ctx.response.status = 412;
                    ctx.body = statusCode.ERROR_412("登录失败，手机号和邮箱都为空！", 0)
                    return
                }
                // 检查账号是否存在
                const existUsers = await UserModel.checkUserByPhoneOrEmail(mobile, email)
                if (!existUsers || !existUsers.length) {
                    // 账号不存在，则创建一个
                    const userData = {
                        companyId: "1",
                        nickname: username || "no name",
                        emailName: email || mobile,
                        phone: mobile || email,
                        password: Utils.md5(Utils.getUuid()),
                        userId: Utils.getUuid(),
                        userType: "customer",
                        registerStatus: 1,
                        avatar: Math.floor(Math.random() * 6)
                    }
                    let userRet = await UserModel.createUser(userData);
                    if (userRet && userRet.id) {
                        const accessToken = await UserController.createSsoToken(mobile, email)
                        if (accessToken) {
                            ctx.response.status = 200;
                            ctx.body = statusCode.SUCCESS_200('success', {
                                accessToken
                            })
                        } else {
                            ctx.response.status = 412;
                            ctx.body = statusCode.ERROR_412("登录失败，账号无效或不存在！", 0)
                        }
                    }
                }
            } else {
                console.log(userInfoRes)
                log.printError(`获取第三方用户信息失败（${getUserInfoConfig.url}）`, userInfoRes)
                ctx.response.status = 412;
                ctx.body = statusCode.ERROR_412(tokenRes.msg, tokenRes.msg)
            }
        } else {
            console.log(tokenRes)
            log.printError(`获取第三方token失败（${getTenantTokenConfig.url}）`, tokenRes)
            ctx.response.status = 412;
            ctx.body = statusCode.ERROR_412(tokenRes.msg, tokenRes.msg)
        }
    }

    /**
     * 获取飞书的签名
     * @param ctx
     * @returns {Promise.<void>}
     */
    static async getSignatureForFeiShu(ctx) {
        const { getAppTokenConfig, getJsTicketConfig, redirectUri } = feiShuConfig
        log.printInfo("飞书配置项：", JSON.stringify(feiShuConfig))
        const params = {
            app_id: feiShuConfig.appId,
            app_secret: feiShuConfig.appSecret,
        }
        // 获取缓存里的token
        const tokenInCache = global.centerInfo.ssoForFeiShu.appToken
        let cacheTokenValid = false
        if (tokenInCache && tokenInCache.value) {
            if (new Date().getTime() < tokenInCache.endTime) {
                cacheTokenValid = true
            }
        }
        let finalToken = ""
        if (!cacheTokenValid) {
            log.printInfo(getAppTokenConfig.url + " 接口参数：", JSON.stringify(params))
            const tokenRes = await Utils.postJson(getAppTokenConfig.url, params).catch((e) => {
                log.printInfo(getAppTokenConfig.url + " 接口报错 ：", e)
                ctx.response.status = 412;
                ctx.body = statusCode.ERROR_412(e.msg, 0)
            })
            log.printInfo(getAppTokenConfig.url + " 接口结果：", JSON.stringify(tokenRes))
            if (tokenRes) {
                const { app_access_token, expire } = tokenRes
                finalToken = app_access_token
                global.centerInfo.ssoForFeiShu.appToken = {
                    value: finalToken,
                    endTime: new Date().getTime() + expire * 1000
                }
            }
        } else {
            finalToken = global.centerInfo.ssoForFeiShu.appToken.value
        }
        if (!finalToken) {
            ctx.response.status = 412;
            ctx.body = statusCode.ERROR_412("token无效", 0)
            return
        }

        const customHead = {
            "Authorization": `Bearer ${finalToken}`,
            "Content-Type": "application/json"
        }
        // 获取缓存里的ticket
        const ticketInCache = global.centerInfo.ssoForFeiShu.ticket
        let cacheTicketValid = false
        if (ticketInCache && ticketInCache.value) {
            if (new Date().getTime() < ticketInCache.endTime) {
                cacheTicketValid = true
            }
        }
        let finalTicket = ""
        if (!cacheTicketValid) {
            log.printInfo(getJsTicketConfig.url + " 接口参数（header）：", JSON.stringify(customHead))
            const ticketRes = await Utils.get(getJsTicketConfig.url, {}, {customHead}).catch((e) => {
                log.printInfo(getJsTicketConfig.url + " 接口报错 ：", e)
                ctx.response.status = 412;
                ctx.body = statusCode.ERROR_412(e.msg, 0)
            })
            log.printInfo(getJsTicketConfig.url + " 接口结果：", JSON.stringify(ticketRes))
            if (ticketRes) {
                const { ticket, expire_in } = ticketRes.data
                finalTicket = ticket
                global.centerInfo.ssoForFeiShu.ticket = {
                    value: finalTicket,
                    endTime: new Date().getTime() + expire_in * 1000
                }
            }
        } else {
            finalTicket = global.centerInfo.ssoForFeiShu.ticket.value
        }

        if (!finalTicket) {
            ctx.response.status = 412;
            ctx.body = statusCode.ERROR_412(`ticket无效`, 0)
            return
        }
        const nonceStr = Utils.getUuid().replace(/-/g, "")
        const timestamp = new Date().getTime()
        const url = redirectUri
        const verifyStr = `jsapi_ticket=${finalTicket}&noncestr=${nonceStr}&timestamp=${timestamp}&url=${url}`
        const signature = Utils.sha1(verifyStr)
        ctx.response.status = 200;
        ctx.body = statusCode.SUCCESS_200('success', {
            appId: feiShuConfig.appId,
            timestamp,
            nonceStr,
            signature
        })
    }

    /**
     * 根据code获取飞书的用户信息已经登录token
     * @param ctx
     * @returns {Promise.<void>}
     */
    static async getAccessTokenByCodeForFeiShu(ctx) {
        const { code, grant_type } = Utils.parseQs(ctx.request.url)
        const { getUserTokenConfig, getUserInfoConfig } = feiShuConfig

        let finalToken = ""
        const customHead = {
            "Authorization": `Bearer ${global.centerInfo.ssoForFeiShu.appToken.value}`,
            "Content-Type": "application/json"
        }
        log.printInfo(getUserTokenConfig.url + " 接口参数（header）：", JSON.stringify(customHead))
        const tokenRes = await Utils.postJson(getUserTokenConfig.url, {code, grant_type}, {customHead}).catch((e) => {
            log.printInfo(getUserTokenConfig.url + " 接口报错 ：", e)
            ctx.response.status = 412;
            ctx.body = statusCode.ERROR_412(e.msg, 0)
        })
        log.printInfo(getUserTokenConfig.url + " 接口结果：", JSON.stringify(tokenRes))
        if (tokenRes) {
            const { access_token } = tokenRes.data
            finalToken = access_token
        }
        if (!finalToken) {
            ctx.response.status = 412;
            ctx.body = statusCode.ERROR_412("token无效", 0)
            return
        }

        const userInfoCustomHead = {
            "Authorization": `Bearer ${finalToken}`
        }
        log.printInfo(getUserInfoConfig.url + " 接口参数（header）：", JSON.stringify(userInfoCustomHead))
        const userInfoRes = await Utils.get(getUserInfoConfig.url, {}, {customHead: userInfoCustomHead}).catch((e) => {
            log.printInfo(getUserInfoConfig.url + " 接口报错 ：", e)
            ctx.response.status = 412;
            ctx.body = statusCode.ERROR_412(e.msg, 0)
        })
        log.printInfo(getUserInfoConfig.url + " 接口结果：", JSON.stringify(userInfoRes))
        const { email = "", mobile = "", name = ""} = userInfoRes.data
        const finalMobile = mobile.replace(/\+86/g, "")
        if (email || finalMobile) {
            // 检查账号是否存在
            const existUsers = await UserModel.checkUserByPhoneOrEmail(finalMobile, email)
            if (!existUsers || !existUsers.length) {
                // 账号不存在，则创建一个
                const nickname = name || "no name"
                const emailName = email || finalMobile
                const phone = finalMobile || email
                const userData = {
                    companyId: "1",
                    nickname,
                    emailName,
                    phone,
                    password: Utils.md5("123456"),
                    userId: Utils.getUuid(),
                    userType: "customer",
                    registerStatus: 1,
                    avatar: Math.floor(Math.random() * 6)
                }
                log.printInfo("用户不存在，即将创建：", JSON.stringify(userData))
                let userRet = await UserModel.createUser(userData);
                if (userRet && userRet.id) {
                    const accessToken = await UserController.createSsoToken(phone, emailName)
                    if (accessToken) {
                        ctx.response.status = 200;
                        ctx.body = statusCode.SUCCESS_200('success', {
                            accessToken
                        })
                        log.printInfo("生成token：", JSON.stringify(accessToken))
                    } else {
                        log.printInfo("生成token失败：", JSON.stringify(accessToken))
                        ctx.response.status = 412;
                        ctx.body = statusCode.ERROR_412("登录失败，账号无效或不存在1！", 0)
                    }
                }
            } else {
                const emailName = email || finalMobile
                const phone = finalMobile || email
                log.printInfo("用户已存在，用户信息：", JSON.stringify({phone, emailName}))
                const accessToken = await UserController.createSsoToken(phone, emailName)
                if (accessToken) {
                    ctx.response.status = 200;
                    ctx.body = statusCode.SUCCESS_200('success', {
                        accessToken
                    })
                    log.printInfo("生成token：", JSON.stringify(accessToken))
                } else {
                    log.printInfo("生成token失败：", JSON.stringify(accessToken))
                    ctx.response.status = 412;
                    ctx.body = statusCode.ERROR_412("登录失败，账号不存在或匹配到多条信息！", 0)
                }
            }
        } else {
            ctx.response.status = 412;
            ctx.body = statusCode.ERROR_412("未获取到手机号或邮箱", 0)
        }

        
    }
}
//exports//
module.exports = ApplicationConfigController
//exports//