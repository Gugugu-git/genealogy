import React, { useState, useEffect } from 'react';
import { BrowserRouter as Router, Routes, Route, NavLink, Navigate } from 'react-router-dom';
import Overview from './components/Overview';
import Genealogy from './components/Genealogy';
import Generation from './components/Generation';
import Rules from './components/Rules';
import PrefacePostscript from './components/PrefacePostscript';
import DataManagement from './components/DataManagement';
import GuideModal from './components/GuideModal';
import CaptchaCanvas from './components/CaptchaCanvas';
import { supabase } from './lib/supabase';
import dataService from './lib/dataService';
import { runMigration, verifyMigration, rollbackMigration } from './lib/migration';
import syncService from './lib/syncService';
import authService from './lib/authService';
import './App.css';

if (typeof window !== 'undefined') {
  window.runMigration = runMigration;
  window.verifyMigration = verifyMigration;
  window.rollbackMigration = rollbackMigration;
}

const ipcRenderer = typeof window !== 'undefined' && window.require ? window.require('electron').ipcRenderer : null;

function App() {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [showGuide, setShowGuide] = useState(false);
  const [changeLog, setChangeLog] = useState([]);
  const [isAdmin, setIsAdmin] = useState(false);
  const [hasSelectedRole, setHasSelectedRole] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [showScrollTop, setShowScrollTop] = useState(false);
  const [onlineUsers, setOnlineUsers] = useState([]);
  const [editingInfo, setEditingInfo] = useState(null);
  const [syncEnabled, setSyncEnabled] = useState(true);
  const [memberName, setMemberName] = useState('');
  const [fatherName, setFatherName] = useState('');
  const [memberError, setMemberError] = useState('');
  const [memberLoading, setMemberLoading] = useState(false);
  const [verifiedMember, setVerifiedMember] = useState(null);
  const [captchaVerified, setCaptchaVerified] = useState(false);
  const [authLoading, setAuthLoading] = useState(false);

  // 数据版本，每次数据结构变更时更新
  const DATA_VERSION = '2';

  useEffect(() => {
    const handleScroll = () => {
      const appMain = document.querySelector('.app-main');
      if (appMain) {
        setShowScrollTop(appMain.scrollTop > 50);
      } else {
        setShowScrollTop(window.scrollY > 50);
      }
    };

    const appMain = document.querySelector('.app-main');
    if (appMain) {
      appMain.addEventListener('scroll', handleScroll);
      return () => appMain.removeEventListener('scroll', handleScroll);
    } else {
      window.addEventListener('scroll', handleScroll);
      return () => window.removeEventListener('scroll', handleScroll);
    }
  }, []);

  const scrollToTop = () => {
    const appMain = document.querySelector('.app-main');
    if (appMain) {
      appMain.scrollTo({ top: 0, behavior: 'smooth' });
    } else {
      window.scrollTo({ top: 0, behavior: 'smooth' });
    }
  };

  // 验证数据结构是否有效
  const isDataValid = (data) => {
    if (!data) return false;
    if (!data.genealogy || !Array.isArray(data.genealogy)) return false;
    return true;
  };

  useEffect(() => {
    const initialize = async () => {
      // 1. 先从 localStorage 恢复状态（快速显示）
      const adminStatus = localStorage.getItem('isAdmin') === 'true';
      setIsAdmin(adminStatus);

      if (adminStatus || localStorage.getItem('hasSelectedRole') === 'true') {
        setHasSelectedRole(true);
      }

      // 2. 检查缓存版本，不匹配则清理
      const cachedVersion = localStorage.getItem('dataVersion');
      if (cachedVersion !== DATA_VERSION) {
        localStorage.removeItem('cachedData');
        localStorage.removeItem('cachedTime');
        localStorage.removeItem('dataVersion');
      }

      // 3. 尝试加载缓存数据（快速显示）
      const cachedDataStr = localStorage.getItem('cachedData');
      const cachedTime = localStorage.getItem('cachedTime');
      if (cachedDataStr && cachedTime && cachedVersion === DATA_VERSION) {
        try {
          const parsedData = JSON.parse(cachedDataStr);
          if (isDataValid(parsedData)) {
            const cleanData = { ...parsedData };
            delete cleanData.changeLog;
            setData(cleanData);
            setLoading(false);
          }
        } catch (e) {
          console.warn('解析缓存数据失败，忽略缓存');
        }
      }

      // 4. 重新验证会话（确保权限最新）
      try {
        const session = await authService.getSession();
        if (session?.user) {
          const username = authService.getGitHubUsername(session.user);
          if (username) {
            await handleGitHubLogin(session.user);
          }
        }
      } catch (err) {
        console.warn('检查会话状态失败:', err);
      }

      // 5. 从云端加载数据（始终执行，确保数据最新）
      let cloudLoadSuccess = false;
      try {
        // 先加载日志（使用 dataService，带缓存和重试）
        try {
          const logsData = await dataService.getChangeLogs(100);
          if (logsData && Array.isArray(logsData)) {
            const formattedLogs = logsData.map(log => ({
              id: log.log_id,
              time: log.time,
              type: log.type,
              module: log.module,
              content: log.content,
              editor: log.editor,
              details: log.details,
              browser: log.browser
            }));
            setChangeLog(formattedLogs);
            // 缓存日志到本地
            try {
              localStorage.setItem('cachedChangeLogs', JSON.stringify(formattedLogs));
            } catch (e) {
              console.warn('缓存日志失败:', e);
            }
          }
        } catch (logsError) {
          console.error('加载日志失败:', logsError);
          // 尝试从 localStorage 恢复日志缓存
          const cachedLogs = localStorage.getItem('cachedChangeLogs');
          if (cachedLogs) {
            try {
              setChangeLog(JSON.parse(cachedLogs));
              console.log('✅ 从本地缓存恢复日志');
            } catch (e) {
              console.warn('解析缓存日志失败');
            }
          }
        }

        // 再加载族谱数据（使用 dataService，带缓存和重试）
        try {
          const supabaseData = await dataService.getGenealogyData();
          console.log('📊 Supabase 返回数据:', supabaseData);

          if (supabaseData && supabaseData.data && supabaseData.data.genealogy && Array.isArray(supabaseData.data.genealogy)) {
            console.log('✅ 从云端加载族谱数据成功');
            setData(supabaseData.data);
            cloudLoadSuccess = true;

            // 更新缓存
            const dataToCache = { ...supabaseData.data };
            delete dataToCache.changeLog;
            localStorage.setItem('cachedData', JSON.stringify(dataToCache));
            localStorage.setItem('cachedTime', Date.now().toString());
            localStorage.setItem('dataVersion', DATA_VERSION);
            console.log('✅ 数据已缓存到本地');
          } else {
            console.warn('⚠️ 云端数据格式无效');
          }
        } catch (dataError) {
          console.error('❌ 加载族谱数据失败:', dataError);
        }
      } catch (error) {
        console.error('从云端加载数据失败:', error);
      }

      // 如果云端加载失败且没有本地缓存，设置一个标记
      if (!cloudLoadSuccess && !data) {
        console.warn('⚠️ 云端加载失败且没有本地缓存');
      }

      // 6. 初始化同步服务
      if (syncEnabled) {
        syncService.initialize(
          (newData, updatedBy) => {
            if (updatedBy !== syncService.getUserName()) {
              console.log('收到远程数据更新');
              setData(newData);
              localStorage.setItem('cachedData', JSON.stringify(newData));
              localStorage.setItem('cachedTime', Date.now().toString());
            }
          },
          (users, editing) => {
            setOnlineUsers(users);
            setEditingInfo(editing);
          }
        );
      }

      // 7. 检查是否显示引导
      const hasSeenGuide = localStorage.getItem('hasSeenGuide');
      if (!hasSeenGuide) {
        setShowGuide(true);
      }

      setLoading(false);
    };

    initialize();

    const { data: { subscription } } = authService.onAuthStateChange(
      async (event, session) => {
        if (event === 'SIGNED_IN' && session) {
          await handleGitHubLogin(session.user);
        } else if (event === 'SIGNED_OUT') {
          localStorage.removeItem('isAdmin');
          localStorage.removeItem('userRole');
          localStorage.removeItem('githubUsername');
          setIsAdmin(false);
          setHasSelectedRole(false);
        }
      }
    );

    return () => {
      syncService.cleanup();
      subscription.unsubscribe();
    };
  }, []);

  const handleGitHubLogin = async (user) => {
    try {
      const username = authService.getGitHubUsername(user);
      const role = await authService.fetchUserRole(username);

      const isAuthenticated = ['admin', 'editor'].includes(role);
      setIsAdmin(isAuthenticated);
      setHasSelectedRole(true);
      localStorage.setItem('isAdmin', isAuthenticated ? 'true' : 'false');
      localStorage.setItem('hasSelectedRole', 'true');
      localStorage.setItem('userRole', role);
      if (username) {
        localStorage.setItem('githubUsername', username);
      }
    } catch (err) {
      console.error('GitHub 登录处理失败:', err);
    } finally {
      setAuthLoading(false);
    }
  };

  const handleGitHubSignIn = async () => {
    setAuthLoading(true);
    try {
      await authService.signInWithGitHub();
    } catch (err) {
      console.error('GitHub 登录失败:', err);
      setAuthLoading(false);
    }
  };



  const saveData = async (newData, action = null, targetName = null) => {
    try {
      await dataService.saveGenealogyData(newData, syncService.getUserName());

      syncService.setLastUpdateTime(Date.now());
      localStorage.setItem('cachedData', JSON.stringify(newData));
      localStorage.setItem('cachedTime', Date.now().toString());
      localStorage.setItem('dataVersion', DATA_VERSION);

      if (action && targetName) {
        syncService.broadcastEditing(action, targetName);
      }

      if (ipcRenderer) {
        await ipcRenderer.invoke('save-data', newData);
      }
    } catch (error) {
      console.error('保存数据失败:', error);
      throw error;
    }
  };

  const addChangeLog = async (action, updatedData = null) => {
    const logId = 'log_' + Date.now();
    const log = {
      id: logId,
      time: new Date().toLocaleString('zh-CN'),
      type: action.type || 'edit',
      module: action.module || '系统',
      content: action.content || '',
      editor: action.editor || '当前用户',
      details: action.details || null,
      browser: navigator.userAgent.includes('Chrome') ? 'Chrome' :
        navigator.userAgent.includes('Firefox') ? 'Firefox' :
          navigator.userAgent.includes('Safari') ? 'Safari' : '其他浏览器'
    };

    const newLog = [log, ...changeLog].slice(0, 100);
    setChangeLog(newLog);

    // 缓存日志到本地
    try {
      localStorage.setItem('cachedChangeLogs', JSON.stringify(newLog));
    } catch (e) {
      console.warn('缓存日志失败:', e);
    }

    try {
      await dataService.addChangeLog(log);
      console.log('✅ 日志已保存到云端');
    } catch (err) {
      console.error('保存日志到云端失败:', err);
      // 日志保存失败不影响主流程，已缓存到本地
    }

    if (updatedData) {
      const dataToSave = { ...updatedData };
      delete dataToSave.changeLog;
      saveData(dataToSave);
    }
  };

  const closeGuide = () => {
    setShowGuide(false);
    localStorage.setItem('hasSeenGuide', 'true');
  };

  const normalizeName = (input) => {
    const trimmed = input.trim();
    if (trimmed.startsWith('胡')) {
      return trimmed.slice(1);
    }
    return trimmed;
  };

  const namesMatch = (inputName, dbName) => {
    const normalizedInput = normalizeName(inputName);
    const normalizedDb = normalizeName(dbName);
    return normalizedInput === normalizedDb;
  };

  const verifyMember = (name, father, genealogyData) => {
    if (!genealogyData || !genealogyData.genealogy) return null;

    for (const person of genealogyData.genealogy) {
      const allChildren = [
        ...(person.children || []),
        ...(person.daughters || [])
      ];

      for (const child of allChildren) {
        if (namesMatch(name, child.name) && namesMatch(father, person.name)) {
          return {
            name: child.name,
            fatherName: person.name,
            generation: person.generation + 1,
            gender: child.gender
          };
        }
      }
    }

    return null;
  };

  const handleMemberLogin = async (e) => {
    e.preventDefault();
    setMemberError('');
    setMemberLoading(true);

    const trimmedName = memberName.trim();
    const trimmedFather = fatherName.trim();

    if (!trimmedName) {
      setMemberError('请输入您的姓名');
      setMemberLoading(false);
      return;
    }

    if (!trimmedFather) {
      setMemberError('请输入父亲的姓名');
      setMemberLoading(false);
      return;
    }

    if (!captchaVerified) {
      setMemberError('请先完成验证码验证');
      setMemberLoading(false);
      return;
    }

    let genealogyData = data;

    if (!genealogyData || !genealogyData.genealogy) {
      try {
        const { data: supabaseData, error } = await supabase
          .from('genealogy_data')
          .select('data')
          .eq('id', 1)
          .single();

        if (!error && supabaseData?.data) {
          genealogyData = supabaseData.data;
        } else {
          let loadedData;
          if (ipcRenderer) {
            loadedData = await ipcRenderer.invoke('read-data');
          } else {
            const response = await fetch('./泸县大堰胡氏宗谱数据.json');
            loadedData = await response.json();
          }
          genealogyData = loadedData;
        }
      } catch (err) {
        console.error('加载族谱数据失败:', err);
        setMemberError('加载族谱数据失败，请稍后重试');
        setMemberLoading(false); return;
      }
    }

    const result = verifyMember(trimmedName, trimmedFather, genealogyData);

    if (result) {
      setVerifiedMember(result);
      localStorage.removeItem('isAdmin');
      localStorage.removeItem('adminAuthTime');
      localStorage.setItem('hasSelectedRole', 'true');
      localStorage.setItem('userRole', 'viewer');
      localStorage.setItem('memberName', result.name);
      localStorage.setItem('memberFather', result.fatherName);
      setIsAdmin(false);
      setHasSelectedRole(true);
    } else {
      setMemberError('验证失败：姓名与父亲姓名不匹配。提示：请尝试加上对应字辈，如"贤碧"、"清鑫"等');
    }

    setMemberLoading(false);
  };

  const handleLogout = async () => {
    localStorage.removeItem('isAdmin');
    localStorage.removeItem('adminAuthTime');
    localStorage.removeItem('hasSelectedRole');
    localStorage.removeItem('userRole');
    localStorage.removeItem('githubUsername');
    localStorage.removeItem('memberName');
    localStorage.removeItem('memberFather');
    setIsAdmin(false);
    setHasSelectedRole(false);
    setVerifiedMember(null);
    setMemberName('');
    setFatherName('');
    setCaptchaVerified(false);
    try {
      await authService.signOut();
    } catch (err) {
      console.error('GitHub 退出失败:', err);
    }
  };

  if (!hasSelectedRole) {
    return (
      <div className="welcome-container">
        <div className="welcome-card">
          <h1>泸县大堰胡氏宗谱</h1>
          <p>请通过族员身份验证后浏览族谱信息</p>

          <form onSubmit={handleMemberLogin} className="member-login-form">
            <div className="form-group">
              <label className="form-label">您的姓名</label>
              <input
                type="text"
                className="form-input"
                value={memberName}
                onChange={(e) => setMemberName(e.target.value)}
                placeholder="请输入您在族谱中的姓名"
                required
              />
            </div>

            <div className="form-group">
              <label className="form-label">父亲姓名</label> <input
                type="text"
                className="form-input"
                value={fatherName}
                onChange={(e) => setFatherName(e.target.value)}
                placeholder="请输入您父亲在族谱中的姓名"
                required
              />
            </div>

            <div className="form-group">
              <label className="form-label">验证码</label>
              <CaptchaCanvas onVerify={setCaptchaVerified} />
            </div>

            {memberError && <div className="error-message">{memberError}</div>}

            <button type="submit" className="btn btn-primary member-login-btn" disabled={memberLoading || !captchaVerified}>
              {memberLoading ? '验证中...' : '验证登录'}
            </button>
          </form>

          <div className="divider">
            <span>或者</span>
          </div>

          <button
            type="button"
            className="btn btn-github"
            onClick={handleGitHubSignIn}
            disabled={authLoading}
          >
            <svg height="20" width="20" viewBox="0 0 16 16" fill="currentColor">
              <path d="M8 0C3.58 0 0 3.58 0 8c0 3.54 2.29 6.53 5.47 7.59.4.07.55-.17.55-.38 0-.19-.01-.82-.01-1.49-2.01.37-2.53-.49-2.69-.94-.09-.23-.48-.94-.82-1.13-.28-.15-.68-.52-.01-.53.63-.01 1.08.58 1.23.82.72 1.21 1.87.87 2.33.66.07-.52.28-.87.51-1.07-1.78-.2-3.64-.89-3.64-3.95 0-.87.31-1.59.82-2.15-.08-.2-.36-1.02.08-2.12 0 0 .67-.21 2.2.82.64-.18 1.32-.27 2-.27.68 0 1.36.09 2 .27 1.53-1.04 2.2-.82 2.2-.82.44 1.1.16 1.92.08 2.12.51.56.82 1.27.82 2.15 0 3.07-1.87 3.75-3.65 3.95.29.25.54.73.54 1.48 0 1.07-.01 1.93-.01 2.2 0 .21.15.46.55.38A8.013 8.013 0 0016 8c0-4.42-3.58-8-8-8z" />
            </svg>
            {authLoading ? '登录中...' : '管理员登录'}
          </button>

          <p className="welcome-note">
            族员验证：输入您和父亲在族谱中登记的姓名进行身份验证
          </p>
        </div>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="loading-container">
        <div className="loading-spinner"></div>
        <p>加载中...</p>
      </div>
    );
  }

  const navItems = [
    { path: '/', label: '族谱总览' },
    { path: '/genealogy', label: '世系展示' },
    { path: '/generation', label: '字辈查询' },
    { path: '/rules', label: '凡例规则' },
    { path: '/preface', label: '谱序后跋' },
    ...(isAdmin ? [{ path: '/data', label: '数据管理' }] : [])
  ];

  return (
    <Router>
      <div className="app">
        <header className="app-header border-b border-gray-100 bg-white/80 backdrop-blur-lg sticky top-0 z-50">
          <div className="header-content max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 flex justify-between items-center h-14 sm:h-16">
            <NavLink to="/" className="flex items-center gap-2 group">
              <div className="w-8 h-8 bg-gradient-to-br from-gray-900 to-gray-700 rounded-lg flex items-center justify-center text-white font-bold text-sm group-hover:scale-105 transition-transform">
                胡
              </div>
              <h1 className="text-sm sm:text-base font-semibold text-gray-900 tracking-tight">
                泸县大堰胡氏宗谱
              </h1>
            </NavLink>

            <nav className="hidden md:flex items-center gap-1">
              {navItems.map((item) => (
                <NavLink
                  key={item.path}
                  to={item.path}
                  className={({ isActive }) =>
                    `px-3 py-2 text-sm font-medium rounded-md transition-all duration-200 ${
                      isActive
                        ? 'bg-gray-100 text-gray-900'
                        : 'text-gray-600 hover:text-gray-900 hover:bg-gray-50'
                    }`
                  }
                >
                  {item.label}
                </NavLink>
              ))}
            </nav>

            <div className="hidden md:flex items-center gap-3">
              {onlineUsers.length > 0 && (
                <div className="flex items-center gap-2 px-3 py-1.5 bg-green-50 rounded-full">
                  <span className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></span>
                  <span className="text-xs text-green-700">{onlineUsers.length} 人在线</span>
                </div>
              )}

              {editingInfo && editingInfo.user !== syncService.getUserName() && (
                <div className="flex items-center gap-2 px-3 py-1.5 bg-yellow-50 rounded-full animate-pulse">
                  <span className="text-xs text-yellow-700">
                    {editingInfo.user} 正在{editingInfo.action === 'edit' ? '编辑' : editingInfo.action === 'delete' ? '删除' : '添加'} {editingInfo.target}
                  </span>
                </div>
              )}

              <div className="flex items-center gap-2 px-3 py-1.5 bg-gray-50 rounded-full">
                <span className="text-xs text-gray-600">{isAdmin ? '管理员' : (localStorage.getItem('memberName') ? `族员·${localStorage.getItem('memberName')}` : '族员')}</span>
              </div>
              <button
                className="px-3 py-1.5 text-sm text-gray-600 hover:text-gray-900 hover:bg-gray-50 rounded-md transition-colors"
                onClick={() => setShowGuide(true)}
              >
                操作指引
              </button>
              <button
                className="px-3 py-1.5 text-sm text-gray-600 hover:text-gray-900 hover:bg-gray-50 rounded-md transition-colors"
                onClick={handleLogout}
              >
                退出
              </button>
            </div>

            <button
              className="md:hidden p-2 hover:bg-gray-100 rounded-lg transition-colors"
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
            >
              <svg className="w-5 h-5 text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                {mobileMenuOpen ? (
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                ) : (
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
                )}
              </svg>
            </button>
          </div>

          {mobileMenuOpen && (
            <div className="md:hidden border-t border-gray-100 bg-white">
              <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4 space-y-1">
                <div className="px-3 py-2 bg-gray-50 rounded-lg mb-3">
                  <span className="text-sm text-gray-600">{isAdmin ? '管理员' : (localStorage.getItem('memberName') ? `族员·${localStorage.getItem('memberName')}` : '族员')}</span>
                </div>

                {navItems.map((item) => (
                  <NavLink
                    key={item.path}
                    to={item.path}
                    className={({ isActive }) =>
                      `block w-full px-3 py-2 rounded-md text-sm ${
                        isActive
                          ? 'bg-gray-100 text-gray-900 font-medium'
                          : 'text-gray-600 hover:bg-gray-50 hover:text-gray-900'
                      }`
                    }
                    onClick={() => setMobileMenuOpen(false)}
                  >
                    {item.label}
                  </NavLink>
                ))}

                <div className="h-px bg-gray-100 my-3" />

                <button
                  className="w-full text-left px-3 py-2 rounded-md text-sm text-gray-600 hover:bg-gray-50 hover:text-gray-900"
                  onClick={() => { setShowGuide(true); setMobileMenuOpen(false); }}
                >
                  操作指引
                </button>
                <button
                  className="w-full text-left px-3 py-2 rounded-md text-sm text-gray-600 hover:bg-gray-50 hover:text-gray-900"
                  onClick={() => { handleLogout(); setMobileMenuOpen(false); }}
                >
                  退出登录
                </button>
              </div>
            </div>
          )}
        </header>

        <main className="app-main flex-1">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 sm:py-8">
            {data && (
              <Routes>
                <Route path="/" element={<Overview data={data} />} />
                <Route path="/genealogy" element={<Genealogy data={data} setData={setData} saveData={saveData} addChangeLog={addChangeLog} isAdmin={isAdmin} />} />
                <Route path="/generation" element={<Generation data={data} />} />
                <Route path="/rules" element={<Rules data={data} />} />
                <Route path="/preface" element={<PrefacePostscript data={data} setData={setData} saveData={saveData} addChangeLog={addChangeLog} isAdmin={isAdmin} />} />
                <Route
                  path="/data"
                  element={
                    isAdmin ? (
                      <DataManagement data={data} setData={setData} saveData={saveData} changeLog={changeLog} addChangeLog={addChangeLog} />
                    ) : (
                      <Navigate to="/" replace />
                    )
                  }
                />
              </Routes>
            )}
          </div>
        </main>

        {showGuide && <GuideModal onClose={closeGuide} />}
      </div>

      {showScrollTop && (
        <button
          onClick={scrollToTop}
          className="fixed bottom-6 right-6 w-12 h-12 bg-gray-900 text-white rounded-full shadow-lg hover:bg-gray-700 hover:scale-110 transition-all duration-200 flex items-center justify-center"
          style={{ zIndex: 9999 }}
          aria-label="回到顶部"
        >
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 10l7-7m0 0l7 7m-7-7v18" />
          </svg>
        </button>
      )}
    </Router>
  );
}

export default App;
