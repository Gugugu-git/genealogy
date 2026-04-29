import { supabase } from './supabase';

const DEFAULT_FAMILY_ID = '00000000-0000-0000-0000-000000000001';

const spouseTypeMap = {
  '配': 'primary',
  '继配': 'secondary',
  '侧室': 'concubine',
  '适': 'primary'
};

const spouseTypeReverseMap = {
  'primary': '配',
  'secondary': '继配',
  'concubine': '侧室'
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

export const genealogyService = {
  async initializeFamily(familyData) {
    const { data: existingFamily } = await supabase
      .from('families')
      .select('id')
      .eq('id', DEFAULT_FAMILY_ID)
      .single();

    if (existingFamily) {
      return existingFamily;
    }

    const { data, error } = await supabase
      .from('families')
      .insert({
        id: DEFAULT_FAMILY_ID,
        title: familyData.metadata?.title || '泸县大堰胡氏宗谱',
        surname: '胡',
        version: familyData.metadata?.version || '1.0',
        last_updated: familyData.metadata?.lastUpdated || new Date().toISOString().split('T')[0]
      })
      .select()
      .single();

    if (error) throw error;
    return data;
  },

  async loadAllData() {
    try {
      const { data: familyData, error: familyError } = await supabase
        .from('families')
        .select('*')
        .eq('id', DEFAULT_FAMILY_ID)
        .single();

      if (familyError || !familyData) {
        return null;
      }

      const { data: persons } = await supabase
        .from('persons')
        .select('*')
        .eq('family_id', DEFAULT_FAMILY_ID);

      const { data: relations } = await supabase
        .from('parent_child_relations')
        .select('*')
        .eq('family_id', DEFAULT_FAMILY_ID);

      const { data: spousesData } = await supabase
        .from('spouses')
        .select('*')
        .eq('family_id', DEFAULT_FAMILY_ID);

      const { data: generationChars } = await supabase
        .from('generation_chars')
        .select('*')
        .eq('family_id', DEFAULT_FAMILY_ID);

      const { data: catalogs } = await supabase
        .from('catalogs')
        .select('*')
        .eq('family_id', DEFAULT_FAMILY_ID);

      const { data: prefaces } = await supabase
        .from('prefaces')
        .select('*')
        .eq('family_id', DEFAULT_FAMILY_ID);

      const { data: rules } = await supabase
        .from('rules')
        .select('*')
        .eq('family_id', DEFAULT_FAMILY_ID);

      const { data: origins } = await supabase
        .from('origins')
        .select('*')
        .eq('family_id', DEFAULT_FAMILY_ID);

      const { data: postscripts } = await supabase
        .from('postscripts')
        .select('*')
        .eq('family_id', DEFAULT_FAMILY_ID);

      return this.convertToJSONFormat({
        family: familyData,
        persons: persons || [],
        relations: relations || [],
        spouses: spousesData || [],
        generationChars: generationChars || [],
        catalogs: catalogs || [],
        prefaces: prefaces || [],
        rules: rules || [],
        origins: origins || [],
        postscripts: postscripts || []
      });
    } catch (error) {
      console.error('加载数据失败: - genealogyService.js:130', error);
      return null;
    }
  },

  convertToJSONFormat(dbData) {
    const { family, persons, relations, spouses, generationChars, catalogs, prefaces, rules, origins, postscripts } = dbData;

    const personMap = new Map();
    persons.forEach(p => {
      personMap.set(p.id, {
        id: p.id,
        generation: p.generation,
        name: p.name,
        styleName: p.style_name || '',
        title: p.title || '',
        birth: p.birth_date || '',
        death: p.death_date || '',
        birthplace: p.birthplace || '',
        burial: p.burial_place || '',
        spouse: [],
        children: [],
        daughters: [],
        heirs: [],
        notes: p.notes || '',
        protected: p.is_protected,
        gender: p.gender
      });
    });

    spouses.forEach(s => {
      const person = personMap.get(s.person_id);
      if (person) {
        person.spouse.push({
          name: s.spouse_name,
          type: spouseTypeReverseMap[s.spouse_type] || '配',
          birth: s.spouse_birth || '',
          death: s.spouse_death || '',
          birthplace: s.spouse_birthplace || ''
        });
      }
    });

    relations.forEach(r => {
      const parent = personMap.get(r.parent_id);
      const child = personMap.get(r.child_id);
      
      if (parent && child) {
        const childRef = { id: child.id, gender: child.gender, name: child.name };
        
        if (r.relation_type === 'adopted') {
          parent.heirs.push(childRef);
        } else if (child.gender === 'female') {
          parent.daughters.push(childRef);
        } else {
          parent.children.push(childRef);
        }
      }
    });

    const genealogy = Array.from(personMap.values()).sort((a, b) => {
      if (a.generation !== b.generation) return a.generation - b.generation;
      return a.name.localeCompare(b.name, 'zh-CN');
    });

    const genChar = generationChars[0];

    return {
      metadata: {
        title: family.title,
        version: family.version,
        lastUpdated: family.last_updated,
        description: `${family.title}信息管理系统数据文件`
      },
      catalog: catalogs.map(c => ({
        id: c.id,
        name: c.name,
        module: c.module
      })),
      origin: origins[0] ? { content: origins[0].content || '暂无' } : { content: '暂无' },
      preface: prefaces[0] ? {
        content: prefaces[0].content,
        date: prefaces[0].date || '',
        author: prefaces[0].author || ''
      } : { content: '' },
      rules: rules.map(r => ({
        id: r.id,
        number: r.number,
        content: r.content
      })),
      familyRules: { content: '暂无' },
      generation: genChar ? {
        poem: genChar.poem || '',
        characters: genChar.characters || [],
        note: genChar.note || ''
      } : { poem: '', characters: [], note: '' },
      genealogy: genealogy,
      postscript: postscripts[0] ? {
        content: postscripts[0].content,
        date: postscripts[0].date || '',
        author: postscripts[0].author || ''
      } : { content: '' },
      backupHistory: [],
      changeLog: []
    };
  },

  async migrateFromJSON(jsonData) {
    try {
      await this.initializeFamily(jsonData);

      console.log('清空旧数据... - genealogyService.js:241');
      await supabase.from('spouses').delete().eq('family_id', DEFAULT_FAMILY_ID);
      await supabase.from('parent_child_relations').delete().eq('family_id', DEFAULT_FAMILY_ID);
      await supabase.from('persons').delete().eq('family_id', DEFAULT_FAMILY_ID);
      console.log('旧数据已清空 - genealogyService.js:245');

      const idMapping = new Map();
      if (jsonData.genealogy) {
        jsonData.genealogy.forEach(p => {
          idMapping.set(p.id, stringToUUID(p.id));
        });
        console.log(`已生成 ${idMapping.size} 个 UUID 映射 - genealogyService.js:252`);
      }

      if (jsonData.catalog && jsonData.catalog.length > 0) {
        await supabase.from('catalogs').delete().eq('family_id', DEFAULT_FAMILY_ID);
        const catalogData = jsonData.catalog.map(c => ({
          family_id: DEFAULT_FAMILY_ID,
          name: c.name,
          module: c.module
        }));
        await supabase.from('catalogs').insert(catalogData);
      }

      if (jsonData.origin) {
        await supabase.from('origins').delete().eq('family_id', DEFAULT_FAMILY_ID);
        await supabase.from('origins').insert({
          family_id: DEFAULT_FAMILY_ID,
          content: jsonData.origin.content || ''
        });
      }

      if (jsonData.preface) {
        await supabase.from('prefaces').delete().eq('family_id', DEFAULT_FAMILY_ID);
        await supabase.from('prefaces').insert({
          family_id: DEFAULT_FAMILY_ID,
          content: jsonData.preface.content || '',
          author: jsonData.preface.author || '',
          date: jsonData.preface.date || ''
        });
      }

      if (jsonData.rules && jsonData.rules.length > 0) {
        await supabase.from('rules').delete().eq('family_id', DEFAULT_FAMILY_ID);
        const rulesData = jsonData.rules.map(r => ({
          family_id: DEFAULT_FAMILY_ID,
          number: r.number,
          content: r.content
        }));
        await supabase.from('rules').insert(rulesData);
      }

      if (jsonData.generation) {
        await supabase.from('generation_chars').delete().eq('family_id', DEFAULT_FAMILY_ID);
        await supabase.from('generation_chars').insert({
          family_id: DEFAULT_FAMILY_ID,
          poem: jsonData.generation.poem || '',
          characters: jsonData.generation.characters || [],
          note: jsonData.generation.note || ''
        });
      }

      if (jsonData.postscript) {
        await supabase.from('postscripts').delete().eq('family_id', DEFAULT_FAMILY_ID);
        await supabase.from('postscripts').insert({
          family_id: DEFAULT_FAMILY_ID,
          content: jsonData.postscript.content || '',
          author: jsonData.postscript.author || '',
          date: jsonData.postscript.date || ''
        });
      }

      if (jsonData.genealogy && jsonData.genealogy.length > 0) {
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
            console.error(`插入人员批次 ${Math.floor(i / batchSize) + 1} 失败: - genealogyService.js:337`, error);
          } else {
            successCount += batch.length;
          }
        }
        console.log(`人员数据迁移完成，成功 ${successCount} 条 - genealogyService.js:342`);

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
          await supabase.from('parent_child_relations').delete().eq('family_id', DEFAULT_FAMILY_ID);
          let relSuccessCount = 0;
          for (let i = 0; i < relationsData.length; i += batchSize) {
            const batch = relationsData.slice(i, i + batchSize);
            const { error } = await supabase.from('parent_child_relations').insert(batch);
            if (!error) relSuccessCount += batch.length;
          }
          console.log(`关系数据迁移完成，成功 ${relSuccessCount} 条 - genealogyService.js:419`);
        }

        if (spousesData.length > 0) {
          await supabase.from('spouses').delete().eq('family_id', DEFAULT_FAMILY_ID);
          let spouseSuccessCount = 0;
          for (let i = 0; i < spousesData.length; i += batchSize) {
            const batch = spousesData.slice(i, i + batchSize);
            const { error } = await supabase.from('spouses').insert(batch);
            if (!error) spouseSuccessCount += batch.length;
          }
          console.log(`配偶数据迁移完成，成功 ${spouseSuccessCount} 条 - genealogyService.js:430`);
        }
      }

      return { success: true };
    } catch (error) {
      console.error('迁移失败: - genealogyService.js:436', error);
      return { success: false, error };
    }
  },

  async saveAllData(jsonData) {
    try {
      await this.migrateFromJSON(jsonData);
      return { success: true };
    } catch (error) {
      console.error('保存数据失败: - genealogyService.js:446', error);
      return { success: false, error };
    }
  },

  async addPerson(personData) {
    const uuid = stringToUUID(personData.id || `person_${Date.now()}`);
    const { data, error } = await supabase
      .from('persons')
      .insert({
        id: uuid,
        family_id: DEFAULT_FAMILY_ID,
        name: personData.name,
        style_name: personData.styleName || '',
        generation: personData.generation,
        gender: personData.gender || 'male',
        birth_date: personData.birth || '',
        death_date: personData.death || '',
        birthplace: personData.birthplace || '',
        burial_place: personData.burial || '',
        title: personData.title || '',
        is_protected: personData.protected !== false,
        notes: personData.notes || ''
      })
      .select()
      .single();

    if (error) throw error;
    return data;
  },

  async updatePerson(personId, updates) {
    const dbUpdates = {};
    if (updates.name !== undefined) dbUpdates.name = updates.name;
    if (updates.styleName !== undefined) dbUpdates.style_name = updates.styleName;
    if (updates.generation !== undefined) dbUpdates.generation = updates.generation;
    if (updates.gender !== undefined) dbUpdates.gender = updates.gender;
    if (updates.birth !== undefined) dbUpdates.birth_date = updates.birth;
    if (updates.death !== undefined) dbUpdates.death_date = updates.death;
    if (updates.birthplace !== undefined) dbUpdates.birthplace = updates.birthplace;
    if (updates.burial !== undefined) dbUpdates.burial_place = updates.burial;
    if (updates.title !== undefined) dbUpdates.title = updates.title;
    if (updates.notes !== undefined) dbUpdates.notes = updates.notes;

    const { data, error } = await supabase
      .from('persons')
      .update(dbUpdates)
      .eq('id', personId)
      .select()
      .single();

    if (error) throw error;
    return data;
  },

  async deletePerson(personId) {
    const { error } = await supabase
      .from('persons')
      .delete()
      .eq('id', personId);

    if (error) throw error;
    return true;
  },

  async addParentChildRelation(parentId, childId, relationType = 'biological') {
    const { data, error } = await supabase
      .from('parent_child_relations')
      .insert({
        family_id: DEFAULT_FAMILY_ID,
        parent_id: parentId,
        child_id: childId,
        relation_type: relationType
      })
      .select()
      .single();

    if (error) throw error;
    return data;
  },

  async removeParentChildRelation(parentId, childId) {
    const { error } = await supabase
      .from('parent_child_relations')
      .delete()
      .eq('parent_id', parentId)
      .eq('child_id', childId);

    if (error) throw error;
    return true;
  },

  async addSpouse(personId, spouseData) {
    const { data, error } = await supabase
      .from('spouses')
      .insert({
        family_id: DEFAULT_FAMILY_ID,
        person_id: personId,
        spouse_name: spouseData.name,
        spouse_type: spouseTypeMap[spouseData.type] || 'primary',
        spouse_birth: spouseData.birth || '',
        spouse_death: spouseData.death || '',
        spouse_birthplace: spouseData.birthplace || ''
      })
      .select()
      .single();

    if (error) throw error;
    return data;
  },

  async updateSpouse(spouseId, updates) {
    const dbUpdates = {};
    if (updates.name !== undefined) dbUpdates.spouse_name = updates.name;
    if (updates.type !== undefined) dbUpdates.spouse_type = spouseTypeMap[updates.type] || 'primary';
    if (updates.birth !== undefined) dbUpdates.spouse_birth = updates.birth;
    if (updates.death !== undefined) dbUpdates.spouse_death = updates.death;
    if (updates.birthplace !== undefined) dbUpdates.spouse_birthplace = updates.birthplace;

    const { data, error } = await supabase
      .from('spouses')
      .update(dbUpdates)
      .eq('id', spouseId)
      .select()
      .single();

    if (error) throw error;
    return data;
  },

  async deleteSpouse(spouseId) {
    const { error } = await supabase
      .from('spouses')
      .delete()
      .eq('id', spouseId);

    if (error) throw error;
    return true;
  },

  async updateGenerationChars(poem, characters, note) {
    const { data: existing } = await supabase
      .from('generation_chars')
      .select('id')
      .eq('family_id', DEFAULT_FAMILY_ID)
      .single();

    if (existing) {
      const { data, error } = await supabase
        .from('generation_chars')
        .update({
          poem,
          characters,
          note
        })
        .eq('id', existing.id)
        .select()
        .single();

      if (error) throw error;
      return data;
    } else {
      const { data, error } = await supabase
        .from('generation_chars')
        .insert({
          family_id: DEFAULT_FAMILY_ID,
          poem,
          characters,
          note
        })
        .select()
        .single();

      if (error) throw error;
      return data;
    }
  },

  async updatePreface(content, author, date) {
    const { data: existing } = await supabase
      .from('prefaces')
      .select('id')
      .eq('family_id', DEFAULT_FAMILY_ID)
      .single();

    if (existing) {
      const { data, error } = await supabase
        .from('prefaces')
        .update({ content, author, date })
        .eq('id', existing.id)
        .select()
        .single();

      if (error) throw error;
      return data;
    } else {
      const { data, error } = await supabase
        .from('prefaces')
        .insert({
          family_id: DEFAULT_FAMILY_ID,
          content,
          author,
          date
        })
        .select()
        .single();

      if (error) throw error;
      return data;
    }
  },

  async updatePostscript(content, author, date) {
    const { data: existing } = await supabase
      .from('postscripts')
      .select('id')
      .eq('family_id', DEFAULT_FAMILY_ID)
      .single();

    if (existing) {
      const { data, error } = await supabase
        .from('postscripts')
        .update({ content, author, date })
        .eq('id', existing.id)
        .select()
        .single();

      if (error) throw error;
      return data;
    } else {
      const { data, error } = await supabase
        .from('postscripts')
        .insert({
          family_id: DEFAULT_FAMILY_ID,
          content,
          author,
          date
        })
        .select()
        .single();

      if (error) throw error;
      return data;
    }
  },

  async getPersonChildren(personId) {
    const { data, error } = await supabase
      .from('parent_child_relations')
      .select(`
        child_id,
        relation_type,
        birth_order,
        persons!parent_child_relations_child_id_fkey (*)
      `)
      .eq('parent_id', personId);

    if (error) throw error;
    return data;
  },

  async getPersonParents(personId) {
    const { data, error } = await supabase
      .from('parent_child_relations')
      .select(`
        parent_id,
        relation_type,
        persons!parent_child_relations_parent_id_fkey (*)
      `)
      .eq('child_id', personId);

    if (error) throw error;
    return data;
  },

  async searchPersons(searchTerm, familyId = DEFAULT_FAMILY_ID) {
    const { data, error } = await supabase
      .from('persons')
      .select('*')
      .eq('family_id', familyId)
      .or(`name.ilike.%${searchTerm}%,style_name.ilike.%${searchTerm}%,title.ilike.%${searchTerm}%`);

    if (error) throw error;
    return data;
  },

  async getPersonsByGeneration(generation, familyId = DEFAULT_FAMILY_ID) {
    const { data, error } = await supabase
      .from('persons')
      .select('*')
      .eq('family_id', familyId)
      .eq('generation', generation);

    if (error) throw error;
    return data;
  }
};

export default genealogyService;
