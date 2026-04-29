# 安全修复指南

## 1. 管理员密钥问题修复

### 方案 A: 使用 Supabase Auth（推荐）

1. 启用 Supabase 认证
2. 创建管理员用户表
3. 使用 JWT 验证权限

### 方案 B: 使用环境变量 + 后端验证

1. 将密钥移到 Supabase Edge Function
2. 前端调用 API 验证
3. 返回临时 token

### 方案 C: 简单改进（临时方案）

1. 将密钥存储在环境变量中
2. 增加验证失败次数限制
3. 添加验证过期时间

---

## 2. RLS 策略修复

### 当前问题
```sql
-- 当前策略：允许所有人做任何事
CREATE POLICY "允许所有人删除 families" ON families FOR DELETE USING (true);
```

### 推荐策略
```sql
-- 只允许认证用户写入
CREATE POLICY "认证用户可写入" ON families 
  FOR INSERT 
  WITH CHECK (auth.role() = 'authenticated');

-- 只允许数据所有者修改
CREATE POLICY "所有者可修改" ON families 
  FOR UPDATE 
  USING (auth.uid() = owner_id);

-- 管理员可删除
CREATE POLICY "管理员可删除" ON families 
  FOR DELETE 
  USING (auth.jwt() ->> 'role' = 'admin');
```

---

## 3. 输入验证增强

### 前端验证
- 姓名：限制长度和字符
- 世代：必须是正整数
- 日期：验证格式

### 后端验证
- 使用 Supabase 触发器验证
- 使用 CHECK 约束

---

## 4. 其他安全建议

1. **启用 HTTPS**: Vercel 已自动启用 ✅
2. **添加 CSP 头**: 防止 XSS 攻击
3. **添加速率限制**: 防止暴力破解
4. **日志审计**: 记录敏感操作
5. **数据备份**: 定期备份数据库
