import React, { useState, useEffect } from 'react';
import authService from '../lib/authService';

function AdminKeyInput({ onAuthenticate }) {
  const [error, setError] = useState('');
  const [githubUser, setGithubUser] = useState(null);
  const [userRole, setUserRole] = useState('viewer');
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    checkExistingSession();

    const { data: { subscription } } = authService.onAuthStateChange(
      async (event, session) => {
        if (event === 'SIGNED_IN' && session) {
          await handleGitHubLogin(session.user);
        } else if (event === 'SIGNED_OUT') {
          setGithubUser(null);
          setUserRole('viewer');
        }
      }
    );

    return () => subscription.unsubscribe();
  }, []);

  const checkExistingSession = async () => {
    try {
      const session = await authService.getSession();
      if (session?.user) {
        await handleGitHubLogin(session.user);
      }
    } catch (err) {
      console.warn('检查会话失败:', err);
    }
  };

  const handleGitHubLogin = async (user) => {
    setLoading(true);
    try {
      const username = authService.getGitHubUsername(user);
      const role = await authService.fetchUserRole(username);

      setGithubUser({
        username: username,
        avatar: user.user_metadata?.avatar_url,
        name: user.user_metadata?.full_name || username
      });
      setUserRole(role);

      const isAuthenticated = ['admin', 'editor'].includes(role);
      localStorage.setItem('isAdmin', isAuthenticated ? 'true' : 'false');
      onAuthenticate(isAuthenticated, role, username);
    } catch (err) {
      console.error('GitHub 登录处理失败:', err);
      setError('登录处理失败，请重试');
    } finally {
      setLoading(false);
    }
  };

  const handleGitHubSignIn = async () => {
    setLoading(true);
    setError('');
    try {
      await authService.signInWithGitHub();
    } catch (err) {
      setError('GitHub 登录失败: ' + err.message);
      setLoading(false);
    }
  };

  const handleSignOut = async () => {
    try {
      await authService.signOut();
      setGithubUser(null);
      setUserRole('viewer');
      localStorage.removeItem('isAdmin');
      onAuthenticate(false, 'viewer', null);
    } catch (err) {
      setError('登出失败: ' + err.message);
    }
  };

  const getRoleBadgeClass = (role) => {
    switch (role) {
      case 'admin': return 'role-badge admin';
      case 'editor': return 'role-badge editor';
      default: return 'role-badge viewer';
    }
  };

  const getRoleLabel = (role) => {
    switch (role) {
      case 'admin': return '管理员';
      case 'editor': return '编辑者';
      default: return '访客';
    }
  };

  if (githubUser) {
    return (
      <div className="admin-key-container">
        <div className="admin-key-card">
          <div className="user-info">
            {githubUser.avatar && (
              <img
                src={githubUser.avatar}
                alt={githubUser.username}
                className="github-avatar"
              />
            )}
            <div className="user-details">
              <h3>{githubUser.name}</h3>
              <span className="github-username">@{githubUser.username}</span>
              <span className={getRoleBadgeClass(userRole)}>
                {getRoleLabel(userRole)}
              </span>
            </div>
          </div>

          {userRole === 'viewer' && (
            <div className="viewer-notice">
              <p>您当前是访客身份，只能查看数据。</p>
              <p>如需编辑权限，请联系管理员添加您的 GitHub 账号。</p>
            </div>
          )}

          <div className="button-group">
            <button
              className="btn btn-primary"
              onClick={() => onAuthenticate(
                ['admin', 'editor'].includes(userRole),
                userRole,
                githubUser.username
              )}
            >
              进入系统
            </button>
            <button
              className="btn btn-secondary"
              onClick={handleSignOut}
            >
              登出 GitHub
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="admin-key-container">
      <div className="admin-key-card">
        <h2>管理员登录</h2>
        <p>使用 GitHub 账号登录，权限由管理员在 `user_roles` 表中配置</p>

        <button
          className="btn btn-github"
          onClick={handleGitHubSignIn}
          disabled={loading}
        >
          <svg height="20" width="20" viewBox="0 0 16 16" fill="currentColor">
            <path d="M8 0C3.58 0 0 3.58 0 8c0 3.54 2.29 6.53 5.47 7.59.4.07.55-.17.55-.38 0-.19-.01-.82-.01-1.49-2.01.37-2.53-.49-2.69-.94-.09-.23-.48-.94-.82-1.13-.28-.15-.68-.52-.01-.53.63-.01 1.08.58 1.23.82.72 1.21 1.87.87 2.33.66.07-.52.28-.87.51-1.07-1.78-.2-3.64-.89-3.64-3.95 0-.87.31-1.59.82-2.15-.08-.2-.36-1.02.08-2.12 0 0 .67-.21 2.2.82.64-.18 1.32-.27 2-.27.68 0 1.36.09 2 .27 1.53-1.04 2.2-.82 2.2-.82.44 1.1.16 1.92.08 2.12.51.56.82 1.27.82 2.15 0 3.07-1.87 3.75-3.65 3.95.29.25.54.73.54 1.48 0 1.07-.01 1.93-.01 2.2 0 .21.15.46.55.38A8.013 8.013 0 0016 8c0-4.42-3.58-8-8-8z"/>
          </svg>
          {loading ? '登录中...' : '使用 GitHub 登录'}
        </button>

        {error && <div className="error-message">{error}</div>}

        <div className="button-group" style={{ marginTop: '16px' }}>
          <button
            type="button"
            className="btn btn-secondary"
            onClick={() => window.history.back()}
          >
            返回
          </button>
        </div>
      </div>
    </div>
  );
}

export default AdminKeyInput;
