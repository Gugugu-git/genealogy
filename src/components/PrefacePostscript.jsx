import React, { useState } from 'react';

function PrefacePostscript({ data, setData, saveData, addChangeLog, isAdmin }) {
  const [isEditing, setIsEditing] = useState(false);
  const [editType, setEditType] = useState(null);
  const [editContent, setEditContent] = useState('');
  const [editDate, setEditDate] = useState('');
  const [editAuthor, setEditAuthor] = useState('');
  const [activeTab, setActiveTab] = useState('preface');

  const preface = data.preface || {};
  const postscript = data.postscript || {};

  const handleEdit = (type) => {
    setEditType(type);
    const content = type === 'preface' ? preface : postscript;
    setEditContent(content.content || '');
    setEditDate(content.date || '');
    setEditAuthor(content.author || '');
    setIsEditing(true);
  };

  const handleSave = () => {
    const newData = { ...data };
    if (editType === 'preface') {
      newData.preface = {
        ...preface,
        content: editContent,
        date: editDate,
        author: editAuthor
      };
    } else {
      newData.postscript = {
        ...postscript,
        content: editContent,
        date: editDate,
        author: editAuthor
      };
    }
    
    setData(newData);
    
    addChangeLog({
      type: 'edit',
      module: editType === 'preface' ? '谱序' : '后跋',
      content: `修改了${editType === 'preface' ? '谱序' : '后跋'}内容`,
      editor: '当前用户'
    }, newData);
    
    setIsEditing(false);
    setEditType(null);
  };

  return (
    <div className="preface-postscript">
      <div className="card bg-white rounded-xl p-4 md:p-6 shadow-md border-2 border-cream-100">
        <h2 className="card-title text-xl md:text-2xl text-brown-800 font-bold mb-5 pb-2.5 border-b-2 border-cream-200">谱序后跋</h2>
        
        <div className="flex gap-2.5 mb-5 flex-wrap">
          <button
            className={`btn px-4 py-2.5 rounded-lg font-medium transition-all ${activeTab === 'preface' ? 'bg-gradient-to-br from-brown-800 to-brown-700 text-white hover:-translate-y-0.5 hover:shadow-lg' : 'bg-cream-200 text-brown-900 hover:bg-cream-100'}`}
            onClick={() => setActiveTab('preface')}
          >
            谱序
          </button>
          <button
            className={`btn px-4 py-2.5 rounded-lg font-medium transition-all ${activeTab === 'postscript' ? 'bg-gradient-to-br from-brown-800 to-brown-700 text-white hover:-translate-y-0.5 hover:shadow-lg' : 'bg-cream-200 text-brown-900 hover:bg-cream-100'}`}
            onClick={() => setActiveTab('postscript')}
          >
            后跋
          </button>
        </div>

        {activeTab === 'preface' && (
          <div className="card bg-white rounded-xl p-4 md:p-5">
            <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center gap-4 mb-5">
              <h3 className="text-brown-800 text-base md:text-lg font-medium m-0">谱序</h3>
              {isAdmin && (
                <button className="btn bg-cream-200 text-brown-900 hover:bg-cream-100 px-4 py-2 rounded-lg w-full sm:w-auto" onClick={() => handleEdit('preface')}>
                  编辑
                </button>
              )}
            </div>
            <div className="leading-loose text-xl md:text-2xl text-justify indent-8 whitespace-pre-wrap text-gray-800 bg-cream-50 p-6 md:p-7.5 rounded-lg" style={{ fontFamily: '"SimSun", "STSong", "宋体", "Songti SC", serif' }}>
              {preface.content}
            </div>
            {preface.date && (
              <p className="text-right mt-5 text-gray-600 italic">
                {preface.date}
              </p>
            )}
            {preface.author && (
              <p className="text-right text-gray-600 italic">
                {preface.author}
              </p>
            )}
          </div>
        )}

        {activeTab === 'postscript' && (
          <div className="card bg-white rounded-xl p-4 md:p-5">
            <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center gap-4 mb-5">
              <h3 className="text-brown-800 text-base md:text-lg font-medium m-0">后跋</h3>
              {isAdmin && (
                <button className="btn bg-cream-200 text-brown-900 hover:bg-cream-100 px-4 py-2 rounded-lg w-full sm:w-auto" onClick={() => handleEdit('postscript')}>
                  编辑
                </button>
              )}
            </div>
            <div className="leading-loose text-xl md:text-2xl text-justify indent-8 whitespace-pre-wrap text-gray-800 bg-cream-50 p-6 md:p-7.5 rounded-lg" style={{ fontFamily: '"SimSun", "STSong", "宋体", "Songti SC", serif' }}>
              {postscript.content}
            </div>
            {postscript.date && (
              <p className="text-right mt-5 text-gray-600 italic">
                {postscript.date}
              </p>
            )}
            {postscript.author && (
              <p className="text-right text-gray-600 italic">
                {postscript.author}
              </p>
            )}
          </div>
        )}
      </div>

      {isEditing && (
        <div className="modal-overlay fixed inset-0 bg-black/60 flex items-center justify-center z-[1000]" onClick={() => setIsEditing(false)}>
          <div className="modal bg-white rounded-2xl p-7.5 max-w-[700px] w-[90%] max-h-[90vh] overflow-y-auto shadow-2xl" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header flex justify-between items-center mb-5 pb-3.5 border-b-2 border-cream-200">
              <h3 className="modal-title text-xl text-brown-800 font-bold m-0">
                编辑{editType === 'preface' ? '谱序' : '后跋'}
              </h3>
              <button className="modal-close bg-none border-none text-3xl cursor-pointer text-gray-500 hover:text-brown-800 transition-colors p-0 leading-none" onClick={() => setIsEditing(false)}>×</button>
            </div>
            
            <div className="form-group mb-5">
              <label className="form-label block mb-2 font-medium text-brown-900">内容</label>
              <textarea
                className="form-textarea w-full p-3 border-2 border-cream-200 rounded-lg text-base font-serif transition-colors focus:outline-none focus:border-brown-800"
                value={editContent}
                onChange={(e) => setEditContent(e.target.value)}
                style={{ minHeight: '300px', fontFamily: 'KaiTi, serif', fontSize: '16px', lineHeight: '2' }}
              />
            </div>

            <div className="form-group mb-5">
              <label className="form-label block mb-2 font-medium text-brown-900">日期（可选）</label>
              <input
                type="text"
                className="form-input w-full p-3 border-2 border-cream-200 rounded-lg text-base transition-colors focus:outline-none focus:border-brown-800"
                value={editDate}
                onChange={(e) => setEditDate(e.target.value)}
                placeholder="例如：时公元二〇二六年岁次丙午孟春吉旦。"
              />
            </div>

            <div className="form-group mb-5">
              <label className="form-label block mb-2 font-medium text-brown-900">作者（可选）</label>
              <input
                type="text"
                className="form-input w-full p-3 border-2 border-cream-200 rounded-lg text-base transition-colors focus:outline-none focus:border-brown-800"
                value={editAuthor}
                onChange={(e) => setEditAuthor(e.target.value)}
                placeholder="例如：合族修谱人 谨识"
              />
            </div>

            <div className="flex gap-2.5 justify-end mt-5">
              <button className="btn bg-cream-200 text-brown-900 hover:bg-cream-100 px-5 py-2.5 rounded-lg" onClick={() => setIsEditing(false)}>
                取消
              </button>
              <button className="btn bg-gradient-to-br from-brown-800 to-brown-700 text-white hover:-translate-y-0.5 hover:shadow-lg px-5 py-2.5 rounded-lg" onClick={handleSave}>
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
