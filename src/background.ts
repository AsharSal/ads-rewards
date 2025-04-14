import { UserProfile, AdSettings, Message, AdEngagement } from './types';

class BackgroundService {
  private user: UserProfile | null = null;
  private settings: AdSettings = {
    shareData: false
  };

  constructor() {
    this.initializeListeners();
    this.loadUserData();
  }

  private async initializeListeners() {
    console.log("Background script: Setting up message listeners");
    chrome.runtime.onMessage.addListener((message: Message, sender, sendResponse) => {
      switch (message.type) {
        case 'LOGIN':
          // Handle login asynchronously
          this.handleLogin().catch(error => {
            console.error('Background script: Login error:', error);
          });
          break;
        case 'LOGOUT':
          this.handleLogout();
          break;
        case 'UPDATE_SETTINGS':
          this.updateSettings(message.payload);
          break;
        case 'AD_COMPLETED':
          this.handleAdCompletion(message.payload);
          break;
      }
      // Return true to indicate we're handling the message asynchronously
      return true;
    });
  }

  private async handleLogin() {
    try {
      const auth = await chrome.identity.getAuthToken({ interactive: true });
      const response = await fetch('https://www.googleapis.com/oauth2/v2/userinfo', {
        headers: {
          Authorization: `Bearer ${auth.token}`
        }
      });
      const data = await response.json();

      console.log("data", data);
      
      this.user = {
        email: data.email,
        name: data.name,
        balance: 0
      };
      
      await this.saveUserData();
      chrome.runtime.sendMessage({ type: 'LOGIN_SUCCESS', payload: this.user });
    } catch (error: unknown) {
      console.log(error);
      const errorMessage = error instanceof Error ? error.message : 'An unknown error occurred';
      chrome.runtime.sendMessage({ type: 'LOGIN_ERROR', payload: errorMessage });
    }
  }

  private async handleLogout() {
    this.user = null;
    await chrome.storage.local.remove(['user']);
    chrome.runtime.sendMessage({ type: 'LOGOUT_SUCCESS' });
  }

  private async updateSettings(newSettings: AdSettings) {
    this.settings = { ...this.settings, ...newSettings };
    await chrome.storage.local.set({ settings: this.settings });
  }

  private async handleAdCompletion(engagement: AdEngagement) {
    if (!this.user) return;
    
    // Calculate rewards based on ad type and duration
    const reward = engagement.type === 'video' ? 0.05 : 0.01;
    this.user.balance += reward;
    
    await this.saveUserData();
    chrome.runtime.sendMessage({ 
      type: 'BALANCE_UPDATED', 
      payload: this.user.balance 
    });
  }

  private async loadUserData() {
    const data = await chrome.storage.local.get(['user', 'settings']);
    if (data.user) this.user = data.user;
    if (data.settings) this.settings = data.settings;
  }

  private async saveUserData() {
    if (this.user) {
      await chrome.storage.local.set({ user: this.user });
    }
  }
}

// Initialize the background service
new BackgroundService();