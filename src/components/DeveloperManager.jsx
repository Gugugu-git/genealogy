import React, { useState, useEffect, useCallback } from 'react';
import dataService from '../lib/dataService';
import authService from '../lib/authService';

function DeveloperManager() {
  const [developers, setDevelopers] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [newUsername, setNewUsername] = useState('');
  const [newRole, setNewRole] = useState('editor');
  const [retryCount, setRetryCount] = useState(0);

  useEffect(() => {
    if (authService.isAdmin()) {
      loadDevelopers();
    }
  }, [retryCount]);

  const loadDevelopers = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const data = await dataService.getDevelopers();
      setDevelopers(data || []);
    } catch (err) {
      setError('加载开发者列表失败: ' + (err.message || '网络错误'));
      console.error('加载开发者失败:', err);
    } finally {
      setLoading(false);
    }
  }, []);

  const handleRetry = () => {
    setRetryCount(prev => prev + 1);
  };

  const handleAddDeveloper = async (e) => {
    e.preventDefault();
    if (!newUsername.trim()) {
      setError('请输入 GitHub 用户名');
      return;
    }

    setLoading(true);
    setError('');
    try {
      const user = await authService.getCurrentUser();
      if (!user) throw new Error('请先登录');

      await dataService.setDeveloperRole(user.id, newUsername.trim(), newRole);
      await loadDevelopers();
      setNewUsername('');
      setNewRole('editor');
    } catch (err) {
      setError('添加开发者失败: ' + (err.message || '网络错误'));
      console.error('添加开发者失败:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleUpdateRole = async (username, role) => {
    setLoading(true);
    setError('');
    try {
      const user = await authService.getCurrentUser();
      if (!user) throw new Error('请先登录');

      await dataService.setDeveloperRole(user.id, username, role);
      await loadDevelopers();
    } catch (err) {
      setError('更新权限失败: ' + (err.message || '网络错误'));
      console.error('更新权限失败:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleRemoveDeveloper = async (username) => {
    if (!window.confirm(`确定要移除开发者 @${username} 吗？`)) {
      return;
    }

    setLoading(true);
    setError('');
    try {
      await dataService.removeDeveloper(username);
      await loadDevelopers();
    } catch (err) {
      setError('移除开发者失败: ' + (err.message || '网络错误'));
      console.error('移除开发者失败:', err);
    } finally {
      setLoading(false);
    }
  };

  if (!authService.isAdmin()) {
    return (
      <div className="developer-manager">
        <div className="permission-denied">
          <h3>权限不足</h3>
          <p>只有管理员可以管理开发者权限</p>
        </div>
      </div>
    );
  }

  return (
    <div className="developer-manager">
      <h3>开发者权限管理</h3>

      {error && (
        <div className="error-message" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <span>{error}</span>
          <button
            className="btn btn-secondary"
            style={{ fontSize: '12px', padding: '4px 12px', marginLeft: '10px' }}
            onClick={handleRetry}
          >
            重试
          </button>
        </div>
      )}

      <form className="add-developer-form" onSubmit={handleAddDeveloper}>
        <div className="form-row">
          <input
            type="text"
            value={newUsername}
            onChange={(e) => setNewUsername(e.target.value)}
            placeholder="GitHub 用户名"
            className="username-input"
            disabled={loading}
          />
          <select
            value={newRole}
            onChange={(e) => setNewRole(e.target.value)}
            className="role-select"
            disabled={loading}
          >
            <option value="editor">编辑者</option>
            <option value="admin">管理员</option>
          </select>
          <button type="submit" className="btn btn-primary" disabled={loading}>
            {loading ? '处理中...' : '添加'}
          </button>
        </div>
      </form>

      <div className="developers-list">
        <h4>当前开发者 ({developers.length})</h4>

        {loading && developers.length === 0 && <div className="loading">加载中...</div>}

        {developers.length === 0 && !loading && (
          <div className="empty-state">
            {error ? '加载失败，请重试' : '暂无开发者'}
          </div>
        )}

        {developers.map((dev) => (
          <div key={dev.id || dev.github_username} className="developer-item">
            <div className="developer-info">
              <span className="github-icon">@</span>
              <span className="developer-username">{dev.github_username}</span>
            </div>
            <div className="developer-actions">
              <select
                value={dev.role}
                onChange={(e) => handleUpdateRole(dev.github_username, e.target.value)}
                className="role-select"
                disabled={loading}
              >
                <option value="viewer">访客</option>
                <option value="editor">编辑者</option>
                <option value="admin">管理员</option>
              </select>
              <button
                className="btn btn-danger btn-sm"
                onClick={() => handleRemoveDeveloper(dev.github_username)}
                disabled={loading}
              >
                移除
              </button>
            </div>
          </div>
        ))}
      </div>

      <div className="role-legend">
        <h4>权限说明</h4>
        <ul>
          <li><strong>管理员</strong>: 可以增删改所有数据，管理开发者权限</li>
          <li><strong>编辑者</strong>: 可以增删改所有数据</li>
          <li><strong>访客</strong>: 只能查看数据</li>
        </ul>
      </div>
    </div>
  );
}

export default DeveloperManager;
