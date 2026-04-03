# Git 配置和推送指南

## 问题1：Git用户信息未配置

### 解决方法：
运行以下命令配置您的Git用户信息（请替换为您的真实信息）：

```bash
git config --global user.email "your-email@example.com"
git config --global user.name "Your Name"
```

**示例：**
```bash
git config --global user.email "gugugu@example.com"
git config --global user.name "Gugugu"
```

---

## 问题2：远程仓库已存在

远程仓库已经添加过了，这是正常的，可以继续下一步。

---

## 问题3：分支名称问题

### 检查当前分支：
```bash
git branch
```

### 如果显示 master 而不是 main：
需要重命名分支：
```bash
git branch -M main
```

---

## 完整推送流程

按顺序执行以下命令：

### 步骤1：配置用户信息
```bash
git config --global user.email "your-email@example.com"
git config --global user.name "Your Name"
```

### 步骤2：检查状态
```bash
git status
```

### 步骤3：添加所有文件
```bash
git add .
```

### 步骤4：提交
```bash
git commit -m "Initial commit"
```

### 步骤5：重命名分支为main（如果需要）
```bash
git branch -M main
```

### 步骤6：推送到GitHub
```bash
git push -u origin main
```

---

## 如果推送失败

### 方法1：强制推送（谨慎使用）
```bash
git push -u origin main --force
```

### 方法2：先拉取再推送
```bash
git pull origin main --allow-unrelated-histories
git push -u origin main
```

---

## 验证推送成功

访问您的GitHub仓库：
https://github.com/Gugugu-git/genealogy

应该能看到所有文件！

---

## 下一步：部署到Vercel

推送成功后：
1. 访问 https://vercel.com
2. 点击 "Add New Project"
3. 选择 "Import Git Repository"
4. 选择 Gugugu-git/genealogy 仓库
5. 配置：
   - Framework Preset: Vite
   - Build Command: npm run build
   - Output Directory: dist
6. 点击 "Deploy"

等待几分钟，部署完成后会获得访问地址！
