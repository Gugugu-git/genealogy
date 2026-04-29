import { supabase } from './supabase';

const GITHUB_CLIENT_ID = import.meta.env.VITE_GITHUB_CLIENT_ID;

export const authService = {
  async signInWithGitHub() {
    const { data, error } = await supabase.auth.signInWithOAuth({
      provider: 'github',
      options: {
        redirectTo: `${window.location.origin}`,
        scopes: 'read:user user:email'
      }
    });
    
    if (error) throw error;
    return data;
  },

  async signOut() {
    const { error } = await supabase.auth.signOut();
    if (error) throw error;
    localStorage.removeItem('userRole');
    localStorage.removeItem('githubUsername');
  },

  async getCurrentUser() {
    const { data: { user } } = await supabase.auth.getUser();
    return user;
  },

  async getSession() {
    const { data: { session } } = await supabase.auth.getSession();
    return session;
  },

  getGitHubUsername(user) {
    if (!user) return null;
    return user.user_metadata?.user_name || 
           user.user_metadata?.preferred_username ||
           user.identities?.[0]?.identity_data?.user_name ||
           null;
  },

  async getUserRole(githubUsername) {
    if (!githubUsername) return 'viewer';
    
    try {
      const { data, error } = await supabase
        .rpc('get_user_role', { github_username: githubUsername });
      
      if (error) {
        console.warn('获取用户角色失败: - authService.js:52', error);
        return 'viewer';
      }
      
      return data || 'viewer';
    } catch (err) {
      console.warn('获取用户角色异常: - authService.js:58', err);
      return 'viewer';
    }
  },

  async fetchUserRole(githubUsername) {
    const role = await this.getUserRole(githubUsername);
    localStorage.setItem('userRole', role);
    localStorage.setItem('githubUsername', githubUsername);
    return role;
  },

  getCachedRole() {
    return localStorage.getItem('userRole') || 'viewer';
  },

  getCachedUsername() {
    return localStorage.getItem('githubUsername') || null;
  },

  hasPermission(requiredRole) {
    const currentRole = this.getCachedRole();
    const roleHierarchy = {
      'admin': 3,
      'editor': 2,
      'viewer': 1
    };
    
    return (roleHierarchy[currentRole] || 0) >= (roleHierarchy[requiredRole] || 0);
  },

  isAdmin() {
    return this.getCachedRole() === 'admin';
  },

  isEditor() {
    return ['admin', 'editor'].includes(this.getCachedRole());
  },

  canEdit() {
    return this.isEditor();
  },

  canDelete() {
    return this.isAdmin();
  },

  async setDeveloperRole(githubUsername, role) {
    if (!this.isAdmin()) {
      throw new Error('只有管理员可以设置开发者权限');
    }
    
    const user = await this.getCurrentUser();
    if (!user) throw new Error('请先登录');
    
    const { data, error } = await supabase
      .from('user_roles')
      .upsert({
        user_id: user.id,
        github_username: githubUsername,
        role: role,
        updated_at: new Date().toISOString()
      }, {
        onConflict: 'github_username'
      });
    
    if (error) throw error;
    return data;
  },

  async getAllDevelopers() {
    if (!this.isAdmin()) {
      throw new Error('只有管理员可以查看开发者列表');
    }
    
    const { data, error } = await supabase
      .from('user_roles')
      .select('*')
      .order('created_at', { ascending: false });
    
    if (error) throw error;
    return data;
  },

  async removeDeveloper(githubUsername) {
    if (!this.isAdmin()) {
      throw new Error('只有管理员可以移除开发者');
    }
    
    const { error } = await supabase
      .from('user_roles')
      .delete()
      .eq('github_username', githubUsername);
    
    if (error) throw error;
  },

  onAuthStateChange(callback) {
    return supabase.auth.onAuthStateChange(callback);
  }
};

export default authService;
