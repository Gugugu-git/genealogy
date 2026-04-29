import { supabase } from './supabase';

const DEFAULT_FAMILY_ID = '00000000-0000-0000-0000-000000000001';

const spouseTypeMap = {
  '配': 'primary',
  '继配': 'secondary',
  '侧室': 'concubine',
  '适': 'primary'
};

function stringToUUID(str) {
  const hash = str.split('').reduce((acc, char) => {
    acc = ((acc << 5) - acc + char.charCodeAt(0)) | 0;
    return acc;
  }, 0);
  
  const hex = Math.abs(hash).toString(16).padStart(8, '0');
  const hex2 = Math.abs(hash * 31).toString(16).padStart(8, '0');
  const hex3 = Math.abs(hash * 37).toString(16).padStart(8, '0');
  const hex4 = Math.abs(hash * 41).toString(16).padStart(8, '0');
  
  return `${hex.slice(0, 8)}-${hex2.slice(0, 4)}-4${hex2.slice(4, 7)}-${hex3.slice(0, 4)}-${hex4.slice(0, 12).padEnd(12, '0')}`;
}

export async function runMigration() {
  console.log('开始数据迁移...');
  
  try {
    const { data: existingFamily } = await supabase
      .from('families')
      .select('id')
      .eq('id', DEFAULT_FAMILY_ID)
      .single();

    if (existingFamily) {
      console.log('宗谱数据已存在，跳过初始化');
    } else {
      const { error: familyError } = await supabase
        .from('families')
        .insert({
          id: DEFAULT_FAMILY_ID,
          title: '泸县大堰胡氏宗谱',
          surname: '胡',
          version: '1.0',
          last_updated: new Date().toISOString().split('T')[0]
        });

      if (familyError) {
        console.error('创建宗谱记录失败:', familyError);
        return { success: false, error: familyError };
      }
      console.log('宗谱记录创建成功');
    }

    const { data: existingPersons } = await supabase
      .from('persons')
      .select('id')
      .eq('family_id', DEFAULT_FAMILY_ID)
      .limit(1);

    if (existingPersons && existingPersons.length > 0) {
      console.log('人员数据已存在，跳过迁移');
      return { success: true, message: '数据已存在，无需迁移' };
    }

    const response = await fetch('./泸县大堰胡氏宗谱数据.json');
    const jsonData = await response.json();
    
    console.log('读取JSON数据成功，开始迁移...');

    const idMapping = new Map();
    jsonData.genealogy.forEach(p => {
      idMapping.set(p.id, stringToUUID(p.id));
    });
    console.log(`已生成 ${idMapping.size} 个 UUID 映射`);

    if (jsonData.catalog && jsonData.catalog.length > 0) {
      const catalogData = jsonData.catalog.map(c => ({
        family_id: DEFAULT_FAMILY_ID,
        name: c.name,
        module: c.module
      }));
      await supabase.from('catalogs').insert(catalogData);
      console.log('目录数据迁移完成');
    }

    if (jsonData.origin) {
      await supabase.from('origins').insert({
        family_id: DEFAULT_FAMILY_ID,
        content: jsonData.origin.content || ''
      });
      console.log('源流数据迁移完成');
    }

    if (jsonData.preface) {
      await supabase.from('prefaces').insert({
        family_id: DEFAULT_FAMILY_ID,
        content: jsonData.preface.content || '',
        author: jsonData.preface.author || '',
        date: jsonData.preface.date || ''
      });
      console.log('谱序数据迁移完成');
    }

    if (jsonData.rules && jsonData.rules.length > 0) {
      const rulesData = jsonData.rules.map(r => ({
        family_id: DEFAULT_FAMILY_ID,
        number: r.number,
        content: r.content
      }));
      await supabase.from('rules').insert(rulesData);
      console.log('凡例数据迁移完成');
    }

    if (jsonData.generation) {
      await supabase.from('generation_chars').insert({
        family_id: DEFAULT_FAMILY_ID,
        poem: jsonData.generation.poem || '',
        characters: jsonData.generation.characters || [],
        note: jsonData.generation.note || ''
      });
      console.log('字辈数据迁移完成');
    }

    if (jsonData.postscript) {
      await supabase.from('postscripts').insert({
        family_id: DEFAULT_FAMILY_ID,
        content: jsonData.postscript.content || '',
        author: jsonData.postscript.author || '',
        date: jsonData.postscript.date || ''
      });
      console.log('后跋数据迁移完成');
    }

    if (jsonData.genealogy && jsonData.genealogy.length > 0) {
      console.log('开始迁移人员数据...');
      
      const personsData = jsonData.genealogy.map(p => ({
        id: idMapping.get(p.id),
        family_id: DEFAULT_FAMILY_ID,
        name: p.name,
        style_name: p.styleName || '',
        generation: p.generation,
        gender: p.gender || (p.title?.includes('女') ? 'female' : 'male'),
        birth_date: p.birth || '',
        death_date: p.death || '',
        birthplace: p.birthplace || '',
        burial_place: p.burial || '',
        title: p.title || '',
        is_founder: p.generation === 1,
        is_protected: p.protected !== false,
        notes: p.notes || ''
      }));

      const batchSize = 50;
      let successCount = 0;
      for (let i = 0; i < personsData.length; i += batchSize) {
        const batch = personsData.slice(i, i + batchSize);
        const { error } = await supabase.from('persons').insert(batch);
        if (error) {
          console.error(`插入人员批次 ${Math.floor(i / batchSize) + 1} 失败:`, error);
        } else {
          successCount += batch.length;
        }
      }
      console.log(`人员数据迁移完成，成功 ${successCount} 条`);

      const relationsData = [];
      const spousesData = [];

      jsonData.genealogy.forEach(person => {
        const personUUID = idMapping.get(person.id);
        
        if (person.children && person.children.length > 0) {
          person.children.forEach((child, idx) => {
            const childUUID = idMapping.get(child.id);
            if (childUUID) {
              relationsData.push({
                family_id: DEFAULT_FAMILY_ID,
                parent_id: personUUID,
                child_id: childUUID,
                relation_type: 'biological',
                birth_order: idx
              });
            }
          });
        }

        if (person.daughters && person.daughters.length > 0) {
          person.daughters.forEach((daughter, idx) => {
            const daughterUUID = idMapping.get(daughter.id);
            if (daughterUUID) {
              relationsData.push({
                family_id: DEFAULT_FAMILY_ID,
                parent_id: personUUID,
                child_id: daughterUUID,
                relation_type: 'biological',
                birth_order: (person.children?.length || 0) + idx
              });
            }
          });
        }

        if (person.heirs && person.heirs.length > 0) {
          person.heirs.forEach((heir, idx) => {
            const heirUUID = idMapping.get(heir.id);
            if (heirUUID) {
              relationsData.push({
                family_id: DEFAULT_FAMILY_ID,
                parent_id: personUUID,
                child_id: heirUUID,
                relation_type: 'adopted',
                birth_order: (person.children?.length || 0) + (person.daughters?.length || 0) + idx
              });
            }
          });
        }

        if (person.spouse && person.spouse.length > 0) {
          person.spouse.forEach((s, index) => {
            spousesData.push({
              family_id: DEFAULT_FAMILY_ID,
              person_id: personUUID,
              spouse_name: s.name,
              spouse_type: spouseTypeMap[s.type] || 'primary',
              spouse_birth: s.birth || '',
              spouse_death: s.death || '',
              spouse_birthplace: s.birthplace || '',
              marriage_order: index + 1
            });
          });
        }
      });

      if (relationsData.length > 0) {
        let relSuccessCount = 0;
        for (let i = 0; i < relationsData.length; i += batchSize) {
          const batch = relationsData.slice(i, i + batchSize);
          const { error } = await supabase.from('parent_child_relations').insert(batch);
          if (error) {
            console.error(`插入关系批次 ${Math.floor(i / batchSize) + 1} 失败:`, error);
          } else {
            relSuccessCount += batch.length;
          }
        }
        console.log(`关系数据迁移完成，成功 ${relSuccessCount} 条`);
      }

      if (spousesData.length > 0) {
        let spouseSuccessCount = 0;
        for (let i = 0; i < spousesData.length; i += batchSize) {
          const batch = spousesData.slice(i, i + batchSize);
          const { error } = await supabase.from('spouses').insert(batch);
          if (error) {
            console.error(`插入配偶批次 ${Math.floor(i / batchSize) + 1} 失败:`, error);
          } else {
            spouseSuccessCount += batch.length;
          }
        }
        console.log(`配偶数据迁移完成，成功 ${spouseSuccessCount} 条`);
      }
    }

    console.log('✅ 数据迁移完成！');
    return { success: true };
  } catch (error) {
    console.error('迁移失败:', error);
    return { success: false, error };
  }
}

