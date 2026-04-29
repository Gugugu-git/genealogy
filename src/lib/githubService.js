const GITHUB_REPO = 'Gugugu-git/genealogy';
const GITHUB_API_BASE = 'https://api.github.com';

const COMMIT_TYPE_MAP = {
  'feat': { label: '新增', icon: '✨', color: '#22c55e' },
  'fix': { label: '修复', icon: '🐛', color: '#ef4444' },
  'refactor': { label: '重构', icon: '🔧', color: '#8b5cf6' },
  'perf': { label: '优化', icon: '⚡', color: '#3b82f6' },
  'docs': { label: '文档', icon: '📝', color: '#6b7280' },
  'style': { label: '样式', icon: '💄', color: '#ec4899' },
  'test': { label: '测试', icon: '✅', color: '#14b8a6' },
  'chore': { label: '维护', icon: '🔨', color: '#f59e0b' }
};

function parseCommitMessage(message) {
  const lines = message.split('\n');
  const firstLine = lines[0];
  
  const match = firstLine.match(/^(\w+)(?:\(([^)]+)\))?:\s*(.+)$/);
  
  if (match) {
    const [, type, scope, description] = match;
    const typeInfo = COMMIT_TYPE_MAP[type] || { label: type, icon: '📝', color: '#6b7280' };
    
    return {
      type,
      scope,
      description,
      label: typeInfo.label,
      icon: typeInfo.icon,
      color: typeInfo.color,
      fullDescription: firstLine
    };
  }
  
  return {
    type: 'other',
    scope: null,
    description: firstLine,
    label: '其他',
    icon: '📝',
    color: '#6b7280',
    fullDescription: firstLine
  };
}

function formatDate(dateString) {
  const date = new Date(dateString);
  return date.toLocaleDateString('zh-CN', {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit'
  }).replace(/\//g, '-');
}

function groupCommitsByDate(commits) {
  const groups = new Map();
  
  commits.forEach(commit => {
    const date = formatDate(commit.commit.author.date);
    if (!groups.has(date)) {
      groups.set(date, []);
    }
    groups.get(date).push(commit);
  });
  
  return Array.from(groups.entries()).map(([date, commits]) => ({
    date,
    commits
  }));
}

export async function fetchGitHubCommits(perPage = 100) {
  try {
    // 添加 10 秒超时
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 10000);
    
    const response = await fetch(
      `${GITHUB_API_BASE}/repos/${GITHUB_REPO}/commits?per_page=${perPage}`,
      { signal: controller.signal }
    );
    
    clearTimeout(timeoutId);
    
    if (!response.ok) {
      throw new Error(`GitHub API error: ${response.status}`);
    }
    
    const commits = await response.json();
    return commits;
  } catch (error) {
    console.error('获取 GitHub 提交记录失败:', error);
    return [];
  }
}

export async function getUpdateLogsFromGitHub() {
  const commits = await fetchGitHubCommits(100);
  
  if (commits.length === 0) {
    return [];
  }
  
  const groupedCommits = groupCommitsByDate(commits);
  
  const logs = groupedCommits.map((group, index) => {
    const changes = group.commits.map(commit => {
      const parsed = parseCommitMessage(commit.commit.message);
      return {
        type: parsed.label,
        icon: parsed.icon,
        color: parsed.color,
        description: parsed.description,
        sha: commit.sha.substring(0, 7),
        url: commit.html_url,
        author: commit.commit.author.name
      };
    });
    
    return {
      id: index.toString(),
      date: group.date,
      title: `${group.date} 更新`,
      changes,
      commitCount: group.commits.length
    };
  });
  
  return logs;
}

export async function getLatestCommit() {
  const commits = await fetchGitHubCommits(1);
  if (commits.length > 0) {
    const commit = commits[0];
    const parsed = parseCommitMessage(commit.commit.message);
    return {
      sha: commit.sha.substring(0, 7),
      message: parsed.description,
      date: formatDate(commit.commit.author.date),
      url: commit.html_url
    };
  }
  return null;
}

export { COMMIT_TYPE_MAP };
