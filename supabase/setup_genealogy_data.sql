-- ============================================
-- 创建 genealogy_data 表并启用 Realtime
-- ============================================

-- 1. 检查并创建 genealogy_data 表
CREATE TABLE IF NOT EXISTS genealogy_data (
  id INTEGER PRIMARY KEY DEFAULT 1,
  data JSONB NOT NULL,
  updated_by VARCHAR(100) DEFAULT '系统',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 2. 插入默认数据（如果表为空）
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM genealogy_data WHERE id = 1) THEN
    INSERT INTO genealogy_data (id, data, updated_by)
    VALUES (1, '{}'::jsonb, '系统初始化');
    RAISE NOTICE '已创建默认记录';
  ELSE
    RAISE NOTICE '数据已存在';
  END IF;
END $$;

-- 3. 添加 Realtime 支持
ALTER PUBLICATION supabase_realtime ADD TABLE genealogy_data;

-- 4. 创建更新触发器
CREATE OR REPLACE FUNCTION update_genealogy_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trigger_update_genealogy_updated_at ON genealogy_data;

CREATE TRIGGER trigger_update_genealogy_updated_at
BEFORE UPDATE ON genealogy_data
FOR EACH ROW EXECUTE FUNCTION update_genealogy_updated_at();

-- 5. 验证结果
SELECT 
  table_name,
  CASE WHEN table_name IN (
    SELECT tablename FROM pg_publication_tables WHERE pubname = 'supabase_realtime'
  ) THEN '✅ 已启用 Realtime' ELSE '❌ 未启用' END as realtime_status
FROM information_schema.tables 
WHERE table_name = 'genealogy_data'
AND table_schema = 'public';

-- 6. 显示当前 Realtime 配置
SELECT * FROM pg_publication_tables WHERE pubname = 'supabase_realtime';
