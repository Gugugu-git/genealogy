import React, { useState } from 'react';

function Genealogy({ data, setData, saveData, addChangeLog }) {
  const [viewMode, setViewMode] = useState('tree');
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedGeneration, setSelectedGeneration] = useState('all');
  const [selectedPerson, setSelectedPerson] = useState(null);
  const [expandedNodes, setExpandedNodes] = useState(new Set(['person_1']));

  const buildTree = () => {
    if (!data.genealogy) return [];
    
    const personMap = new Map();
    data.genealogy.forEach(p => personMap.set(p.id, { ...p, children: [] }));
    
    const roots = [];
    data.genealogy.forEach(person => {
      const node = personMap.get(person.id);
      if (person.generation === 1) {
        roots.push(node);
      } else {
        const parent = data.genealogy.find(p => 
          p.children?.some(c => c.id === person.id) ||
          p.daughters?.some(d => d.id === person.id) ||
          p.heirs?.some(h => h.id === person.id)
        );
        if (parent) {
          const parentNode = personMap.get(parent.id);
          parentNode.children.push(node);
        }
      }
    });
    
    return roots;
  };

  const toggleExpand = (id) => {
    const newExpanded = new Set(expandedNodes);
    if (newExpanded.has(id)) {
      newExpanded.delete(id);
    } else {
      newExpanded.add(id);
    }
    setExpandedNodes(newExpanded);
  };

  const renderTreeNode = (node, level = 0) => {
    const isExpanded = expandedNodes.has(node.id);
    const hasChildren = node.children && node.children.length > 0;

    return (
      <div key={node.id} style={{ marginLeft: level * 30 }}>
        <div
          className="tree-node"
          style={{
            padding: '12px 16px',
            margin: '8px 0',
            background: '#fff',
            borderRadius: '8px',
            border: '2px solid #e8dcc8',
            display: 'flex',
            alignItems: 'center',
            gap: '10px'
          }}
          onClick={() => setSelectedPerson(node)}
        >
          {hasChildren && (
            <span
              style={{ cursor: 'pointer', fontSize: '12px', width: '20px' }}
              onClick={(e) => {
                e.stopPropagation();
                toggleExpand(node.id);
              }}
            >
              {isExpanded ? '▼' : '▶'}
            </span>
          )}
          {!hasChildren && <span style={{ width: '20px' }}></span>}
          <span style={{ 
            background: '#8b4513', 
            color: 'white', 
            padding: '2px 8px', 
            borderRadius: '4px', 
            fontSize: '12px'
          }}>
            第{node.generation}世
          </span>
          <span style={{ fontWeight: 'bold', fontSize: '16px', color: '#5c4033' }}>
            {node.name}
          </span>
          {node.styleName && (
            <span style={{ color: '#888', fontSize: '13px' }}>
              号 {node.styleName}
            </span>
          )}
          {node.title && (
            <span style={{ color: '#a0522d', fontSize: '13px' }}>
              ({node.title})
            </span>
          )}
        </div>
        {isExpanded && hasChildren && (
          <div>
            {node.children.map(child => renderTreeNode(child, level + 1))}
          </div>
        )}
      </div>
    );
  };

  const filterPersons = () => {
    if (!data.genealogy) return [];
    
    return data.genealogy.filter(person => {
      const matchesSearch = !searchTerm || 
        person.name.includes(searchTerm) ||
        (person.styleName && person.styleName.includes(searchTerm)) ||
        (person.title && person.title.includes(searchTerm));
      
      const matchesGeneration = selectedGeneration === 'all' || 
        person.generation === parseInt(selectedGeneration);
      
      return matchesSearch && matchesGeneration;
    });
  };

  const getSpecialTags = (person) => {
    const tags = [];
    if (person.notes) {
      if (person.notes.includes('早夭')) {
        tags.push({ type: 'early-death', text: '早夭' });
      }
      if (person.notes.includes('适')) {
        tags.push({ type: 'married', text: '适嫁' });
      }
      if (person.notes.includes('嗣子') || person.heirs) {
        tags.push({ type: 'adopted', text: '嗣子' });
      }
      if (person.name === '某某') {
        tags.push({ type: 'unknown', text: '未命名' });
      }
    }
    return tags;
  };

  const generations = data.genealogy ? 
    [...new Set(data.genealogy.map(p => p.generation))].sort((a, b) => a - b) : [];

  return (
    <div className="genealogy">
      <div className="card">
        <h2 className="card-title">🌳 世系展示</h2>
        
        <div style={{ display: 'flex', gap: '15px', marginBottom: '20px', flexWrap: 'wrap' }}>
          <div style={{ display: 'flex', gap: '10px', background: '#f5f0e6', padding: '5px', borderRadius: '8px' }}>
            <button
              className={`btn ${viewMode === 'tree' ? 'btn-primary' : 'btn-secondary'}`}
              onClick={() => setViewMode('tree')}
              style={{ borderRadius: '6px' }}
            >
              🌲 树形结构
            </button>
            <button
              className={`btn ${viewMode === 'list' ? 'btn-primary' : 'btn-secondary'}`}
              onClick={() => setViewMode('list')}
              style={{ borderRadius: '6px' }}
            >
              📋 文字列表
            </button>
          </div>
        </div>

        <div style={{ display: 'flex', gap: '15px', marginBottom: '20px', flexWrap: 'wrap' }}>
          <input
            type="text"
            className="form-input"
            placeholder="搜索姓名、号、字辈..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            style={{ flex: 1, minWidth: '200px' }}
          />
          <select
            className="form-select"
            value={selectedGeneration}
            onChange={(e) => setSelectedGeneration(e.target.value)}
            style={{ width: '150px' }}
          >
            <option value="all">全部世代</option>
            {generations.map(g => (
              <option key={g} value={g}>第{g}世</option>
            ))}
          </select>
        </div>

        {viewMode === 'tree' && (
          <div className="card" style={{ background: '#faf8f3' }}>
            {buildTree().map(root => renderTreeNode(root))}
          </div>
        )}

        {viewMode === 'list' && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '15px' }}>
            {filterPersons().map(person => (
              <div
                key={person.id}
                className="person-card card"
                style={{ margin: 0, cursor: 'pointer' }}
                onClick={() => setSelectedPerson(person)}
              >
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'start' }}>
                  <div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '10px' }}>
                      <span style={{ 
                        background: '#8b4513', 
                        color: 'white', 
                        padding: '4px 12px', 
                        borderRadius: '4px', 
                        fontSize: '14px',
                        fontWeight: 'bold'
                      }}>
                        第{person.generation}世
                      </span>
                      <h3 style={{ fontSize: '18px', color: '#5c4033', margin: 0 }}>
                        {person.name}
                        {person.styleName && <span style={{ fontWeight: 'normal', fontSize: '14px', color: '#888' }}>　号 {person.styleName}</span>}
                      </h3>
                      {getSpecialTags(person).map((tag, idx) => (
                        <span key={idx} className={`special-tag tag-${tag.type}`}>
                          {tag.text}
                        </span>
                      ))}
                    </div>
                    {person.title && <p style={{ margin: '5px 0', color: '#a0522d' }}>{person.title}</p>}
                    {person.birth && <p style={{ margin: '5px 0', color: '#555' }}>{person.birth}</p>}
                    {person.death && <p style={{ margin: '5px 0', color: '#555' }}>{person.death}</p>}
                    {person.birthplace && <p style={{ margin: '5px 0', color: '#666', fontSize: '13px' }}>出生地：{person.birthplace}</p>}
                    {person.spouse && person.spouse.length > 0 && (
                      <p style={{ margin: '8px 0', color: '#555' }}>
                        {person.spouse.map((s, i) => (
                          <span key={i}>
                            {i > 0 && '　'}
                            {s.type}：{s.name}
                            {s.birth && `　${s.birth}`}
                            {s.death && `　${s.death}`}
                          </span>
                        ))}
                      </p>
                    )}
                    {person.notes && <p style={{ margin: '8px 0', color: '#666', fontStyle: 'italic' }}>{person.notes}</p>}
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {selectedPerson && (
        <div className="modal-overlay" onClick={() => setSelectedPerson(null)}>
          <div className="modal" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h3 className="modal-title">
                第{selectedPerson.generation}世　{selectedPerson.name}
                {selectedPerson.styleName && `　号 ${selectedPerson.styleName}`}
              </h3>
              <button className="modal-close" onClick={() => setSelectedPerson(null)}>×</button>
            </div>
            <div style={{ lineHeight: '2' }}>
              {selectedPerson.title && (
                <p><strong>身份：</strong>{selectedPerson.title}</p>
              )}
              {selectedPerson.birth && (
                <p><strong>出生：</strong>{selectedPerson.birth}</p>
              )}
              {selectedPerson.death && (
                <p><strong>逝世：</strong>{selectedPerson.death}</p>
              )}
              {selectedPerson.birthplace && (
                <p><strong>出生地：</strong>{selectedPerson.birthplace}</p>
              )}
              {selectedPerson.burial && (
                <p><strong>安葬：</strong>{selectedPerson.burial}</p>
              )}
              {selectedPerson.spouse && selectedPerson.spouse.length > 0 && (
                <div>
                  <strong>配偶：</strong>
                  {selectedPerson.spouse.map((s, i) => (
                    <div key={i} style={{ marginLeft: '20px' }}>
                      {s.type}：{s.name}
                      {s.birth && <div style={{ color: '#666' }}>{s.birth}</div>}
                      {s.death && <div style={{ color: '#666' }}>{s.death}</div>}
                      {s.birthplace && <div style={{ color: '#666' }}>出生地：{s.birthplace}</div>}
                    </div>
                  ))}
                </div>
              )}
              {selectedPerson.children && selectedPerson.children.length > 0 && (
                <p><strong>子嗣：</strong>{selectedPerson.children.map(c => c.name).join('、')}</p>
              )}
              {selectedPerson.daughters && selectedPerson.daughters.length > 0 && (
                <p><strong>女儿：</strong>{selectedPerson.daughters.map(d => d.name).join('、')}</p>
              )}
              {selectedPerson.heirs && selectedPerson.heirs.length > 0 && (
                <p><strong>嗣子：</strong>{selectedPerson.heirs.map(h => h.name).join('、')}</p>
              )}
              {selectedPerson.notes && (
                <p><strong>备注：</strong>{selectedPerson.notes}</p>
              )}
            </div>
            <div style={{ marginTop: '20px', textAlign: 'right' }}>
              <button className="btn btn-secondary" onClick={() => setSelectedPerson(null)}>
                关闭
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default Genealogy;
