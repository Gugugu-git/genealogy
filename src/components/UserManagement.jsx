import React, { useState, useEffect } from 'react';

function UserManagement({ currentUser, onLogout }) {
  const [users, setUsers] = useState([]);
  const [showAddModal, setShowAddModal] = useState(false);
  const [newUsername, setNewUsername] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [newRole, setNewRole] = useState('visitor');
  const [error, setError] = useState('');

  useEffect(() => {
    loadUsers();
  }, []);

  const loadUsers = () => {
    const savedUsers = JSON.parse(localStorage.getItem('genealogyUsers') || '[]');
    setUsers(savedUsers.map(u => ({ ...u, password: '******' })));
  };

  const handleAddUser = (e) => {
    e.preventDefault();
    setError('');

    if (!newUsername.trim() || !newPassword.trim()) {
      setError('请输入用户名和密码');
      return;
    }

    if (newPassword.length < 6) {
      setError('密码长度至少6位');
      return;
    }

    const savedUsers = JSON.parse(localStorage.getItem('genealogyUsers') || '[]');
    if (savedUsers.find(u => u.username === newUsername)) {
      setError('用户名已存在');
      return;
    }

    const newUser = {
      id: Date.now(),
      username: newUsername,
      password: newPassword,
      role: newRole,
      createdAt: new Date().toLocaleString('zh-CN')
    };

    savedUsers.push(newUser);
    localStorage.setItem('genealogyUsers', JSON.stringify(savedUsers));
    
    setNewUsername('');
    setNewPassword('');
    setNewRole('visitor');
    setShowAddModal(false);
    loadUsers();
  };

  const handleDeleteUser = (userId) => {
    if (userId === currentUser.id) {
      alert('不能删除当前登录的账号！');
      return;
    }

    if (!confirm('确定要删除此用户吗？')) {
      return;
    }

    const savedUsers = JSON.parse(localStorage.getItem('genealogyUsers') || '[]');
    const filteredUsers = savedUsers.filter(u => u.id !== userId);
    localStorage.setItem('genealogyUsers', JSON.stringify(filteredUsers));
    loadUsers();
  };

  const handleChangeRole = (userId, newRole) => {
    if (userId === currentUser.id) {
      alert('不能修改当前登录账号的角色！');
      return;
    }

    const savedUsers = JSON.parse(localStorage.getItem('genealogyUsers') || '[]');
    const userIndex = savedUsers.findIndex(u => u.id === userId);
    if (userIndex !== -1) {
      savedUsers[userIndex].role = newRole;
      localStorage.setItem('genealogyUsers', JSON.stringify(savedUsers));
      loadUsers();
    }
  };

  const handleResetPassword = (userId) => {
    const newPassword = prompt('请输入新密码（至少6位）：');
    if (!newPassword || newPassword.length < 6) {
      alert('密码长度至少6位');
      return;
    }

    const savedUsers = JSON.parse(localStorage.getItem('genealogyUsers') || '[]');
    const userIndex = savedUsers.findIndex(u => u.id === userId);
    if (userIndex !== -1) {
      savedUsers[userIndex].password = newPassword;
      localStorage.setItem('genealogyUsers', JSON.stringify(savedUsers));
      alert('密码重置成功！');
    }
  };

  return (
    <div className="user-management">
      <div className="card">
        <div className="card-title">👥 用户管理</div>
        
        <div className="user-actions">
          <button className="btn btn-primary" onClick={() => setShowAddModal(true)}>
            ➕ 新增用户
          </button>
        </div>

        <div className="users-list">
          <table className="users-table">
            <thead>
              <tr>
                <th>用户名</th>
                <th>角色</th>
                <th>创建时间</th>
                <th>操作</th>
              </tr>
            </thead>
            <tbody>
              {users.map(user => (
                <tr key={user.id} className={user.id === currentUser.id ? 'current-user' : ''}>
                  <td>
                    {user.username}
                    {user.id === currentUser.id && <span className="current-badge">当前</span>}
                  </td>
                  <td>
                    <select
                      value={user.role}
                      onChange={(e) => handleChangeRole(user.id, e.target.value)}
                      disabled={user.id === currentUser.id}
                      className="role-select"
                    >
                      <option value="admin">管理员</option>
                      <option value="visitor">游客</option>
                    </select>
                  </td>
                  <td>{user.createdAt}</td>
                  <td>
                    <div className="action-buttons">
                      <button
                        className="btn btn-secondary btn-sm"
                        onClick={() => handleResetPassword(user.id)}
                      >
                        重置密码
                      </button>
                      {user.id !== currentUser.id && (
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
        </div>
      </div>

      {showAddModal && (
        <div className="modal-overlay" onClick={() => setShowAddModal(false)}>
          <div className="modal" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h3 className="modal-title">新增用户</h3>
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
                  <option value="visitor">游客</option>
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
