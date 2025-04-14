import { UserProfile, AdSettings, Message, AdEngagement, AdNetworkConfig } from './types';

class BackgroundService {
  private user: UserProfile | null = null;
  private settings: AdSettings = {
    shareData: false
  };
  private adNetworkConfigs: AdNetworkConfig[] = [];

  constructor() {
    this.initializeListeners();
    this.loadUserData();
    this.loadAdNetworkConfigs();
  }

  private async initializeListeners() {
    console.log("Background script: Setting up message listeners");
    chrome.runtime.onMessage.addListener((message: Message, sender, sendResponse) => {
      switch (message.type) {
        case 'LOGIN':
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
        case 'START_ADS':
          this.startAdsWithNetwork(sender.tab?.id);
          break;
      }
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
    
    // Calculate rewards based on ad type, duration, and network
    let reward = engagement.type === 'video' ? 0.05 : 0.01;
    
    // Bonus for completed views
    if (engagement.completed) {
      reward *= 1.5;
    }
    
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

  private async loadAdNetworkConfigs() {
    const data = await chrome.storage.local.get('adNetworkConfigs');
    if (data.adNetworkConfigs) {
      this.adNetworkConfigs = data.adNetworkConfigs;
    }
  }

  private async saveAdNetworkConfigs() {
    await chrome.storage.local.set({ adNetworkConfigs: this.adNetworkConfigs });
  }

  private async startAdsWithNetwork(tabId?: number) {
    if (!tabId || this.adNetworkConfigs.length === 0) return;

    // Rotate through available networks
    const network = this.adNetworkConfigs[Math.floor(Math.random() * this.adNetworkConfigs.length)];
    
    chrome.tabs.sendMessage(tabId, {
      type: 'START_ADS',
      payload: network
    });
  }

  public async updateAdNetworkConfig(config: AdNetworkConfig) {
    const existingIndex = this.adNetworkConfigs.findIndex(c => 
      c.network === config.network && c.publisherId === config.publisherId
    );

    if (existingIndex >= 0) {
      this.adNetworkConfigs[existingIndex] = config;
    } else {
      this.adNetworkConfigs.push(config);
    }

    await this.saveAdNetworkConfigs();
  }
}

// Initialize the background service
new BackgroundService();