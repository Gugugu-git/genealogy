import React from 'react';

function Rules({ data }) {
  const rules = data.rules || [];

  return (
    <div className="rules">
      <div className="card bg-white rounded-xl p-4 md:p-6 shadow-md border-2 border-cream-100">
        <h2 className="card-title text-xl md:text-2xl text-brown-800 font-bold mb-5 pb-2.5 border-b-2 border-cream-200">凡例规则</h2>
        
        <div className="card bg-yellow-50 border-yellow-400 border-2 rounded-xl p-4 mb-5">
          <p className="text-yellow-700">
            <strong>提示：</strong>凡例是族谱编写的规范和原则，所有族谱更新均应遵循此凡例。
          </p>
        </div>

        <div className="flex flex-col gap-3.5 md:gap-4">
          {rules.map((rule, idx) => (
            <div key={rule.id} className="card bg-white rounded-xl p-4 md:p-5 border-l-4 border-brown-800 shadow-sm">
              <div className="flex items-start gap-3.5 md:gap-4">
                <div className="w-10 h-10 bg-gradient-to-br from-brown-800 to-brown-700 text-white rounded-full flex items-center justify-center font-bold text-lg flex-shrink-0">
                  {rule.number}
                </div>
                <div className="flex-1">
                  <h3 className="mb-2 text-brown-900 text-base md:text-lg font-medium">
                    凡例{rule.number}
                  </h3>
                  <p className="text-gray-700 leading-relaxed text-sm md:text-base">
                    {rule.content}
                  </p>
                </div>
              </div>
            </div>
          ))}
        </div>

        <div className="card bg-cream-50 rounded-xl p-4 md:p-5 mt-6">
          <h3 className="mb-4 text-brown-800 text-base md:text-lg font-medium">
            凡例要点解读
          </h3>
          <ul className="list-none pl-0 md:pl-5 leading-loose text-gray-700 space-y-2">
            <li className="flex items-start gap-2"><span className="font-bold text-brown-800 flex-shrink-0">始祖定位：</span><span>以公讳继相为始祖，所有世系从此开始计算</span></li>
            <li className="flex items-start gap-2"><span className="font-bold text-brown-800 flex-shrink-0">称谓规范：</span><span>男子称"讳"，妇人称"配"，女子称"适"</span></li>
            <li className="flex items-start gap-2"><span className="font-bold text-brown-800 flex-shrink-0">信息记录：</span><span>生卒年月、坟茔所在地，有则记录，无则空缺</span></li>
            <li className="flex items-start gap-2"><span className="font-bold text-brown-800 flex-shrink-0">入谱原则：</span><span>族中子弟无论贵贱贤愚，一律入谱</span></li>
            <li className="flex items-start gap-2"><span className="font-bold text-brown-800 flex-shrink-0">特殊情况：</span><span>继嗣、迁徙、功名、善行等均需详细记录</span></li>
            <li className="flex items-start gap-2"><span className="font-bold text-brown-800 flex-shrink-0">纪年方式：</span><span>近代统一使用公元纪年，同时附干支纪年</span></li>
            <li className="flex items-start gap-2"><span className="font-bold text-brown-800 flex-shrink-0">亲疏关系：</span><span>以五服为亲，高祖以下五世亲尽为出服</span></li>
          </ul>
        </div>
      </div>
    </div>
  );
}

export default Rules;
