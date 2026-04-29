import React from 'react';
import { useNavigate } from 'react-router-dom';

function Overview({ data }) {
  const navigate = useNavigate();

  const modules = [
    { id: 'catalog_1', name: '目录', path: '/', icon: null, desc: '查看宗谱完整目录结构' },
    { id: 'catalog_2', name: '第一章　源流', path: '/', icon: null, desc: '追溯胡氏家族的起源与迁徙' },
    { id: 'catalog_3', name: '第二章　谱序', path: '/preface', icon: null, desc: '族谱序言，记载修谱缘由与宗旨' },
    { id: 'catalog_4', name: '第三章　凡例', path: '/rules', icon: null, desc: '族谱编写规范与原则' },
    { id: 'catalog_5', name: '第四章　家训族规', path: '/', icon: null, desc: '家族训诫与行为规范' },
    { id: 'catalog_6', name: '第五章　字辈', path: '/generation', icon: null, desc: '胡氏字辈排行与查询' },
    { id: 'catalog_7', name: '第六章　谱系', path: '/genealogy', icon: null, desc: '1-6世完整世系图' },
    { id: 'catalog_8', name: '第七章　后跋', path: '/preface', icon: null, desc: '修谱完成后记' },
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
      {/* 谱序区域 - Vercel风格 */}
      {data.preface && (
        <div className="mb-8">
          <h2 className="text-xl font-semibold text-gray-900 mb-4 tracking-tight">谱序</h2>
          <div className="bg-white border border-gray-200 rounded-xl p-6">
            <div className="leading-relaxed text-gray-700 font-serif text-justify indent-8 whitespace-pre-wrap bg-gray-50 p-5 rounded-lg">
              {data.preface.content}
            </div>
            {data.preface.date && (
              <p className="text-right mt-4 text-gray-500 italic text-sm">
                {data.preface.date}
              </p>
            )}
            {data.preface.author && (
              <p className="text-right text-gray-500 italic text-sm">
                {data.preface.author}
              </p>
            )}
          </div>
        </div>
      )}

      {/* 统计数据区域 - Vercel风格 */}
      <div className="mb-8">
        <h2 className="text-xl font-semibold text-gray-900 mb-4 tracking-tight">族谱总览</h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          <div className="bg-gradient-to-br from-gray-900 to-gray-800 p-6 rounded-xl text-white text-center hover:shadow-lg transition-shadow">
            <div className="text-3xl font-bold mb-1">{getPersonCount()}</div>
            <div className="text-gray-300 text-sm">入谱人数</div>
          </div>
          <div className="bg-gradient-to-br from-gray-700 to-gray-600 p-6 rounded-xl text-white text-center hover:shadow-lg transition-shadow">
            <div className="text-3xl font-bold mb-1">{getGenerationCount()}</div>
            <div className="text-gray-300 text-sm">世系代数</div>
          </div>
          <div className="bg-gradient-to-br from-amber-900 to-amber-800 p-6 rounded-xl text-white text-center hover:shadow-lg transition-shadow sm:col-span-2 lg:col-span-1">
            <div className="text-3xl font-bold mb-1">继相</div>
            <div className="text-amber-200 text-sm">始祖</div>
          </div>
        </div>
      </div>

      {/* 目录导航 - Vercel风格 */}
      <div className="mb-8">
        <h2 className="text-xl font-semibold text-gray-900 mb-4 tracking-tight">目录导航</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
          {modules.map((module) => (
            <div
              key={module.id}
              className="bg-white border border-gray-200 rounded-xl p-4 cursor-pointer hover:border-gray-300 hover:shadow-md transition-all"
              onClick={() => module.path !== '/' && navigate(module.path)}
            >
              <div>
                <h3 className="text-base font-medium text-gray-900 mb-1">{module.name}</h3>
                <p className="text-sm text-gray-500">{module.desc}</p>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* 始祖简介 - Vercel风格 */}
      <div className="mb-8">
        <h2 className="text-xl font-semibold text-gray-900 mb-4 tracking-tight">始祖简介</h2>
        {data.genealogy && data.genealogy[0] && (
          <div className="bg-white border border-gray-200 rounded-xl p-6 border-l-4 border-gray-900">
            <div className="flex flex-col md:flex-row md:justify-between md:items-start gap-4">
              <div className="flex-1">
                <h3 className="text-xl font-semibold text-gray-900 mb-2">
                  第{data.genealogy[0].generation}世　{data.genealogy[0].name}
                  {data.genealogy[0].title && <span className="ml-2 text-sm text-gray-500">({data.genealogy[0].title})</span>}
                </h3>
                {data.genealogy[0].birth && <p className="my-1 text-gray-600 text-sm">{data.genealogy[0].birth}</p>}
                {data.genealogy[0].spouse && data.genealogy[0].spouse.length > 0 && (
                  <p className="my-1 text-gray-600 text-sm">
                    配：{data.genealogy[0].spouse.map(s => s.name).join('、')}
                  </p>
                )}
              </div>
              <button 
                className="bg-gray-900 text-white px-4 py-2.5 rounded-lg hover:bg-gray-800 transition-colors text-sm font-medium w-full md:w-auto" 
                onClick={() => navigate('/genealogy')}
              >
                查看世系 →
              </button>
            </div>
          </div>
        )}
      </div>

      {/* 后跋区域 - Vercel风格 */}
      {data.postscript && (
        <div>
          <h2 className="text-xl font-semibold text-gray-900 mb-4 tracking-tight">后跋</h2>
          <div className="bg-white border border-gray-200 rounded-xl p-6">
            <div className="leading-relaxed text-gray-700 font-serif text-justify indent-8 whitespace-pre-wrap bg-gray-50 p-5 rounded-lg">
              {data.postscript.content}
            </div>
            {data.postscript.date && (
              <p className="text-right mt-4 text-gray-500 italic text-sm">
                {data.postscript.date}
              </p>
            )}
            {data.postscript.author && (
              <p className="text-right text-gray-500 italic text-sm">
                {data.postscript.author}
              </p>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

export default Overview;
