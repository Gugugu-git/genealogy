import React, { useState } from 'react';

function PrefacePostscript({ data, setData, saveData, addChangeLog }) {
  const [isEditing, setIsEditing] = useState(false);
  const [editType, setEditType] = useState(null);
  const [editContent, setEditContent] = useState('');
  const [activeTab, setActiveTab] = useState('preface');

  const preface = data.preface || {};
  const postscript = data.postscript || {};

  const handleEdit = (type) => {
    setEditType(type);
    setEditContent(type === 'preface' ? preface.content : postscript.content);
    setIsEditing(true);
  };

  const handleSave = () => {
    const newData = { ...data };
    if (editType === 'preface') {
      newData.preface = { ...preface, content: editContent };
    } else {
      newData.postscript = { ...postscript, content: editContent };
    }
    
    addChangeLog({
      type: 'edit',
      module: editType === 'preface' ? '谱序' : '后跋',
      content: `修改了${editType === 'preface' ? '谱序' : '后跋'}内容`,
      editor: '当前用户'
    });
    
    saveData(newData);
    setIsEditing(false);
    setEditType(null);
  };

  return (
    <div className="preface-postscript">
      <div className="card">
        <h2 className="card-title">📜 谱序后跋</h2>
        
        <div style={{ display: 'flex', gap: '10px', marginBottom: '20px' }}>
          <button
            className={`btn ${activeTab === 'preface' ? 'btn-primary' : 'btn-secondary'}`}
            onClick={() => setActiveTab('preface')}
          >
            📖 谱序
          </button>
          <button
            className={`btn ${activeTab === 'postscript' ? 'btn-primary' : 'btn-secondary'}`}
            onClick={() => setActiveTab('postscript')}
          >
            ✍️ 后跋
          </button>
        </div>

        {activeTab === 'preface' && (
          <div className="card" style={{ margin: 0 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
              <h3 style={{ margin: 0, color: '#8b4513', fontSize: '18px' }}>谱序</h3>
              <button className="btn btn-secondary" onClick={() => handleEdit('preface')}>
                ✏️ 编辑
              </button>
            </div>
            <div style={{ 
              lineHeight: '2.2', 
              fontSize: '16px', 
              fontFamily: 'KaiTi, serif',
              textAlign: 'justify',
              textIndent: '2em',
              whiteSpace: 'pre-wrap',
              color: '#333',
              background: '#faf8f3',
              padding: '25px',
              borderRadius: '8px'
            }}>
              {preface.content}
            </div>
            {preface.date && (
              <p style={{ textAlign: 'right', marginTop: '20px', color: '#666', fontStyle: 'italic' }}>
                {preface.date}
              </p>
            )}
            {preface.author && (
              <p style={{ textAlign: 'right', color: '#666', fontStyle: 'italic' }}>
                {preface.author}
              </p>
            )}
          </div>
        )}

        {activeTab === 'postscript' && (
          <div className="card" style={{ margin: 0 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
              <h3 style={{ margin: 0, color: '#8b4513', fontSize: '18px' }}>后跋</h3>
              <button className="btn btn-secondary" onClick={() => handleEdit('postscript')}>
                ✏️ 编辑
              </button>
            </div>
            <div style={{ 
              lineHeight: '2.2', 
              fontSize: '16px', 
              fontFamily: 'KaiTi, serif',
              textAlign: 'justify',
              textIndent: '2em',
              whiteSpace: 'pre-wrap',
              color: '#333',
              background: '#faf8f3',
              padding: '25px',
              borderRadius: '8px'
            }}>
              {postscript.content}
            </div>
            {postscript.date && (
              <p style={{ textAlign: 'right', marginTop: '20px', color: '#666', fontStyle: 'italic' }}>
                {postscript.date}
              </p>
            )}
            {postscript.author && (
              <p style={{ textAlign: 'right', color: '#666', fontStyle: 'italic' }}>
                {postscript.author}
              </p>
            )}
          </div>
        )}
      </div>

      {isEditing && (
        <div className="modal-overlay" onClick={() => setIsEditing(false)}>
          <div className="modal" onClick={(e) => e.stopPropagation()} style={{ maxWidth: '700px' }}>
            <div className="modal-header">
              <h3 className="modal-title">
                编辑{editType === 'preface' ? '谱序' : '后跋'}
              </h3>
              <button className="modal-close" onClick={() => setIsEditing(false)}>×</button>
            </div>
            <div className="form-group">
              <label className="form-label">内容</label>
              <textarea
                className="form-textarea"
                value={editContent}
                onChange={(e) => setEditContent(e.target.value)}
                style={{ minHeight: '300px', fontFamily: 'KaiTi, serif', fontSize: '16px', lineHeight: '2' }}
              />
            </div>
            <div style={{ display: 'flex', gap: '10px', justifyContent: 'flex-end', marginTop: '20px' }}>
              <button className="btn btn-secondary" onClick={() => setIsEditing(false)}>
                取消
              </button>
              <button className="btn btn-primary" onClick={handleSave}>
                保存
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default PrefacePostscript;
