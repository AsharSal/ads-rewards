import { UserProfile, Message, AdSettings, AdNetworkConfig } from './types';

class PopupManager {
  private loginSection: HTMLElement = document.createElement('div');
  private mainSection: HTMLElement = document.createElement('div');
  private loginButton: HTMLButtonElement = document.createElement('button');
  private logoutButton: HTMLButtonElement = document.createElement('button');
  private startAdsButton: HTMLElement = document.createElement('button');
  private userNameSpan: HTMLElement = document.createElement('span');
  private earningsSpan: HTMLElement = document.createElement('span');
  private shareDataCheckbox: HTMLInputElement = document.createElement('input');
  private adContainer: HTMLElement = document.createElement('div');
  private adNetworkForm: HTMLFormElement = document.createElement('form');
  private networkSelect: HTMLSelectElement = document.createElement('select');
  private publisherIdInput: HTMLInputElement = document.createElement('input');
  private zoneIdInput: HTMLInputElement = document.createElement('input');
  private adFormatSelect: HTMLSelectElement = document.createElement('select');

  constructor() {
    document.addEventListener('DOMContentLoaded', () => {
      this.initializeElements();
      this.attachEventListeners();
      this.checkLoginState();
    });
  }

  private initializeElements() {
    this.loginSection = document.getElementById('login-section')!;
    this.mainSection = document.getElementById('main-section')!;
    this.loginButton = document.getElementById('login-button') as HTMLButtonElement;
    this.logoutButton = document.getElementById('logout-button') as HTMLButtonElement;
    this.startAdsButton = document.getElementById('start-ads')!;
    this.userNameSpan = document.getElementById('user-name')!;
    this.earningsSpan = document.getElementById('earnings')!;
    this.shareDataCheckbox = document.getElementById('share-data') as HTMLInputElement;
    this.adContainer = document.getElementById('ad-container')!;
    this.adNetworkForm = document.getElementById('ad-network-form') as HTMLFormElement;
    this.networkSelect = document.getElementById('network-select') as HTMLSelectElement;
    this.publisherIdInput = document.getElementById('publisher-id') as HTMLInputElement;
    this.zoneIdInput = document.getElementById('zone-id') as HTMLInputElement;
    this.adFormatSelect = document.getElementById('ad-format') as HTMLSelectElement;
  }

  private attachEventListeners() {
    this.loginButton.addEventListener('click', () => this.handleLogin());
    this.logoutButton.addEventListener('click', () => this.handleLogout());
    this.startAdsButton.addEventListener('click', () => this.toggleAds());
    this.shareDataCheckbox.addEventListener('change', () => this.updateSettings());
    this.adNetworkForm.addEventListener('submit', (e) => this.handleNetworkConfigSubmit(e));
    this.networkSelect.addEventListener('change', () => this.handleNetworkChange());

    chrome.runtime.onMessage.addListener((message: Message) => {
      switch (message.type) {
        case 'LOGIN_SUCCESS':
          this.handleLoginSuccess(message.payload);
          break;
        case 'LOGOUT_SUCCESS':
          this.handleLogoutSuccess();
          break;
        case 'BALANCE_UPDATED':
          this.updateBalance(message.payload);
          break;
      }
    });
  }

  private async handleNetworkConfigSubmit(e: Event) {
    e.preventDefault();

    const config: AdNetworkConfig = {
      network: this.networkSelect.value as AdNetworkConfig['network'],
      publisherId: this.publisherIdInput.value,
      zoneId: this.zoneIdInput.value || undefined,
      format: this.adFormatSelect.value as AdNetworkConfig['format']
    };

    // Send config to background script
    chrome.runtime.sendMessage({
      type: 'UPDATE_AD_NETWORK',
      payload: config
    });

    // Clear form
    this.adNetworkForm.reset();
  }

