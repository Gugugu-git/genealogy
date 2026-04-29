-- ============================================
-- Supabase Realtime 配置
-- 用于多人实时同步编辑
-- ============================================

-- 1. 启用 Realtime 扩展
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- 2. 为 genealogy_data 表启用 Realtime
ALTER PUBLICATION supabase_realtime ADD TABLE genealogy_data;

-- 3. 添加 updated_at 字段（如果不存在）
DO $$ 
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'genealogy_data' AND column_name = 'updated_at'
  ) THEN
    ALTER TABLE genealogy_data ADD COLUMN updated_at TIMESTAMPTZ DEFAULT NOW();
  END IF;
END $$;

-- 4. 创建更新时间戳的触发器函数
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- 5. 创建触发器（如果不存在）
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_trigger WHERE tgname = 'update_genealogy_data_updated_at'
  ) THEN
    CREATE TRIGGER update_genealogy_data_updated_at
    BEFORE UPDATE ON genealogy_data
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();
  END IF;
END $$;

-- 6. 确保表有正确的结构
ALTER TABLE genealogy_data ADD COLUMN IF NOT EXISTS updated_by VARCHAR(100) DEFAULT '系统';

-- 7. 验证 Realtime 是否启用
SELECT * FROM pg_publication_tables WHERE pubname = 'supabase_realtime';
