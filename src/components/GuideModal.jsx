import React, { useState } from 'react';

function GuideModal({ onClose }) {
  const [step, setStep] = useState(1);
  const totalSteps = 5;

  const steps = [
    {
      title: '👋 欢迎使用',
      content: (
        <div>
          <h3 style={{ color: '#8b4513', marginBottom: '15px' }}>泸县大堰胡氏宗谱信息管理系统</h3>
          <p style={{ lineHeight: '1.8', color: '#555' }}>
            感谢您使用本系统！这是一个纯本地存储的族谱管理工具，无需联网，
            所有数据都保存在您的电脑上。
          </p>
          <div style={{ marginTop: '20px', padding: '15px', background: '#faf8f3', borderRadius: '8px' }}>
            <p style={{ margin: 0, color: '#666' }}>
              <strong>💡 提示：</strong>您可以随时点击右上角的「操作指引」按钮重新查看此指南。
            </p>
          </div>
        </div>
      )
    },
    {
      title: '🌳 查看世系',
      content: (
        <div>
          <h3 style={{ color: '#8b4513', marginBottom: '15px' }}>如何查看世系图</h3>
          <ul style={{ lineHeight: '2.2', color: '#555', paddingLeft: '20px' }}>
            <li>点击顶部导航栏的「世系展示」</li>
            <li>可以选择「树形结构」或「文字列表」两种查看方式</li>
            <li>支持按姓名、世代、字辈搜索人物</li>
            <li>点击人物卡片可查看详细信息</li>
            <li>特殊信息（如早夭、适嫁）会有醒目标注</li>
          </ul>
        </div>
      )
    },
    {
      title: '📖 字辈查询',
      content: (
        <div>
          <h3 style={{ color: '#8b4513', marginBottom: '15px' }}>如何使用字辈查询</h3>
          <ul style={{ lineHeight: '2.2', color: '#555', paddingLeft: '20px' }}>
            <li>点击「字辈查询」进入字辈页面</li>
            <li>页面顶部展示完整的字辈诗</li>
            <li>点击任意字辈字，可查看使用该字辈的族人</li>
            <li>字辈右上角的数字表示使用该字辈的人数</li>
          </ul>
        </div>
      )
    },
    {
      title: '✏️ 数据编辑',
      content: (
        <div>
          <h3 style={{ color: '#8b4513', marginBottom: '15px' }}>如何编辑和更新数据</h3>
          <ul style={{ lineHeight: '2.2', color: '#555', paddingLeft: '20px' }}>
            <li>进入「数据管理」模块</li>
            <li>可以新增人物、补充信息、修改错漏</li>
            <li>系统自动备份最近10个版本</li>
            <li>支持从文件同步数据，也可以直接编辑本地JSON文件</li>
            <li>核心世系（1-6世）受删除保护</li>
          </ul>
        </div>
      )
    },
    {
      title: '🎉 开始使用',
      content: (
        <div>
          <h3 style={{ color: '#8b4513', marginBottom: '15px' }}>准备好了吗？</h3>
          <p style={{ lineHeight: '1.8', color: '#555' }}>
            现在您已经了解了系统的基本功能，让我们开始探索族谱吧！
          </p>
          <div style={{ marginTop: '25px', padding: '20px', background: 'linear-gradient(135deg, #e8f5e9 0%, #c8e6c9 100%)', borderRadius: '12px', textAlign: 'center' }}>
            <p style={{ margin: 0, color: '#2e7d32', fontSize: '18px', fontWeight: 'bold' }}>
              📚 愿宗风不坠，家道永昌！
            </p>
          </div>
        </div>
      )
    }
  ];

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal" onClick={(e) => e.stopPropagation()} style={{ maxWidth: '500px' }}>
        <div className="modal-header">
          <h3 className="modal-title">{steps[step - 1].title}</h3>
          <button className="modal-close" onClick={onClose}>×</button>
        </div>
        
        <div style={{ minHeight: '250px' }}>
          {steps[step - 1].content}
        </div>

        <div style={{ display: 'flex', justifyContent: 'center', gap: '8px', marginBottom: '20px' }}>
          {Array.from({ length: totalSteps }, (_, i) => (
            <div
              key={i}
              style={{
                width: step === i + 1 ? '24px' : '12px',
                height: '8px',
                borderRadius: '4px',
                background: step === i + 1 ? '#8b4513' : '#d4c4a8',
                transition: 'all 0.3s'
              }}
            />
          ))}
        </div>

        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <button
            className="btn btn-secondary"
            onClick={() => setStep(Math.max(1, step - 1))}
            style={{ visibility: step === 1 ? 'hidden' : 'visible' }}
          >
            ← 上一步
          </button>
          
          {step < totalSteps ? (
            <button className="btn btn-primary" onClick={() => setStep(step + 1)}>
              下一步 →
            </button>
          ) : (
            <button className="btn btn-success" onClick={onClose}>
              开始使用 🎉
            </button>
          )}
        </div>
      </div>
    </div>
  );
}

export default GuideModal;
