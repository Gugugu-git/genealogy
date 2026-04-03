import React, { useState, useEffect } from 'react';
import { BrowserRouter as Router, Routes, Route, NavLink } from 'react-router-dom';
import Overview from './components/Overview';
import Genealogy from './components/Genealogy';
import Generation from './components/Generation';
import Rules from './components/Rules';
import PrefacePostscript from './components/PrefacePostscript';
import DataManagement from './components/DataManagement';
import GuideModal from './components/GuideModal';
import './App.css';

const ipcRenderer = typeof window !== 'undefined' && window.require ? window.require('electron').ipcRenderer : null;

function App() {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [showGuide, setShowGuide] = useState(false);
  const [changeLog, setChangeLog] = useState([]);

  useEffect(() => {
    loadData();
    const hasSeenGuide = localStorage.getItem('hasSeenGuide');
    if (!hasSeenGuide) {
      setShowGuide(true);
    }
  }, []);

  const loadData = async () => {
    try {
      if (ipcRenderer) {
        const loadedData = await ipcRenderer.invoke('read-data');
        setData(loadedData);
        if (loadedData && loadedData.changeLog) {
          setChangeLog(loadedData.changeLog);
        }
      } else {
        // Web环境：优先从localStorage读取
        const localData = localStorage.getItem('genealogyData');
        if (localData) {
          const parsedData = JSON.parse(localData);
          setData(parsedData);
          if (parsedData && parsedData.changeLog) {
            setChangeLog(parsedData.changeLog);
          }
        } else {
          // 首次访问，从JSON文件加载初始数据
          const response = await fetch('/泸县大堰胡氏宗谱数据.json');
          const jsonData = await response.json();
          setData(jsonData);
          // 保存到localStorage
          localStorage.setItem('genealogyData', JSON.stringify(jsonData));
        }
      }
    } catch (error) {
      console.error('Error loading data:', error);
    } finally {
      setLoading(false);
    }
  };

  const saveData = async (newData) => {
    try {
      if (ipcRenderer) {
        await ipcRenderer.invoke('save-data', newData);
      } else {
        // Web环境：保存到localStorage
        localStorage.setItem('genealogyData', JSON.stringify(newData));
      }
      setData(newData);
    } catch (error) {
      console.error('Error saving data:', error);
      throw error;
    }
  };

  const addChangeLog = (entry) => {
    const newEntry = {
      ...entry,
      id: Date.now(),
      time: new Date().toLocaleString('zh-CN')
    };
    const newLog = [newEntry, ...changeLog].slice(0, 100);
    setChangeLog(newLog);
    if (data) {
      const updatedData = { ...data, changeLog: newLog };
      saveData(updatedData);
    }
  };

  const closeGuide = () => {
    setShowGuide(false);
    localStorage.setItem('hasSeenGuide', 'true');
  };

  if (loading) {
    return (
      <div className="loading-container">
        <div className="loading-spinner"></div>
        <p>加载中...</p>
      </div>
    );
  }

  return (
    <Router>
      <div className="app">
        <header className="app-header">
          <div className="header-content">
            <h1>泸县大堰胡氏宗谱</h1>
            <button className="guide-btn" onClick={() => setShowGuide(true)}>
              操作指引
            </button>
          </div>
        </header>

        <nav className="app-nav">
          <NavLink to="/" className={({ isActive }) => isActive ? 'active' : ''}>
            族谱总览
          </NavLink>
          <NavLink to="/genealogy" className={({ isActive }) => isActive ? 'active' : ''}>
            世系展示
          </NavLink>
          <NavLink to="/generation" className={({ isActive }) => isActive ? 'active' : ''}>
            字辈查询
          </NavLink>
          <NavLink to="/rules" className={({ isActive }) => isActive ? 'active' : ''}>
            凡例规则
          </NavLink>
          <NavLink to="/preface" className={({ isActive }) => isActive ? 'active' : ''}>
            谱序后跋
          </NavLink>
          <NavLink to="/data" className={({ isActive }) => isActive ? 'active' : ''}>
            数据管理
          </NavLink>
        </nav>

        <main className="app-main">
          {data && (
            <Routes>
              <Route path="/" element={<Overview data={data} />} />
              <Route path="/genealogy" element={<Genealogy data={data} setData={setData} saveData={saveData} addChangeLog={addChangeLog} />} />
              <Route path="/generation" element={<Generation data={data} />} />
              <Route path="/rules" element={<Rules data={data} />} />
              <Route path="/preface" element={<PrefacePostscript data={data} setData={setData} saveData={saveData} addChangeLog={addChangeLog} />} />
              <Route path="/data" element={<DataManagement data={data} setData={setData} saveData={saveData} changeLog={changeLog} addChangeLog={addChangeLog} />} />
            </Routes>
          )}
        </main>

        {showGuide && <GuideModal onClose={closeGuide} />}
      </div>
    </Router>
  );
}

export default App;
