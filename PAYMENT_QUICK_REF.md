# 支付配置快速参考表

## 📍 哪里获取ID？

### 微信支付

| 配置项 | 获取位置 | 链接 | 示例 |
|--------|---------|------|------|
| **商户号(MCH_ID)** | 微信商户平台 → 账户中心 → 商户信息 | https://pay.weixin.qq.com | `1234567890` |
| **AppID** | 公众号/小程序/开放平台 | https://mp.weixin.qq.com 或 https://open.weixin.qq.com | `wx1234567890abcdef` |
| **APIv3密钥** | 微信商户平台 → 账户中心 → API安全 → 设置APIv3密钥 | https://pay.weixin.qq.com | `a1b2c3d4e5f6g7h8i9j0k1l2m3n4o5p6` |
| **证书序列号** | 微信商户平台 → 账户中心 → API安全 → 查看证书 | https://pay.weixin.qq.com | `1234567890ABCDEF1234567890ABCDEF12345678` |

### 支付宝

| 配置项 | 获取位置 | 链接 | 示例 |
|--------|---------|------|------|
| **AppID** | 支付宝开放平台 → 控制台 → 应用详情 | https://open.alipay.com | `2021001234567890` |
| **应用私钥** | 使用支付宝密钥生成工具生成 | https://opendocs.alipay.com/common/02kipl | `-----BEGIN RSA PRIVATE KEY-----` |
| **应用公钥** | 使用支付宝密钥生成工具生成 | https://opendocs.alipay.com/common/02kipl | `-----BEGIN PUBLIC KEY-----` |
| **支付宝公钥** | 上传应用公钥后，支付宝自动生成 | https://open.alipay.com | `-----BEGIN PUBLIC KEY-----` |
| **网关地址** | 固定值（沙箱：openapi.alipaydev.com） | https://open.alipay.com | `https://openapi.alipay.com/gateway.do` |

---

## 🎯 微信支付获取步骤

### 1. 注册商户号（需要营业执照）
```
https://pay.weixin.qq.com → 注册 → 提交资料 → 等待审核（1-3天）
```

### 2. 获取AppID（选择其中一种）
- 公众号：https://mp.weixin.qq.com → 开发 → 基本配置
- 小程序：https://mp.weixin.qq.com → 开发 → 开发设置
- 开放平台：https://open.weixin.qq.com → 网站应用

### 3. 设置APIv3密钥
```
微信商户平台 → 账户中心 → API安全 → 设置APIv3密钥 → 生成32位字符串
```

### 4. 下载证书
```
微信商户平台 → 账户中心 → API安全 → 申请商户API证书 → 下载.p12文件
```

### 5. 获取证书序列号
```
微信商户平台 → 账户中心 → API安全 → 查看证书 → 复制证书序列号
```

### 6. 关联AppID
```
微信商户平台 → 产品中心 → 网页/APP支付 → 关联AppID
```

---

## 🎯 支付宝获取步骤

### 1. 注册开放平台
```
https://open.alipay.com → 注册 → 企业认证
```

### 2. 创建应用
```
控制台 → 网页&移动应用 → 创建应用 → 填写信息
```

### 3. 获取AppID
```
应用详情页面 → AppID → 复制
```

### 4. 生成密钥对
```
应用详情 → 开发信息 → 加签方式 → 设置 → 下载密钥生成工具 → 生成密钥
```

### 5. 上传应用公钥
```
加签方式设置 → 粘贴应用公钥 → 保存
```

### 6. 获取支付宝公钥
```
保存后自动显示支付宝公钥 → 复制保存
```

### 7. 开通支付产品
```
产品绑定 → 添加产品 → 选择支付类型 → 签约
```

---

## ⚙️ 配置到项目

### 前端 .env 文件
```env
# 腾讯云环境ID
VITE_TCB_ENV_ID=mdtoword-8g8xxxxx

# 微信支付
VITE_WECHAT_APPID=wx1234567890abcdef

# 支付宝
VITE_ALIPAY_APPID=2021001234567890
```

### 云函数 payment 环境变量

#### 微信支付
```
TCB_ENV_ID = mdtoword-8g8xxxxx
WECHAT_APPID = wx1234567890abcdef
WECHAT_MCH_ID = 1234567890
WECHAT_API_V3_KEY = a1b2c3d4e5f6g7h8i9j0k1l2m3n4o5p6
WECHAT_CERT_SERIAL_NO = 1234567890ABCDEF1234567890ABCDEF12345678
```

