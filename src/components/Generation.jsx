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
    // 查找该世代的所有人物
    return data.genealogy.filter(person => person.generation === generation);
  };

  return (
    <div className="generation">
      <div className="card bg-white rounded-xl p-4 md:p-6 shadow-md border-2 border-cream-100">
        <h2 className="card-title text-xl md:text-2xl text-brown-800 font-bold mb-5 pb-2.5 border-b-2 border-cream-200">字辈查询</h2>
        
        <div className="card bg-gradient-to-br from-cream-50 to-cream-50 rounded-xl p-4 md:p-5 mb-5">
          <h3 className="text-brown-800 mb-4 text-base md:text-lg font-medium">字辈诗</h3>
          <div className="text-center text-lg md:text-xl leading-10 font-serif">
            {generationPoem.map((line, idx) => (
              <div key={idx} className="tracking-widest">{line}</div>
            ))}
          </div>
        </div>

        <div className="card bg-white rounded-xl p-4 md:p-5 mb-5">
          <h3 className="text-brown-800 mb-4 text-base md:text-lg font-medium">字辈表</h3>
          <div className="flex flex-wrap gap-2.5 md:gap-3">
            {generationChars.map((char, idx) => {
              const persons = getPersonsByGenerationChar(char);
              return (
                <div
                  key={idx}
                  className={`w-14 h-14 md:w-16 md:h-16 flex flex-col items-center justify-center rounded-xl cursor-pointer transition-all border-2 ${
                    selectedChar === char 
                      ? 'bg-gradient-to-br from-brown-800 to-brown-700 text-white border-brown-800 shadow-lg' 
                      : 'bg-white text-brown-900 border-cream-200 hover:border-brown-800 hover:-translate-y-1'
                  }`}
                  onClick={() => setSelectedChar(selectedChar === char ? null : char)}
                >
                  <span className="text-xl md:text-2xl font-bold">{char}</span>
                  <span className="text-xs opacity-80">第{idx + 1}字</span>
                </div>
              );
            })}
          </div>
        </div>

        {selectedChar && (
          <div className="card bg-white rounded-xl p-4 md:p-5">
            <h3 className="text-brown-800 mb-4 text-base md:text-lg font-medium flex items-center gap-2.5 flex-wrap">
              字辈「{selectedChar}」相关人物
              <span className="bg-red-600 text-white px-2.5 py-1 rounded-full text-sm font-bold">
                {getPersonsByGenerationChar(selectedChar).length}人
              </span>
            </h3>
            <div className="flex flex-col gap-3">
              {getPersonsByGenerationChar(selectedChar).map(person => (
                <div key={person.id} className="person-card bg-gradient-to-br from-white to-cream-50 rounded-xl p-4 border-l-4 border-brown-800">
                  <div className="flex flex-wrap items-center gap-3">
                    <span className="bg-brown-800 text-white px-2.5 py-1 rounded text-xs md:text-sm">
                      第{person.generation}世
                    </span>
                    <span className="text-lg md:text-xl font-bold text-brown-900">
                      {person.name}
                    </span>
                    {person.styleName && (
                      <span className="text-gray-600 text-sm">号 {person.styleName}</span>
                    )}
                    {person.title && (
                      <span className="text-brown-700 text-xs md:text-sm">({person.title})</span>
                    )}
                  </div>
                  {person.birth && <p className="mt-2 text-gray-600 text-xs md:text-sm">{person.birth}</p>}
                </div>
              ))}
              {getPersonsByGenerationChar(selectedChar).length === 0 && (
                <p className="text-center text-gray-500 py-7.5">
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
