import { supabase } from './supabase';

export interface UserSession {
  id: string;
  user_id: string;
  session_token: string;
  refresh_token?: string;
  device_name: string;
  device_type: 'desktop' | 'mobile' | 'tablet';
  browser: string;
  ip_address: string;
  location?: string;
  user_agent: string;
  is_active: boolean;
  last_activity: string;
  created_at: string;
  expires_at: string;
}

export class SessionManager {
  static async createSession(userId: string, sessionData: Partial<UserSession>): Promise<UserSession | null> {
    try {
      const session: Partial<UserSession> = {
        id: crypto.randomUUID(),
        user_id: userId,
        session_token: sessionData.session_token || this.generateSessionToken(),
        device_name: sessionData.device_name || 'Unknown Device',
        device_type: sessionData.device_type || 'desktop',
        browser: sessionData.browser || 'Unknown',
        ip_address: sessionData.ip_address || '127.0.0.1',
        location: sessionData.location,
        user_agent: sessionData.user_agent || '',
        is_active: true,
        last_activity: new Date().toISOString(),
        created_at: new Date().toISOString(),
        expires_at: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(),
        ...sessionData
      };

      const { data, error } = await supabase
        .from('user_sessions')
        .insert(session)
        .select()
        .single();

      if (error) {
        console.error('Supabase error creating session:', error);
        return null;
      }

      return data;
    } catch (error: any) {
      console.error('SessionManager.createSession error:', error);
      return null;
    }
  }

  static async getUserSessions(userId: string): Promise<UserSession[]> {
    try {
      const { data, error } = await supabase
        .from('user_sessions')
        .select('*')
        .eq('user_id', userId)
        .order('is_active', { ascending: false })
        .order('last_activity', { ascending: false });

      if (error) {
        console.error('Error fetching sessions:', error);
        return [];
      }

      return data || [];
    } catch (error) {
      console.error('Session fetch error:', error);
      return [];
    }
  }

  static async terminateSession(sessionId: string, userId?: string): Promise<boolean> {
    try {
      let query = supabase
        .from('user_sessions')
        .update({ is_active: false, last_activity: new Date().toISOString() })
        .eq('id', sessionId);

      if (userId) {
        query = query.eq('user_id', userId);
      }

      const { error } = await query;

      if (error) {
        console.error('Error terminating session:', error);
        return false;
      }

      return true;
    } catch (error) {
      console.error('Session termination error:', error);
      return false;
    }
  }

  static async terminateAllOtherSessions(userId: string, currentSessionId: string): Promise<boolean> {
    try {
      const { error } = await supabase
        .from('user_sessions')
        .update({ is_active: false, last_activity: new Date().toISOString() })
        .eq('user_id', userId)
        .neq('id', currentSessionId);

      if (error) {
        console.error('Error terminating other sessions:', error);
        return false;
      }

      return true;
    } catch (error) {
      console.error('Session termination error:', error);
      return false;
    }
  }

  static async cleanupExpiredSessions(): Promise<void> {
    try {
      const { error } = await supabase
        .from('user_sessions')
        .update({ is_active: false })
        .lt('expires_at', new Date().toISOString());

      if (error) {
        console.error('Error cleaning up expired sessions:', error);
      }
    } catch (error) {
      console.error('Session cleanup error:', error);
    }
  }

  static generateSessionToken(): string {
    try {
      if (typeof crypto !== 'undefined' && crypto.randomUUID) {
        return crypto.randomUUID().replace(/-/g, '');
      }
    } catch (e) {
      return 'session_' + Date.now() + '_' + Math.random().toString(36).substr(2, 9);
    }

    return btoa(Math.random().toString(36) + Date.now()).replace(/[^a-zA-Z0-9]/g, '').substr(0, 32);
  }

  static parseUserAgent(userAgent: string): { browser: string; deviceType: 'desktop' | 'mobile' | 'tablet'; deviceName: string } {
    const ua = userAgent.toLowerCase();

    let browser = 'Unknown';
    if (ua.includes('chrome')) browser = 'Chrome';
    else if (ua.includes('safari')) browser = 'Safari';
    else if (ua.includes('firefox')) browser = 'Firefox';
    else if (ua.includes('edge')) browser = 'Edge';

    let deviceType: 'desktop' | 'mobile' | 'tablet' = 'desktop';
    if (ua.includes('mobile') || ua.includes('android') || ua.includes('iphone')) {
      deviceType = 'mobile';
    } else if (ua.includes('tablet') || ua.includes('ipad')) {
      deviceType = 'tablet';
    }

    let deviceName = 'Unknown Device';
    if (ua.includes('mac')) deviceName = 'MacBook Pro';
    else if (ua.includes('windows')) deviceName = 'Windows PC';
    else if (ua.includes('iphone')) deviceName = 'iPhone';
    else if (ua.includes('ipad')) deviceName = 'iPad';
    else if (ua.includes('android')) deviceName = 'Android Device';

    return { browser, deviceType, deviceName };
  }
}
