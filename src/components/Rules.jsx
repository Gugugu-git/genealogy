import React from 'react';

function Rules({ data }) {
  const rules = data.rules || [];

  return (
    <div className="rules">
      <div className="card">
        <h2 className="card-title">📏 凡例规则</h2>
        
        <div className="card" style={{ background: '#fff9c4', borderColor: '#fbc02d', marginBottom: '20px' }}>
          <p style={{ margin: 0, color: '#f57f17' }}>
            <strong>📌 提示：</strong>凡例是族谱编写的规范和原则，所有族谱更新均应遵循此凡例。
          </p>
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: '15px' }}>
          {rules.map((rule, idx) => (
            <div key={rule.id} className="card" style={{ margin: 0, borderLeft: '4px solid #8b4513' }}>
              <div style={{ display: 'flex', alignItems: 'start', gap: '15px' }}>
                <div style={{
                  width: '40px',
                  height: '40px',
                  background: 'linear-gradient(135deg, #8b4513 0%, #a0522d 100%)',
                  color: 'white',
                  borderRadius: '50%',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  fontWeight: 'bold',
                  fontSize: '18px',
                  flexShrink: 0
                }}>
                  {rule.number}
                </div>
                <div style={{ flex: 1 }}>
                  <h3 style={{ margin: 0, marginBottom: '8px', color: '#5c4033', fontSize: '16px' }}>
                    凡例{rule.number}
                  </h3>
                  <p style={{ margin: 0, color: '#555', lineHeight: '1.8', fontSize: '15px' }}>
                    {rule.content}
                  </p>
                </div>
              </div>
            </div>
          ))}
        </div>

        <div className="card" style={{ marginTop: '25px', background: '#faf8f3' }}>
          <h3 style={{ margin: 0, marginBottom: '15px', color: '#8b4513', fontSize: '18px' }}>
            📋 凡例要点解读
          </h3>
          <ul style={{ margin: 0, paddingLeft: '20px', lineHeight: '2.2', color: '#555' }}>
            <li><strong>始祖定位：</strong>以公讳继相为始祖，所有世系从此开始计算</li>
            <li><strong>称谓规范：</strong>男子称"讳"，妇人称"配"，女子称"适"</li>
            <li><strong>信息记录：</strong>生卒年月、坟茔所在地，有则记录，无则空缺</li>
            <li><strong>入谱原则：</strong>族中子弟无论贵贱贤愚，一律入谱</li>
            <li><strong>特殊情况：</strong>继嗣、迁徙、功名、善行等均需详细记录</li>
            <li><strong>纪年方式：</strong>近代统一使用公元纪年，同时附干支纪年</li>
            <li><strong>亲疏关系：</strong>以五服为亲，高祖以下五世亲尽为出服</li>
          </ul>
        </div>
      </div>
    </div>
  );
}

export default Rules;
