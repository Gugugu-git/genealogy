import React, { useState } from 'react';

function Genealogy({ data, setData, saveData, addChangeLog, isAdmin = false }) {
  const [viewMode, setViewMode] = useState('tree');
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedGeneration, setSelectedGeneration] = useState('all');
  const [selectedPerson, setSelectedPerson] = useState(null);
  const [expandedNodes, setExpandedNodes] = useState(new Set(['person_1']));
  const [draggedNode, setDraggedNode] = useState(null);
  const [dropTarget, setDropTarget] = useState(null);
  const [editMode, setEditMode] = useState(false);

  const buildTree = () => {
    if (!data.genealogy) return [];
    
    const personMap = new Map();
    data.genealogy.forEach(p => personMap.set(p.id, { ...p, children: [] }));
    
    const roots = [];
    const connectedIds = new Set();
    
    data.genealogy.forEach(person => {
      if (person.generation === 1) {
        const node = personMap.get(person.id);
        roots.push(node);
        connectedIds.add(person.id);
      }
    });
    
    data.genealogy.forEach(person => {
      if (person.generation === 1) return;
      
      const node = personMap.get(person.id);
      const parent = data.genealogy.find(p => {
        const children = p.children || [];
        const daughters = p.daughters || [];
        const heirs = p.heirs || [];
        
        const allChildren = [...children, ...daughters, ...heirs];
        return allChildren.some(c => {
          if (typeof c === 'string') {
            return c === person.id;
          }
          return c.id === person.id;
        });
      });
      
      if (parent) {
        const parentNode = personMap.get(parent.id);
        parentNode.children.push(node);
        connectedIds.add(person.id);
      }
    });
    
    data.genealogy.forEach(person => {
      if (!connectedIds.has(person.id)) {
        const node = personMap.get(person.id);
        roots.push(node);
      }
    });
    
    roots.sort((a, b) => a.generation - b.generation);
    
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

  const isDescendantOf = (nodeId, targetId, genealogyData) => {
    if (nodeId === targetId) return true;
    const node = genealogyData.find(p => p.id === nodeId);
    if (!node || !node.parentId) return false;
    return isDescendantOf(node.parentId, targetId, genealogyData);
  };

  const getSubtreeIds = (personId, genealogyData) => {
    const ids = new Set([personId]);
    const queue = [personId];
    
    while (queue.length > 0) {
      const currentId = queue.shift();
      const currentPerson = genealogyData.find(p => p.id === currentId);
      if (currentPerson) {
        (currentPerson.children || []).forEach(childRef => {
          const childId = childRef.id || childRef;
          if (!ids.has(childId)) {
            ids.add(childId);
            queue.push(childId);
          }
        });
        (currentPerson.daughters || []).forEach(daughterRef => {
          const daughterId = daughterRef.id || daughterRef;
          if (!ids.has(daughterId)) {
            ids.add(daughterId);
            queue.push(daughterId);
          }
        });
        (currentPerson.heirs || []).forEach(heirRef => {
          const heirId = heirRef.id || heirRef;
          if (!ids.has(heirId)) {
            ids.add(heirId);
            queue.push(heirId);
          }
        });
      }
    }
    
    return ids;
  };

  const recalculateGeneration = (personId, newParentGeneration, genealogyData) => {
    const updates = {};
    const queue = [{ id: personId, generation: newParentGeneration + 1 }];
    
    while (queue.length > 0) {
      const { id, generation } = queue.shift();
      updates[id] = generation;
      
      const person = genealogyData.find(p => p.id === id);
      if (person) {
        (person.children || []).forEach(childRef => {
          const childId = childRef.id || childRef;
          if (!updates[childId]) {
            queue.push({ id: childId, generation: generation + 1 });
          }
        });
        (person.daughters || []).forEach(daughterRef => {
          const daughterId = daughterRef.id || daughterRef;
          if (!updates[daughterId]) {
            queue.push({ id: daughterId, generation: generation + 1 });
          }
        });
        (person.heirs || []).forEach(heirRef => {
          const heirId = heirRef.id || heirRef;
          if (!updates[heirId]) {
            queue.push({ id: heirId, generation: generation + 1 });
          }
        });
      }
    }
    
    return updates;
  };

  const handleDragStart = (e, node) => {
    setDraggedNode(node);
    e.dataTransfer.effectAllowed = 'move';
    e.dataTransfer.setData('text/plain', node.id);
    setTimeout(() => {
      e.target.style.opacity = '0.5';
    }, 0);
  };

  const handleDragEnd = (e) => {
    e.target.style.opacity = '1';
    setDraggedNode(null);
    setDropTarget(null);
  };

  const handleDragOver = (e, targetNode) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';
    
    if (draggedNode && targetNode.id !== draggedNode.id && !isDescendantOf(targetNode.id, draggedNode.id, data.genealogy)) {
      setDropTarget(targetNode);
    } else {
      setDropTarget(null);
    }
  };

  const handleDragLeave = (e) => {
    setDropTarget(null);
  };

  const handleDrop = async (e, targetNode) => {
    e.preventDefault();
    
    if (!draggedNode || !targetNode || draggedNode.id === targetNode.id) {
      setDropTarget(null);
      return;
    }
    
    if (isDescendantOf(targetNode.id, draggedNode.id, data.genealogy)) {
      alert('不能将父节点移动到其子节点下！');
      setDropTarget(null);
      return;
    }

    const oldParent = data.genealogy.find(p => 
      p.children?.some(c => c.id === draggedNode.id) ||
      p.daughters?.some(d => d.id === draggedNode.id) ||
      p.heirs?.some(h => h.id === draggedNode.id)
    );

    let updatedGenealogy = [...data.genealogy];
    
    if (oldParent) {
      updatedGenealogy = updatedGenealogy.map(p => {
        if (p.id === oldParent.id) {
          return {
            ...p,
            children: (p.children || []).filter(c => c.id !== draggedNode.id),
            daughters: (p.daughters || []).filter(d => d.id !== draggedNode.id),
            heirs: (p.heirs || []).filter(h => h.id !== draggedNode.id)
          };
        }
        return p;
      });
    }

    const newParentGeneration = targetNode.generation;
    const generationUpdates = recalculateGeneration(draggedNode.id, newParentGeneration, updatedGenealogy);
    
    updatedGenealogy = updatedGenealogy.map(p => {
      if (generationUpdates[p.id]) {
        return { ...p, generation: generationUpdates[p.id], parentId: targetNode.id };
      }
      if (p.id === targetNode.id) {
        const existingChildren = p.children || [];
        const existingDaughters = p.daughters || [];
        const draggedPerson = updatedGenealogy.find(dp => dp.id === draggedNode.id);
        
        if (draggedPerson && draggedPerson.gender === 'female') {
          if (!existingDaughters.some(d => d.id === draggedNode.id)) {
            return { 
              ...p, 
              daughters: [...existingDaughters, { id: draggedNode.id, name: draggedPerson.name }] 
            };
          }
        } else {
          if (!existingChildren.some(c => c.id === draggedNode.id)) {
            return { 
              ...p, 
              children: [...existingChildren, { id: draggedNode.id, name: draggedPerson.name }] 
            };
          }
        }
      }
      return p;
    });

    const newData = { ...data, genealogy: updatedGenealogy };
    setData(newData);
    
    try {
      await saveData(newData);
      addChangeLog({
        type: 'edit',
        module: '世系管理',
        content: `将「${draggedNode.name}」（第${draggedNode.generation}世）移动到「${targetNode.name}」（第${targetNode.generation}世）下，新世代为第${generationUpdates[draggedNode.id]}世`,
        editor: '当前用户',
        details: {
          movedPerson: { id: draggedNode.id, name: draggedNode.name },
          fromParent: oldParent ? { id: oldParent.id, name: oldParent.name } : null,
          toParent: { id: targetNode.id, name: targetNode.name },
          oldGeneration: draggedNode.generation,
          newGeneration: generationUpdates[draggedNode.id],
          affectedNodes: Object.keys(generationUpdates).length
        }
      }, newData);
    } catch (error) {
      console.error('保存失败:', error);
    }

    setDraggedNode(null);
    setDropTarget(null);
  };

  const renderTreeNode = (node, level = 0) => {
    const isExpanded = expandedNodes.has(node.id);
    const hasChildren = node.children && node.children.length > 0;
    const isBeingDragged = draggedNode?.id === node.id;
    const isValidDropTarget = dropTarget?.id === node.id;
    const canDrag = isAdmin && editMode;

    return (
      <div key={node.id} className="ml-[15px] md:ml-[30px]">
        <div
          className={`tree-node bg-white rounded-lg border-2 flex items-center gap-2 md:gap-2.5 p-2 md:p-3 my-1 md:my-2 cursor-pointer transition-all ${
            isBeingDragged 
              ? 'opacity-50 border-dashed border-gray-400' 
              : isValidDropTarget && canDrag
                ? 'border-green-500 bg-green-50 shadow-lg scale-[1.02]'
                : 'border-cream-200 hover:border-brown-800 hover:shadow-md'
          }`}
          onClick={() => setSelectedPerson(node)}
          draggable={canDrag}
          onDragStart={canDrag ? (e) => handleDragStart(e, node) : undefined}
          onDragEnd={canDrag ? handleDragEnd : undefined}
          onDragOver={canDrag ? (e) => handleDragOver(e, node) : undefined}
          onDragLeave={canDrag ? handleDragLeave : undefined}
          onDrop={canDrag ? (e) => handleDrop(e, node) : undefined}
        >
          {hasChildren && (
            <span
              className="cursor-pointer text-xs md:text-sm w-5 md:w-5 flex-shrink-0"
              onClick={(e) => {
                e.stopPropagation();
                toggleExpand(node.id);
              }}
            >
              {isExpanded ? '收起' : '展开'}
            </span>
          )}
          {!hasChildren && <span className="w-5 md:w-5 flex-shrink-0"></span>}
          <span className="bg-brown-800 text-white px-1.5 md:px-2 py-0.5 md:py-1 rounded text-xs md:text-sm flex-shrink-0">
            第{node.generation}世
          </span>
          <span className="font-bold text-sm md:text-base text-brown-900 flex-1 min-w-0 truncate">
            {node.name}
          </span>
          {isValidDropTarget && (
            <span className="text-green-600 text-xs font-medium animate-pulse">放置到此处</span>
          )}
          {node.styleName && (
            <span className="text-gray-600 text-xs md:text-sm hidden sm:inline-flex flex-shrink-0">
              号 {node.styleName}
            </span>
          )}
          {node.title && (
            <span className="text-brown-700 text-xs md:text-sm hidden md:inline-flex flex-shrink-0">
              ({node.title})
            </span>
          )}
          {!isBeingDragged && canDrag && (
            <span className="text-gray-400 text-xs hidden sm:block cursor-grab active:cursor-grabbing" title="拖动此节点到其他位置">
              ⠿
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
      <div className="card bg-white rounded-xl p-4 md:p-6 shadow-md border-2 border-cream-100">
        <h2 className="card-title text-lg md:text-xl text-brown-800 font-bold mb-4 md:mb-5 pb-2 border-b-2 border-cream-200">世系展示</h2>
        
        <div className="flex gap-3 md:gap-4 mb-3 md:mb-4 items-center flex-wrap">
          <div className="flex gap-2 bg-cream-50 p-1.5 rounded-lg">
            <button
              className={`btn px-3 py-1.5 md:px-4 md:py-2 rounded-md text-sm md:text-base font-medium transition-all ${viewMode === 'tree' ? 'bg-gradient-to-br from-brown-800 to-brown-700 text-white hover:-translate-y-0.5 hover:shadow-lg' : 'bg-cream-200 text-brown-900 hover:bg-cream-100'}`}
              onClick={() => setViewMode('tree')}
            >
              树形结构
            </button>
            <button
              className={`btn px-3 py-1.5 md:px-4 md:py-2 rounded-md text-sm md:text-base font-medium transition-all ${viewMode === 'list' ? 'bg-gradient-to-br from-brown-800 to-brown-700 text-white hover:-translate-y-0.5 hover:shadow-lg' : 'bg-cream-200 text-brown-900 hover:bg-cream-100'}`}
              onClick={() => setViewMode('list')}
            >
              文字列表
            </button>
          </div>
          
          {isAdmin && (
            <button
              onClick={() => setEditMode(!editMode)}
              className={`flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs md:text-sm font-medium transition-all border ${
                editMode 
                  ? 'bg-green-50 border-green-500 text-green-700 hover:bg-green-100' 
                  : 'bg-gray-50 border-gray-300 text-gray-600 hover:bg-gray-100'
              }`}
            >
              <span className={`w-8 h-4.5 rounded-full relative transition-colors flex items-center ${editMode ? 'bg-green-500' : 'bg-gray-300'}`}>
                <span className={`absolute w-3.5 h-3.5 rounded-full bg-white shadow transition-transform ${editMode ? 'translate-x-3.5' : 'translate-x-0.5'} top-1/2 -translate-y-1/2`}></span>
              </span>
              {editMode ? '编辑中' : '编辑'}
            </button>
          )}
          
          {isAdmin && editMode && viewMode === 'tree' && (
            <div className="text-xs text-green-700 bg-green-50 px-3 py-1.5 rounded-lg animate-pulse">
              拖拽模式已开启 - 可拖动节点调整父子关系
            </div>
          )}
          
          {!isAdmin && viewMode === 'tree' && (
            <div className="text-xs text-gray-400 bg-gray-100 px-3 py-1.5 rounded-lg">
              需管理员权限才能使用拖拽功能
            </div>
          )}
        </div>

        {viewMode === 'tree' && (
          <div className="card bg-cream-50 rounded-xl p-3 md:p-4">
            {buildTree().map(root => renderTreeNode(root))}
          </div>
        )}

        {viewMode === 'list' && (
          <>
            <div className="flex gap-3 md:gap-4 mb-4 md:mb-5 flex-wrap flex-col sm:flex-row">
              <input
                type="text"
                className="form-input flex-1 min-w-[150px] p-2 md:p-3 border-2 border-cream-200 rounded-lg text-sm md:text-base focus:outline-none focus:border-brown-800"
                placeholder="搜索姓名、号、字辈..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
              />
              <select
                className="form-select w-full sm:w-[120px] md:w-[150px] p-2 md:p-3 border-2 border-cream-200 rounded-lg text-sm md:text-base focus:outline-none focus:border-brown-800"
                value={selectedGeneration}
                onChange={(e) => setSelectedGeneration(e.target.value)}
              >
                <option value="all">全部世代</option>
                {generations.map(g => (
                  <option key={g} value={g}>第{g}世</option>
                ))}
              </select>
            </div>
            
            <div className="flex flex-col gap-3 md:gap-4">
              {filterPersons().map(person => (
                <div
                  key={person.id}
                  className="person-card card bg-gradient-to-br from-white to-cream-50 rounded-xl p-3 md:p-4 border-l-4 border-brown-800 cursor-pointer hover:shadow-lg hover:-translate-y-0.5 transition-all"
                  onClick={() => setSelectedPerson(person)}
                >
                  <div className="flex flex-col justify-between items-start">
                    <div className="w-full">
                      <div className="flex flex-wrap items-center gap-2 md:gap-2.5 mb-2 md:mb-2.5">
                        <span className="bg-brown-800 text-white px-2.5 md:px-3 py-1 md:py-1.5 rounded text-xs md:text-sm font-bold flex-shrink-0">
                          第{person.generation}世
                        </span>
                        <h3 className="text-base md:text-lg text-brown-900 m-0 font-medium">
                          {person.name}
                          {person.styleName && <span className="font-normal text-xs md:text-sm text-gray-600 ml-2">号 {person.styleName}</span>}
                        </h3>
                        {getSpecialTags(person).map((tag, idx) => (
                          <span key={idx} className={`special-tag tag-${tag.type} text-xs`}>
                            {tag.text}
                          </span>
                        ))}
                      </div>
                      {person.title && <p className="my-1 text-brown-700 text-sm md:text-base">{person.title}</p>}
                      {person.birth && <p className="my-1 text-gray-700 text-sm md:text-base">{person.birth}</p>}
                      {person.death && <p className="my-1 text-gray-700 text-sm md:text-base">{person.death}</p>}
                      {person.birthplace && <p className="my-1 text-gray-600 text-xs md:text-sm">出生地：{person.birthplace}</p>}
                      {person.spouse && person.spouse.length > 0 && (
                        <p className="my-2 text-gray-700 text-sm md:text-base">
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
                      {person.notes && <p className="my-2 text-gray-600 italic text-sm md:text-base">{person.notes}</p>}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </>
        )}
      </div>

      {selectedPerson && (
        <div className="modal-overlay fixed inset-0 bg-black/60 flex items-center justify-center z-[1000]" onClick={() => setSelectedPerson(null)}>
          <div className="modal bg-white rounded-2xl p-5 md:p-7.5 max-w-[90%] w-[500px] max-h-[90vh] overflow-y-auto shadow-2xl" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header flex justify-between items-center mb-4 md:mb-5 pb-2.5 md:pb-3.5 border-b-2 border-cream-200">
              <h3 className="modal-title text-lg md:text-xl text-brown-800 font-bold m-0">
                第{selectedPerson.generation}世　{selectedPerson.name}
                {selectedPerson.styleName && <span className="text-sm md:text-base">号 {selectedPerson.styleName}</span>}
              </h3>
              <button className="modal-close bg-none border-none text-2xl md:text-3xl cursor-pointer text-gray-500 hover:text-brown-800 transition-colors p-0 leading-none" onClick={() => setSelectedPerson(null)}>×</button>
            </div>
            <div className="leading-loose">
              {selectedPerson.title && (
                <p className="text-sm md:text-base"><strong>身份：</strong>{selectedPerson.title}</p>
              )}
              {selectedPerson.birth && (
                <p className="text-sm md:text-base"><strong>出生：</strong>{selectedPerson.birth}</p>
              )}
              {selectedPerson.death && (
                <p className="text-sm md:text-base"><strong>逝世：</strong>{selectedPerson.death}</p>
              )}
              {selectedPerson.birthplace && (
                <p className="text-sm md:text-base"><strong>出生地：</strong>{selectedPerson.birthplace}</p>
              )}
              {selectedPerson.burial && (
                <p className="text-sm md:text-base"><strong>安葬地：</strong>{selectedPerson.burial}</p>
              )}
              {selectedPerson.spouse && selectedPerson.spouse.length > 0 && (
                <div>
                  <strong className="text-sm md:text-base">配偶：</strong>
                  {selectedPerson.spouse.map((s, i) => (
                    <div key={i} className="ml-4 md:ml-5 text-sm md:text-base">
                      {s.type}：{s.name}
                      {s.birth && <div className="text-gray-600">{s.birth}</div>}
                      {s.death && <div className="text-gray-600">{s.death}</div>}
                      {s.birthplace && <div className="text-gray-600">出生地：{s.birthplace}</div>}
                    </div>
                  ))}
                </div>
              )}
              {selectedPerson.children && selectedPerson.children.length > 0 && (
                <p className="text-sm md:text-base"><strong>子嗣：</strong>{selectedPerson.children.map(c => c.name).join('、')}</p>
              )}
              {selectedPerson.daughters && selectedPerson.daughters.length > 0 && (
                <p className="text-sm md:text-base"><strong>女儿：</strong>{selectedPerson.daughters.map(d => d.name).join('、')}</p>
              )}
              {selectedPerson.heirs && selectedPerson.heirs.length > 0 && (
                <p className="text-sm md:text-base"><strong>嗣子：</strong>{selectedPerson.heirs.map(h => h.name).join('、')}</p>
              )}
              {selectedPerson.notes && (
                <p className="text-sm md:text-base"><strong>备注：</strong>{selectedPerson.notes}</p>
              )}
            </div>
            <div className="mt-4 md:mt-5 text-right">
              <button className="btn bg-cream-200 text-brown-900 hover:bg-cream-100 px-4 py-2 rounded-lg text-sm md:text-base" onClick={() => setSelectedPerson(null)}>
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
