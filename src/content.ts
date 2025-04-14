import { AdEngagement, Message, AdNetworkConfig } from './types';

class AdManager {
  private active: boolean = false;
  private currentAd: AdEngagement | null = null;
  private adContainer: HTMLElement | null = null;
  private adNetworkConfig: AdNetworkConfig | null = null;
  private adScripts: { [key: string]: string } = {
    adsterra: 'https://www.adsterra.com/script.js',
    propellerads: 'https://propellerads.com/platform/script.js',
    admaven: 'https://admaven.com/script.js',
    hilltopads: 'https://hilltopads.com/script.js',
    revenuehits: 'https://revenuehits.com/script.js'
  };

  constructor() {
    this.setupMessageListener();
  }

  private setupMessageListener() {
    chrome.runtime.onMessage.addListener((message: Message) => {
      switch (message.type) {
        case 'START_ADS':
          this.adNetworkConfig = message.payload;
          this.startAdSession();
          break;
        case 'STOP_ADS':
          this.stopAdSession();
          break;
      }
      return true;
    });
  }

  private createAdContainer() {
    const container = document.createElement('div');
    container.style.cssText = `
      position: fixed;
      right: 0;
      top: 0;
      width: 300px;
      height: 100vh;
      background: white;
      box-shadow: -2px 0 5px rgba(0,0,0,0.2);
      z-index: 999999;
      overflow: hidden;
    `;
    document.body.appendChild(container);
    return container;
  }

  private async loadAdNetworkScript(network: string): Promise<void> {
    return new Promise((resolve, reject) => {
      if (!this.adScripts[network]) {
        reject(new Error(`No script URL defined for network: ${network}`));
        return;
      }

      const script = document.createElement('script');
      script.src = this.adScripts[network];
      script.async = true;
      script.onload = () => resolve();
      script.onerror = () => reject(new Error(`Failed to load script for ${network}`));
      document.head.appendChild(script);
    });
  }

  private async initializeAdNetwork(config: AdNetworkConfig): Promise<void> {
    if (!config || !config.network) return;

    try {
      await this.loadAdNetworkScript(config.network);
      
      // Initialize network-specific configuration
      switch (config.network) {
        case 'adsterra':
          (window as any).adsterra = {
            publisherId: config.publisherId,
            zoneId: config.zoneId,
            format: config.format || 'banner'
          };
          break;

        case 'propellerads':
          (window as any).propellerads = {
            publisherId: config.publisherId,
            placementId: config.placementId,
            format: config.format
          };
          break;

        case 'admaven':
          (window as any).admaven = {
            publisherId: config.publisherId,
            zoneId: config.zoneId
          };
          break;

        case 'hilltopads':
          (window as any).hilltopads = {
            publisherId: config.publisherId,
            zoneId: config.zoneId
          };
          break;

        case 'revenuehits':
          (window as any).revenuehits = {
            publisherId: config.publisherId,
            format: config.format || 'banner'
          };
          break;
      }
    } catch (error) {
      console.error(`Failed to initialize ad network: ${config.network}`, error);
      throw error;
    }
  }

  private async startAdSession() {
    if (this.active || !this.adNetworkConfig) return;
    
    this.active = true;
    this.adContainer = this.createAdContainer();
    
    try {
      await this.initializeAdNetwork(this.adNetworkConfig);
      document.addEventListener('visibilitychange', this.handleVisibilityChange);
      await this.loadNextAd();
    } catch (error) {
      console.error("Failed to start ad session:", error);
      this.stopAdSession();
    }
  }

  private stopAdSession() {
    if (!this.active) return;
    
    this.active = false;
    document.removeEventListener('visibilitychange', this.handleVisibilityChange);
    
    if (this.currentAd) {
      this.completeCurrentAd(false);
    }
    
    if (this.adContainer) {
      document.body.removeChild(this.adContainer);
      this.adContainer = null;
    }

    // Clean up ad network scripts
    if (this.adNetworkConfig) {
      const scriptElement = document.querySelector(`script[src="${this.adScripts[this.adNetworkConfig.network]}"]`);
      if (scriptElement) {
        scriptElement.remove();
      }
    }
  }

  private handleVisibilityChange = () => {
    if (document.hidden && this.currentAd) {
      this.completeCurrentAd(false);
    }
  }

  private async loadNextAd() {
    if (!this.active || !this.adContainer || !this.adNetworkConfig) return;

    const adType = this.adNetworkConfig.format || 'banner';
    
    this.currentAd = {
      adId: Math.random().toString(36).substring(7),
      startTime: Date.now(),
      duration: adType === 'video' ? 30000 : 15000,
      completed: false,
      type: adType === 'video' ? 'video' : 'banner'
    };

    // Create container for ad content
    const adFrame = document.createElement('div');
    adFrame.id = `ad-frame-${this.currentAd.adId}`;
    adFrame.style.cssText = 'width: 100%; height: 100%; border: none;';
    
    this.adContainer.innerHTML = '';
    this.adContainer.appendChild(adFrame);

    // Start monitoring ad engagement
    this.monitorAdEngagement();
  }

  private monitorAdEngagement() {
    if (!this.currentAd) return;

    const duration = this.currentAd.duration;
    const startTime = Date.now();

    const checkEngagement = () => {
      if (!this.active || !this.currentAd) return;
      
      const elapsed = Date.now() - startTime;
      
      if (elapsed >= duration) {
        this.completeCurrentAd(true);
      } else {
        requestAnimationFrame(checkEngagement);
      }
    };

    requestAnimationFrame(checkEngagement);
  }

  private completeCurrentAd(success: boolean) {
    if (!this.currentAd) return;

    this.currentAd.completed = success;
    chrome.runtime.sendMessage({
      type: 'AD_COMPLETED',
      payload: this.currentAd
    });

    this.currentAd = null;

    if (this.active) {
      this.loadNextAd();
    }
  }
}

// Initialize the ad manager
new AdManager();