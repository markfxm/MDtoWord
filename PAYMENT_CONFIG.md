# 支付配置指南

## 微信支付配置

### 1. 准备工作

1. **注册微信支付商户账号**
   - 访问 [微信支付商户平台](https://pay.weixin.qq.com/)
   - 提交相关资料完成认证
   - 获取商户号（MchID）

2. **获取API密钥**
   - 登录微信支付商户平台
   - 进入「账户中心」→「API安全」
   - 设置API密钥（32位）
   - 下载并妥善保管

3. **申请商户证书**
   - 在「账户中心」→「API安全」
   - 申请API证书
   - 下载证书（包含 apiclient_cert.pem、apiclient_key.pem）

### 2. 配置步骤

#### 2.1 在腾讯云云开发中配置

1. 进入云开发控制台
2. 选择你的环境
3. 进入「云函数」→「payment」
4. 点击「配置」→「环境变量」
5. 添加以下环境变量：

```env
# 微信支付配置
WECHAT_APP_ID=wx1234567890abcdef
WECHAT_MCH_ID=1234567890
WECHAT_API_KEY=your_32_character_api_key
WECHAT_SERIAL_NO=your_certificate_serial_number
WECHAT_PRIVATE_KEY_path=/path/to/private/key.pem
WECHAT_NOTIFY_URL=https://your-domain.com/payment/wechat/notify
```

#### 2.2 上传证书文件

在云函数代码目录中创建 `certs` 文件夹，上传以下文件：
- `apiclient_cert.pem` - 商户证书
- `apiclient_key.pem` - 商户私钥

#### 2.3 测试支付

使用微信支付沙箱环境进行测试：
1. 访问 [微信支付沙箱](https://pay.weixin.qq.com/wiki/doc/api/sandbox/index.html)
2. 获取沙箱环境的商户号和密钥
3. 更新环境变量进行测试

### 3. 支付类型支持

#### 3.1 小程序支付
```javascript
// 在小程序中调用
wx.requestPayment({
  timeStamp: result.data.timeStamp,
  nonceStr: result.data.nonceStr,
  package: result.data.package,
  signType: 'MD5',
  paySign: result.data.paySign,
  success: (res) => {
    // 支付成功
  }
})
```

#### 3.2 H5支付
```javascript
// 跳转到微信支付页面
window.location.href = result.data.mweb_url
```

#### 3.3 扫码支付（Native）
```javascript
// 生成二维码供用户扫码
const qrCodeUrl = result.data.code_url
// 使用二维码库生成二维码展示给用户
```

### 4. 回调处理

在 `cloudbase/functions/payment/index.js` 中添加回调处理：

```javascript
// 处理微信支付回调
exports.main = async (event, context) => {
  const { action } = event

  if (action === 'wechatNotify') {
    // 验证签名
    const isValid = verifyWeChatSignature(event)
    if (!isValid) {
      return { code: -1, message: '签名验证失败' }
    }

    // 更新订单状态
    await updateOrderStatus(event.out_trade_no, 'paid')

    // 开通会员
    await activateVip(event.out_trade_no)

    return { code: 0, message: 'success' }
  }
}
```

## 支付宝支付配置

### 1. 准备工作

1. **注册支付宝开放平台账号**
   - 访问 [支付宝开放平台](https://open.alipay.com/)
   - 创建应用
   - 获取AppID

2. **生成密钥**
   - 使用支付宝提供的密钥生成工具
   - 生成应用公钥和应用私钥
   - 上传应用公钥到支付宝开放平台
   - 获取支付宝公钥

3. **开通功能**
   - 开通「手机网站支付」
   - 开通「电脑网站支付」

### 2. 配置步骤

#### 2.1 在腾讯云云开发中配置

1. 进入云开发控制台
2. 选择你的环境
3. 进入「云函数」→「payment」
4. 点击「配置」→「环境变量」
5. 添加以下环境变量：

```env
# 支付宝配置
ALIPAY_APP_ID=2021001234567890
ALIPAY_PRIVATE_KEY=MIIEvgIBADANBgkqhkiG9w0BAQEFAASCBKgwggSkAgEAAoIBAQC...
ALIPAY_PUBLIC_KEY=MIIBIjANBgkqhkiG9w0BAQEFAAOCAQ8AMIIBCgKCAQEA...
ALIPAY_NOTIFY_URL=https://your-domain.com/payment/alipay/notify
```

#### 2.2 配置回调地址

在支付宝开放平台配置异步通知地址：
- 电脑网站支付：`https://your-domain.com/payment/alipay/notify`
- 手机网站支付：`https://your-domain.com/payment/alipay/notify`

### 3. 支付类型支持

#### 3.1 电脑网站支付

```javascript
// 获取支付URL
const result = await db.callFunction({
  name: 'payment',
  data: {
    action: 'createAliPay',
    orderId: 'ORDER123',
    amount: 1900,
    product: 'web'
  }
})

// 跳转到支付页面
window.location.href = result.data.payUrl
```

#### 3.2 手机网站支付

```javascript
// 手机网站支付配置
const result = await db.callFunction({
  name: 'payment',
  data: {
    action: 'createAliPay',
    orderId: 'ORDER123',
    amount: 1900,
    product: 'wap'
  }
})

// 跳转到支付页面
window.location.href = result.data.payUrl
```

### 4. 回调处理

```javascript
// 处理支付宝回调
exports.main = async (event, context) => {
  const { action } = event

  if (action === 'alipayNotify') {
    // 验证签名
    const isValid = verifyAliPaySignature(event)
    if (!isValid) {
      return { code: -1, message: '签名验证失败' }
    }

    // 更新订单状态
    await updateOrderStatus(event.out_trade_no, 'paid')

    // 开通会员
    await activateVip(event.out_trade_no)

    return 'success'
  }
}
```

## 通用配置

### 1. 安全建议

1. **密钥管理**
   - 不要在代码中硬编码密钥
   - 使用环境变量存储敏感信息
   - 定期更换密钥

2. **HTTPS**
   - 生产环境必须使用HTTPS
   - 配置SSL证书

3. **回调验证**
   - 所有回调必须验证签名
   - 验证订单金额是否一致
   - 防止重复处理回调

### 2. 日志记录

在云函数中添加详细的日志记录：

```javascript
console.log('订单创建:', { orderId, amount, userId })
console.log('支付回调:', { orderId, status })
console.log('会员开通:', { userId, expireTime })
```

### 3. 错误处理

完善的错误处理机制：

```javascript
try {
  const result = await createPayment(orderData)
  return { code: 0, data: result }
} catch (error) {
  console.error('支付创建失败:', error)
  
  // 记录错误日志
  await logError(error)
  
  return {
    code: -1,
    message: error.message || '支付失败，请重试'
  }
}
```

## 测试流程

### 1. 沙箱测试

1. **微信支付沙箱**
   - 获取沙箱商户号和密钥
   - 更新环境变量
   - 进行测试支付

2. **支付宝沙箱**
   - 访问支付宝沙箱环境
   - 使用沙箱账号测试
   - 验证支付流程

### 2. 生产环境部署

1. 切换到正式环境
2. 更新正式环境的密钥
3. 进行小额测试
4. 监控支付成功率

## 常见问题

### Q: 支付回调收不到怎么办？

A: 
1. 检查回调URL是否可访问
2. 查看云函数日志
3. 确认微信/支付宝是否配置了正确的回调地址

### Q: 签名验证失败？

A: 
1. 检查密钥是否正确
2. 确认签名算法是否一致
3. 检查参数编码格式

### Q: 订单状态不同步？

A: 
1. 添加主动查询接口
2. 定期同步订单状态
3. 实现重试机制

## 参考文档

- [微信支付文档](https://pay.weixin.qq.com/wiki/doc/api/index.html)
- [支付宝开放平台文档](https://opendocs.alipay.com/open/270)
- [腾讯云云开发文档](https://cloud.tencent.com/document/product/876)
