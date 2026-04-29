import React, { useState } from 'react';
import { supabase } from '../lib/supabase';

function Login({ onLogin }) {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [username, setUsername] = useState('');
  const [error, setError] = useState('');
  const [isRegister, setIsRegister] = useState(false);
  const [loading, setLoading] = useState(false);

  const handleLogin = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    // 设置超时（10秒）
    const timeoutId = setTimeout(() => {
      setLoading(false);
      setError('登录超时，请检查网络连接后重试');
    }, 10000);

    try {
      const { data, error: authError } = await supabase.auth.signInWithPassword({
        email,
        password
      });

      clearTimeout(timeoutId);

      if (authError) throw authError;

      // 获取用户信息
      const { data: profile, error: profileError } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', data.user.id)
        .single();

      if (profileError && profileError.code !== 'PGRST116') {
        console.error('获取用户信息失败:', profileError);
      }

      // 检查用户状态
      if (profile?.status === 'pending') {
        await supabase.auth.signOut();
        setError('您的账号正在审核中，请等待管理员审核。');
        setLoading(false);
        return;
      }

      if (profile?.status === 'rejected') {
        await supabase.auth.signOut();
        setError('您的账号申请已被拒绝，请联系管理员。');
        setLoading(false);
        return;
      }

      if (profile?.status === 'suspended') {
        await supabase.auth.signOut();
        setError('您的账号已被停用，请联系管理员。');
        setLoading(false);
        return;
      }

      const userInfo = {
        id: data.user.id,
        email: data.user.email,
        username: profile?.username || data.user.email.split('@')[0],
        role: profile?.role || 'viewer',
        status: profile?.status || 'approved',
        createdAt: new Date().toLocaleString('zh-CN')
      };

      onLogin(userInfo);
    } catch (err) {
      console.error('登录错误:', err);
      if (err.message?.includes('Invalid login credentials')) {
        setError('邮箱或密码错误');
      } else if (err.message?.includes('Email not confirmed')) {
        setError('请先验证邮箱，检查收件箱');
      } else {
        setError(err.message || '登录失败，请检查网络连接');
      }
    } finally {
      setLoading(false);
    }
  };

  const handleRegister = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    if (!username.trim()) {
      setError('请输入用户名');
      setLoading(false);
      return;
    }

    // 设置超时（15秒）
    const timeoutId = setTimeout(() => {
      setLoading(false);
      setError('注册超时，请检查网络连接后重试');
    }, 15000);

    try {
      // 检查是否是第一个用户（自动设为管理员）
      const { count, error: countError } = await supabase
        .from('profiles')
        .select('*', { count: 'exact', head: true });
      
      if (countError) {
        console.error('查询用户数量失败:', countError);
      }
      
      const isFirstUser = (count || 0) === 0;
      console.log('当前用户数量:', count, '是否第一个用户:', isFirstUser);

      // 注册用户
      const { data, error: authError } = await supabase.auth.signUp({
        email,
        password,
        options: {
          data: {
            username: username
          }
        }
      });

      clearTimeout(timeoutId);

      if (authError) throw authError;

      if (!data.user) {
        setError('注册成功！请检查邮箱并验证后再登录');
        setIsRegister(false);
        setLoading(false);
        return;
      }

      const { error: profileError } = await supabase
        .from('profiles')
        .insert([{
          id: data.user.id,
          username: username,
          role: isFirstUser ? 'super_admin' : 'viewer',
          status: isFirstUser ? 'approved' : 'pending'
        }]);

      if (profileError) {
        console.error('创建profile失败:', profileError);
        if (profileError.message?.includes('row-level security policy')) {
          setError('注册成功，但创建用户资料失败。请联系管理员检查数据库权限。');
        } else {
          setError('注册成功，但创建用户资料失败: ' + profileError.message);
        }
        setIsRegister(false);
        setLoading(false);
        return;
      }

      if (isFirstUser) {
        // 第一个用户自动成为超级管理员，直接登录
        const userInfo = {
          id: data.user.id,
          email: data.user.email,
          username: username,
          role: 'super_admin',
          status: 'approved',
          createdAt: new Date().toLocaleString('zh-CN')
        };
        onLogin(userInfo);
      } else {
        // 其他用户需要等待审核
        setError('注册成功！您的账号需要管理员审核后才能使用，请等待审核结果。');
        setIsRegister(false);
        setEmail('');
        setPassword('');
        setUsername('');
      }
    } catch (err) {
      console.error('注册错误:', err);
      if (err.message?.includes('already registered')) {
        setError('该邮箱已被注册');
      } else if (err.message?.includes('password')) {
        setError('密码强度不足，请使用更复杂的密码');
      } else {
        setError(err.message || '注册失败，请检查网络连接');
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="login-container">
      <div className="login-box">
        <h1 className="login-title">泸县大堰胡氏宗谱</h1>
        <h2 className="login-subtitle">{isRegister ? '注册账号' : '用户登录'}</h2>

        <form onSubmit={isRegister ? handleRegister : handleLogin} className="login-form">
          {isRegister && (
            <div className="form-group">
              <label>用户名</label>
              <input
                type="text"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                placeholder="请输入用户名"
              />
            </div>
          )}

          <div className="form-group">
            <label>邮箱</label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="请输入邮箱地址"
              required
            />
          </div>

          <div className="form-group">
            <label>密码</label>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="请输入密码（至少6位）"
              required
              minLength={6}
            />
          </div>

          {error && <div className="login-error">{error}</div>}

          <button type="submit" className="login-btn" disabled={loading}>
            {loading ? '处理中...' : (isRegister ? '注册' : '登录')}
          </button>
        </form>

        <div className="login-actions">
          <button
            type="button"
            className="link-btn"
            onClick={() => {
              setIsRegister(!isRegister);
              setError('');
            }}
          >
            {isRegister ? '已有账号？立即登录' : '没有账号？立即注册'}
          </button>
        </div>

        <div className="login-tips">
          <p>💡 提示：</p>
          <ul>
            <li>使用邮箱和密码注册/登录</li>
            <li>管理员可以编辑和管理族谱数据</li>
            <li>族员可以查看族谱信息</li>
            <li>数据保存在云端，多设备同步</li>
          </ul>
        </div>
      </div>
    </div>
  );
}

export default Login;
