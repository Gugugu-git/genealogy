import React, { useState, useEffect, useCallback } from 'react';
import { supabase } from '../lib/supabase';
import dataService from '../lib/dataService';
import { getUpdateLogs } from '../data/updateLogs';
import { getUpdateLogsFromGitHub, getLatestCommit } from '../lib/githubService';
import authService from '../lib/authService';
import DeveloperManager from './DeveloperManager';

const { ipcRenderer } = window.require ? window.require('electron') : { ipcRenderer: null };

const emptyPerson = {
  generation: '',
  name: '',
  styleName: '',
  title: '',
  birth: '',
  death: '',
  birthplace: '',
  burial: '',
  spouse: [],
  children: [],
  daughters: [],
  notes: '',
  protected: false,
  gender: 'male',
  parentId: null
};

function DataManagement({ data, setData, saveData, changeLog, addChangeLog }) {
  const [activeTab, setActiveTab] = useState('edit');
  const [backups, setBackups] = useState([]);
  const [showAddPerson, setShowAddPerson] = useState(false);
  const [showEditPerson, setShowEditPerson] = useState(false);
  const [editingPerson, setEditingPerson] = useState(null);
  const [newPerson, setNewPerson] = useState(emptyPerson);
  const [editPerson, setEditPerson] = useState(emptyPerson);
  const [searchTerm, setSearchTerm] = useState('');
  const [parentPerson, setParentPerson] = useState(null);
  const [githubLogs, setGithubLogs] = useState([]);
  const [loadingLogs, setLoadingLogs] = useState(false);
  const [showAllLogs, setShowAllLogs] = useState(false);
  const [expandedDays, setExpandedDays] = useState({});

  useEffect(() => {
    if (activeTab === 'update' && githubLogs.length === 0) {
      setLoadingLogs(true);
      getUpdateLogsFromGitHub()
        .then(logs => {
          setGithubLogs(logs);
        })
        .catch(error => {
          console.error('加载更新日志失败:', error);
          setGithubLogs([]);
        })
        .finally(() => {
          setLoadingLogs(false);
        });
    }
  }, [activeTab]);

  const [loadingBackup, setLoadingBackup] = useState(false);
  const [creatingBackup, setCreatingBackup] = useState(false);
  const [backupError, setBackupError] = useState('');

  useEffect(() => {
    if (activeTab === 'backup') {
      loadBackups();
    }
  }, [activeTab]);

  const loadBackups = useCallback(async () => {
    setBackupError('');
    if (ipcRenderer) {
      try {
        const backupList = await ipcRenderer.invoke('get-backups');
        setBackups(backupList);
      } catch (error) {
        console.error('Error loading backups:', error);
        setBackupError('加载本地备份失败');
      }
    } else {
      try {
        setLoadingBackup(true);
        const data = await dataService.getBackups(10);
        setBackups(data || []);
      } catch (error) {
        console.error('Error loading backups from Supabase:', error);
        setBackupError('加载备份失败: ' + (error.message || '网络错误'));
      } finally {
        setLoadingBackup(false);
      }
    }
  }, []);

  const handleRestoreBackup = async (backup) => {
    if (window.confirm('确定要恢复此备份吗？当前数据将被覆盖！')) {
      try {
        let restoredData;
        
        if (ipcRenderer) {
          const result = await ipcRenderer.invoke('restore-backup', backup.path);
          restoredData = result.data;
        } else {
          // 从 Supabase 备份恢复
          restoredData = backup.data;
        }

        setData(restoredData);
        await saveData(restoredData);
        addChangeLog({
          type: 'restore',
          module: '数据管理',
          content: `从备份恢复数据：${backup.name || backup.backup_name}`,
          editor: '当前用户'
        }, restoredData);
        alert('备份恢复成功！');
      } catch (error) {
        console.error('Restore error:', error);
        alert('恢复备份失败：' + error.message);
      }
    }
  };

  const handleCreateBackup = async () => {
    if (!confirm('确定要创建备份吗？')) return;

    try {
      setCreatingBackup(true);
      setBackupError('');

      if (ipcRenderer) {
        await ipcRenderer.invoke('create-backup');
        await loadBackups();
        alert('备份创建成功！');
      } else {
        const backupName = `族谱备份_${new Date().toLocaleString('zh-CN').replace(/[/: ]/g, '-')}`;
        await dataService.createBackup(backupName, data);
        await loadBackups();
        alert('备份创建成功！');
      }
    } catch (error) {
      console.error('Create backup error:', error);
      setBackupError('创建备份失败：' + (error.message || '网络错误'));
      alert('创建备份失败：' + (error.message || '网络错误'));
    } finally {
      setCreatingBackup(false);
    }
  };

  const handleDeleteBackup = async (backup) => {
    if (!confirm(`确定要删除备份「${backup.name || backup.backup_name}」吗？此操作不可恢复！`)) return;

    try {
      setBackupError('');
      if (ipcRenderer) {
        await ipcRenderer.invoke('delete-backup', backup.path);
      } else {
        await dataService.deleteBackup(backup.id);
      }

      await loadBackups();
      alert('备份删除成功！');
    } catch (error) {
      console.error('Delete backup error:', error);
      setBackupError('删除备份失败：' + (error.message || '网络错误'));
      alert('删除备份失败：' + (error.message || '网络错误'));
    }
  };

  const handleSyncFromFile = async () => {
    if (ipcRenderer) {
      try {
        const result = await ipcRenderer.invoke('open-file-dialog');
        if (!result.canceled && result.filePaths.length > 0) {
          const content = await ipcRenderer.invoke('read-file', result.filePaths[0]);
          try {
            const parsedData = JSON.parse(content);
            setData(parsedData);
            addChangeLog({
              type: 'sync',
              module: '数据管理',
              content: '从文件同步数据',
              editor: '当前用户'
            }, parsedData);
            alert('数据同步成功！');
          } catch (e) {
            alert('JSON格式错误，请检查文件内容！\n\n错误信息：' + e.message);
          }
        }
      } catch (error) {
        alert('同步失败：' + error.message);
      }
    } else {
      const input = document.createElement('input');
      input.type = 'file';
      input.accept = '.json';
      input.onchange = async (e) => {
        const file = e.target.files[0];
        if (!file) return;
        
        const reader = new FileReader();
        reader.onload = async (event) => {
          try {
            const parsedData = JSON.parse(event.target.result);
            if (!parsedData.genealogy) {
              alert('JSON文件格式不正确，缺少genealogy字段！');
              return;
            }
            
            setData(parsedData);
            
            try {
              addChangeLog({
                type: 'sync',
                module: '数据管理',
                content: '从文件同步数据',
                editor: '当前用户'
              }, parsedData);
              alert('数据同步成功！已保存到云端。');
            } catch (saveError) {
              console.error('保存到云端失败:', saveError);
              alert('保存到云端失败：' + (saveError.message || JSON.stringify(saveError)));
            }
          } catch (e) {
            alert('JSON格式错误，请检查文件内容！\n\n错误信息：' + e.message);
          }
        };
        reader.readAsText(file);
      };
      input.click();
    }
  };

  const handleExportJSON = () => {
    const dataStr = JSON.stringify(data, null, 2);
    const blob = new Blob([dataStr], { type: 'application/json;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `泸县大堰胡氏宗谱数据_${new Date().toISOString().split('T')[0]}.json`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
    
    addChangeLog({
      type: 'sync',
      module: '数据管理',
      content: '导出JSON数据文件',
      editor: '当前用户'
    });
  };

  const handleExportTXT = () => {
    let txtContent = '';
    
    txtContent += '泸县大堰胡氏宗谱\n';
    txtContent += '\n\n';
    
    txtContent += '目录\n';
    txtContent += '在传统纸质谱牒的基础上，结合现代信息技术，编纂而成。\n\n';
    
    txtContent += '第一章　源流\n';
    txtContent += (data.origin?.content || '暂无') + '\n\n';
    
    txtContent += '第二章　谱序\n';
    txtContent += (data.preface?.content || '') + '\n\n';
    if (data.preface?.date) txtContent += data.preface.date + '\n';
    if (data.preface?.author) txtContent += data.preface.author + '\n';
    txtContent += '\n';
    
    txtContent += '第三章　凡例\n';
    (data.rules || []).forEach(rule => {
      txtContent += `${rule.number}、${rule.content}\n`;
    });
    txtContent += '\n';
    
    txtContent += '第四章　家训族规\n';
    txtContent += (data.familyRules?.content || '暂无') + '\n\n';
    
    txtContent += '第五章　字辈\n';
    txtContent += '自天承开继先贤\n';
    txtContent += '清白传家世代延\n';
    txtContent += '立意公平光斗宿\n';
    txtContent += '存心正直昭乾元\n';
    txtContent += '从今次第永依祖\n';
    txtContent += '昌大余支定万年\n\n';
    
    txtContent += '第六章　谱系\n';
    txtContent += '由于历史年代久远，很多世系无法考证，只能记载能够考证的支系。这些支系以后如有考证，可再进行统一的修订。\n\n';
    
    const genealogy = data.genealogy || [];
    const personMap = {};
    genealogy.forEach(person => {
      personMap[person.id] = person;
    });
    
    const exportPerson = (person, indent = '') => {
      let result = '';
      result += `${indent}第${person.generation}世 ${person.name}`;
      if (person.styleName) result += ` ${person.styleName}`;
      if (person.title) result += ` ${person.title}`;
      result += '\n';
      
      if (person.birth) result += `${indent}  出生：${person.birth}\n`;
      if (person.death) result += `${indent}  逝世：${person.death}\n`;
      if (person.birthplace) result += `${indent}  出生地：${person.birthplace}\n`;
      if (person.burial) result += `${indent}  安葬地：${person.burial}\n`;
      
      if (person.spouse && person.spouse.length > 0) {
        person.spouse.forEach(s => {
          result += `${indent}  ${s.type} ${s.name}`;
          if (s.birth) result += `，${s.birth}`;
          if (s.death) result += `，${s.death}`;
          if (s.birthplace) result += `，${s.birthplace}`;
          result += '\n';
        });
      }
      
      if (person.children && person.children.length > 0) {
        const sonNames = person.children.map(c => c.name).join('、');
        result += `${indent}  子${person.children.length}：${sonNames}\n`;
      }
      
      if (person.daughters && person.daughters.length > 0) {
        const daughterNames = person.daughters.map(d => d.name).join('、');
        result += `${indent}  女儿${person.daughters.length}：${daughterNames}\n`;
      }
      
      if (person.notes) result += `${indent}  备注：${person.notes}\n`;
      
      result += '\n';
      
      if (person.children && person.children.length > 0) {
        person.children.forEach(childRef => {
          const child = personMap[childRef.id || childRef];
          if (child) {
            result += exportPerson(child, indent + '  ');
          }
        });
      }
      
      if (person.daughters && person.daughters.length > 0) {
        person.daughters.forEach(daughterRef => {
          const daughter = personMap[daughterRef.id || daughterRef];
          if (daughter) {
            result += exportPerson(daughter, indent + '  ');
          }
        });
      }
      
      return result;
    };
    
    const firstGeneration = genealogy.filter(p => p.generation === 1);
    firstGeneration.forEach(person => {
      txtContent += exportPerson(person);
    });
    
    txtContent += '第七章　后跋\n';
    txtContent += (data.postscript?.content || '') + '\n\n';
    if (data.postscript?.date) txtContent += data.postscript.date + '\n';
    if (data.postscript?.author) txtContent += data.postscript.author + '\n';
    
    const blob = new Blob([txtContent], { type: 'text/plain;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `泸县大堰胡氏宗谱_${new Date().toISOString().split('T')[0]}.txt`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
    
    addChangeLog({
      type: 'sync',
      module: '数据管理',
      content: '导出TXT族谱文件',
      editor: '当前用户'
    });
  };

  const handleAddPerson = () => {
    if (!newPerson.name) {
      alert('请填写姓名！');
      return;
    }

    if (!newPerson.generation && !parentPerson) {
      alert('请填写世代或选择父节点！');
      return;
    }

    const personId = 'person_' + Date.now();
    const generation = parentPerson ? parentPerson.generation + 1 : parseInt(newPerson.generation);
    
    const personToAdd = {
      id: personId,
      ...newPerson,
      generation: generation,
      parentId: parentPerson ? parentPerson.id : null
    };

    let updatedGenealogy = [...(data.genealogy || []), personToAdd];

    if (parentPerson) {
      const childField = newPerson.gender === 'male' ? 'children' : 'daughters';
      const childRef = { id: personId, name: newPerson.name, gender: newPerson.gender };
      updatedGenealogy = updatedGenealogy.map(p => {
        if (p.id === parentPerson.id) {
          return {
            ...p,
            [childField]: [...(p[childField] || []), childRef]
          };
        }
        return p;
      });
    }

    const newData = {
      ...data,
      genealogy: updatedGenealogy
    };

    setData(newData);
    addChangeLog({
      type: 'add',
      module: '数据管理',
      content: `新增人物：${newPerson.name}（第${generation}世）${parentPerson ? `，${parentPerson.name}之${newPerson.gender === 'male' ? '子' : '女'}` : ''}`,
      editor: '当前用户'
    }, newData);

    setShowAddPerson(false);
    setNewPerson(emptyPerson);
    setParentPerson(null);
  };

  const handleAddChild = (parent) => {
    setParentPerson(parent);
    setNewPerson({
      ...emptyPerson,
      generation: parent.generation + 1
    });
    setShowAddPerson(true);
  };

  const handleEditPerson = (person) => {
    setEditingPerson(person);
    setEditPerson({ ...emptyPerson, ...person });
    setShowEditPerson(true);
  };

  const handleSaveEditPerson = () => {
    if (!editPerson.name || !editPerson.generation) {
      alert('请填写必要信息（世代和姓名为必填项）！');
      return;
    }

    const updatedPerson = {
      ...editingPerson,
      ...editPerson,
      generation: parseInt(editPerson.generation)
    };

    let newGenealogy = data.genealogy.map(p => p.id === editingPerson.id ? updatedPerson : p);
    let newPersons = [];
    let deletedPersons = [];

    const originalChildren = editingPerson.children || [];
    const newChildren = updatedPerson.children || [];
    
    const deletedChildIds = originalChildren
      .filter(oc => !newChildren.some(nc => nc.id === oc.id))
      .map(c => c.id);

    if (deletedChildIds.length > 0) {
      const getAllDescendants = (personId) => {
        const descendants = [personId];
        const person = data.genealogy.find(p => p.id === personId);
        if (person && person.children) {
          person.children.forEach(child => {
            descendants.push(...getAllDescendants(child.id));
          });
        }
        return descendants;
      };
      
      deletedChildIds.forEach(childId => {
        deletedPersons.push(...getAllDescendants(childId));
      });
      
      newGenealogy = newGenealogy.filter(p => !deletedPersons.includes(p.id));
    }

    if (newChildren.length > 0) {
      const updatedChildren = [];

      newChildren.forEach(child => {
        const isNewChild = child.id && !data.genealogy.some(p => p.id === child.id);
        
        if (isNewChild && child.name && child.name.trim()) {
          const newPerson = {
            id: child.id,
            name: child.name.trim(),
            generation: updatedPerson.generation + 1,
            gender: child.gender || 'male',
            parentId: updatedPerson.id,
            birth: '',
            death: '',
            spouse: [],
            children: [],
            daughters: [],
            heirs: [],
            notes: ''
          };
          newPersons.push(newPerson);
          updatedChildren.push({ id: newPerson.id, name: newPerson.name, gender: newPerson.gender });
        } else if (!isNewChild && !deletedPersons.includes(child.id)) {
          updatedChildren.push(child);
        }
      });

      if (newPersons.length > 0) {
        newGenealogy = [...newGenealogy, ...newPersons];
      }

      updatedPerson.children = updatedChildren;
      newGenealogy = newGenealogy.map(p => p.id === editingPerson.id ? updatedPerson : p);
    } else {
      updatedPerson.children = [];
      newGenealogy = newGenealogy.map(p => p.id === editingPerson.id ? updatedPerson : p);
    }

    const newData = { ...data, genealogy: newGenealogy };

    setData(newData);
    saveData(newData);
    
    if (deletedPersons.length > 0) {
      addChangeLog({
        type: 'delete',
        module: '数据管理',
        content: `从「${updatedPerson.name}」删除${deletedPersons.length}个子嗣及其后代`,
        editor: '当前用户'
      });
    }
    
    if (newPersons.length > 0) {
      addChangeLog({
        type: 'add',
        module: '数据管理',
        content: `为「${updatedPerson.name}」添加${newPersons.length}个子嗣：${newPersons.map(p => p.name).join('、')}`,
        editor: '当前用户'
      });
    }
    
    if (newPersons.length === 0 && deletedPersons.length === 0) {
      addChangeLog({
        type: 'edit',
        module: '数据管理',
        content: `编辑人物：${editPerson.name}（第${editPerson.generation}世）`,
        editor: '当前用户'
      });
    }

    setShowEditPerson(false);
    setEditingPerson(null);
    setEditPerson(emptyPerson);
  };

  const handleDeletePerson = (person) => {
    if (window.confirm(`确定要删除「${person.name}」吗？此操作不可恢复！`)) {
      let newGenealogy = data.genealogy.filter(p => p.id !== person.id);
      
      if (person.parentId) {
        newGenealogy = newGenealogy.map(p => {
          if (p.id === person.parentId && p.children) {
            return {
              ...p,
              children: p.children.filter(c => c.id !== person.id)
            };
          }
          return p;
        });
      }
      
      const newData = {
        ...data,
        genealogy: newGenealogy
      };
      
      setShowEditPerson(false);
      setEditingPerson(null);
      setEditPerson(emptyPerson);
      
      setData(newData);
      saveData(newData);
      addChangeLog({
        type: 'delete',
        module: '数据管理',
        content: `删除人物：${person.name}（第${person.generation}世）`,
        editor: '当前用户'
      });
    }
  };

  const filteredPersons = data.genealogy?.filter(person => 
    person.name?.includes(searchTerm) || 
    person.title?.includes(searchTerm) ||
    person.generation?.toString().includes(searchTerm)
  ) || [];

  const renderPersonForm = (person, setPerson, isEdit = false) => (
    <>
      {!isEdit && (
        <>
          <div className="form-group">
            <label className="form-label">父节点</label>
            {parentPerson ? (
              <div style={{ 
                background: '#e8f5e9', 
                border: '1px solid #4caf50', 
                borderRadius: '8px', 
                padding: '12px',
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center'
              }}>
                <div>
                  <span style={{ 
                    background: '#8b4513', 
                    color: 'white', 
                    padding: '2px 8px', 
                    borderRadius: '4px', 
                    fontSize: '12px',
                    marginRight: '8px'
                  }}>
                    第{parentPerson.generation}世
                  </span>
                  <strong style={{ color: '#5c4033' }}>{parentPerson.name}</strong>
                  <span style={{ color: '#666', marginLeft: '8px' }}>
                    （新人物将作为其子嗣，世代自动设为第{parentPerson.generation + 1}世）
                  </span>
                </div>
                <button
                  type="button"
                  className="btn btn-secondary"
                  style={{ padding: '4px 10px', fontSize: '12px' }}
                  onClick={() => {
                    setParentPerson(null);
                    setPerson({ ...person, generation: '' });
                  }}
                >
                  取消选择
                </button>
              </div>
            ) : (
              <select
                className="form-select"
                value={person.parentId || ''}
                onChange={(e) => {
                  const selectedParent = data.genealogy?.find(p => p.id === e.target.value);
                  if (selectedParent) {
                    setParentPerson(selectedParent);
                    setPerson({ ...person, generation: selectedParent.generation + 1, parentId: selectedParent.id });
                  } else {
                    setParentPerson(null);
                    setPerson({ ...person, parentId: null });
                  }
                }}
              >
                <option value="">-- 选择父节点（可选）--</option>
                {data.genealogy?.map(p => (
                  <option key={p.id} value={p.id}>
                    第{p.generation}世 - {p.name} {p.styleName ? `（号 ${p.styleName}）` : ''}
                  </option>
                ))}
              </select>
            )}
          </div>

          <div className="form-group">
            <label className="form-label">性别 <span style={{ color: '#e53935' }}>*</span></label>
            <div style={{ display: 'flex', gap: '10px' }}>
              <label style={{ 
                display: 'flex', 
                alignItems: 'center', 
                gap: '6px',
                cursor: 'pointer',
                padding: '8px 16px',
                border: `2px solid ${person.gender === 'male' ? '#2196f3' : '#ddd'}`,
                borderRadius: '8px',
                background: person.gender === 'male' ? '#e3f2fd' : 'white'
              }}>
                <input
                  type="radio"
                  name="gender"
                  value="male"
                  checked={person.gender === 'male'}
                  onChange={() => setPerson({ ...person, gender: 'male' })}
                />
                男（子）
              </label>
              <label style={{ 
                display: 'flex', 
                alignItems: 'center', 
                gap: '6px',
                cursor: 'pointer',
                padding: '8px 16px',
                border: `2px solid ${person.gender === 'female' ? '#e91e63' : '#ddd'}`,
                borderRadius: '8px',
                background: person.gender === 'female' ? '#fce4ec' : 'white'
              }}>
                <input
                  type="radio"
                  name="gender"
                  value="female"
                  checked={person.gender === 'female'}
                  onChange={() => setPerson({ ...person, gender: 'female' })}
                />
                女（女）
              </label>
            </div>
          </div>
        </>
      )}

      <div className="form-group">
        <label className="form-label">世代 {!parentPerson && <span style={{ color: '#e53935' }}>*</span>}</label>
        <input
          type="number"
          className="form-input"
          value={person.generation}
          onChange={(e) => setPerson({ ...person, generation: e.target.value })}
          placeholder="例如：7"
          disabled={!!parentPerson}
          style={{ background: parentPerson ? '#f5f5f5' : 'white' }}
        />
        {parentPerson && (
          <small style={{ color: '#888' }}>世代已根据父节点自动设置</small>
        )}
      </div>

      <div className="form-group">
        <label className="form-label">姓名 <span style={{ color: '#e53935' }}>*</span></label>
        <input
          type="text"
          className="form-input"
          value={person.name}
          onChange={(e) => setPerson({ ...person, name: e.target.value })}
          placeholder="例如：传明"
        />
      </div>

      <div className="form-group">
        <label className="form-label">号/字</label>
        <input
          type="text"
          className="form-input"
          value={person.styleName}
          onChange={(e) => setPerson({ ...person, styleName: e.target.value })}
          placeholder="例如：文轩"
        />
      </div>

      <div className="form-group">
        <label className="form-label">身份/称谓</label>
        <input
          type="text"
          className="form-input"
          value={person.title}
          onChange={(e) => setPerson({ ...person, title: e.target.value })}
          placeholder="例如：传明长子"
        />
      </div>

      <div className="form-group">
        <label className="form-label">出生年月</label>
        <input
          type="text"
          className="form-input"
          value={person.birth}
          onChange={(e) => setPerson({ ...person, birth: e.target.value })}
          placeholder="例如：生于甲午年（公元二零一四年）"
        />
      </div>

      <div className="form-group">
        <label className="form-label">逝世/安葬</label>
        <input
          type="text"
          className="form-input"
          value={person.death}
          onChange={(e) => setPerson({ ...person, death: e.target.value })}
          placeholder="例如：卒于癸卯年，葬大堰"
        />
      </div>

      <div className="form-group">
        <label className="form-label">配偶信息</label>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
          {(person.spouse || []).map((s, idx) => (
            <div key={idx} style={{ 
              background: '#faf8f3', 
              border: '1px solid #d4c4a8', 
              borderRadius: '8px', 
              padding: '12px',
              position: 'relative'
            }}>
              <button
                type="button"
                onClick={() => {
                  const newSpouse = [...(person.spouse || [])];
                  newSpouse.splice(idx, 1);
                  setPerson({ ...person, spouse: newSpouse });
                }}
                style={{
                  position: 'absolute',
                  top: '8px',
                  right: '8px',
                  background: '#e53935',
                  color: 'white',
                  border: 'none',
                  borderRadius: '4px',
                  width: '24px',
                  height: '24px',
                  cursor: 'pointer',
                  fontSize: '14px'
                }}
              >
                ×
              </button>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px', marginBottom: '10px' }}>
                <div>
                  <label style={{ fontSize: '12px', color: '#666' }}>姓名</label>
                  <input
                    type="text"
                    className="form-input"
                    value={s.name || ''}
                    onChange={(e) => {
                      const newSpouse = [...(person.spouse || [])];
                      newSpouse[idx] = { ...newSpouse[idx], name: e.target.value };
                      setPerson({ ...person, spouse: newSpouse });
                    }}
                    placeholder="例如：张氏"
                    style={{ marginTop: '4px' }}
                  />
                </div>
                <div>
                  <label style={{ fontSize: '12px', color: '#666' }}>类型</label>
                  <select
                    className="form-select"
                    value={s.type || '配'}
                    onChange={(e) => {
                      const newSpouse = [...(person.spouse || [])];
                      newSpouse[idx] = { ...newSpouse[idx], type: e.target.value };
                      setPerson({ ...person, spouse: newSpouse });
                    }}
                    style={{ marginTop: '4px' }}
                  >
                    <option value="配">配</option>
                    <option value="继配">继配</option>
                    <option value="适">适</option>
                  </select>
                </div>
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px', marginBottom: '10px' }}>
                <div>
                  <label style={{ fontSize: '12px', color: '#666' }}>出生</label>
                  <input
                    type="text"
                    className="form-input"
                    value={s.birth || ''}
                    onChange={(e) => {
                      const newSpouse = [...(person.spouse || [])];
                      newSpouse[idx] = { ...newSpouse[idx], birth: e.target.value };
                      setPerson({ ...person, spouse: newSpouse });
                    }}
                    placeholder="例如：生于辛巳年..."
                    style={{ marginTop: '4px', fontSize: '13px' }}
                  />
                </div>
                <div>
                  <label style={{ fontSize: '12px', color: '#666' }}>逝世</label>
                  <input
                    type="text"
                    className="form-input"
                    value={s.death || ''}
                    onChange={(e) => {
                      const newSpouse = [...(person.spouse || [])];
                      newSpouse[idx] = { ...newSpouse[idx], death: e.target.value };
                      setPerson({ ...person, spouse: newSpouse });
                    }}
                    placeholder="例如：卒于庚寅年..."
                    style={{ marginTop: '4px', fontSize: '13px' }}
                  />
                </div>
              </div>
              <div>
                <label style={{ fontSize: '12px', color: '#666' }}>出生地</label>
                <input
                  type="text"
                  className="form-input"
                  value={s.birthplace || ''}
                  onChange={(e) => {
                    const newSpouse = [...(person.spouse || [])];
                    newSpouse[idx] = { ...newSpouse[idx], birthplace: e.target.value };
                    setPerson({ ...person, spouse: newSpouse });
                  }}
                  placeholder="例如：泸州里仁乡..."
                  style={{ marginTop: '4px', fontSize: '13px' }}
                />
              </div>
            </div>
          ))}
          <button
            type="button"
            className="btn btn-secondary"
            onClick={() => {
              const newSpouse = [...(person.spouse || []), { name: '', type: '配' }];
              setPerson({ ...person, spouse: newSpouse });
            }}
            style={{ width: '100%' }}
          >
            添加配偶
          </button>
        </div>
      </div>

      <div className="form-group" id="children-section">
        <label className="form-label">子嗣信息</label>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
          <p style={{ fontSize: '13px', color: '#666', margin: 0 }}>
            添加的子嗣会自动生成新人物，并放置在此人物下（第{person.generation + 1}世）
          </p>
          {(person.children || []).map((child, idx) => (
            <div key={idx} style={{ 
              background: '#f0f7ff', 
              border: '1px solid #90caf9', 
              borderRadius: '8px', 
              padding: '12px',
              position: 'relative'
            }}>
              <button
                type="button"
                onClick={() => {
                  const newChildren = [...(person.children || [])];
                  newChildren.splice(idx, 1);
                  setPerson({ ...person, children: newChildren });
                }}
                style={{
                  position: 'absolute',
                  top: '8px',
                  right: '8px',
                  background: '#e53935',
                  color: 'white',
                  border: 'none',
                  borderRadius: '4px',
                  width: '24px',
                  height: '24px',
                  cursor: 'pointer',
                  fontSize: '14px'
                }}
              >
                ×
              </button>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
                <div>
                  <label style={{ fontSize: '12px', color: '#666' }}>姓名</label>
                  <input
                    type="text"
                    className="form-input"
                    value={child.name || ''}
                    onChange={(e) => {
                      const newChildren = [...(person.children || [])];
                      newChildren[idx] = { ...newChildren[idx], name: e.target.value };
                      setPerson({ ...person, children: newChildren });
                    }}
                    placeholder="例如：传明"
                    style={{ marginTop: '4px' }}
                  />
                </div>
                <div>
                  <label style={{ fontSize: '12px', color: '#666' }}>性别</label>
                  <select
                    className="form-select"
                    value={child.gender || 'male'}
                    onChange={(e) => {
                      const newChildren = [...(person.children || [])];
                      newChildren[idx] = { ...newChildren[idx], gender: e.target.value };
                      setPerson({ ...person, children: newChildren });
                    }}
                    style={{ marginTop: '4px' }}
                  >
                    <option value="male">男</option>
                    <option value="female">女</option>
                  </select>
                </div>
              </div>
            </div>
          ))}
          <button
            type="button"
            className="btn btn-primary"
            onClick={() => {
              const newChildId = `person_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
              const newChild = { id: newChildId, name: '', gender: 'male', generation: person.generation + 1 };
              setPerson({ ...person, children: [...(person.children || []), newChild] });
            }}
            style={{ width: '100%' }}
          >
            + 添加子嗣
          </button>
        </div>
      </div>

      <div className="form-group">
        <label className="form-label">备注</label>
        <textarea
          className="form-textarea"
          value={person.notes}
          onChange={(e) => setPerson({ ...person, notes: e.target.value })}
          placeholder="其他补充信息..."
        />
      </div>
    </>
  );

  return (
    <div className="data-management">
      <div className="card">
        <h2 className="card-title">数据管理</h2>
        
        <div style={{ display: 'flex', gap: '10px', marginBottom: '20px', flexWrap: 'wrap' }}>
          <button
            className={`btn ${activeTab === 'edit' ? 'btn-primary' : 'btn-secondary'}`}
            onClick={() => setActiveTab('edit')}
          >
            人物编辑
          </button>
          <button
            className={`btn ${activeTab === 'backup' ? 'btn-primary' : 'btn-secondary'}`}
            onClick={() => { setActiveTab('backup'); loadBackups(); }}
          >
            备份管理
          </button>
          <button
            className={`btn ${activeTab === 'sync' ? 'btn-primary' : 'btn-secondary'}`}
            onClick={() => setActiveTab('sync')}
          >
            文件同步
          </button>
          <button
            className={`btn ${activeTab === 'log' ? 'btn-primary' : 'btn-secondary'}`}
            onClick={() => setActiveTab('log')}
          >
            修改日志
          </button>
          <button
            className={`btn ${activeTab === 'update' ? 'btn-primary' : 'btn-secondary'}`}
            onClick={() => setActiveTab('update')}
          >
            更新日志
          </button>
          {authService.isAdmin() && (
            <button
              className={`btn ${activeTab === 'developers' ? 'btn-primary' : 'btn-secondary'}`}
              onClick={() => setActiveTab('developers')}
            >
              开发者管理
            </button>
          )}
        </div>

        {activeTab === 'edit' && (
          <div>
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '15px', gap: '10px', flexWrap: 'wrap' }}>
              <input
                type="text"
                className="form-input"
                style={{ maxWidth: '300px' }}
                placeholder="搜索人物（姓名/称谓/世代）..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
              />
              <button className="btn btn-success" onClick={() => setShowAddPerson(true)}>
                新增人物
              </button>
            </div>
            
            <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
              {filteredPersons.map(person => (
                <div 
                  key={person.id} 
                  className="person-card card" 
                  style={{ margin: 0, padding: '15px', cursor: 'pointer' }}
                  onClick={() => handleEditPerson(person)}
                >
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '12px', flex: 1 }}>
                      <span style={{ 
                        background: '#8b4513', 
                        color: 'white', 
                        padding: '4px 10px', 
                        borderRadius: '4px', 
                        fontSize: '13px'
                      }}>
                        第{person.generation}世
                      </span>
                      <span style={{ fontSize: '16px', fontWeight: 'bold', color: '#5c4033' }}>
                        {person.name}
                      </span>
                      {person.styleName && (
                        <span style={{ color: '#888', fontSize: '14px' }}>号 {person.styleName}</span>
                      )}
                      {person.title && (
                        <span style={{ color: '#a0522d', fontSize: '13px' }}>({person.title})</span>
                      )}
                    </div>
                    <div style={{ display: 'flex', gap: '8px' }} onClick={(e) => e.stopPropagation()}>
                      <button 
                        className="btn btn-success" 
                        style={{ padding: '6px 12px', fontSize: '12px' }}
                        onClick={() => handleAddChild(person)}
                      >
                        添加子嗣
                      </button>
                      <button 
                        className="btn btn-primary" 
                        style={{ padding: '6px 12px', fontSize: '12px' }}
                        onClick={() => handleEditPerson(person)}
                      >
                        编辑
                      </button>
                      <button 
                        className="btn btn-danger" 
                        style={{ padding: '6px 12px', fontSize: '12px' }}
                        onClick={() => handleDeletePerson(person)}
                      >
                        删除
                      </button>
                    </div>
                  </div>
                  {(person.birth || person.birthplace) && (
                    <div style={{ marginTop: '8px', fontSize: '13px', color: '#666' }}>
                      {person.birth && <span>{person.birth}</span>}
                      {person.birthplace && <span> · {person.birthplace}</span>}
                    </div>
                  )}
                </div>
              ))}
              {filteredPersons.length === 0 && (
                <p style={{ textAlign: 'center', color: '#888', padding: '40px' }}>
                  {searchTerm ? '未找到匹配的人物' : '暂无人物数据'}
                </p>
              )}
            </div>
          </div>
        )}

        {activeTab === 'backup' && (
          <div>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
              <div className="card" style={{ background: '#e8f5e9', borderColor: '#4caf50', flex: 1, margin: 0 }}>
                <p style={{ margin: 0, color: '#2e7d32' }}>
                  <strong>提示：</strong>系统保存最近10个备份，可手动创建备份。
                </p>
              </div>
              <button 
                className="btn btn-success"
                onClick={handleCreateBackup}
                disabled={creatingBackup}
                style={{ marginLeft: '15px', whiteSpace: 'nowrap' }}
              >
                {creatingBackup ? '创建中...' : '+ 创建备份'}
              </button>
            </div>

            {backupError && (
              <div className="card" style={{ background: '#ffebee', borderColor: '#e53935', marginBottom: '15px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <p style={{ margin: 0, color: '#c62828' }}>
                    <strong>错误：</strong>{backupError}
                  </p>
                  <button
                    className="btn btn-secondary"
                    style={{ fontSize: '12px', padding: '4px 12px' }}
                    onClick={loadBackups}
                  >
                    重试
                  </button>
                </div>
              </div>
            )}

            {loadingBackup ? (
              <div style={{ textAlign: 'center', padding: '40px' }}>
                <p style={{ color: '#888' }}>加载备份中...</p>
              </div>
            ) : backups.length === 0 ? (
              <p style={{ textAlign: 'center', color: '#888', padding: '40px' }}>
                暂无备份记录，点击上方按钮创建第一个备份
              </p>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                {backups.map((backup, idx) => (
                  <div key={backup.id || idx} className="card" style={{ margin: 0, padding: '15px' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                      <div>
                        <h4 style={{ margin: 0, color: '#5c4033' }}>{backup.name || backup.backup_name}</h4>
                        <div style={{ display: 'flex', gap: '15px', marginTop: '8px' }}>
                          <p style={{ margin: 0, color: '#888', fontSize: '13px' }}>
                            创建时间：{new Date(backup.date || backup.created_at).toLocaleString('zh-CN')}
                          </p>
                          {backup.backup_size && (
                            <p style={{ margin: 0, color: '#888', fontSize: '13px' }}>
                              大小：{Math.round(backup.backup_size / 1024)}KB
                            </p>
                          )}
                        </div>
                      </div>
                      <div style={{ display: 'flex', gap: '10px' }}>
                        <button 
                          className="btn btn-primary"
                          onClick={() => handleRestoreBackup(backup)}
                        >
                          恢复备份
                        </button>
                        <button 
                          className="btn btn-danger"
                          onClick={() => handleDeleteBackup(backup)}
                        >
                          删除
                        </button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {activeTab === 'sync' && (
          <div>
            <div className="card" style={{ marginBottom: '20px' }}>
              <h3 style={{ color: '#8b4513', marginBottom: '15px' }}>数据导入导出</h3>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '16px' }}>
                <div className="card" style={{ margin: 0, background: '#faf8f3' }}>
                  <h4 style={{ margin: 0, marginBottom: '10px', color: '#5c4033' }}>导入JSON</h4>
                  <p style={{ margin: 0, marginBottom: '15px', color: '#666', fontSize: '13px' }}>
                    从本地JSON文件导入数据
                  </p>
                  <button className="btn btn-primary" onClick={handleSyncFromFile}>
                    选择文件并导入
                  </button>
                </div>
                <div className="card" style={{ margin: 0, background: '#faf8f3' }}>
                  <h4 style={{ margin: 0, marginBottom: '10px', color: '#5c4033' }}>导出JSON</h4>
                  <p style={{ margin: 0, marginBottom: '15px', color: '#666', fontSize: '13px' }}>
                    导出完整数据为JSON文件
                  </p>
                  <button className="btn btn-primary" onClick={handleExportJSON}>
                    导出JSON文件
                  </button>
                </div>
                <div className="card" style={{ margin: 0, background: '#e8f5e9' }}>
                  <h4 style={{ margin: 0, marginBottom: '10px', color: '#2e7d32' }}>导出族谱TXT</h4>
                  <p style={{ margin: 0, marginBottom: '15px', color: '#666', fontSize: '13px' }}>
                    导出为传统族谱格式文本
                  </p>
                  <button className="btn btn-success" onClick={handleExportTXT}>
                    导出TXT文件
                  </button>
                </div>
              </div>
            </div>

            <div className="card" style={{ background: '#fff3e0', borderColor: '#ffa726' }}>
              <h4 style={{ margin: 0, marginBottom: '10px', color: '#e65100' }}>注意事项</h4>
              <ul style={{ margin: 0, paddingLeft: '20px', color: '#555', lineHeight: '2' }}>
                <li>导入JSON文件会覆盖当前所有数据，请谨慎操作</li>
                <li>请确保导入的JSON文件格式正确</li>
                <li>建议在导入前先导出备份当前数据</li>
                <li>TXT文件为传统族谱格式，适合打印保存</li>
              </ul>
            </div>
          </div>
        )}

        {activeTab === 'log' && (
          <div>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '15px' }}>
              <p style={{ margin: 0, color: '#666', fontSize: '14px' }}>
                共 {changeLog.length} 条记录（最多保留100条）
              </p>
              <button 
                className="btn btn-secondary" 
                style={{ fontSize: '12px', padding: '6px 12px' }}
                onClick={() => {
                  if (window.confirm('确定要清空所有日志吗？此操作不可恢复！')) {
                    const newData = { ...data, changeLog: [] };
                    saveData(newData);
                  }
                }}
              >
                清空日志
              </button>
            </div>
            
            {changeLog.length === 0 ? (
              <p style={{ textAlign: 'center', color: '#888', padding: '40px' }}>
                暂无修改记录
              </p>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                {changeLog.map((log, idx) => {
                  const logType = log.type || log.action?.type || 'edit';
                  const logModule = log.module || log.action?.module || '系统';
                  const logContent = log.content || log.action?.content || '';
                  const logEditor = log.editor || log.action?.editor || '当前用户';
                  const logDetails = log.details || log.action?.details || null;
                  const logBrowser = log.browser || null;
                  
                  return (
                    <div key={log.id || idx} className="card" style={{ margin: 0, padding: '15px' }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'start' }}>
                        <div style={{ flex: 1 }}>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '8px' }}>
                            <span style={{ 
                              background: logType === 'add' ? '#4caf50' : 
                                         logType === 'delete' ? '#e53935' : 
                                         logType === 'edit' ? '#2196f3' : 
                                         logType === 'restore' ? '#9c27b0' : '#ff9800',
                              color: 'white',
                              padding: '3px 10px',
                              borderRadius: '4px',
                              fontSize: '12px',
                              fontWeight: 'bold'
                            }}>
                              {logType === 'add' ? '新增' : 
                               logType === 'delete' ? '删除' : 
                               logType === 'edit' ? '编辑' : 
                               logType === 'restore' ? '恢复' : '同步'}
                            </span>
                            <strong style={{ color: '#5c4033', fontSize: '15px' }}>{logModule}</strong>
                          </div>
                          <p style={{ margin: 0, color: '#555', lineHeight: '1.6' }}>{logContent}</p>
                          {logDetails && (
                            <div style={{ marginTop: '10px', padding: '10px', background: '#f5f5f5', borderRadius: '6px', fontSize: '13px' }}>
                              <details>
                                <summary style={{ cursor: 'pointer', color: '#666' }}>查看详情</summary>
                                <pre style={{ margin: '10px 0 0 0', fontSize: '12px', whiteSpace: 'pre-wrap', wordBreak: 'break-all' }}>
                                  {typeof logDetails === 'string' ? logDetails : JSON.stringify(logDetails, null, 2)}
                                </pre>
                              </details>
                            </div>
                          )}
                        </div>
                        <div style={{ textAlign: 'right', marginLeft: '15px', minWidth: '120px' }}>
                          <p style={{ margin: 0, color: '#333', fontSize: '13px', fontWeight: '500' }}>{log.time}</p>
                          <p style={{ margin: '5px 0 0 0', color: '#666', fontSize: '12px' }}>操作者：{logEditor}</p>
                          {logBrowser && (
                            <p style={{ margin: '3px 0 0 0', color: '#999', fontSize: '11px' }}>{logBrowser}</p>
                          )}
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        )}

        {activeTab === 'update' && (
          <div>
            <div style={{ marginBottom: '20px' }}>
              <h3 style={{ margin: '0 0 15px 0', color: '#5c4033', fontSize: '18px' }}>系统更新日志</h3>
              <p style={{ margin: 0, color: '#666', fontSize: '14px' }}>
                记录系统的功能更新和改进历史（自动同步 GitHub 提交记录）
              </p>
            </div>
            
            <div style={{ marginBottom: '25px' }}>
              <h4 style={{ margin: '0 0 12px 0', color: '#5c4033', fontSize: '15px', borderBottom: '2px solid #e8e0d5', paddingBottom: '8px' }}>
                📦 版本发布
              </h4>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '15px' }}>
                {getUpdateLogs().map((log) => (
                  <div 
                    key={log.id}
                    style={{ 
                      background: 'linear-gradient(135deg, #fff 0%, #faf8f5 100%)',
                      border: '1px solid #e8e0d5',
                      borderRadius: '12px',
                      padding: '16px',
                      boxShadow: '0 2px 8px rgba(92, 64, 51, 0.08)'
                    }}
                  >
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                        <span style={{ 
                          background: 'linear-gradient(135deg, #8b4513 0%, #a0522d 100%)',
                          color: 'white',
                          padding: '4px 12px',
                          borderRadius: '20px',
                          fontSize: '13px',
                          fontWeight: 'bold'
                        }}>
                          v{log.version}
                        </span>
                        <h5 style={{ margin: 0, color: '#5c4033', fontSize: '14px' }}>{log.title}</h5>
                      </div>
                      <span style={{ color: '#888', fontSize: '12px' }}>{log.date}</span>
                    </div>
                    
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                      {log.changes.map((change, idx) => (
                        <div 
                          key={idx}
                          style={{ 
                            display: 'flex', 
                            alignItems: 'center', 
                            gap: '8px',
                            padding: '6px 10px',
                            background: '#fff',
                            borderRadius: '4px',
                            fontSize: '13px'
                          }}
                        >
                          <span style={{ 
                            color: change.startsWith('新增') ? '#22c55e' : 
                                   change.startsWith('修复') ? '#ef4444' : 
                                   change.startsWith('优化') ? '#3b82f6' : '#8b4513'
                          }}>
                            {change.startsWith('新增') ? '✨' : 
                             change.startsWith('修复') ? '🐛' : 
                             change.startsWith('优化') ? '⚡' : '📝'}
                          </span>
                          <span style={{ color: '#444' }}>{change}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            </div>
            
            <div>
              <h4 style={{ margin: '0 0 12px 0', color: '#5c4033', fontSize: '15px', borderBottom: '2px solid #e8e0d5', paddingBottom: '8px' }}>
                🔧 开发提交记录
              </h4>
              
              {loadingLogs ? (
                <div style={{ textAlign: 'center', padding: '40px', color: '#888' }}>
                  <div style={{ fontSize: '24px', marginBottom: '10px' }}>⏳</div>
                  <div>正在从 GitHub 加载提交记录...</div>
                </div>
              ) : githubLogs.length > 0 ? (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '15px' }}>
                  {(showAllLogs ? githubLogs : githubLogs.slice(0, 5)).map((log) => {
                    const isExpanded = expandedDays[log.id];
                    const displayChanges = isExpanded ? log.changes : log.changes.slice(0, 5);
                    
                    return (
                    <div 
                      key={log.id}
                      style={{ 
                        background: '#fff',
                        border: '1px solid #e8e0d5',
                        borderRadius: '8px',
                        padding: '12px 16px'
                      }}
                    >
                      <div style={{ 
                        display: 'flex', 
                        justifyContent: 'space-between', 
                        alignItems: 'center',
                        marginBottom: '10px'
                      }}>
                        <span style={{ 
                          color: '#8b4513',
                          fontSize: '13px',
                          fontWeight: '500'
                        }}>
                          {log.date}
                        </span>
                        <span style={{ 
                          background: '#f5f5f5',
                          padding: '2px 8px',
                          borderRadius: '4px',
                          fontSize: '12px',
                          color: '#666'
                        }}>
                          {log.commitCount} 次提交
                        </span>
                      </div>
                      
                      <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                        {displayChanges.map((change, idx) => (
                          <div 
                            key={idx}
                            style={{ 
                              display: 'flex', 
                              alignItems: 'center', 
                              gap: '8px',
                              fontSize: '13px'
                            }}
                          >
                            <span style={{ color: change.color }}>{change.icon}</span>
                            <span style={{ color: '#444', flex: 1 }}>{change.description}</span>
                            <span style={{ 
                              color: '#888',
                              fontSize: '11px',
                              fontFamily: 'monospace'
                            }}>
                              {change.sha}
                            </span>
                          </div>
                        ))}
                        {log.changes.length > 5 && (
                          <button
                            onClick={() => {
                              setExpandedDays(prev => ({
                                ...prev,
                                [log.id]: !isExpanded
                              }));
                            }}
                            style={{
                              background: 'none',
                              border: '1px solid #e8e0d5',
                              color: '#8b4513',
                              padding: '4px 12px',
                              borderRadius: '4px',
                              fontSize: '12px',
                              cursor: 'pointer',
                              marginTop: '8px',
                              alignSelf: 'flex-start'
                            }}
                          >
                            {isExpanded ? '收起' : `查看全部 ${log.changes.length} 次提交`}
                          </button>
                        )}
                      </div>
                    </div>
                  );
                  })}
                  
                  {githubLogs.length > 5 && (
                    <button
                      onClick={() => setShowAllLogs(!showAllLogs)}
                      style={{
                        background: 'linear-gradient(135deg, #8b4513 0%, #a0522d 100%)',
                        border: 'none',
                        color: 'white',
                        padding: '10px 20px',
                        borderRadius: '8px',
                        fontSize: '14px',
                        cursor: 'pointer',
                        marginTop: '10px',
                        alignSelf: 'center',
                        boxShadow: '0 2px 8px rgba(139, 69, 19, 0.2)'
                      }}
                    >
                      {showAllLogs ? '收起' : `查看更早的 ${githubLogs.length - 5} 条记录`}
                    </button>
                  )}
                </div>
              ) : (
                <div style={{ textAlign: 'center', padding: '40px', color: '#888' }}>
                  暂无提交记录
                </div>
              )}
            </div>
          </div>
        )}

        {activeTab === 'developers' && (
          <div>
            <DeveloperManager />
          </div>
        )}
      </div>

      {showAddPerson && (
        <div className="modal-overlay" onClick={() => { setShowAddPerson(false); setParentPerson(null); }}>
          <div className="modal" onClick={(e) => e.stopPropagation()} style={{ maxWidth: '600px', maxHeight: '80vh', overflowY: 'auto' }}>
            <div className="modal-header">
              <h3 className="modal-title">
                {parentPerson ? `为「${parentPerson.name}」添加子嗣` : '新增人物'}
              </h3>
              <button className="modal-close" onClick={() => { setShowAddPerson(false); setParentPerson(null); }}>×</button>
            </div>
            
            {renderPersonForm(newPerson, setNewPerson)}

            <div style={{ display: 'flex', gap: '10px', justifyContent: 'flex-end', marginTop: '20px' }}>
              <button className="btn btn-secondary" onClick={() => { setShowAddPerson(false); setParentPerson(null); }}>
                取消
              </button>
              <button className="btn btn-primary" onClick={handleAddPerson}>
                保存
              </button>
            </div>
          </div>
        </div>
      )}

      {showEditPerson && editingPerson && (
        <div className="modal-overlay" onClick={() => setShowEditPerson(false)}>
          <div className="modal" onClick={(e) => e.stopPropagation()} style={{ maxWidth: '600px', maxHeight: '80vh', overflowY: 'auto' }}>
            <div className="modal-header">
              <h3 className="modal-title">编辑人物：{editingPerson.name}</h3>
              <button className="modal-close" onClick={() => setShowEditPerson(false)}>×</button>
            </div>
            
            {renderPersonForm(editPerson, setEditPerson, true)}

            <div style={{ display: 'flex', gap: '10px', justifyContent: 'flex-end', marginTop: '20px' }}>
              <button className="btn btn-secondary" onClick={() => setShowEditPerson(false)}>
                取消
              </button>
              <button className="btn btn-primary" onClick={handleSaveEditPerson}>
                保存修改
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default DataManagement;
