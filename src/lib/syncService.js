import { supabase } from './supabase';

const CHANNEL_NAME = 'genealogy-sync';

class SyncService {
  constructor() {
    this.channel = null;
    this.onDataChange = null;
    this.onPresenceChange = null;
    this.lastUpdateTime = 0;
    this.isInitialized = false;
    this.currentEditor = null;
    this.userName = '用户_' + Math.random().toString(36).substr(2, 6);
  }

  async initialize(onDataChange, onPresenceChange) {
    if (this.isInitialized) return;
    
    this.onDataChange = onDataChange;
    this.onPresenceChange = onPresenceChange;
    
    this.channel = supabase.channel(CHANNEL_NAME, {
      config: {
        presence: {
          key: this.userName
        }
      }
    });

    this.channel
      .on('postgres_changes', {
        event: 'UPDATE',
        schema: 'public',
        table: 'genealogy_data',
        filter: 'id=eq.1'
      }, (payload) => {
        console.log('数据变更通知:', payload);
        const updateTime = new Date(payload.commit_timestamp).getTime();
        if (updateTime > this.lastUpdateTime) {
          this.lastUpdateTime = updateTime;
          if (this.onDataChange && payload.new) {
            this.onDataChange(payload.new.data, payload.new.updated_by);
          }
        }
      })
      .on('presence', { event: 'sync' }, () => {
        const state = this.channel.presenceState();
        const users = Object.keys(state);
        console.log('在线用户:', users);
        if (this.onPresenceChange) {
          this.onPresenceChange(users);
        }
      })
      .on('presence', { event: 'join' }, ({ newPresences }) => {
        console.log('用户加入:', newPresences);
      })
      .on('presence', { event: 'leave' }, ({ leftPresences }) => {
        console.log('用户离开:', leftPresences);
      })
      .on('broadcast', { event: 'editing' }, (payload) => {
        console.log('编辑通知:', payload);
        this.currentEditor = payload.payload;
        if (this.onPresenceChange) {
          const state = this.channel.presenceState();
          const users = Object.keys(state);
          this.onPresenceChange(users, payload.payload);
        }
      });

    await this.channel.subscribe(async (status) => {
      if (status === 'SUBSCRIBED') {
        await this.channel.track({
          user: this.userName,
          online_at: new Date().toISOString()
        });
        console.log('同步服务已连接');
      }
    });

    this.isInitialized = true;
  }

  async broadcastEditing(action, targetName) {
    if (!this.channel) return;
    
    await this.channel.send({
      type: 'broadcast',
      event: 'editing',
      payload: {
        user: this.userName,
        action: action,
        target: targetName,
        time: Date.now()
      }
    });
  }

  async cleanup() {
    if (this.channel) {
      await this.channel.untrack();
      await supabase.removeChannel(this.channel);
      this.channel = null;
      this.isInitialized = false;
    }
  }

  getLastUpdateTime() {
    return this.lastUpdateTime;
  }

  setLastUpdateTime(time) {
    this.lastUpdateTime = time;
  }

  getUserName() {
    return this.userName;
  }
}

export const syncService = new SyncService();
export default syncService;
