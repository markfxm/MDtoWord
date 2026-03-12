// 云函数：认证相关处理
const cloud = require('@cloudbase/node-sdk')
const tcb = cloud.init()

const db = tcb.database()
const _ = db.command

exports.main = async (event, context) => {
  const { action, userId } = event

  try {
    switch (action) {
      case 'createUser': {
        // 创建新用户
        const { email } = event

        const existingUser = await db.collection('users')
          .where({ _openid: userId })
          .get()

        if (existingUser.data.length === 0) {
          await db.collection('users').add({
            _openid: userId,
            email,
            freeQuota: 10,
            vipExpireTime: null,
            isVip: false,
            createdAt: new Date(),
            updatedAt: new Date()
          })
        }

        return {
          code: 0,
          message: '用户创建成功'
        }
      }

      case 'getUserQuota': {
        // 获取用户配额信息
        const result = await db.collection('users')
          .where({ _openid: userId })
          .get()

        if (result.data.length === 0) {
          return {
            code: 0,
            data: {
              isVip: false,
              remainingQuota: 0
            }
          }
        }

        const user = result.data[0]
        const now = new Date()
        const isVip = user.vipExpireTime && new Date(user.vipExpireTime) > now

        return {
          code: 0,
          data: {
            isVip,
            remainingQuota: isVip ? Infinity : (user.freeQuota || 0),
            vipExpireTime: user.vipExpireTime
          }
        }
      }

      case 'decreaseQuota': {
        // 扣除使用次数
        const { count = 1 } = event

        // 检查用户是否为会员
        const quotaResult = await db.collection('users')
          .where({ _openid: userId })
          .get()

        if (quotaResult.data.length === 0) {
          return {
            code: -1,
            message: '用户不存在'
          }
        }

        const user = quotaResult.data[0]
        const now = new Date()
        const isVip = user.vipExpireTime && new Date(user.vipExpireTime) > now

        // 会员不扣减配额
        if (isVip) {
          return {
            code: 0,
            data: {
              remainingQuota: Infinity
            }
          }
        }

        if ((user.freeQuota || 0) < count) {
          return {
            code: -1,
            message: '配额不足'
          }
        }

        // 扣减配额
        await db.collection('users')
          .where({ _openid: userId })
          .update({
            freeQuota: _.inc(-count),
            updatedAt: new Date()
          })

        // 记录使用日志
        await db.collection('usage_logs').add({
          userId,
          action: 'download',
          count,
          createdAt: new Date()
        })

        return {
          code: 0,
          data: {
            remainingQuota: user.freeQuota - count
          }
        }
      }

      default:
        return {
          code: -1,
          message: '未知操作'
        }
    }
  } catch (error) {
    console.error('认证处理失败:', error)
    return {
      code: -1,
      message: error.message
    }
  }
}
