# Vercel 部署步骤

## ✅ 已完成的准备工作

1. ✅ 修改数据存储为localStorage（Web版本适配）
2. ✅ 修改vite.config.js配置
3. ✅ 构建生产版本（dist文件夹）
4. ✅ 复制JSON数据文件到dist文件夹
5. ✅ 安装Vercel CLI

---

## 🚀 开始部署

### 方法一：命令行部署（推荐）

#### 步骤1：登录Vercel
在项目目录下打开终端，运行：
```bash
vercel login
```

按提示选择登录方式：
- 输入邮箱地址
- 或选择 GitHub / GitLab / Bitbucket 登录

#### 步骤2：部署项目
登录成功后，运行：
```bash
vercel --prod
```

按提示操作：
1. **Set up and deploy?** → 输入 `Y`
2. **Which scope?** → 选择你的账户
3. **Link to existing project?** → 输入 `N`（首次部署）
4. **Project name?** → 输入项目名（如：`luxian-hu-genealogy`）或按回车使用默认
5. **In which directory is your code located?** → 输入 `dist`
6. **Want to override the settings?** → 输入 `N`

#### 步骤3：获取访问地址
部署完成后，终端会显示：
```
✔ Production: https://你的项目名.vercel.app
```

点击链接即可访问！

---

### 方法二：网页端部署（更简单）

#### 步骤1：推送代码到GitHub
如果还没有GitHub仓库，先创建并推送：
```bash
git init
git add .
git commit -m "Initial commit"
git remote add origin https://github.com/你的用户名/你的仓库名.git
git push -u origin main
```

#### 步骤2：导入到Vercel
1. 访问 [vercel.com](https://vercel.com)
2. 点击 **"Add New Project"**
3. 选择 **"Import Git Repository"**
4. 选择你的GitHub仓库
5. 配置项目：
   - **Framework Preset**: Vite
   - **Build Command**: `npm run build`
   - **Output Directory**: `dist`
   - **Install Command**: `npm install`
6. 点击 **"Deploy"**

#### 步骤3：等待部署完成
Vercel会自动构建和部署，完成后显示访问地址。

---

## 📝 重要提示

### 数据存储说明
Web版本使用 **localStorage** 存储数据：
- ✅ 数据存储在用户浏览器本地
- ✅ 每个用户有独立的数据副本
- ⚠️ 清除浏览器数据会丢失数据
- 💡 建议定期使用"数据管理"模块的导出功能备份

### 首次访问
首次打开网站时：
1. 系统会自动从JSON文件加载初始数据
2. 数据保存到localStorage
3. 之后所有修改都保存在localStorage中

### 数据同步
不同设备间的数据不自动同步，需要：
1. 在"数据管理"模块导出数据
2. 在另一台设备导入数据

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

---

## 🔧 常见问题

### Q: 部署后页面空白？
A: 检查浏览器控制台错误，可能是路径配置问题。

### Q: 数据无法保存？
A: 确认localStorage未被禁用，检查浏览器隐私设置。

### Q: 如何更新网站？
A: 修改代码后重新运行 `vercel --prod` 即可。

### Q: 如何绑定自定义域名？
A: 在Vercel项目设置中添加域名，按提示配置DNS。

---

## 📞 需要帮助？

如果遇到问题，可以：
1. 查看Vercel官方文档：https://vercel.com/docs
2. 检查浏览器控制台错误信息
3. 确认dist文件夹包含所有必要文件

---

## 🎉 部署成功后

恭喜！您的族谱管理系统已成功部署到互联网！

现在可以：
- 分享链接给家族成员
- 随时随地访问族谱
- 在线编辑和更新数据

祝使用愉快！ 🎊
