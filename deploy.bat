@echo off
chcp 65001 >nul
echo ========================================
echo   MDtoWord 快速部署脚本
echo ========================================
echo.

REM 检查是否已登录 CloudBase
echo [1/5] 检查 CloudBase 登录状态...
cloudbase env:list >nul 2>&1
if %errorlevel% neq 0 (
    echo 未登录 CloudBase，正在打开登录页面...
    cloudbase login
) else (
    echo ✓ 已登录 CloudBase
)

echo.
echo [2/5] 安装项目依赖...
call npm install
if %errorlevel% neq 0 (
    echo ✗ 依赖安装失败
    pause
    exit /b 1
)

echo.
echo [3/5] 构建生产版本...
call npm run build
if %errorlevel% neq 0 (
    echo ✗ 构建失败
    pause
    exit /b 1
)

echo.
echo [4/5] 部署云函数...
echo 提示：首次部署需要手动在腾讯云控制台创建数据库集合
cloudbase functions:deploy
if %errorlevel% neq 0 (
    echo ✗ 云函数部署失败
    echo 请检查：1. 环境ID是否正确 2. 是否有足够权限
    pause
    exit /b 1
)

echo.
echo [5/5] 部署静态网站...
cloudbase hosting:deploy dist
if %errorlevel% neq 0 (
    echo ✗ 网站部署失败
    pause
    exit /b 1
)

echo.
echo ========================================
echo   ✓ 部署成功！
echo ========================================
echo.
echo 后续步骤：
echo 1. 访问腾讯云控制台：https://console.cloud.tencent.com/tcb
echo 2. 手动创建数据库集合（参考 DEPLOY_GUIDE.md）
echo 3. 配置云函数环境变量
echo 4. （可选）配置微信/支付宝支付
echo.
echo 完整部署指南：DEPLOY_GUIDE.md
echo.
pause
