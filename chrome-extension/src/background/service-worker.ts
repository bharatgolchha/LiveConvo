import browser from 'webextension-polyfill';
import { createClient, Session, User } from '@supabase/supabase-js';
import { SUPABASE_CONFIG } from '../config/supabase';
import { API_CONFIG } from '../config/api';

interface AuthState {
  isAuthenticated: boolean;
  user: User | null;
  session: Session | null;
  loading: boolean;
  error: string | null;
}

class BackgroundService {
  private authState: AuthState = {
    isAuthenticated: false,
    user: null,
    session: null,
    loading: false,
    error: null
  };
  
  private supabase = createClient(SUPABASE_CONFIG.url, SUPABASE_CONFIG.anonKey, {
    auth: {
      storage: {
        async getItem(key: string): Promise<string | null> {
          const result = await browser.storage.local.get(key);
          return result[key] || null;
        },
        async setItem(key: string, value: string): Promise<void> {
          await browser.storage.local.set({ [key]: value });
        },
        async removeItem(key: string): Promise<void> {
          await browser.storage.local.remove(key);
        }
      },
      flowType: 'implicit',
      detectSessionInUrl: false,
      persistSession: true,
      autoRefreshToken: true
    }
  });

  constructor() {
    this.initialize();
  }

  private async initialize() {
    try {
      // Restore Supabase session
      const { data: { session } } = await this.supabase.auth.getSession();
      if (session) {
        this.authState = {
          isAuthenticated: true,
          user: session.user,
          session,
          loading: false,
          error: null
        };
        console.log('Restored session for user:', session.user.email);
      }

      // Listen for auth state changes
      this.supabase.auth.onAuthStateChange((event, session) => {
        console.log('Auth state changed:', event);
        if (session) {
          this.authState = {
            isAuthenticated: true,
            user: session.user,
            session,
            loading: false,
            error: null
          };
        } else {
          this.authState = {
            isAuthenticated: false,
            user: null,
            session: null,
            loading: false,
            error: null
          };
        }
        this.broadcastAuthStateChange();
      });

      // Set up message listeners
      browser.runtime.onMessage.addListener(this.handleMessage.bind(this));
      
      // Set up alarm for token refresh
      if (browser.alarms && browser.alarms.create) {
        try {
          browser.alarms.create('refreshToken', { periodInMinutes: 30 });
          browser.alarms.onAlarm.addListener(this.handleAlarm.bind(this));
        } catch (error) {
          console.warn('Could not set up alarms:', error);
        }
      } else {
        console.warn('Alarms API not available');
      }

      // Handle extension install/update
      if (browser.runtime.onInstalled) {
        browser.runtime.onInstalled.addListener(this.handleInstalled.bind(this));
      }

      // Handle tab updates for meeting detection
      if (browser.tabs && browser.tabs.onUpdated) {
        browser.tabs.onUpdated.addListener(this.handleTabUpdate.bind(this));
      }
    } catch (error) {
      console.error('Error initializing background service:', error);
    }
  }

  private async handleMessage(
    message: any,
    sender: browser.Runtime.MessageSender
  ): Promise<any> {
    switch (message.type) {
      case 'LOGIN':
        return this.handleLogin(message.payload);
      
      case 'LOGOUT':
        return this.handleLogout();
      
      case 'GET_AUTH_STATE':
        return this.authState;
      
      case 'START_RECORDING':
        return this.startRecording(message.payload);
      
      case 'CREATE_SESSION':
        return this.createSession(message.payload);
      
      case 'STOP_RECORDING':
        return this.stopRecording();
      
      case 'GET_ACTIVE_SESSION':
        return this.getActiveSession();
      
      case 'OPEN_SIDEBAR':
        return this.openSidebar();
      
      default:
        console.warn('Unknown message type:', message.type);
        return null;
    }
  }

  private async handleLogin(credentials: { email: string; password: string }) {
    try {
      this.authState.loading = true;
      
      const { data, error } = await this.supabase.auth.signInWithPassword({
        email: credentials.email,
        password: credentials.password
      });
      
      if (error) {
        this.authState.error = error.message;
        this.authState.loading = false;
        return { success: false, error: error.message };
      }
      
      // Auth state will be updated by onAuthStateChange listener
      
      return { success: true, user: data.user };
    } catch (error: any) {
      console.error('Login error:', error);
      this.authState.error = error.message;
      this.authState.loading = false;
      return { success: false, error: error.message };
    }
  }

  private async handleLogout() {
    try {
      await this.supabase.auth.signOut();
      // Auth state will be updated by onAuthStateChange listener
      return { success: true };
    } catch (error: any) {
      console.error('Logout error:', error);
      return { success: false, error: error.message };
    }
  }

