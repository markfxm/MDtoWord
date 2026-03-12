/**
 * 腾讯云云开发(CloudBase)配置
 */

// 环境配置 - 部署时需要替换为实际的环境ID
export const tcbConfig = {
  envId: import.meta.env.VITE_TCB_ENV_ID || 'your-env-id',
  // 授权配置
  scopes: {
    // 登录方式
    loginTypes: ['anonymous', 'email', 'custom']
  }
}

// 用户状态管理
let tcbInstance = null
let authInstance = null
let dbInstance = null

/**
 * 初始化云开发
 */
export const initTCB = async () => {
  try {
    const tcb = await import('@cloudbase/js-sdk')
    tcbInstance = tcb.default || tcb

    const app = tcbInstance.init({
      env: tcbConfig.envId
    })

    authInstance = app.auth()
    dbInstance = app.database()

    return { app, auth: authInstance, db: dbInstance }
  } catch (error) {
    console.error('初始化云开发失败:', error)
    throw error
  }
}

/**
 * 获取Auth实例
 */
export const getAuth = async () => {
  if (!authInstance) {
    await initTCB()
  }
  return authInstance
}

/**
 * 获取数据库实例
 */
export const getDB = async () => {
  if (!dbInstance) {
    await initTCB()
  }
  return dbInstance
}

/**
 * 匿名登录
 */
export const anonymousLogin = async () => {
  try {
    const auth = await getAuth()
    await auth.anonymousAuthProvider().signIn()
    return { success: true }
  } catch (error) {
    console.error('匿名登录失败:', error)
    return { success: false, error: error.message }
  }
}

/**
 * 邮箱密码登录
 */
export const emailLogin = async (email, password) => {
  try {
    const auth = await getAuth()
    await auth.signInWithEmailAndPassword(email, password)
    return { success: true }
  } catch (error) {
    console.error('邮箱登录失败:', error)
    return { success: false, error: error.message }
  }
}

/**
 * 注册用户
 */
export const registerUser = async (email, password) => {
  try {
    const auth = await getAuth()
    await auth.signUpWithEmailAndPassword(email, password)
    return { success: true }
  } catch (error) {
    console.error('注册失败:', error)
    return { success: false, error: error.message }
  }
}

/**
 * 微信登录
 */
export const wechatLogin = async () => {
  try {
    const auth = await getAuth()
    await auth.weixinAuthProvider().signIn()
    return { success: true }
  } catch (error) {
    console.error('微信登录失败:', error)
    return { success: false, error: error.message }
  }
}

/**
 * 发起微信支付
 */
export const requestWeChatPay = async (orderId, amount) => {
  try {
    const db = await getDB()
    const result = await db.callFunction({
      name: 'payment',
      data: {
        action: 'createWeChatPay',
        orderId,
        amount
      }
    })
    
    return result.result
  } catch (error) {
    console.error('发起微信支付失败:', error)
    return { code: -1, message: error.message }
  }
}

/**
 * 发起支付宝支付
 */
export const requestAliPay = async (orderId, amount) => {
  try {
    const db = await getDB()
    const result = await db.callFunction({
      name: 'payment',
      data: {
        action: 'createAliPay',
        orderId,
        amount
      }
    })
    
    return result.result
  } catch (error) {
    console.error('发起支付宝支付失败:', error)
    return { code: -1, message: error.message }
  }
}

/**
 * 查询支付状态
 */
export const queryPaymentStatus = async (orderId) => {
  try {
    const db = await getDB()
    const result = await db.callFunction({
      name: 'payment',
      data: {
        action: 'queryPayment',
        orderId
      }
    })
    
    return result.result
  } catch (error) {
    console.error('查询支付状态失败:', error)
    return { code: -1, message: error.message }
  }
}

/**
 * 登出
 */
export const logout = async () => {
  try {
    const auth = await getAuth()
    await auth.signOut()
    return { success: true }
  } catch (error) {
    console.error('登出失败:', error)
    return { success: false, error: error.message }
  }
}

/**
 * 获取当前用户
 */
export const getCurrentUser = async () => {
  try {
    const auth = await getAuth()
    const user = await auth.getUser()
    return user
  } catch (error) {
    console.error('获取用户信息失败:', error)
    return null
  }
}

/**
 * 获取用户信息
 */
export const getUserInfo = async (uid) => {
  try {
    const db = await getDB()
    const result = await db.collection('users')
      .where({
        _openid: uid
      })
      .get()

    if (result.data.length > 0) {
      return result.data[0]
    }
    return null
  } catch (error) {
    console.error('获取用户信息失败:', error)
    return null
  }
}

/**
 * 检查用户会员状态
 */
export const checkVipStatus = async (uid) => {
  try {
    const userInfo = await getUserInfo(uid)
    if (!userInfo) {
      return { isVip: false, remainingQuota: 0 }
    }

    const now = new Date()
    const isVip = userInfo.vipExpireTime && new Date(userInfo.vipExpireTime) > now
    const remainingQuota = userInfo.freeQuota || 0

    return {
      isVip,
      remainingQuota,
      vipExpireTime: userInfo.vipExpireTime
    }
  } catch (error) {
    console.error('检查会员状态失败:', error)
    return { isVip: false, remainingQuota: 0 }
  }
}

/**
 * 扣除使用次数
 */
export const decreaseQuota = async (uid, count = 1) => {
  try {
    const db = await getDB()
    const result = await db.collection('users')
      .where({
        _openid: uid
      })
      .update({
        freeQuota: db.command.inc(-count)
      })

    return { success: true }
  } catch (error) {
    console.error('扣除次数失败:', error)
    return { success: false, error: error.message }
  }
}

/**
 * 创建或更新用户信息
 */
export const upsertUser = async (userInfo) => {
  try {
    const db = await getDB()
    const uid = userInfo._openid

    // 检查用户是否存在
    const existing = await db.collection('users')
      .where({ _openid: uid })
      .get()

    if (existing.data.length > 0) {
      // 更新用户
      await db.collection('users')
        .where({ _openid: uid })
        .update(userInfo)
    } else {
      // 创建用户
      await db.collection('users').add({
        ...userInfo,
        createdAt: new Date(),
        freeQuota: 10, // 默认10次免费使用
        vipExpireTime: null
      })
    }

    return { success: true }
  } catch (error) {
    console.error('保存用户信息失败:', error)
    return { success: false, error: error.message }
  }
}
