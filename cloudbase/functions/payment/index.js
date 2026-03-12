// 云函数：支付处理
const cloud = require('@cloudbase/node-sdk')
const tcb = cloud.init()

const db = tcb.database()
const _ = db.command

// 支付配置 - 需要在云函数环境变量中配置
const PAYMENT_CONFIG = {
  // 微信支付配置
  wechat: {
    appId: process.env.WECHAT_APP_ID,
    mchId: process.env.WECHAT_MCH_ID,
    apiKey: process.env.WECHAT_API_KEY,
    notifyUrl: process.env.WECHAT_NOTIFY_URL
  },
  // 支付宝配置
  alipay: {
    appId: process.env.ALIPAY_APP_ID,
    privateKey: process.env.ALIPAY_PRIVATE_KEY,
    publicKey: process.env.ALIPAY_PUBLIC_KEY,
    notifyUrl: process.env.ALIPAY_NOTIFY_URL
  }
}

/**
 * 生成微信支付参数
 */
const createWeChatPay = async (orderId, amount, userId, planType) => {
  try {
    // 创建订单
    const orderData = {
      orderId,
      userId,
      planType,
      amount,
      status: 'pending',
      paymentMethod: 'wechat',
      createdAt: new Date(),
      updatedAt: new Date()
    }

    await db.collection('orders').add(orderData)

    // 实际项目中，这里应该调用微信支付API
    // 示例代码：
    /*
    const wxpay = require('wechatpay-node-v3')
    const pay = new wxpay({
      appid: PAYMENT_CONFIG.wechat.appId,
      mchid: PAYMENT_CONFIG.wechat.mchId,
      private_key: PAYMENT_CONFIG.wechat.privateKey,
      serial_no: PAYMENT_CONFIG.wechat.serialNo
    })

    const params = {
      appid: PAYMENT_CONFIG.wechat.appId,
      mchid: PAYMENT_CONFIG.wechat.mchId,
      description: `${planType === 'month' ? '月度' : '年度'}会员`,
      out_trade_no: orderId,
      notify_url: PAYMENT_CONFIG.wechat.notifyUrl,
      amount: {
        total: amount,
        currency: 'CNY'
      }
    }

    const result = await pay.transactions_native(params)
    return {
      code: 0,
      data: {
        code_url: result.code_url
      }
    }
    */

    // 返回模拟数据
    return {
      code: 0,
      data: {
        code_url: `weixin://wxpay/bizpayurl?pr=${orderId}`,
        message: '微信支付订单创建成功'
      }
    }
  } catch (error) {
    console.error('创建微信支付失败:', error)
    return {
      code: -1,
      message: error.message
    }
  }
}

/**
 * 创建微信H5支付
 */
const createWeChatH5Pay = async (orderId, amount) => {
  try {
    // 实际项目中调用微信H5支付API
    return {
      code: 0,
      data: {
        mweb_url: `https://wx.tenpay.com/cgi-bin/mmpayweb-bin/checkmweb?prepay_id=${orderId}`,
        message: '微信H5支付订单创建成功'
      }
    }
  } catch (error) {
    console.error('创建微信H5支付失败:', error)
    return {
      code: -1,
      message: error.message
    }
  }
}

/**
 * 创建支付宝支付
 */
