@echo off
chcp 65001 >nul
echo ========================================
echo    泸县大堰胡氏宗谱管理系统
echo ========================================
echo.
echo [1/3] 检查Node.js...
node --version >nul 2>&1
if %errorlevel% neq 0 (
    echo ❌ 错误：未找到Node.js，请先安装Node.js！
    pause
    exit /b 1
)
echo ✅ Node.js已安装
echo.
echo [2/3] 检查依赖...
if not exist "node_modules" (
    echo ⚠️  首次运行，正在安装依赖...
    call npm install
    if %errorlevel% neq 0 (
        echo ❌ 依赖安装失败！
        pause
        exit /b 1
    )
    echo ✅ 依赖安装完成
) else (
    echo ✅ 依赖已存在
)
echo.
echo [3/3] 启动开发服务器...
echo.
echo ========================================
echo    启动成功！
echo    请在浏览器中打开：
echo    http://localhost:5173/
echo ========================================
echo.
echo 按 Ctrl+C 可停止服务器
echo.
call npm run dev
pause
