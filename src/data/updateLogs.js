const UPDATE_LOGS = [
  {
    id: '4',
    version: '1.3.0',
    date: '2026-04-07',
    title: '多人实时同步',
    changes: [
      '新增：Supabase Realtime 实时数据同步',
      '新增：在线用户显示功能',
      '新增：编辑状态实时提示',
      '优化：数据同步机制',
      '修复：添加子嗣按钮逻辑',
      '修复：树形结构子嗣引用格式兼容'
    ]
  },
  {
    id: '3',
    version: '1.2.0',
    date: '2026-04-07',
    title: '数据库规范化',
    changes: [
      '新增：关系型数据库支持（11个表）',
      '新增：数据库迁移脚本',
      '新增：数据服务层 API 封装',
      '优化：数据结构规范化设计',
      '优化：关系完整性约束'
    ]
  },
  {
    id: '2',
    version: '1.1.0',
    date: '2026-04-07',
    title: '数据同步优化',
    changes: [
      '修复：数据同步滞后问题',
      '优化：统一使用 JSON 存储作为数据源',
      '优化：缓存更新机制'
    ]
  },
  {
    id: '1',
    version: '1.0.0',
    date: '2026-03-30',
    title: '初始版本',
    changes: [
      '新增：族谱信息展示',
      '新增：世系管理（树形/列表视图）',
      '新增：数据管理功能',
      '新增：字辈管理',
      '新增：谱序、凡例、后跋管理',
      '新增：修改日志记录',
      '新增：管理员权限控制'
    ]
  }
];

export const getUpdateLogs = () => {
  return UPDATE_LOGS.sort((a, b) => new Date(b.date) - new Date(a.date));
};

export const getLatestVersion = () => {
  return UPDATE_LOGS[0];
};

export default UPDATE_LOGS;