#### 支付宝
```
TCB_ENV_ID = mdtoword-8g8xxxxx
ALIPAY_APPID = 2021001234567890
ALIPAY_PRIVATE_KEY = -----BEGIN RSA PRIVATE KEY-----
（完整私钥内容）
-----END RSA PRIVATE KEY-----
ALIPAY_PUBLIC_KEY = -----BEGIN PUBLIC KEY-----
（支付宝公钥内容）
-----END PUBLIC KEY-----
ALIPAY_GATEWAY = https://openapi.alipay.com/gateway.do
```

---

## 🔑 生成APIv3密钥的命令

### Python
```bash
python3 -c "import secrets; print(secrets.token_hex(16))"
```

### Node.js
```bash
node -e "console.log(require('crypto').randomBytes(16).toString('hex'))"
```

### 在线工具
```
https://randomkeygen.com/
```

---

## 📦 上传微信支付证书

### 目录结构
```
cloudbase/functions/payment/
├── certs/
│   └── wechat_cert.p12
├── index.js
├── package.json
└── .env.example
```

### 上传步骤
```bash
# 1. 创建certs文件夹
mkdir cloudbase/functions/payment/certs

# 2. 复制证书文件
cp /path/to/cert.p12 cloudbase/functions/payment/certs/wechat_cert.p12

# 3. 重新部署云函数
cloudbase functions:deploy payment
```

---

## ⚠️ 注意事项

### 微信支付
- ❌ 个人无法注册商户号（需要营业执照）
- ✅ 需要企业银行账户
- ✅ 首次开通需要缴纳保证金
- ✅ 审核时间：1-3个工作日

### 支付宝
- ✅ 个人可以注册（有限制）
- ✅ 可以开通基础支付功能
- ⚠️ 部分功能需要企业认证
- ✅ 审核通常较快（几分钟到几小时）

---

## 🆘 常见问题

### Q: 我没有营业执照，能用微信支付吗？
**A**: 不能直接使用。建议：
1. 先用免费额度测试功能（新用户10次）
2. 使用支付宝（个人可以开通）
3. 找有营业执照的朋友/公司帮忙注册

### Q: 支付宝个人能开通哪些支付？
**A**: 个人可以开通：
- 手机网站支付
- 当面付
- 部分小程序支付

### Q: 密钥泄露了怎么办？
**A**:
1. 立即登录支付平台重置密钥
2. 重新配置到项目
3. 检查是否有异常交易
4. 加强账号安全

### Q: 支付测试失败怎么办？
**A**: 排查步骤：
1. 检查ID和密钥是否正确
2. 查看云函数日志（腾讯云控制台）
3. 检查回调地址是否可访问
4. 使用沙箱环境测试

---

## 📋 检查清单

配置前确认：

### 微信支付
- [ ] 已有营业执照
- [ ] 已注册微信商户号
- [ ] 已获取商户号(MCH_ID)
- [ ] 已获取AppID
- [ ] 已设置APIv3密钥
- [ ] 已下载证书文件
- [ ] 已获取证书序列号
- [ ] 已关联AppID和商户号
- [ ] 已开通支付产品
- [ ] 已配置到项目

### 支付宝
- [ ] 已注册开放平台账号
- [ ] 已创建应用
- [ ] 已获取AppID
- [ ] 已生成应用私钥
- [ ] 已生成应用公钥
- [ ] 已上传应用公钥到支付宝
- [ ] 已获取支付宝公钥
- [ ] 已开通支付产品
- [ ] 已配置回调地址
- [ ] 已配置到项目

---

## 📞 官方支持

### 微信支付
- 商户平台：https://pay.weixin.qq.com
- 文档中心：https://pay.weixin.qq.com/wiki/doc/apiv3/index.shtml
- 商户客服：95105966

### 支付宝
- 开放平台：https://open.alipay.com
- 文档中心：https://opendocs.alipay.com
- 技术支持：95188

### 腾讯云
- CloudBase：https://docs.cloudbase.net
- 控制台：https://console.cloud.tencent.com/tcb
- 工单支持：https://console.cloud.tencent.com/workorder

---

## 📚 相关文档

- **完整支付配置**：`PAYMENT_SETUP.md`
- **环境变量配置**：`ENV_CONFIG.md`
- **部署指南**：`DEPLOY_GUIDE.md`
- **配置步骤**：`CONFIG_STEPS.md`
