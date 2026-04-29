-- 修复 user_roles 表的 RLS 策略无限递归问题

-- 1. 先删除所有现有策略
DROP POLICY IF EXISTS "用户可查看自己的角色" ON user_roles;
DROP POLICY IF EXISTS "管理员可查看所有角色" ON user_roles;
DROP POLICY IF EXISTS "允许插入角色记录" ON user_roles;
DROP POLICY IF EXISTS "管理员可更新角色" ON user_roles;
DROP POLICY IF EXISTS "管理员可删除角色" ON user_roles;

-- 2. 创建新的无递归策略
-- 策略1：允许任何人查看角色（只读，无递归）
CREATE POLICY "允许查看角色" ON user_roles FOR SELECT USING (true);

-- 策略2：允许插入角色记录
CREATE POLICY "允许插入角色" ON user_roles FOR INSERT WITH CHECK (true);

-- 策略3：只有管理员可以更新
CREATE POLICY "管理员可更新角色" ON user_roles FOR UPDATE USING (
  EXISTS (
    SELECT 1 FROM user_roles ur 
    WHERE ur.user_id = auth.uid() 
    AND ur.role = 'admin'
  )
);

-- 策略4：只有管理员可以删除
CREATE POLICY "管理员可删除角色" ON user_roles FOR DELETE USING (
  EXISTS (
    SELECT 1 FROM user_roles ur 
    WHERE ur.user_id = auth.uid() 
    AND ur.role = 'admin'
  )
);

-- 3. 验证策略
SELECT policyname, permissive, roles, cmd, qual, with_check
FROM pg_policies
WHERE tablename = 'user_roles';
