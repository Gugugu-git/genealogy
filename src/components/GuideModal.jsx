import React, { useState } from 'react';

function GuideModal({ onClose }) {
  const [step, setStep] = useState(1);
  const totalSteps = 6;

  const steps = [
    {
      title: '欢迎使用',
      content: (
        <div>
          <h3 style={{ color: '#8b4513', marginBottom: '15px' }}>泸县大堰胡氏宗谱信息管理系统</h3>
          <p style={{ lineHeight: '1.8', color: '#555' }}>
            欢迎使用本系统！这是一个基于云端数据库的族谱管理工具，
            数据安全存储在云端，支持多人协作，随时随地访问。
          </p>
          <div style={{ marginTop: '20px', padding: '15px', background: '#faf8f3', borderRadius: '8px' }}>
            <p style={{ margin: 0, color: '#666' }}>
              <strong>提示：</strong>您可以随时点击右上角的「操作指引」按钮重新查看此指南。
            </p>
          </div>
        </div>
      )
    },
    {
      title: '登录方式',
      content: (
        <div>
          <h3 style={{ color: '#8b4513', marginBottom: '15px' }}>两种登录方式</h3>
          <div style={{ lineHeight: '2', color: '#555' }}>
            <div style={{ marginBottom: '15px', padding: '12px', background: '#fff3e0', borderRadius: '8px' }}>
              <strong style={{ color: '#e65100' }}>族员验证登录</strong>
              <p style={{ margin: '8px 0 0 0', fontSize: '14px' }}>输入您和父亲的姓名进行身份验证，验证成功后可查看族谱</p>
            </div>
            <div style={{ marginBottom: '15px', padding: '12px', background: '#f3e5f5', borderRadius: '8px' }}>
              <strong style={{ color: '#7b1fa2' }}>GitHub 账号登录</strong>
              <p style={{ margin: '8px 0 0 0', fontSize: '14px' }}>管理员/编辑者使用 GitHub 账号登录，可编辑数据</p>
            </div>
            <div style={{ marginBottom: '15px', padding: '12px', background: '#e8f5e9', borderRadius: '8px' }}>
              <strong style={{ color: '#2e7d32' }}>管理员</strong>
              <p style={{ margin: '8px 0 0 0', fontSize: '14px' }}>可查看、编辑所有数据，管理开发者权限</p>
            </div>
            <div style={{ marginBottom: '15px', padding: '12px', background: '#fff8e1', borderRadius: '8px' }}>
              <strong style={{ color: '#f57c00' }}>编辑者</strong>
              <p style={{ margin: '8px 0 0 0', fontSize: '14px' }}>可查看、编辑所有数据</p>
            </div>
            <div style={{ padding: '12px', background: '#e3f2fd', borderRadius: '8px' }}>
              <strong style={{ color: '#1565c0' }}>族员</strong>
              <p style={{ margin: '8px 0 0 0', fontSize: '14px' }}>可查看所有信息，无法编辑数据</p>
            </div>
          </div>
        </div>
      )
    },
    {
      title: '用户管理',
      content: (
        <div>
          <h3 style={{ color: '#8b4513', marginBottom: '15px' }}>多人协作编辑</h3>
          <ul style={{ lineHeight: '2.2', color: '#555', paddingLeft: '20px' }}>
            <li>管理员可在「数据管理」→「用户管理」中添加团队成员</li>
            <li>输入 GitHub 用户名即可邀请加入</li>
            <li>可设置角色：管理员 / 编辑者</li>
            <li>支持多人同时在线编辑，数据实时同步</li>
            <li>所有修改自动记录到修改日志</li>
          </ul>
          <div style={{ marginTop: '15px', padding: '10px', background: '#e8f5e9', borderRadius: '8px' }}>
            <p style={{ margin: 0, color: '#2e7d32', fontSize: '13px' }}>
              提示：需要管理员权限才能管理用户
            </p>
          </div>
        </div>
      )
    },
    {
      title: '查看世系',
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
      title: '数据编辑',
      content: (
        <div>
          <h3 style={{ color: '#8b4513', marginBottom: '15px' }}>如何编辑和更新数据</h3>
          <ul style={{ lineHeight: '2.2', color: '#555', paddingLeft: '20px' }}>
            <li>管理员或编辑者登录后进入「数据管理」模块</li>
            <li>可新增人物、编辑信息、添加子嗣</li>
            <li>支持从本地JSON文件导入数据</li>
            <li>所有修改自动同步到云端</li>
            <li>修改日志记录所有操作历史</li>
            <li>「备份管理」功能可保存和恢复历史版本</li>
          </ul>
          <div style={{ marginTop: '15px', padding: '10px', background: '#ffebee', borderRadius: '8px' }}>
            <p style={{ margin: 0, color: '#c62828', fontSize: '13px' }}>
              数据编辑需要管理员或编辑者权限
            </p>
          </div>
        </div>
      )
    },
    {
      title: '开始使用',
      content: (
        <div>
          <h3 style={{ color: '#8b4513', marginBottom: '15px' }}>准备好了吗？</h3>
          <p style={{ lineHeight: '1.8', color: '#555' }}>
            现在您已经了解了系统的基本功能，让我们开始探索族谱吧！
          </p>
          <div style={{ marginTop: '25px', padding: '20px', background: 'linear-gradient(135deg, #e8f5e9 0%, #c8e6c9 100%)', borderRadius: '12px', textAlign: 'center' }}>
            <p style={{ margin: 0, color: '#2e7d32', fontSize: '18px', fontWeight: 'bold' }}>
              愿宗风不坠，家道永昌！
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
              开始使用
            </button>
          )}
        </div>
      </div>
    </div>
  );
}

export default GuideModal;
