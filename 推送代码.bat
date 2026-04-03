@echo off
chcp 65001 >nul
echo ========================================
echo    Git 配置和推送脚本
echo ========================================
echo.

REM 步骤1：配置Git用户信息
echo [步骤1] 配置Git用户信息
echo.
set /p user_email="请输入您的邮箱地址: "
set /p user_name="请输入您的用户名: "

git config --global user.email "%user_email%"
git config --global user.name "%user_name%"
echo ✅ Git用户信息配置完成
echo.

REM 步骤2：添加文件
echo [步骤2] 添加文件到Git
git add .
echo ✅ 文件添加完成
echo.

REM 步骤3：提交
echo [步骤3] 提交代码
git commit -m "Initial commit: 泸县大堰胡氏宗谱管理系统"
echo ✅ 代码提交完成
echo.

REM 步骤4：重命名分支
echo [步骤4] 设置分支为main
git branch -M main
echo ✅ 分支设置完成
echo.

REM 步骤5：推送
echo [步骤5] 推送到GitHub
echo 仓库地址: https://github.com/Gugugu-git/genealogy.git
git push -u origin main
if %errorlevel% equ 0 (
    echo.
    echo ========================================
    echo    🎉 推送成功！
    echo ========================================
    echo.
    echo 访问您的仓库:
    echo https://github.com/Gugugu-git/genealogy
    echo.
    echo 下一步: 部署到Vercel
    echo 1. 访问 https://vercel.com
    echo 2. 导入GitHub仓库
    echo 3. 自动部署完成
    echo.
) else (
    echo.
    echo ❌ 推送失败，请检查网络连接或仓库权限
    echo.
)

pause
