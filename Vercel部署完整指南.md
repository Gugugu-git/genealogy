# Vercel 部署完整指南（纯Web版本）

## ✅ 项目已优化

项目已成功转换为纯 Web 应用，完全兼容 Vercel 部署！

### 已完成的优化：
1. ✅ 移除所有 Electron 相关依赖
2. ✅ 路由改为 BrowserRouter（适配 Vercel）
3. ✅ 创建 vercel.json 配置文件
4. ✅ 数据存储改为 localStorage
5. ✅ 构建测试成功

---

## 🚀 Vercel 部署步骤

### 方法一：GitHub 自动部署（推荐）

#### 步骤1：推送代码到GitHub

```bash
# 1. 配置Git用户信息
git config --global user.email "your-email@example.com"
git config --global user.name "Your Name"

# 2. 添加文件
git add .

# 3. 提交
git commit -m "转换为纯Web应用，支持Vercel部署"

# 4. 设置分支
git branch -M main

# 5. 推送到GitHub
git push -u origin main
```

#### 步骤2：在Vercel导入项目

1. 访问 [vercel.com](https://vercel.com)
2. 点击 **"Add New Project"**
3. 选择 **"Import Git Repository"**
4. 选择您的GitHub仓库：`Gugugu-git/genealogy`
5. Vercel会自动检测到Vite项目

#### 步骤3：配置项目（自动检测）

Vercel会自动检测到以下配置：
- ✅ **Framework Preset**: Vite
- ✅ **Build Command**: `npm run build`
- ✅ **Output Directory**: `dist`
- ✅ **Install Command**: `npm install`

#### 步骤4：部署

点击 **"Deploy"** 按钮，等待2-3分钟，部署完成！

---

### 方法二：命令行部署

```bash
# 1. 安装Vercel CLI（如果还没安装）
npm install -g vercel

# 2. 登录Vercel
vercel login

# 3. 部署
vercel --prod
```

---

## 📝 重要说明

### 数据存储方式

Web版本使用 **localStorage** 存储数据：

**优点：**
- ✅ 无需后端服务器
- ✅ 数据完全本地化
- ✅ 支持离线使用
- ✅ 部署简单

**注意事项：**
- ⚠️ 数据存储在用户浏览器中
- ⚠️ 清除浏览器数据会丢失数据
- ⚠️ 不同设备数据不自动同步
- 💡 建议定期使用"数据管理"模块导出备份

### 首次访问

首次打开网站时：
1. 系统自动从 JSON 文件加载初始数据
2. 数据保存到 localStorage
3. 之后所有修改都保存在 localStorage 中

---

## 🎯 部署后检查清单

访问网站后，检查以下功能：

- [ ] 页面正常加载
- [ ] 族谱总览显示正确
- [ ] 世系展示功能正常
- [ ] 字辈查询功能正常
- [ ] 凡例规则显示正确
- [ ] 谱序后跋可编辑
- [ ] 数据管理功能正常
- [ ] 数据可以保存和修改
- [ ] 刷新页面数据不丢失

---

## 🔧 常见问题

### Q: 部署失败怎么办？

**A:** 检查以下几点：
1. 确认 package.json 中没有 electron 依赖
2. 确认 vercel.json 文件存在
3. 查看Vercel部署日志错误信息

### Q: 页面刷新后404？

**A:** vercel.json 中的 rewrites 配置已处理此问题，确保配置文件存在。

### Q: 数据无法保存？

**A:** 
1. 检查浏览器是否禁用了 localStorage
2. 检查浏览器隐私设置
3. 尝试使用无痕模式测试

### Q: 如何更新网站？

**A:** 
```bash
# 修改代码后
git add .
git commit -m "更新内容"
git push
```
Vercel会自动重新部署！

---

## 🎉 部署成功后

恭喜！您的族谱管理系统已成功部署到互联网！

### 现在可以：
- ✅ 分享链接给家族成员
- ✅ 随时随地访问族谱
- ✅ 在线编辑和更新数据
- ✅ 多人独立使用（各自数据独立）

### 下一步：
1. 测试所有功能是否正常
2. 分享链接给家族成员
3. 教导家族成员如何使用
4. 定期备份数据

---

## 📞 技术支持

如有问题：
1. 查看 Vercel 部署日志
2. 检查浏览器控制台错误
3. 确认所有配置文件正确

---

## 🎊 项目文件说明

```
test_2/
├── src/                    # 源代码
│   ├── App.jsx            # 主应用（已移除Electron依赖）
│   ├── components/        # React组件
│   └── main.jsx           # 入口文件
├── public/                # 静态资源
├── dist/                  # 构建输出
├── package.json           # 项目配置（纯Web应用）
├── vite.config.js         # Vite配置
├── vercel.json            # Vercel配置（重要！）
└── 泸县大堰胡氏宗谱数据.json  # 数据文件
```

---

祝部署顺利！🎊
