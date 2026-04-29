-- ============================================
-- GitHub 开发者权限系统
-- ============================================

-- 1. 创建用户角色表
CREATE TABLE IF NOT EXISTS user_roles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  github_username VARCHAR(100) NOT NULL,
  role VARCHAR(20) NOT NULL DEFAULT 'viewer' CHECK (role IN ('admin', 'editor', 'viewer')),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(github_username)
);

-- 2. 创建索引
CREATE INDEX IF NOT EXISTS idx_user_roles_user_id ON user_roles(user_id);
CREATE INDEX IF NOT EXISTS idx_user_roles_github_username ON user_roles(github_username);

-- 3. 启用 RLS
ALTER TABLE user_roles ENABLE ROW LEVEL SECURITY;

-- 4. RLS 策略
CREATE POLICY "用户可查看自己的角色" ON user_roles FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "管理员可查看所有角色" ON user_roles FOR SELECT USING (
  EXISTS (SELECT 1 FROM user_roles WHERE user_id = auth.uid() AND role = 'admin')
);

-- 5. 添加初始管理员（需要替换为实际的 GitHub 用户名）
-- 使用方法: 将 'your-github-username' 替换为您的 GitHub 用户名
-- INSERT INTO user_roles (github_username, role) VALUES ('your-github-username', 'admin');

-- 5.1 创建管理员插入策略（允许匿名插入第一个管理员）
CREATE POLICY "允许插入角色记录" ON user_roles FOR INSERT WITH CHECK (true);

-- 5.2 创建更新策略
CREATE POLICY "管理员可更新角色" ON user_roles FOR UPDATE USING (
  EXISTS (SELECT 1 FROM user_roles WHERE user_id = auth.uid() AND role = 'admin')
);

-- 6. 创建获取用户角色的函数
CREATE OR REPLACE FUNCTION get_user_role(github_username TEXT)
RETURNS VARCHAR AS $$
DECLARE
  user_role VARCHAR;
BEGIN
  SELECT role INTO user_role FROM user_roles WHERE user_roles.github_username = get_user_role.github_username;
  RETURN COALESCE(user_role, 'viewer');
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 7. 创建检查权限的函数
CREATE OR REPLACE FUNCTION has_permission(required_role TEXT)
RETURNS BOOLEAN AS $$
DECLARE
  user_role VARCHAR;
BEGIN
  SELECT role INTO user_role FROM user_roles WHERE user_id = auth.uid();
  
  IF user_role IS NULL THEN
    RETURN FALSE;
  END IF;
  
  IF required_role = 'admin' THEN
    RETURN user_role = 'admin';
  ELSIF required_role = 'editor' THEN
    RETURN user_role IN ('admin', 'editor');
  ELSE
    RETURN TRUE;
  END IF;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 8. 为现有表添加权限检查触发器
CREATE OR REPLACE FUNCTION check_delete_permission()
RETURNS TRIGGER AS $$
BEGIN
  IF NOT has_permission('admin') THEN
    RAISE EXCEPTION '需要管理员权限才能删除数据';
  END IF;
  RETURN OLD;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 9. 更新 families 表的删除策略
DROP POLICY IF EXISTS "允许所有人删除 families" ON families;
CREATE POLICY "管理员可删除 families" ON families FOR DELETE USING (has_permission('admin'));

DROP POLICY IF EXISTS "允许所有人删除 persons" ON persons;
CREATE POLICY "管理员可删除 persons" ON persons FOR DELETE USING (has_permission('admin'));

DROP POLICY IF EXISTS "允许所有人删除 parent_child_relations" ON parent_child_relations;
CREATE POLICY "管理员可删除 parent_child_relations" ON parent_child_relations FOR DELETE USING (has_permission('admin'));

DROP POLICY IF EXISTS "允许所有人删除 spouses" ON spouses;
CREATE POLICY "管理员可删除 spouses" ON spouses FOR DELETE USING (has_permission('admin'));

-- 10. 更新写入策略
DROP POLICY IF EXISTS "允许所有人写入 families" ON families;
CREATE POLICY "编辑者可写入 families" ON families FOR INSERT WITH CHECK (has_permission('editor'));

DROP POLICY IF EXISTS "允许所有人写入 persons" ON persons;
CREATE POLICY "编辑者可写入 persons" ON persons FOR INSERT WITH CHECK (has_permission('editor'));

-- 11. 更新更新策略
DROP POLICY IF EXISTS "允许所有人更新 families" ON families;
CREATE POLICY "编辑者可更新 families" ON families FOR UPDATE USING (has_permission('editor'));

DROP POLICY IF EXISTS "允许所有人更新 persons" ON persons;
CREATE POLICY "编辑者可更新 persons" ON persons FOR UPDATE USING (has_permission('editor'));
