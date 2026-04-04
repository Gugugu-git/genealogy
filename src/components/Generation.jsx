import React, { useState } from 'react';

function Generation({ data }) {
  const [selectedChar, setSelectedChar] = useState(null);

  const generationPoem = data.generation?.poem?.split('\n') || [];
  const generationChars = data.generation?.characters || [];

  const getPersonsByGenerationChar = (char) => {
    if (!data.genealogy) return [];
    const charIndex = generationChars.indexOf(char);
    if (charIndex === -1) return [];
    const generation = charIndex - 3; // 第5个字（索引4）对应第1世，所以索引-3
    if (generation < 1) return []; // 前4个字辈不可考
    return data.genealogy.filter(person => person.generation === generation);
  };

  return (
    <div className="generation">
      <div className="card">
        <h2 className="card-title">📖 字辈查询</h2>
        
        <div className="card" style={{ background: 'linear-gradient(135deg, #faf8f3 0%, #f5f0e6 100%)', marginBottom: '20px' }}>
          <h3 style={{ color: '#8b4513', marginBottom: '15px', fontSize: '18px' }}>字辈诗</h3>
          <div style={{ textAlign: 'center', fontSize: '20px', lineHeight: '2.5', fontFamily: 'KaiTi, serif' }}>
            {generationPoem.map((line, idx) => (
              <div key={idx} style={{ letterSpacing: '8px' }}>{line}</div>
            ))}
          </div>
        </div>

        <div className="card" style={{ marginBottom: '20px' }}>
          <h3 style={{ color: '#8b4513', marginBottom: '15px', fontSize: '18px' }}>字辈表</h3>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: '10px' }}>
            {generationChars.map((char, idx) => {
              const persons = getPersonsByGenerationChar(char);
              return (
                <div
                  key={idx}
                  style={{
                    width: '60px',
                    height: '60px',
                    display: 'flex',
                    flexDirection: 'column',
                    alignItems: 'center',
                    justifyContent: 'center',
                    background: selectedChar === char ? 'linear-gradient(135deg, #8b4513 0%, #a0522d 100%)' : '#fff',
                    color: selectedChar === char ? 'white' : '#5c4033',
                    borderRadius: '10px',
                    cursor: 'pointer',
                    transition: 'all 0.3s',
                    border: '2px solid ' + (selectedChar === char ? '#8b4513' : '#d4c4a8'),
                    boxShadow: selectedChar === char ? '0 4px 12px rgba(139, 69, 19, 0.3)' : 'none'
                  }}
                  onClick={() => setSelectedChar(selectedChar === char ? null : char)}
                >
                  <span style={{ fontSize: '24px', fontWeight: 'bold' }}>{char}</span>
                  <span style={{ fontSize: '11px', opacity: 0.8 }}>第{idx + 1}字</span>
                  {persons.length > 0 && (
                    <span style={{ fontSize: '10px', position: 'absolute', top: '-5px', right: '-5px', background: '#e53935', color: 'white', width: '20px', height: '20px', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                      {persons.length}
                    </span>
                  )}
                </div>
              );
            })}
          </div>
        </div>

        {selectedChar && (
          <div className="card">
            <h3 style={{ color: '#8b4513', marginBottom: '15px', fontSize: '18px' }}>
              字辈「{selectedChar}」相关人物
            </h3>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
              {getPersonsByGenerationChar(selectedChar).map(person => (
                <div key={person.id} className="person-card card" style={{ margin: 0, padding: '15px' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                    <span style={{ 
                      background: '#8b4513', 
                      color: 'white', 
                      padding: '4px 10px', 
                      borderRadius: '4px', 
                      fontSize: '13px'
                    }}>
                      第{person.generation}世
                    </span>
                    <span style={{ fontSize: '18px', fontWeight: 'bold', color: '#5c4033' }}>
                      {person.name}
                    </span>
                    {person.styleName && (
                      <span style={{ color: '#888' }}>号 {person.styleName}</span>
                    )}
                    {person.title && (
                      <span style={{ color: '#a0522d', fontSize: '13px' }}>({person.title})</span>
                    )}
                  </div>
                  {person.birth && <p style={{ margin: '8px 0 0 0', color: '#666', fontSize: '13px' }}>{person.birth}</p>}
                </div>
              ))}
              {getPersonsByGenerationChar(selectedChar).length === 0 && (
                <p style={{ textAlign: 'center', color: '#888', padding: '30px' }}>
                  暂未找到使用此时辈的人物
                </p>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

export default Generation;
