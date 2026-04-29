# 泸县大堰胡氏宗谱信息管理系统

一个基于 React + Supabase 的族谱管理Web应用，支持云端数据存储、多人协作编辑和实时同步。

🌐 **在线访问**: https://www.luxianhu.top

## 功能特性

### 核心功能
- **族谱总览**：展示宗谱完整目录
- **世系展示**：树形结构 + 文字列表双模式
- **字辈查询**：42字字辈诗及对应人物
- **凡例规则**：7条族谱编纂规则
- **谱序后跋**：谱序和后跋展示

### 协作功能
- **GitHub 登录**：使用 GitHub 账号登录，安全便捷
- **多人协作**：支持多人同时在线编辑
- **实时同步**：数据修改实时同步给所有在线用户
- **修改日志**：自动记录所有数据变更历史
- **开发者管理**：管理员可添加团队成员并分配权限

### 数据管理
- **云端存储**：数据安全存储在 Supabase 云端
- **本地备份**：支持导出 JSON 备份文件
- **数据导入**：支持从 JSON 文件导入数据
- **权限控制**：基于角色的访问控制（管理员/编辑者/访客）

## 技术栈

- **React 18** - 前端UI框架
- **Vite 5** - 构建工具
- **React Router 6** - 路由管理
- **Supabase** - 云端数据库、用户认证、实时订阅
- **GitHub OAuth** - 第三方登录

## 快速开始

### 环境要求
- Node.js 18+
- npm 或 yarn

### 安装依赖
```bash
npm install
```

### 配置环境变量
创建 `.env` 文件：
```env
# Supabase 配置
VITE_SUPABASE_URL=your-supabase-url
VITE_SUPABASE_ANON_KEY=your-supabase-anon-key

# 管理员密钥（用于密钥登录）
VITE_ADMIN_KEY=your-secure-admin-key

# GitHub OAuth 配置（可选）
VITE_GITHUB_CLIENT_ID=your-github-client-id
```

### 开发模式
```bash
npm run dev
```

### 构建生产版本
```bash
npm run build
```

## 项目结构

```
├── src/
│   ├── components/       # React组件
│   │   ├── AdminKeyInput.jsx    # 登录验证
│   │   ├── DeveloperManager.jsx # 开发者管理
│   │   ├── Genealogy.jsx        # 世系展示
│   │   ├── DataManagement.jsx   # 数据管理
│   │   └── GuideModal.jsx       # 操作指引
│   ├── lib/
│   │   ├── supabase.js   # Supabase配置
│   │   ├── authService.js # 认证服务
│   │   └── syncService.js # 实时同步服务
│   ├── App.jsx           # 主应用
│   └── App.css           # 样式
├── supabase/
│   ├── auth_setup.sql    # 权限系统SQL
│   └── fix_rls_policy.sql # RLS策略修复
├── public/               # 静态资源
└── package.json
```

## 权限系统

### 角色说明

| 角色 | 权限 | 获取方式 |
|------|------|---------|
| 👑 **管理员** | 增删改数据、管理开发者权限 | GitHub 登录 + 数据库配置 |
| ✏️ **编辑者** | 增删改数据 | GitHub 登录 或 密钥登录 |
| 👁️ **访客** | 仅查看数据 | 无需登录 |

### 配置管理员

在 Supabase SQL Editor 中执行：
```sql
INSERT INTO user_roles (github_username, role) VALUES ('你的GitHub用户名', 'admin');
```

## 部署

项目已部署到 Vercel，推送代码后自动部署。

### 生产环境配置

1. **Vercel 环境变量**：
   - `VITE_SUPABASE_URL`
   - `VITE_SUPABASE_ANON_KEY`
   - `VITE_ADMIN_KEY`
   - `VITE_GITHUB_CLIENT_ID`

2. **Supabase 配置**：
   - 执行 `supabase/auth_setup.sql` 创建权限表
   - 配置 GitHub Provider
   - 设置 Redirect URLs

3. **GitHub OAuth App**：
   - Homepage URL: `https://www.luxianhu.top`
   - Authorization callback URL: `https://your-project.supabase.co/auth/v1/callback`

## 数据库架构

### 核心表
- **families** - 家庭信息
- **persons** - 人物信息
- **parent_child_relations** - 父子关系
- **spouses** - 配偶关系
- **user_roles** - 用户角色权限
- **change_logs** - 修改日志

## 许可证

本项目仅供泸县大堰胡氏家族内部使用。

---

**愿宗风不坠，家道永昌！**
