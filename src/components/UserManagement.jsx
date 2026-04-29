import React, { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';

function UserManagement({ currentUser }) {
  const [users, setUsers] = useState([]);
  const [showAddModal, setShowAddModal] = useState(false);
  const [newEmail, setNewEmail] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [newUsername, setNewUsername] = useState('');
  const [newRole, setNewRole] = useState('viewer');
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [filter, setFilter] = useState('all');

  useEffect(() => {
    loadUsers();
  }, []);

  const loadUsers = async () => {
    try {
      const { data, error } = await supabase
        .from('profiles')
        .select('*')
        .order('created_at', { ascending: true });

      if (error) throw error;
      setUsers(data || []);
    } catch (err) {
      console.error('加载用户失败:', err);
      if (err.message?.includes('relation "public.profiles" does not exist')) {
        setError('⚠️ 数据库表未创建，请在Supabase控制台执行SQL脚本');
      } else if (err.message?.includes('Invalid API key')) {
        setError('⚠️ Supabase配置错误，请检查环境变量');
      } else {
        setError('⚠️ 加载用户失败: ' + err.message);
      }
      setUsers([]);
    }
  };

  const logAction = async (action, targetUserId, details) => {
    try {
      await supabase.from('audit_logs').insert([{
        user_id: currentUser.id,
        action: action,
        target_user_id: targetUserId,
        details: details
      }]);
    } catch (err) {
      console.error('记录日志失败:', err);
    }
  };

  const handleApproveUser = async (userId) => {
    if (!confirm('确定要批准此用户吗？')) return;

    try {
      const { error } = await supabase
        .from('profiles')
        .update({ status: 'approved' })
        .eq('id', userId);

      if (error) throw error;

      await logAction('approve_user', userId, { reason: '管理员批准' });
      setSuccess('用户已批准！');
      setTimeout(() => setSuccess(''), 3000);
      loadUsers();
    } catch (err) {
      setError('批准用户失败: ' + err.message);
    }
  };

  const handleRejectUser = async (userId) => {
    const reason = prompt('请输入拒绝原因：');
    if (!reason) return;

    try {
      const { error } = await supabase
        .from('profiles')
        .update({ status: 'rejected' })
        .eq('id', userId);

      if (error) throw error;

      await logAction('reject_user', userId, { reason: reason });
      setSuccess('用户已拒绝！');
      setTimeout(() => setSuccess(''), 3000);
      loadUsers();
    } catch (err) {
      setError('拒绝用户失败: ' + err.message);
    }
  };

  const handleSuspendUser = async (userId) => {
    const reason = prompt('请输入停用原因：');
    if (!reason) return;

    try {
      const { error } = await supabase
        .from('profiles')
        .update({ status: 'suspended' })
        .eq('id', userId);

      if (error) throw error;

      await logAction('suspend_user', userId, { reason: reason });
      setSuccess('用户已停用！');
      setTimeout(() => setSuccess(''), 3000);
      loadUsers();
    } catch (err) {
      setError('停用用户失败: ' + err.message);
    }
  };

  const handleActivateUser = async (userId) => {
    if (!confirm('确定要重新激活此用户吗？')) return;

    try {
      const { error } = await supabase
        .from('profiles')
        .update({ status: 'approved' })
        .eq('id', userId);

      if (error) throw error;

      await logAction('activate_user', userId, { reason: '管理员重新激活' });
      setSuccess('用户已激活！');
      setTimeout(() => setSuccess(''), 3000);
      loadUsers();
    } catch (err) {
      setError('激活用户失败: ' + err.message);
    }
  };

  const handleChangeRole = async (userId, newRole) => {
    if (userId === currentUser.id) {
      alert('不能修改自己的角色！');
      return;
    }

    const targetUser = users.find(u => u.id === userId);
    if (targetUser?.role === 'super_admin') {
      alert('不能修改超级管理员的角色！');
      return;
    }

    if (!confirm(`确定要将此用户的角色改为 ${getRoleName(newRole)} 吗？`)) return;

    try {
      const { error } = await supabase
        .from('profiles')
        .update({ role: newRole })
        .eq('id', userId);

      if (error) throw error;

      await logAction('change_role', userId, { 
        old_role: targetUser.role, 
        new_role: newRole 
      });
      setSuccess('角色已更新！');
      setTimeout(() => setSuccess(''), 3000);
      loadUsers();
    } catch (err) {
      setError('修改角色失败: ' + err.message);
    }
  };

  const handleDeleteUser = async (userId) => {
    if (userId === currentUser.id) {
      alert('不能删除当前登录的账号！');
      return;
    }

    const targetUser = users.find(u => u.id === userId);
    if (targetUser?.role === 'super_admin') {
      alert('不能删除超级管理员！');
      return;
    }

    if (!confirm('确定要删除此用户吗？此操作不可恢复！')) {
      return;
    }

    try {
      await supabase.from('profiles').delete().eq('id', userId);
      await logAction('delete_user', userId, { username: targetUser.username });
      setSuccess('用户已删除！');
      setTimeout(() => setSuccess(''), 3000);
      loadUsers();
    } catch (err) {
      console.error('删除用户失败:', err);
      alert('删除用户失败：' + err.message);
    }
  };

  const handleAddUser = async (e) => {
    e.preventDefault();
    setError('');

    if (!newEmail.trim() || !newPassword.trim() || !newUsername.trim()) {
      setError('请填写所有字段');
      return;
    }

    if (newPassword.length < 6) {
      setError('密码长度至少6位');
      return;
    }

    try {
      const { data: authData, error: authError } = await supabase.auth.signUp({
        email: newEmail,
        password: newPassword,
        options: {
          data: { username: newUsername }
        }
      });

      if (authError) throw authError;

      const { error: profileError } = await supabase
        .from('profiles')
        .insert([{
          id: authData.user.id,
          username: newUsername,
          role: newRole,
          status: 'approved'
        }]);

      if (profileError && !profileError.message.includes('duplicate')) {
        console.error('创建profile失败:', profileError);
      }

      await logAction('create_user', authData.user.id, { 
        username: newUsername, 
        role: newRole 
      });

      setNewEmail('');
      setNewPassword('');
      setNewUsername('');
      setNewRole('viewer');
      setShowAddModal(false);
      setSuccess('用户创建成功！');
      setTimeout(() => setSuccess(''), 3000);
      loadUsers();
    } catch (err) {
      setError(err.message || '添加用户失败');
    }
  };

  const getRoleName = (role) => {
    const roleMap = {
      'super_admin': '超级管理员',
      'admin': '管理员',
      'editor': '编辑者',
      'viewer': '族员'
    };
    return roleMap[role] || role;
  };

  const getStatusName = (status) => {
    const statusMap = {
      'pending': '待审核',
      'approved': '已批准',
      'rejected': '已拒绝',
      'suspended': '已停用'
    };
    return statusMap[status] || status;
  };

  const getStatusColor = (status) => {
    const colorMap = {
      'pending': '#ffc107',
      'approved': '#28a745',
      'rejected': '#dc3545',
      'suspended': '#6c757d'
    };
    return colorMap[status] || '#6c757d';
  };

  const filteredUsers = users.filter(user => {
    if (filter === 'all') return true;
    return user.status === filter;
  });

  const pendingCount = users.filter(u => u.status === 'pending').length;

  return (
    <div className="user-management">
      <div className="card">
        <div className="card-title">用户管理</div>
        
        {pendingCount > 0 && (
          <div style={{
            padding: '12px',
            background: '#fff3cd',
            border: '1px solid #ffc107',
            borderRadius: '6px',
            marginBottom: '16px',
            color: '#856404'
          }}>
            有 {pendingCount} 个用户等待审核
          </div>
        )}

        {error && (
          <div style={{
            padding: '12px',
            background: '#f8d7da',
            border: '1px solid #f5c6cb',
            borderRadius: '6px',
            marginBottom: '16px',
            color: '#721c24'
          }}>
            {error}
          </div>
        )}

        {success && (
          <div style={{
            padding: '12px',
            background: '#d4edda',
            border: '1px solid #c3e6cb',
            borderRadius: '6px',
            marginBottom: '16px',
            color: '#155724'
          }}>
            ✓ {success}
          </div>
        )}
        
        <div className="user-actions">
          <button className="btn btn-primary" onClick={() => setShowAddModal(true)}>
            ➕ 新增用户
          </button>
          <button className="btn btn-secondary" onClick={loadUsers}>
            🔄 刷新列表
          </button>
          <select 
            value={filter} 
            onChange={(e) => setFilter(e.target.value)}
            style={{
              padding: '8px 12px',
              borderRadius: '6px',
              border: '1px solid #ddd'
            }}
          >
            <option value="all">全部用户</option>
            <option value="pending">待审核</option>
            <option value="approved">已批准</option>
            <option value="rejected">已拒绝</option>
            <option value="suspended">已停用</option>
          </select>
        </div>

        <div className="users-list">
          <table className="users-table">
            <thead>
              <tr>
                <th>用户名</th>
                <th>邮箱</th>
                <th>角色</th>
                <th>状态</th>
                <th>注册时间</th>
                <th>操作</th>
              </tr>
            </thead>
            <tbody>
              {filteredUsers.map(user => (
                <tr key={user.id} className={user.id === currentUser.id ? 'current-user' : ''}>
                  <td>
                    {user.username}
                    {user.id === currentUser.id && <span className="current-badge">当前</span>}
                  </td>
                  <td>{user.email}</td>
                  <td>
                    <select
                      value={user.role}
                      onChange={(e) => handleChangeRole(user.id, e.target.value)}
                      disabled={user.id === currentUser.id || user.role === 'super_admin'}
                      className="role-select"
                    >
                      <option value="super_admin">超级管理员</option>
                      <option value="admin">管理员</option>
                      <option value="editor">编辑者</option>
                      <option value="viewer">族员</option>
                    </select>
                  </td>
                  <td>
                    <span style={{
                      padding: '4px 8px',
                      borderRadius: '4px',
                      background: getStatusColor(user.status),
                      color: 'white',
                      fontSize: '12px'
                    }}>
                      {getStatusName(user.status)}
                    </span>
                  </td>
                  <td>{user.created_at ? new Date(user.created_at).toLocaleString('zh-CN') : '-'}</td>
                  <td>
                    <div className="action-buttons">
                      {user.status === 'pending' && (
                        <>
                          <button
                            className="btn btn-success btn-sm"
                            onClick={() => handleApproveUser(user.id)}
                          >
                            批准
                          </button>
                          <button
                            className="btn btn-danger btn-sm"
                            onClick={() => handleRejectUser(user.id)}
                          >
                            拒绝
                          </button>
                        </>
                      )}
                      {user.status === 'approved' && user.id !== currentUser.id && (
                        <button
                          className="btn btn-warning btn-sm"
                          onClick={() => handleSuspendUser(user.id)}
                        >
                          停用
                        </button>
                      )}
                      {(user.status === 'rejected' || user.status === 'suspended') && (
                        <button
                          className="btn btn-success btn-sm"
                          onClick={() => handleActivateUser(user.id)}
                        >
                          激活
                        </button>
                      )}
                      {user.id !== currentUser.id && user.role !== 'super_admin' && (
                        <button
                          className="btn btn-danger btn-sm"
                          onClick={() => handleDeleteUser(user.id)}
                        >
                          删除
                        </button>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>

          {filteredUsers.length === 0 && (
            <p style={{ textAlign: 'center', color: '#888', padding: '40px' }}>
              暂无用户
            </p>
          )}
        </div>
      </div>

      {showAddModal && (
        <div className="modal-overlay" onClick={() => setShowAddModal(false)}>
          <div className="modal" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h3 className="modal-title">➕ 新增用户</h3>
              <button className="modal-close" onClick={() => setShowAddModal(false)}>×</button>
            </div>
            
            <form onSubmit={handleAddUser}>
              <div className="form-group">
                <label className="form-label">用户名</label>
                <input
                  type="text"
                  className="form-input"
                  value={newUsername}
                  onChange={(e) => setNewUsername(e.target.value)}
                  placeholder="请输入用户名"
                />
              </div>

              <div className="form-group">
                <label className="form-label">邮箱</label>
                <input
                  type="email"
                  className="form-input"
                  value={newEmail}
                  onChange={(e) => setNewEmail(e.target.value)}
                  placeholder="请输入邮箱地址"
                />
              </div>

              <div className="form-group">
                <label className="form-label">密码</label>
                <input
                  type="password"
                  className="form-input"
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  placeholder="请输入密码（至少6位）"
                />
              </div>

              <div className="form-group">
                <label className="form-label">角色</label>
                <select
                  className="form-select"
                  value={newRole}
                  onChange={(e) => setNewRole(e.target.value)}
                >
                  <option value="admin">管理员</option>
                  <option value="editor">编辑者</option>
                  <option value="viewer">族员</option>
                </select>
              </div>

              {error && <div className="error-message">{error}</div>}

              <div className="modal-actions">
                <button type="button" className="btn btn-secondary" onClick={() => setShowAddModal(false)}>
                  取消
                </button>
                <button type="submit" className="btn btn-primary">
                  确定
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

export default UserManagement;