export async function verifyMigration() {
  console.log('验证迁移结果...');
  
  const tables = [
    'families',
    'persons',
    'parent_child_relations',
    'spouses',
    'generation_chars',
    'catalogs',
    'prefaces',
    'rules',
    'origins',
    'postscripts'
  ];

  const results = {};

  for (const table of tables) {
    const { count, error } = await supabase
      .from(table)
      .select('*', { count: 'exact', head: true });
    
    if (error) {
      results[table] = { error: error.message };
    } else {
      results[table] = { count };
    }
  }

  console.log('验证结果:', results);
  return results;
}

export async function rollbackMigration() {
  console.log('开始回滚迁移...');
  
  try {
    await supabase.from('spouses').delete().eq('family_id', DEFAULT_FAMILY_ID);
    console.log('已删除配偶数据');
    
    await supabase.from('parent_child_relations').delete().eq('family_id', DEFAULT_FAMILY_ID);
    console.log('已删除关系数据');
    
    await supabase.from('persons').delete().eq('family_id', DEFAULT_FAMILY_ID);
    console.log('已删除人员数据');
    
    await supabase.from('generation_chars').delete().eq('family_id', DEFAULT_FAMILY_ID);
    await supabase.from('catalogs').delete().eq('family_id', DEFAULT_FAMILY_ID);
    await supabase.from('prefaces').delete().eq('family_id', DEFAULT_FAMILY_ID);
    await supabase.from('rules').delete().eq('family_id', DEFAULT_FAMILY_ID);
    await supabase.from('origins').delete().eq('family_id', DEFAULT_FAMILY_ID);
    await supabase.from('postscripts').delete().eq('family_id', DEFAULT_FAMILY_ID);
    console.log('已删除其他数据');
    
    await supabase.from('families').delete().eq('id', DEFAULT_FAMILY_ID);
    console.log('已删除宗谱记录');
    
    console.log('✅ 回滚完成');
    return { success: true };
  } catch (error) {
    console.error('回滚失败:', error);
    return { success: false, error };
  }
}

if (typeof window !== 'undefined') {
  window.runMigration = runMigration;
  window.verifyMigration = verifyMigration;
  window.rollbackMigration = rollbackMigration;
  console.log('✅ 迁移脚本已加载。可用命令:');
  console.log('- runMigration() - 执行迁移');
  console.log('- verifyMigration() - 验证迁移结果');
  console.log('- rollbackMigration() - 回滚迁移');
}
