-- 族谱备份表
CREATE TABLE IF NOT EXISTS genealogy_backups (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  backup_name TEXT NOT NULL,
  data JSONB NOT NULL,
  backup_size INTEGER,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 启用 RLS
ALTER TABLE genealogy_backups ENABLE ROW LEVEL SECURITY;

-- 允许所有人读取备份（因为族谱数据本身就是公开的）
CREATE POLICY "允许所有人读取备份" ON genealogy_backups
  FOR SELECT USING (true);

-- 只允许管理员插入/更新/删除备份
CREATE POLICY "只允许管理员操作备份" ON genealogy_backups
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM user_roles 
      WHERE user_roles.user_id = auth.uid() 
      AND user_roles.role IN ('admin', 'editor')
    )
  );

-- 创建索引
CREATE INDEX IF NOT EXISTS idx_genealogy_backups_created_at ON genealogy_backups(created_at DESC);

-- 创建清理旧备份的函数（保留最近10个）
CREATE OR REPLACE FUNCTION cleanup_old_backups()
RETURNS TRIGGER AS $$
BEGIN
  DELETE FROM genealogy_backups
  WHERE id NOT IN (
    SELECT id FROM genealogy_backups
    ORDER BY created_at DESC
    LIMIT 10
  );
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- 创建触发器，在插入新备份时自动清理旧备份
DROP TRIGGER IF EXISTS trigger_cleanup_backups ON genealogy_backups;
CREATE TRIGGER trigger_cleanup_backups
AFTER INSERT ON genealogy_backups
EXECUTE FUNCTION cleanup_old_backups();
