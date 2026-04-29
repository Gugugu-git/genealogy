-- ============================================
-- 族谱数据库规范化迁移脚本
-- 版本: 2.0
-- 说明: 将原有的 JSON 存储方式转换为关系型数据库结构
-- ============================================

-- ============================================
-- 1. 宗谱表 (families)
-- 存储不同家族的宗谱基本信息
-- ============================================
CREATE TABLE IF NOT EXISTS families (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  title VARCHAR(255) NOT NULL,
  surname VARCHAR(50) NOT NULL,
  origin_place VARCHAR(255),
  founder_id UUID,
  description TEXT,
  version VARCHAR(20) DEFAULT '1.0',
  last_updated DATE DEFAULT CURRENT_DATE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

COMMENT ON TABLE families IS '宗谱基本信息表';
COMMENT ON COLUMN families.title IS '宗谱标题';
COMMENT ON COLUMN families.surname IS '姓氏';
COMMENT ON COLUMN families.founder_id IS '始迁祖ID';

-- ============================================
-- 2. 字辈表 (generation_chars)
-- 存储家族字辈诗和字辈字符
-- ============================================
CREATE TABLE IF NOT EXISTS generation_chars (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  family_id UUID NOT NULL REFERENCES families(id) ON DELETE CASCADE,
  poem TEXT,
  characters TEXT[] NOT NULL,
  note TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

COMMENT ON TABLE generation_chars IS '字辈表';
COMMENT ON COLUMN generation_chars.poem IS '字辈诗';
COMMENT ON COLUMN generation_chars.characters IS '字辈字符数组';

-- ============================================
-- 3. 人员表 (persons)
-- 核心实体表
-- ============================================
CREATE TABLE IF NOT EXISTS persons (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  family_id UUID NOT NULL REFERENCES families(id) ON DELETE CASCADE,
  
  name VARCHAR(100) NOT NULL,
  style_name VARCHAR(100),
  generation INT NOT NULL,
  gender VARCHAR(10) NOT NULL CHECK (gender IN ('male', 'female')),
  
  birth_date VARCHAR(255),
  birth_date_gregorian DATE,
  death_date VARCHAR(255),
  death_date_gregorian DATE,
  birthplace TEXT,
  burial_place VARCHAR(255),
  
  title VARCHAR(100),
  is_founder BOOLEAN DEFAULT FALSE,
  is_protected BOOLEAN DEFAULT TRUE,
  
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  
  CONSTRAINT unique_person_in_family UNIQUE (family_id, name, generation)
);

CREATE INDEX IF NOT EXISTS idx_persons_family ON persons(family_id);
CREATE INDEX IF NOT EXISTS idx_persons_generation ON persons(family_id, generation);
CREATE INDEX IF NOT EXISTS idx_persons_name ON persons(family_id, name);

COMMENT ON TABLE persons IS '人员信息表';
COMMENT ON COLUMN persons.style_name IS '字/号';
COMMENT ON COLUMN persons.generation IS '世代（第几世）';

-- ============================================
-- 4. 父子关系表 (parent_child_relations)
-- 存储血缘和嗣子关系
-- ============================================
CREATE TABLE IF NOT EXISTS parent_child_relations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  family_id UUID NOT NULL REFERENCES families(id) ON DELETE CASCADE,
  
  parent_id UUID NOT NULL REFERENCES persons(id) ON DELETE CASCADE,
  child_id UUID NOT NULL REFERENCES persons(id) ON DELETE CASCADE,
  
  relation_type VARCHAR(20) NOT NULL DEFAULT 'biological' CHECK (relation_type IN (
    'biological',
    'adopted',
    'step'
  )),
  
  birth_order INT DEFAULT 0,
  
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  
  CONSTRAINT unique_parent_child UNIQUE (parent_id, child_id),
  CONSTRAINT no_self_parent CHECK (parent_id != child_id)
);

CREATE INDEX IF NOT EXISTS idx_parent_child_parent ON parent_child_relations(parent_id);
CREATE INDEX IF NOT EXISTS idx_parent_child_child ON parent_child_relations(child_id);
CREATE INDEX IF NOT EXISTS idx_parent_child_family ON parent_child_relations(family_id);

COMMENT ON TABLE parent_child_relations IS '父子关系表';
COMMENT ON COLUMN parent_child_relations.relation_type IS '关系类型：biological亲生, adopted嗣子, step继子女';
COMMENT ON COLUMN parent_child_relations.birth_order IS '出生顺序';

-- ============================================
-- 5. 配偶表 (spouses)
-- 存储婚姻关系
-- ============================================
CREATE TABLE IF NOT EXISTS spouses (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  family_id UUID NOT NULL REFERENCES families(id) ON DELETE CASCADE,
  
  person_id UUID NOT NULL REFERENCES persons(id) ON DELETE CASCADE,
  spouse_name VARCHAR(100) NOT NULL,
  
  spouse_type VARCHAR(20) NOT NULL DEFAULT 'primary' CHECK (spouse_type IN (
    'primary',
    'secondary',
    'concubine'
  )),
  
  spouse_birth VARCHAR(255),
  spouse_death VARCHAR(255),
  spouse_birthplace TEXT,
  spouse_origin VARCHAR(255),
  
  marriage_order INT DEFAULT 1,
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_spouses_person ON spouses(person_id);
CREATE INDEX IF NOT EXISTS idx_spouses_family ON spouses(family_id);

COMMENT ON TABLE spouses IS '配偶关系表';
COMMENT ON COLUMN spouses.spouse_type IS '配偶类型：primary元配, secondary继配, concubine侧室';

-- ============================================
-- 6. 目录表 (catalogs)
-- ============================================
CREATE TABLE IF NOT EXISTS catalogs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  family_id UUID NOT NULL REFERENCES families(id) ON DELETE CASCADE,
  name VARCHAR(100) NOT NULL,
  module VARCHAR(50) NOT NULL,
  sort_order INT DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

COMMENT ON TABLE catalogs IS '目录表';

-- ============================================
-- 7. 谱序表 (prefaces)
-- ============================================
CREATE TABLE IF NOT EXISTS prefaces (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  family_id UUID NOT NULL REFERENCES families(id) ON DELETE CASCADE,
  content TEXT NOT NULL,
  author VARCHAR(100),
  date VARCHAR(100),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

COMMENT ON TABLE prefaces IS '谱序表';

-- ============================================
-- 8. 凡例表 (rules)
-- ============================================
CREATE TABLE IF NOT EXISTS rules (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  family_id UUID NOT NULL REFERENCES families(id) ON DELETE CASCADE,
  number VARCHAR(10) NOT NULL,
  content TEXT NOT NULL,
  sort_order INT DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

COMMENT ON TABLE rules IS '凡例规则表';

-- ============================================
-- 9. 家训族规表 (family_rules)
-- ============================================
CREATE TABLE IF NOT EXISTS family_rules (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  family_id UUID NOT NULL REFERENCES families(id) ON DELETE CASCADE,
  title VARCHAR(100),
  content TEXT NOT NULL,
  sort_order INT DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

COMMENT ON TABLE family_rules IS '家训族规表';

-- ============================================
-- 10. 源流表 (origins)
-- ============================================
CREATE TABLE IF NOT EXISTS origins (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  family_id UUID NOT NULL REFERENCES families(id) ON DELETE CASCADE,
  content TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

COMMENT ON TABLE origins IS '源流表';

-- ============================================
-- 11. 后跋表 (postscripts)
-- ============================================
CREATE TABLE IF NOT EXISTS postscripts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  family_id UUID NOT NULL REFERENCES families(id) ON DELETE CASCADE,
  content TEXT NOT NULL,
  author VARCHAR(100),
  date VARCHAR(100),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

COMMENT ON TABLE postscripts IS '后跋表';

-- ============================================
-- RLS 策略设置
-- ============================================

ALTER TABLE families ENABLE ROW LEVEL SECURITY;
ALTER TABLE generation_chars ENABLE ROW LEVEL SECURITY;
ALTER TABLE persons ENABLE ROW LEVEL SECURITY;
ALTER TABLE parent_child_relations ENABLE ROW LEVEL SECURITY;
ALTER TABLE spouses ENABLE ROW LEVEL SECURITY;
ALTER TABLE catalogs ENABLE ROW LEVEL SECURITY;
ALTER TABLE prefaces ENABLE ROW LEVEL SECURITY;
ALTER TABLE rules ENABLE ROW LEVEL SECURITY;
ALTER TABLE family_rules ENABLE ROW LEVEL SECURITY;
ALTER TABLE origins ENABLE ROW LEVEL SECURITY;
ALTER TABLE postscripts ENABLE ROW LEVEL SECURITY;

-- 允许所有人读取
CREATE POLICY "允许所有人读取 families" ON families FOR SELECT USING (true);
CREATE POLICY "允许所有人读取 generation_chars" ON generation_chars FOR SELECT USING (true);
CREATE POLICY "允许所有人读取 persons" ON persons FOR SELECT USING (true);
CREATE POLICY "允许所有人读取 parent_child_relations" ON parent_child_relations FOR SELECT USING (true);
CREATE POLICY "允许所有人读取 spouses" ON spouses FOR SELECT USING (true);
CREATE POLICY "允许所有人读取 catalogs" ON catalogs FOR SELECT USING (true);
CREATE POLICY "允许所有人读取 prefaces" ON prefaces FOR SELECT USING (true);
CREATE POLICY "允许所有人读取 rules" ON rules FOR SELECT USING (true);
CREATE POLICY "允许所有人读取 family_rules" ON family_rules FOR SELECT USING (true);
CREATE POLICY "允许所有人读取 origins" ON origins FOR SELECT USING (true);
CREATE POLICY "允许所有人读取 postscripts" ON postscripts FOR SELECT USING (true);

-- 允许所有人写入
CREATE POLICY "允许所有人写入 families" ON families FOR INSERT WITH CHECK (true);
CREATE POLICY "允许所有人写入 generation_chars" ON generation_chars FOR INSERT WITH CHECK (true);
CREATE POLICY "允许所有人写入 persons" ON persons FOR INSERT WITH CHECK (true);
CREATE POLICY "允许所有人写入 parent_child_relations" ON parent_child_relations FOR INSERT WITH CHECK (true);
CREATE POLICY "允许所有人写入 spouses" ON spouses FOR INSERT WITH CHECK (true);
CREATE POLICY "允许所有人写入 catalogs" ON catalogs FOR INSERT WITH CHECK (true);
CREATE POLICY "允许所有人写入 prefaces" ON prefaces FOR INSERT WITH CHECK (true);
CREATE POLICY "允许所有人写入 rules" ON rules FOR INSERT WITH CHECK (true);
CREATE POLICY "允许所有人写入 family_rules" ON family_rules FOR INSERT WITH CHECK (true);
CREATE POLICY "允许所有人写入 origins" ON origins FOR INSERT WITH CHECK (true);
CREATE POLICY "允许所有人写入 postscripts" ON postscripts FOR INSERT WITH CHECK (true);

-- 允许所有人更新
CREATE POLICY "允许所有人更新 families" ON families FOR UPDATE USING (true);
CREATE POLICY "允许所有人更新 generation_chars" ON generation_chars FOR UPDATE USING (true);
CREATE POLICY "允许所有人更新 persons" ON persons FOR UPDATE USING (true);
CREATE POLICY "允许所有人更新 parent_child_relations" ON parent_child_relations FOR UPDATE USING (true);
CREATE POLICY "允许所有人更新 spouses" ON spouses FOR UPDATE USING (true);
CREATE POLICY "允许所有人更新 catalogs" ON catalogs FOR UPDATE USING (true);
CREATE POLICY "允许所有人更新 prefaces" ON prefaces FOR UPDATE USING (true);
CREATE POLICY "允许所有人更新 rules" ON rules FOR UPDATE USING (true);
CREATE POLICY "允许所有人更新 family_rules" ON family_rules FOR UPDATE USING (true);
CREATE POLICY "允许所有人更新 origins" ON origins FOR UPDATE USING (true);
CREATE POLICY "允许所有人更新 postscripts" ON postscripts FOR UPDATE USING (true);

-- 允许所有人删除
CREATE POLICY "允许所有人删除 families" ON families FOR DELETE USING (true);
CREATE POLICY "允许所有人删除 generation_chars" ON generation_chars FOR DELETE USING (true);
CREATE POLICY "允许所有人删除 persons" ON persons FOR DELETE USING (true);
CREATE POLICY "允许所有人删除 parent_child_relations" ON parent_child_relations FOR DELETE USING (true);
CREATE POLICY "允许所有人删除 spouses" ON spouses FOR DELETE USING (true);
CREATE POLICY "允许所有人删除 catalogs" ON catalogs FOR DELETE USING (true);
CREATE POLICY "允许所有人删除 prefaces" ON prefaces FOR DELETE USING (true);
CREATE POLICY "允许所有人删除 rules" ON rules FOR DELETE USING (true);
CREATE POLICY "允许所有人删除 family_rules" ON family_rules FOR DELETE USING (true);
CREATE POLICY "允许所有人删除 origins" ON origins FOR DELETE USING (true);
CREATE POLICY "允许所有人删除 postscripts" ON postscripts FOR DELETE USING (true);

-- ============================================
-- 触发器：自动更新 updated_at 字段
-- ============================================
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_families_updated_at BEFORE UPDATE ON families
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_persons_updated_at BEFORE UPDATE ON persons
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_spouses_updated_at BEFORE UPDATE ON spouses
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_prefaces_updated_at BEFORE UPDATE ON prefaces
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_origins_updated_at BEFORE UPDATE ON origins
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_postscripts_updated_at BEFORE UPDATE ON postscripts
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- ============================================
-- 触发器：防止循环引用
-- ============================================
CREATE OR REPLACE FUNCTION prevent_circular_reference()
RETURNS TRIGGER AS $$
DECLARE
  is_circular BOOLEAN;
BEGIN
  WITH RECURSIVE ancestors AS (
    SELECT parent_id
    FROM parent_child_relations
    WHERE child_id = NEW.parent_id
    
    UNION ALL
    
    SELECT r.parent_id
    FROM parent_child_relations r
    JOIN ancestors a ON r.child_id = a.parent_id
  )
  SELECT EXISTS(
    SELECT 1 FROM ancestors WHERE parent_id = NEW.child_id
  ) INTO is_circular;
  
  IF is_circular THEN
    RAISE EXCEPTION '不能将祖先设为自己的后代，这会形成循环引用';
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_prevent_circular
BEFORE INSERT OR UPDATE ON parent_child_relations
FOR EACH ROW
EXECUTE FUNCTION prevent_circular_reference();

-- ============================================
-- 视图：人员完整信息视图
-- ============================================
CREATE OR REPLACE VIEW v_person_full AS
SELECT 
  p.id,
  p.family_id,
  p.name,
  p.style_name,
  p.generation,
  p.gender,
  p.birth_date,
  p.death_date,
  p.birthplace,
  p.burial_place,
  p.title,
  p.is_founder,
  p.is_protected,
  p.notes,
  p.created_at,
  p.updated_at,
  f.title as family_title,
  f.surname
FROM persons p
JOIN families f ON p.family_id = f.id;

-- ============================================
-- 视图：家族树视图（递归查询）
-- ============================================
CREATE OR REPLACE VIEW v_family_tree AS
WITH RECURSIVE family_tree AS (
  SELECT 
    p.id,
    p.name,
    p.generation,
    p.gender,
    p.family_id,
    NULL::UUID as parent_id,
    NULL::VARCHAR as parent_name,
    0 as depth,
    ARRAY[p.id] as path
  FROM persons p
  WHERE p.is_founder = TRUE
  
  UNION ALL
  
  SELECT 
    child.id,
    child.name,
    child.generation,
    child.gender,
    child.family_id,
    parent.id as parent_id,
    parent.name as parent_name,
    ft.depth + 1,
    ft.path || child.id
  FROM persons child
  JOIN parent_child_relations pcr ON pcr.child_id = child.id
  JOIN persons parent ON parent.id = pcr.parent_id
  JOIN family_tree ft ON ft.id = parent.id
  WHERE NOT child.id = ANY(ft.path)
)
SELECT * FROM family_tree;
