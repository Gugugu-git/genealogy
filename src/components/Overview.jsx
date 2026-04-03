import React from 'react';
import { useNavigate } from 'react-router-dom';

function Overview({ data }) {
  const navigate = useNavigate();

  const modules = [
    { id: 'catalog_1', name: '目录', path: '/', icon: '📋', desc: '查看宗谱完整目录结构' },
    { id: 'catalog_2', name: '第一章　源流', path: '/', icon: '🌊', desc: '追溯胡氏家族的起源与迁徙' },
    { id: 'catalog_3', name: '第二章　谱序', path: '/preface', icon: '📜', desc: '族谱序言，记载修谱缘由与宗旨' },
    { id: 'catalog_4', name: '第三章　凡例', path: '/rules', icon: '📏', desc: '族谱编写规范与原则' },
    { id: 'catalog_5', name: '第四章　家训族规', path: '/', icon: '🏛️', desc: '家族训诫与行为规范' },
    { id: 'catalog_6', name: '第五章　字辈', path: '/generation', icon: '📖', desc: '胡氏字辈排行与查询' },
    { id: 'catalog_7', name: '第六章　谱系', path: '/genealogy', icon: '🌳', desc: '1-6世完整世系图' },
    { id: 'catalog_8', name: '第七章　后跋', path: '/preface', icon: '✍️', desc: '修谱完成后记' },
  ];

  const getPersonCount = () => {
    return data.genealogy ? data.genealogy.length : 0;
  };

  const getGenerationCount = () => {
    if (!data.genealogy) return 0;
    const generations = new Set(data.genealogy.map(p => p.generation));
    return generations.size;
  };

  return (
    <div className="overview">
      {data.preface && (
        <div className="card">
          <h2 className="card-title">📜 谱序</h2>
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
            {data.preface.content}
          </div>
          {data.preface.date && (
            <p style={{ textAlign: 'right', marginTop: '20px', color: '#666', fontStyle: 'italic' }}>
              {data.preface.date}
            </p>
          )}
          {data.preface.author && (
            <p style={{ textAlign: 'right', color: '#666', fontStyle: 'italic' }}>
              {data.preface.author}
            </p>
          )}
        </div>
      )}

      <div className="card">
        <h2 className="card-title">📚 族谱总览</h2>
        <div className="stats-grid" style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '20px', marginBottom: '30px' }}>
          <div style={{ background: 'linear-gradient(135deg, #8b4513 0%, #a0522d 100%)', padding: '20px', borderRadius: '12px', color: 'white', textAlign: 'center' }}>
            <div style={{ fontSize: '36px', fontWeight: 'bold' }}>{getPersonCount()}</div>
            <div>入谱人数</div>
          </div>
          <div style={{ background: 'linear-gradient(135deg, #5d4037 0%, #795548 100%)', padding: '20px', borderRadius: '12px', color: 'white', textAlign: 'center' }}>
            <div style={{ fontSize: '36px', fontWeight: 'bold' }}>{getGenerationCount()}</div>
            <div>世系代数</div>
          </div>
          <div style={{ background: 'linear-gradient(135deg, #4e342e 0%, #6d4c41 100%)', padding: '20px', borderRadius: '12px', color: 'white', textAlign: 'center' }}>
            <div style={{ fontSize: '36px', fontWeight: 'bold' }}>继相</div>
            <div>始祖</div>
          </div>
        </div>
      </div>

      <div className="card">
        <h2 className="card-title">📋 目录导航</h2>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: '15px' }}>
          {modules.map((module) => (
            <div
              key={module.id}
              className="card"
              style={{ margin: 0, cursor: 'pointer', transition: 'all 0.3s' }}
              onClick={() => module.path !== '/' && navigate(module.path)}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                <span style={{ fontSize: '28px' }}>{module.icon}</span>
                <div>
                  <h3 style={{ fontSize: '16px', color: '#8b4513', margin: 0, marginBottom: '5px' }}>{module.name}</h3>
                  <p style={{ fontSize: '13px', color: '#666', margin: 0 }}>{module.desc}</p>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>

      <div className="card">
        <h2 className="card-title">🏠 始祖简介</h2>
        {data.genealogy && data.genealogy[0] && (
          <div className="person-card card" style={{ padding: '20px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'start' }}>
              <div>
                <h3 style={{ fontSize: '20px', color: '#8b4513', margin: 0, marginBottom: '10px' }}>
                  第{data.genealogy[0].generation}世　{data.genealogy[0].name}
                  {data.genealogy[0].title && <span style={{ marginLeft: '10px', fontSize: '14px', color: '#666' }}>({data.genealogy[0].title})</span>}
                </h3>
                {data.genealogy[0].birth && <p style={{ margin: '5px 0', color: '#555' }}>{data.genealogy[0].birth}</p>}
                {data.genealogy[0].spouse && data.genealogy[0].spouse.length > 0 && (
                  <p style={{ margin: '5px 0', color: '#555' }}>
                    配：{data.genealogy[0].spouse.map(s => s.name).join('、')}
                  </p>
                )}
              </div>
              <button className="btn btn-primary" onClick={() => navigate('/genealogy')}>
                查看世系 →
              </button>
            </div>
          </div>
        )}
      </div>

      {data.postscript && (
        <div className="card">
          <h2 className="card-title">✍️ 后跋</h2>
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
            {data.postscript.content}
          </div>
          {data.postscript.date && (
            <p style={{ textAlign: 'right', marginTop: '20px', color: '#666', fontStyle: 'italic' }}>
              {data.postscript.date}
            </p>
          )}
          {data.postscript.author && (
            <p style={{ textAlign: 'right', color: '#666', fontStyle: 'italic' }}>
              {data.postscript.author}
            </p>
          )}
        </div>
      )}
    </div>
  );
}

export default Overview;
