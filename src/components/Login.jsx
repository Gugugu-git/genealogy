import React, { useState } from 'react';

function Login({ onLogin }) {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [isRegister, setIsRegister] = useState(false);
  const [confirmPassword, setConfirmPassword] = useState('');

  const handleSubmit = (e) => {
    e.preventDefault();
    setError('');

    if (!username.trim() || !password.trim()) {
      setError('请输入用户名和密码');
      return;
    }

    if (isRegister) {
      if (password !== confirmPassword) {
        setError('两次输入的密码不一致');
        return;
      }
      if (password.length < 6) {
        setError('密码长度至少6位');
        return;
      }
      
      const users = JSON.parse(localStorage.getItem('genealogyUsers') || '[]');
      if (users.find(u => u.username === username)) {
        setError('用户名已存在');
        return;
      }
      
      const newUser = {
        id: Date.now(),
        username,
        password,
        role: users.length === 0 ? 'admin' : 'visitor',
        createdAt: new Date().toLocaleString('zh-CN')
      };
      
      users.push(newUser);
      localStorage.setItem('genealogyUsers', JSON.stringify(users));
      
      const userInfo = { ...newUser };
      delete userInfo.password;
      localStorage.setItem('genealogyCurrentUser', JSON.stringify(userInfo));
      onLogin(userInfo);
    } else {
      const users = JSON.parse(localStorage.getItem('genealogyUsers') || '[]');
      const user = users.find(u => u.username === username && u.password === password);
      
      if (!user) {
        setError('用户名或密码错误');
        return;
      }
      
      const userInfo = { ...user };
      delete userInfo.password;
      localStorage.setItem('genealogyCurrentUser', JSON.stringify(userInfo));
      onLogin(userInfo);
    }
  };

  const handleVisitorLogin = () => {
    const visitorUser = {
      id: 'visitor',
      username: '游客',
      role: 'visitor',
      createdAt: new Date().toLocaleString('zh-CN')
    };
    localStorage.setItem('genealogyCurrentUser', JSON.stringify(visitorUser));
    onLogin(visitorUser);
  };

  return (
    <div className="login-container">
      <div className="login-box">
        <h1 className="login-title">泸县大堰胡氏宗谱</h1>
        <h2 className="login-subtitle">{isRegister ? '注册账号' : '用户登录'}</h2>
        
        <form onSubmit={handleSubmit} className="login-form">
          <div className="form-group">
            <label>用户名</label>
            <input
              type="text"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              placeholder="请输入用户名"
              autoComplete="username"
            />
          </div>
          
          <div className="form-group">
            <label>密码</label>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="请输入密码"
              autoComplete={isRegister ? 'new-password' : 'current-password'}
            />
          </div>

          {isRegister && (
            <div className="form-group">
              <label>确认密码</label>
              <input
                type="password"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                placeholder="请再次输入密码"
                autoComplete="new-password"
              />
            </div>
          )}
          
          {error && <div className="login-error">{error}</div>}
          
          <button type="submit" className="login-btn">
            {isRegister ? '注册' : '登录'}
          </button>
        </form>

        <div className="login-actions">
          <button 
            type="button" 
            className="link-btn"
            onClick={() => {
              setIsRegister(!isRegister);
              setError('');
              setConfirmPassword('');
            }}
          >
            {isRegister ? '已有账号？立即登录' : '没有账号？立即注册'}
          </button>
          
          <div className="divider">
            <span>或者</span>
          </div>
          
          <button 
            type="button" 
            className="visitor-btn"
            onClick={handleVisitorLogin}
          >
            游客访问
          </button>
        </div>

        <div className="login-tips">
          <p>💡 提示：</p>
          <ul>
            <li>首次使用请注册账号（第一个注册的用户自动成为管理员）</li>
            <li>管理员可以编辑和管理族谱数据</li>
            <li>游客只能查看族谱信息</li>
          </ul>
        </div>
      </div>
    </div>
  );
}

export default Login;