const createAliPay = async (orderId, amount) => {
  try {
    // 创建订单
    const orderData = {
      orderId,
      amount,
      status: 'pending',
      paymentMethod: 'alipay',
      createdAt: new Date(),
      updatedAt: new Date()
    }

    await db.collection('orders').add(orderData)

    // 实际项目中，这里应该调用支付宝支付API
    // 示例代码：
    /*
    const AlipaySdk = require('alipay-sdk').default
    const AlipayFormData = require('alipay-sdk/lib/form').default

    const alipaySdk = new AlipaySdk({
      appId: PAYMENT_CONFIG.alipay.appId,
      privateKey: PAYMENT_CONFIG.alipay.privateKey,
      alipayPublicKey: PAYMENT_CONFIG.alipay.publicKey
    })

    const formData = new AlipayFormData()
    formData.setMethod('get')
    formData.addField('returnUrl', 'https://your-domain.com/payment/return')
    formData.addField('bizContent', {
      outTradeNo: orderId,
      productCode: 'FAST_INSTANT_TRADE_PAY',
      totalAmount: (amount / 100).toFixed(2),
      subject: '会员充值'
    })

    const result = await alipaySdk.exec(
      'alipay.trade.page.pay',
      {},
      { formData: formData.getNodeValue() }
    )

    return {
      code: 0,
      data: {
        payUrl: result
      }
    }
    */

    // 返回模拟数据
    return {
      code: 0,
      data: {
        payUrl: `https://openapi.alipay.com/gateway.do?out_trade_no=${orderId}&total_amount=${(amount/100).toFixed(2)}`,
        message: '支付宝订单创建成功'
      }
    }
  } catch (error) {
    console.error('创建支付宝支付失败:', error)
    return {
      code: -1,
      message: error.message
    }
  }
}

/**
 * 查询支付状态
 */
const queryPayment = async (orderId) => {
  try {
    const orderResult = await db.collection('orders')
      .where({ orderId })
      .get()

    if (orderResult.data.length === 0) {
      return {
        code: -1,
        message: '订单不存在'
      }
    }

    const order = orderResult.data[0]

    // 实际项目中应该调用支付接口查询支付状态
    return {
      code: 0,
      data: {
        status: order.status,
        paidAt: order.paidAt
      }
    }
  } catch (error) {
    console.error('查询支付状态失败:', error)
    return {
      code: -1,
      message: error.message
    }
  }
}

/**
 * 确认支付并更新会员状态
 */
const confirmPayment = async (orderId, userId) => {
  try {
    const orderResult = await db.collection('orders')
      .where({ orderId })
      .get()

    if (orderResult.data.length === 0) {
      return {
        code: -1,
        message: '订单不存在'
      }
    }

    const order = orderResult.data[0]

    // 计算会员到期时间
    const now = new Date()
    let expireTime

    // 查询用户当前会员到期时间
    const userResult = await db.collection('users')
      .where({ _openid: userId })
      .get()

    let currentExpireTime = userResult.data[0]?.vipExpireTime

    if (currentExpireTime && new Date(currentExpireTime) > now) {
      // 如果当前仍是会员，从到期时间延长
      expireTime = new Date(currentExpireTime)
    } else {
      // 否则从现在开始计算
      expireTime = new Date()
    }

    if (order.planType === 'month') {
      expireTime.setMonth(expireTime.getMonth() + 1)
    } else {
      expireTime.setFullYear(expireTime.getFullYear() + 1)
    }

    // 更新用户会员状态
    await db.collection('users')
      .where({ _openid: userId })
      .update({
        vipExpireTime: expireTime,
        isVip: true,
        updatedAt: new Date()
      })

    // 更新订单状态
    await db.collection('orders')
      .where({ orderId })
      .update({
        status: 'paid',
        paidAt: new Date(),
        updatedAt: new Date()
      })

    return {
      code: 0,
      data: {
        expireTime
      }
    }
  } catch (error) {
    console.error('确认支付失败:', error)
    return {
      code: -1,
      message: error.message
    }
  }
}

exports.main = async (event, context) => {
  const { action, orderId, userId, planType, amount } = event

  try {
    switch (action) {
      case 'createWeChatPay':
        return await createWeChatPay(orderId, amount, userId, planType)

      case 'createWeChatH5Pay':
        return await createWeChatH5Pay(orderId, amount)

      case 'createAliPay':
        return await createAliPay(orderId, amount)

      case 'queryPayment':
        return await queryPayment(orderId)

      case 'confirmPayment':
        return await confirmPayment(orderId, userId)

      default:
        return {
          code: -1,
          message: '未知操作'
        }
    }
  } catch (error) {
    console.error('支付处理失败:', error)
    return {
      code: -1,
      message: error.message
    }
  }
}
