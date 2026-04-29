-- 创建独立的修改日志表
-- 这个表与主数据分离，防止主数据更新时日志被覆盖

CREATE TABLE IF NOT EXISTS change_logs (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  log_id TEXT UNIQUE NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  time TEXT NOT NULL,
  type TEXT DEFAULT 'edit',
  module TEXT DEFAULT '系统',
  content TEXT DEFAULT '',
  editor TEXT DEFAULT '当前用户',
  details JSONB,
  browser TEXT,
  user_agent TEXT
);

-- 创建索引以提高查询性能
CREATE INDEX IF NOT EXISTS idx_change_logs_created_at ON change_logs(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_change_logs_type ON change_logs(type);
CREATE INDEX IF NOT EXISTS idx_change_logs_module ON change_logs(module);

-- 设置RLS策略
ALTER TABLE change_logs ENABLE ROW LEVEL SECURITY;

-- 允许所有人读取日志
CREATE POLICY "允许所有人读取日志" ON change_logs
  FOR SELECT
  USING (true);

-- 允许所有人写入日志
CREATE POLICY "允许所有人写入日志" ON change_logs
  FOR INSERT
  WITH CHECK (true);

-- 允许所有人更新日志
CREATE POLICY "允许所有人更新日志" ON change_logs
  FOR UPDATE
  USING (true);

-- 允许所有人删除日志
CREATE POLICY "允许所有人删除日志" ON change_logs
  FOR DELETE
  USING (true);

-- 添加注释
COMMENT ON TABLE change_logs IS '修改日志表 - 独立于主数据存储，防止日志丢失';
COMMENT ON COLUMN change_logs.log_id IS '日志唯一标识符';
COMMENT ON COLUMN change_logs.time IS '操作时间（本地时间字符串）';
COMMENT ON COLUMN change_logs.type IS '操作类型：edit, add, delete等';
COMMENT ON COLUMN change_logs.module IS '操作模块：世系管理、谱序后跋等';
COMMENT ON COLUMN change_logs.content IS '操作内容描述';
COMMENT ON COLUMN change_logs.editor IS '操作者身份';
COMMENT ON COLUMN change_logs.details IS '操作详细信息（JSON格式）';
COMMENT ON COLUMN change_logs.browser IS '浏览器类型';
COMMENT ON COLUMN change_logs.user_agent IS '完整User Agent字符串';
