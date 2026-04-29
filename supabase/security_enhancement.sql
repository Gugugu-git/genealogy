-- ============================================
-- 安全增强脚本
-- 1. 增加 genealogy_data 表的 RLS 策略，限制编辑操作
-- 2. 创建管理员会话验证函数
-- ============================================

-- ============================================
-- 1. 创建管理员会话验证函数
-- ============================================
CREATE OR REPLACE FUNCTION is_admin_session()
RETURNS BOOLEAN AS $$
DECLARE
  user_role VARCHAR;
BEGIN
  -- 检查 GitHub OAuth 登录的用户角色
  SELECT role INTO user_role FROM user_roles WHERE user_id = auth.uid();
  IF user_role IN ('admin', 'editor') THEN
    RETURN TRUE;
  END IF;

  -- 注意：密钥登录的用户无法通过此函数验证，因为他们没有 auth.uid()
  -- 密钥登录的用户需要通过其他方式验证（如 Edge Function 签发临时 token）
  RETURN FALSE;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ============================================
-- 2. 更新 genealogy_data 表的 RLS 策略
-- ============================================

-- 删除旧的宽松策略
DROP POLICY IF EXISTS "允许所有人读取 genealogy_data" ON genealogy_data;
DROP POLICY IF EXISTS "允许所有人写入 genealogy_data" ON genealogy_data;
DROP POLICY IF EXISTS "允许所有人更新 genealogy_data" ON genealogy_data;
DROP POLICY IF EXISTS "允许所有人删除 genealogy_data" ON genealogy_data;

-- 创建新的安全策略
-- 读取：允许所有人
CREATE POLICY "允许所有人读取 genealogy_data" ON genealogy_data
  FOR SELECT USING (true);

-- 插入：仅允许管理员/编辑者
CREATE POLICY "编辑者可插入 genealogy_data" ON genealogy_data
  FOR INSERT WITH CHECK (is_admin_session());

-- 更新：仅允许管理员/编辑者
CREATE POLICY "编辑者可更新 genealogy_data" ON genealogy_data
  FOR UPDATE USING (is_admin_session());

-- 删除：仅允许管理员
CREATE POLICY "管理员可删除 genealogy_data" ON genealogy_data
  FOR DELETE USING (
    EXISTS (SELECT 1 FROM user_roles WHERE user_id = auth.uid() AND role = 'admin')
  );

-- ============================================
-- 3. 更新 change_logs 表的策略（保持开放，因为日志需要记录所有操作）
-- ============================================
-- change_logs 保持原有策略，允许所有人写入以便记录操作

-- ============================================
-- 4. 创建用于密钥登录用户的临时验证表
-- ============================================
CREATE TABLE IF NOT EXISTS admin_sessions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  session_token TEXT UNIQUE NOT NULL,
  role VARCHAR(20) NOT NULL DEFAULT 'editor' CHECK (role IN ('admin', 'editor')),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  expires_at TIMESTAMPTZ DEFAULT (NOW() + INTERVAL '24 hours')
);

CREATE INDEX IF NOT EXISTS idx_admin_sessions_token ON admin_sessions(session_token);
CREATE INDEX IF NOT EXISTS idx_admin_sessions_expires ON admin_sessions(expires_at);

-- RLS 策略
ALTER TABLE admin_sessions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "允许插入 admin_sessions" ON admin_sessions FOR INSERT WITH CHECK (true);
CREATE POLICY "允许查看 admin_sessions" ON admin_sessions FOR SELECT USING (true);

-- 清理过期会话的函数
CREATE OR REPLACE FUNCTION cleanup_expired_sessions()
RETURNS void AS $$
BEGIN
  DELETE FROM admin_sessions WHERE expires_at < NOW();
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ============================================
-- 5. 创建验证 admin_session token 的函数
-- ============================================
CREATE OR REPLACE FUNCTION verify_admin_token(token TEXT)
RETURNS BOOLEAN AS $$
DECLARE
  valid BOOLEAN;
BEGIN
  PERFORM cleanup_expired_sessions();

  SELECT EXISTS(
    SELECT 1 FROM admin_sessions
    WHERE session_token = token AND expires_at > NOW()
  ) INTO valid;

  RETURN valid;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ============================================
-- 6. 更新 genealogy_data 策略，支持 admin_session token
-- ============================================
DROP POLICY IF EXISTS "编辑者可插入 genealogy_data" ON genealogy_data;
DROP POLICY IF EXISTS "编辑者可更新 genealogy_data" ON genealogy_data;

CREATE POLICY "编辑者可插入 genealogy_data" ON genealogy_data
  FOR INSERT WITH CHECK (
    is_admin_session() OR
    verify_admin_token(current_setting('request.headers.x-admin-token', true))
  );

CREATE POLICY "编辑者可更新 genealogy_data" ON genealogy_data
  FOR UPDATE USING (
    is_admin_session() OR
    verify_admin_token(current_setting('request.headers.x-admin-token', true))
  );