  private async createSession(payload: {
    title: string;
    context?: string;
  }) {
    if (!this.authState.isAuthenticated || !this.authState.session?.access_token) {
      return { success: false, error: 'Not authenticated' };
    }

    try {
      const response = await fetch(`${API_CONFIG.baseUrl}${API_CONFIG.endpoints.sessions}`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${this.authState.session.access_token}`,
        },
        body: JSON.stringify({
          title: payload.title,
          context: payload.context || '',
        }),
      });

      if (!response.ok) {
        const error = await response.text();
        throw new Error(`Failed to create session: ${error}`);
      }

      const session = await response.json();
      return { success: true, session };
    } catch (error: any) {
      console.error('Create session error:', error);
      return { success: false, error: error.message };
    }
  }

  private async startRecording(options: {
    source: 'tab' | 'microphone';
    tabId?: number;
    sessionId: string;
    title: string;
  }) {
    try {
      // Store session data
      await browser.storage.local.set({
        activeSession: {
          id: options.sessionId,
          title: options.title,
          recordingStartTime: Date.now(),
          source: options.source,
        },
      });

      if (options.source === 'tab' && options.tabId) {
        // Request tab audio capture (Chrome-specific API)
        const streamId = await (chrome as any).tabCapture.capture({
          audio: true,
          video: false,
        });

        // Store stream ID for later use
        await browser.storage.local.set({ activeStreamId: streamId });
        
        // TODO: Connect to Deepgram for transcription
      }

      // Update extension icon
      await browser.action.setBadgeText({ text: 'REC' });
      await browser.action.setBadgeBackgroundColor({ color: '#ef4444' });

      return { success: true };
    } catch (error: any) {
      console.error('Start recording error:', error);
      return { success: false, error: error.message };
    }
  }

  private async stopRecording() {
    try {
      // Clear badge
      await browser.action.setBadgeText({ text: '' });

      // Get active session
      const { activeSession, activeStreamId } = await browser.storage.local.get([
        'activeSession',
        'activeStreamId',
      ]);

      if (activeSession && this.authState.session?.access_token) {
        // Finalize session on backend
        const response = await fetch(
          `${API_CONFIG.baseUrl}${API_CONFIG.endpoints.sessionFinalize(activeSession.id)}`,
          {
            method: 'POST',
            headers: {
              'Authorization': `Bearer ${this.authState.session.access_token}`,
              'Content-Type': 'application/json',
            },
          }
        );

        if (!response.ok) {
          throw new Error('Failed to finalize session');
        }
      }

      // Clean up storage
      await browser.storage.local.remove(['activeSession', 'activeStreamId']);

      return { success: true };
    } catch (error: any) {
      console.error('Stop recording error:', error);
      return { success: false, error: error.message };
    }
  }

  private async getActiveSession() {
    const { activeSession } = await browser.storage.local.get(['activeSession']);
    return activeSession || null;
  }

  private async openSidebar() {
    try {
      // Get current window
      const window = await browser.windows.getCurrent();
      
      // Open sidebar (Chrome-specific API)
      if ('sidePanel' in chrome && chrome.sidePanel) {
        await (chrome as any).sidePanel.open({ windowId: window.id });
        return { success: true };
      } else {
        // Fallback: open sidebar as a new tab
        await browser.tabs.create({
          url: browser.runtime.getURL('sidebar/index.html'),
        });
        return { success: true, message: 'Opened in new tab (sidePanel API not available)' };
      }
    } catch (error: any) {
      console.error('Error opening sidebar:', error);
      // Fallback: open in new tab
      await browser.tabs.create({
        url: browser.runtime.getURL('sidebar/index.html'),
      });
      return { success: true, message: 'Opened in new tab due to error' };
    }
  }

  private async handleAlarm(alarm: browser.Alarms.Alarm) {
    if (alarm.name === 'refreshToken') {
      // Supabase handles token refresh automatically
      // We can use this to check session status
      const { data: { session } } = await this.supabase.auth.getSession();
      if (!session) {
        console.log('Session expired, user needs to login again');
      }
    }
  }

  private async handleInstalled(details: browser.Runtime.OnInstalledDetailsType) {
    if (details.reason === 'install') {
      try {
        // Open welcome page
        await browser.tabs.create({
          url: browser.runtime.getURL('welcome.html'),
        });
      } catch (error) {
        console.warn('Could not open welcome page:', error);
      }
    }
  }

  private async handleTabUpdate(
    tabId: number,
    changeInfo: browser.Tabs.OnUpdatedChangeInfoType,
    tab: browser.Tabs.Tab
  ) {
    if (changeInfo.status === 'complete' && tab.url) {
      // Check if it's a meeting URL
      const meetingPatterns = [
        /meet\.google\.com\/[a-z-]+/,
        /zoom\.us\/j\/\d+/,
        /teams\.microsoft\.com\/.*\/meetingId/,
      ];

      const isMeetingUrl = meetingPatterns.some(pattern => pattern.test(tab.url!));
      
      if (isMeetingUrl && browser.notifications && browser.notifications.create) {
        try {
          // Notify user about meeting detection
          await browser.notifications.create({
            type: 'basic',
            iconUrl: browser.runtime.getURL('public/icon-128.png'),
            title: 'Meeting Detected',
            message: 'Click the LivePrompt icon to start AI coaching for this meeting',
          });
        } catch (error) {
          console.warn('Could not create notification:', error);
        }
      }
    }
  }

  private broadcastAuthStateChange() {
    // Notify all tabs about auth state change
    browser.tabs.query({}).then(tabs => {
      tabs.forEach(tab => {
        if (tab.id) {
          browser.tabs.sendMessage(tab.id, {
            type: 'AUTH_STATE_CHANGED',
            payload: this.authState,
          }).catch(() => {
            // Tab might not have content script
          });
        }
      });
    });

    // Notify popup and sidebar
    browser.runtime.sendMessage({
      type: 'AUTH_STATE_CHANGED',
      payload: this.authState,
    }).catch(() => {
      // Views might not be open
    });
  }
}

// Initialize the background service
new BackgroundService();

// Export for type checking
export {};