  private async checkLoginState() {
    const data = await chrome.storage.local.get(['user', 'settings', 'adNetworkConfigs']);
    if (data.user) {
      this.handleLoginSuccess(data.user);
    }
    if (data.settings) {
      this.shareDataCheckbox.checked = data.settings.shareData;
    }
    if (data.adNetworkConfigs && data.adNetworkConfigs.length > 0) {
      // Use the most recent config
      const lastConfig = data.adNetworkConfigs[data.adNetworkConfigs.length - 1];
      this.networkSelect.value = lastConfig.network;
      this.publisherIdInput.value = lastConfig.publisherId;
      this.zoneIdInput.value = lastConfig.zoneId || '';
      this.adFormatSelect.value = lastConfig.format;
    }
  }

  private clearAdNetworkForm() {
    this.networkSelect.value = '';
    this.publisherIdInput.value = '';
    this.zoneIdInput.value = '';
    this.adFormatSelect.value = 'banner';
  }

  private async handleLogin() {
    try {
      this.loginButton.disabled = true;
      chrome.runtime.sendMessage({ type: 'LOGIN' }, (response) => {
        if (chrome.runtime.lastError) {
          console.error('Login error:', chrome.runtime.lastError);
          this.loginButton.disabled = false;
        }
      });
    } catch (error) {
      console.error('Login error:', error);
      this.loginButton.disabled = false;
    }
  }

  private handleLogout() {
    chrome.runtime.sendMessage({ type: 'LOGOUT' });
  }

  private handleLoginSuccess(user: UserProfile) {
    this.loginSection.classList.add('hidden');
    this.mainSection.classList.remove('hidden');
    this.userNameSpan.textContent = user.name;
    this.updateBalance(user.balance);
  }

  private async handleLogoutSuccess() {
    this.loginSection.classList.remove('hidden');
    this.mainSection.classList.add('hidden');
    this.adContainer.classList.add('hidden');
    this.clearAdNetworkForm();
    this.shareDataCheckbox.checked = false;
    // Clear ad network configs from storage
    await chrome.storage.local.remove(['adNetworkConfigs']);
  }

  private updateBalance(balance: number) {
    this.earningsSpan.textContent = `$${balance.toFixed(2)}`;
  }

  private updateSettings() {
    const settings: AdSettings = {
      shareData: this.shareDataCheckbox.checked
    };
    chrome.runtime.sendMessage({ 
      type: 'UPDATE_SETTINGS', 
      payload: settings 
    });
  }

  private async toggleAds() {
    const isShowing = !this.adContainer.classList.contains('hidden');
    const tabs = await chrome.tabs.query({ active: true, currentWindow: true });
    const currentTab = tabs[0];
    
    if (isShowing) {
      this.adContainer.classList.add('hidden');
      this.startAdsButton.textContent = 'Start Watching Ads';
      if (currentTab.id) {
        chrome.tabs.sendMessage(currentTab.id, { type: 'STOP_ADS' });
      }
    } else {
      this.adContainer.classList.remove('hidden');
      this.startAdsButton.textContent = 'Stop Watching Ads';
      if (currentTab.id) {
        chrome.tabs.sendMessage(currentTab.id, { type: 'START_ADS' });
      }
    }
  }

  private async handleNetworkChange() {
    const selectedNetwork = this.networkSelect.value;
    const data = await chrome.storage.local.get(['adNetworkConfigs']);

    // If we have configs and a network is selected, try to find matching config
    if (data.adNetworkConfigs && selectedNetwork) {
      const networkConfig = data.adNetworkConfigs.find(
        (config: any) => config.network === selectedNetwork
      );

      if (networkConfig) {
        this.publisherIdInput.value = networkConfig.publisherId;
        this.zoneIdInput.value = networkConfig.zoneId || '';
        this.adFormatSelect.value = networkConfig.format;
      }
      else {
        // If no matching config, clear the inputs
        this.publisherIdInput.value = '';
        this.zoneIdInput.value = '';
        this.adFormatSelect.value = 'banner';
      }
    }
  }
}

// Initialize the popup manager
new PopupManager();