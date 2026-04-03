import React, { useState, useEffect } from 'react';

const { ipcRenderer } = window.require ? window.require('electron') : { ipcRenderer: null };

function DataManagement({ data, setData, saveData, changeLog, addChangeLog }) {
  const [activeTab, setActiveTab] = useState('edit');
  const [backups, setBackups] = useState([]);
  const [showAddPerson, setShowAddPerson] = useState(false);
  const [newPerson, setNewPerson] = useState({
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
    protected: false
  });

  useEffect(() => {
    loadBackups();
  }, []);

  const loadBackups = async () => {
    if (ipcRenderer) {
      try {
        const backupList = await ipcRenderer.invoke('get-backups');
        setBackups(backupList);
      } catch (error) {
        console.error('Error loading backups:', error);
      }
    }
  };

  const handleRestoreBackup = async (backupPath) => {
    if (window.confirm('确定要恢复此备份吗？当前数据将被覆盖！')) {
      try {
        const result = await ipcRenderer.invoke('restore-backup', backupPath);
        setData(result.data);
        addChangeLog({
          type: 'restore',
          module: '数据管理',
          content: '从备份恢复数据',
          editor: '当前用户'
        });
        alert('备份恢复成功！');
      } catch (error) {
        alert('恢复备份失败：' + error.message);
      }
    }
  };

  const handleSyncFromFile = async () => {
    try {
      const result = await ipcRenderer.invoke('open-file-dialog');
      if (!result.canceled && result.filePaths.length > 0) {
        const content = await ipcRenderer.invoke('read-file', result.filePaths[0]);
        try {
          const parsedData = JSON.parse(content);
          setData(parsedData);
          await saveData(parsedData);
          addChangeLog({
            type: 'sync',
            module: '数据管理',
            content: '从文件同步数据',
            editor: '当前用户'
          });
          alert('数据同步成功！');
        } catch (e) {
          alert('JSON格式错误，请检查文件内容！\n\n错误信息：' + e.message);
        }
      }
    } catch (error) {
      alert('同步失败：' + error.message);
    }
  };

  const handleAddPerson = () => {
    if (!newPerson.name || !newPerson.generation) {
      alert('请填写必要信息（世代和姓名为必填项）！');
      return;
    }

    const personId = 'person_' + Date.now();
    const personToAdd = {
      id: personId,
      ...newPerson,
      generation: parseInt(newPerson.generation)
    };

    const newData = {
      ...data,
      genealogy: [...(data.genealogy || []), personToAdd]
    };

    addChangeLog({
      type: 'add',
      module: '数据管理',
      content: `新增人物：${newPerson.name}（第${newPerson.generation}世）`,
      editor: '当前用户'
    });

    saveData(newData);
    setShowAddPerson(false);
    setNewPerson({
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
      protected: false
    });
  };

  const handleDeletePerson = (person) => {
    if (person.protected) {
      alert('此人物为核心世系成员，受删除保护！');
      return;
    }
    
    if (window.confirm(`确定要删除「${person.name}」吗？此操作不可恢复！`)) {
      const newData = {
        ...data,
        genealogy: data.genealogy.filter(p => p.id !== person.id)
      };
      
      addChangeLog({
        type: 'delete',
        module: '数据管理',
        content: `删除人物：${person.name}（第${person.generation}世）`,
        editor: '当前用户'
      });
      
      saveData(newData);
    }
  };

  return (
    <div className="data-management">
      <div className="card">
        <h2 className="card-title">⚙️ 数据管理</h2>
        
        <div style={{ display: 'flex', gap: '10px', marginBottom: '20px', flexWrap: 'wrap' }}>
          <button
            className={`btn ${activeTab === 'edit' ? 'btn-primary' : 'btn-secondary'}`}
            onClick={() => setActiveTab('edit')}
          >
            ✏️ 人物编辑
          </button>
          <button
            className={`btn ${activeTab === 'backup' ? 'btn-primary' : 'btn-secondary'}`}
            onClick={() => { setActiveTab('backup'); loadBackups(); }}
          >
            💾 备份管理
          </button>
          <button
            className={`btn ${activeTab === 'sync' ? 'btn-primary' : 'btn-secondary'}`}
            onClick={() => setActiveTab('sync')}
          >
            🔄 文件同步
          </button>
          <button
            className={`btn ${activeTab === 'log' ? 'btn-primary' : 'btn-secondary'}`}
            onClick={() => setActiveTab('log')}
          >
            📝 修改日志
          </button>
        </div>

        {activeTab === 'edit' && (
          <div>
            <div style={{ display: 'flex', justifyContent: 'flex-end', marginBottom: '15px' }}>
              <button className="btn btn-success" onClick={() => setShowAddPerson(true)}>
                ➕ 新增人物
              </button>
            </div>
            
            <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
              {data.genealogy?.map(person => (
                <div key={person.id} className="person-card card" style={{ margin: 0, padding: '15px' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                      <span style={{ 
                        background: person.protected ? '#e53935' : '#8b4513', 
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
                      {person.protected && (
                        <span className="special-tag tag-adopted">受保护</span>
                      )}
                    </div>
                    <div style={{ display: 'flex', gap: '8px' }}>
                      {!person.protected && (
                        <button 
                          className="btn btn-danger" 
                          style={{ padding: '6px 12px', fontSize: '12px' }}
                          onClick={() => handleDeletePerson(person)}
                        >
                          删除
                        </button>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {activeTab === 'backup' && (
          <div>
            <div className="card" style={{ background: '#e8f5e9', borderColor: '#4caf50', marginBottom: '20px' }}>
              <p style={{ margin: 0, color: '#2e7d32' }}>
                <strong>💡 提示：</strong>系统自动保存最近10个备份，每次修改数据时自动创建备份。
              </p>
            </div>
            
            {backups.length === 0 ? (
              <p style={{ textAlign: 'center', color: '#888', padding: '40px' }}>
                暂无备份记录
              </p>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                {backups.map((backup, idx) => (
                  <div key={idx} className="card" style={{ margin: 0, padding: '15px' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                      <div>
                        <h4 style={{ margin: 0, color: '#5c4033' }}>{backup.name}</h4>
                        <p style={{ margin: '5px 0 0 0', color: '#888', fontSize: '13px' }}>
                          创建时间：{new Date(backup.date).toLocaleString('zh-CN')}
                        </p>
                      </div>
                      <button 
                        className="btn btn-primary"
                        onClick={() => handleRestoreBackup(backup.path)}
                      >
                        恢复此备份
                      </button>
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
              <h3 style={{ color: '#8b4513', marginBottom: '15px' }}>📂 双向同步</h3>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '20px' }}>
                <div className="card" style={{ margin: 0, background: '#faf8f3' }}>
                  <h4 style={{ margin: 0, marginBottom: '10px', color: '#5c4033' }}>从文件同步</h4>
                  <p style={{ margin: 0, marginBottom: '15px', color: '#666', fontSize: '13px' }}>
                    选择本地JSON数据文件，将文件内容同步到应用内
                  </p>
                  <button className="btn btn-primary" onClick={handleSyncFromFile}>
                    选择文件并同步
                  </button>
                </div>
                <div className="card" style={{ margin: 0, background: '#faf8f3' }}>
                  <h4 style={{ margin: 0, marginBottom: '10px', color: '#5c4033' }}>数据文件位置</h4>
                  <p style={{ margin: 0, marginBottom: '15px', color: '#666', fontSize: '13px' }}>
                    应用内修改会自动同步到本地数据文件，您也可以直接编辑该文件
                  </p>
                  <div style={{ background: '#333', color: '#0f0', padding: '10px', borderRadius: '4px', fontFamily: 'monospace', fontSize: '12px', wordBreak: 'break-all' }}>
                    数据保存在用户数据目录下
                  </div>
                </div>
              </div>
            </div>

            <div className="card" style={{ background: '#fff3e0', borderColor: '#ffa726' }}>
              <h4 style={{ margin: 0, marginBottom: '10px', color: '#e65100' }}>⚠️ 注意事项</h4>
              <ul style={{ margin: 0, paddingLeft: '20px', color: '#555', lineHeight: '2' }}>
                <li>从文件同步会覆盖当前应用内的所有数据，请谨慎操作</li>
                <li>请确保导入的JSON文件格式正确，否则会导致同步失败</li>
                <li>建议在同步前先创建一个备份</li>
                <li>核心世系人物（1-6世）受删除保护，无法删除</li>
              </ul>
            </div>
          </div>
        )}

        {activeTab === 'log' && (
          <div>
            {changeLog.length === 0 ? (
              <p style={{ textAlign: 'center', color: '#888', padding: '40px' }}>
                暂无修改记录
              </p>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                {changeLog.map((log, idx) => (
                  <div key={log.id || idx} className="card" style={{ margin: 0, padding: '15px' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'start' }}>
                      <div>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '5px' }}>
                          <span style={{ 
                            background: log.type === 'add' ? '#4caf50' : 
                                       log.type === 'delete' ? '#e53935' : 
                                       log.type === 'edit' ? '#2196f3' : '#ff9800',
                            color: 'white',
                            padding: '2px 8px',
                            borderRadius: '4px',
                            fontSize: '12px'
                          }}>
                            {log.type === 'add' ? '新增' : 
                             log.type === 'delete' ? '删除' : 
                             log.type === 'edit' ? '编辑' : '同步'}
                          </span>
                          <strong style={{ color: '#5c4033' }}>{log.module}</strong>
                        </div>
                        <p style={{ margin: 0, color: '#555' }}>{log.content}</p>
                      </div>
                      <div style={{ textAlign: 'right' }}>
                        <p style={{ margin: 0, color: '#888', fontSize: '13px' }}>{log.time}</p>
                        <p style={{ margin: '3px 0 0 0', color: '#999', fontSize: '12px' }}>{log.editor}</p>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
      </div>

      {showAddPerson && (
        <div className="modal-overlay" onClick={() => setShowAddPerson(false)}>
          <div className="modal" onClick={(e) => e.stopPropagation()} style={{ maxWidth: '600px' }}>
            <div className="modal-header">
              <h3 className="modal-title">➕ 新增人物</h3>
              <button className="modal-close" onClick={() => setShowAddPerson(false)}>×</button>
            </div>
            
            <div className="form-group">
              <label className="form-label">世代 <span style={{ color: '#e53935' }}>*</span></label>
              <input
                type="number"
                className="form-input"
                value={newPerson.generation}
                onChange={(e) => setNewPerson({ ...newPerson, generation: e.target.value })}
                placeholder="例如：7"
              />
            </div>

            <div className="form-group">
              <label className="form-label">姓名 <span style={{ color: '#e53935' }}>*</span></label>
              <input
                type="text"
                className="form-input"
                value={newPerson.name}
                onChange={(e) => setNewPerson({ ...newPerson, name: e.target.value })}
                placeholder="例如：传明"
              />
            </div>

            <div className="form-group">
              <label className="form-label">号</label>
              <input
                type="text"
                className="form-input"
                value={newPerson.styleName}
                onChange={(e) => setNewPerson({ ...newPerson, styleName: e.target.value })}
                placeholder="例如：文轩"
              />
            </div>

            <div className="form-group">
              <label className="form-label">身份/称谓</label>
              <input
                type="text"
                className="form-input"
                value={newPerson.title}
                onChange={(e) => setNewPerson({ ...newPerson, title: e.target.value })}
                placeholder="例如：传明长子"
              />
            </div>

            <div className="form-group">
              <label className="form-label">出生年月</label>
              <input
                type="text"
                className="form-input"
                value={newPerson.birth}
                onChange={(e) => setNewPerson({ ...newPerson, birth: e.target.value })}
                placeholder="例如：生于甲午年（公元二零一四年）"
              />
            </div>

            <div className="form-group">
              <label className="form-label">逝世/安葬</label>
              <input
                type="text"
                className="form-input"
                value={newPerson.death}
                onChange={(e) => setNewPerson({ ...newPerson, death: e.target.value })}
                placeholder="例如：卒于癸卯年，葬大堰"
              />
            </div>

            <div className="form-group">
              <label className="form-label">出生地</label>
              <input
                type="text"
                className="form-input"
                value={newPerson.birthplace}
                onChange={(e) => setNewPerson({ ...newPerson, birthplace: e.target.value })}
                placeholder="例如：泸州奇峰镇劳动村"
              />
            </div>

            <div className="form-group">
              <label className="form-label">备注</label>
              <textarea
                className="form-textarea"
                value={newPerson.notes}
                onChange={(e) => setNewPerson({ ...newPerson, notes: e.target.value })}
                placeholder="其他补充信息..."
              />
            </div>

            <div style={{ display: 'flex', gap: '10px', justifyContent: 'flex-end', marginTop: '20px' }}>
              <button className="btn btn-secondary" onClick={() => setShowAddPerson(false)}>
                取消
              </button>
              <button className="btn btn-primary" onClick={handleAddPerson}>
                保存
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default DataManagement;
