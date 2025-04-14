import { AdEngagement, Message } from './types';

class AdManager {
  private active: boolean = false;
  private currentAd: AdEngagement | null = null;
  private adContainer: HTMLElement | null = null;

  constructor() {
    this.setupMessageListener();
  }

  private setupMessageListener() {
    chrome.runtime.onMessage.addListener((message: Message) => {
      switch (message.type) {
        case 'START_ADS':
          console.log("start ads message received");
          this.startAdSession();
          break;
        case 'STOP_ADS':
          console.log("stop ads message received");
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

  private async startAdSession() {
    if (this.active) return;
    
    this.active = true;
    this.adContainer = this.createAdContainer();
    
    // Start monitoring tab visibility
    document.addEventListener('visibilitychange', this.handleVisibilityChange);
    console.log("ad session started");
    
    await this.loadNextAd();
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
  }

  private handleVisibilityChange = () => {
    if (document.hidden && this.currentAd) {
      this.completeCurrentAd(false);
    }
  }

  private async loadNextAd() {
    if (!this.active || !this.adContainer) return;

    // In a real implementation, this would integrate with ad networks
    // For MVP, we'll simulate ad loading
    const adType = Math.random() > 0.5 ? 'video' : 'banner';
    console.log(`Loading ${adType} ad...`);
    
    this.currentAd = {
      adId: Math.random().toString(36).substring(7),
      startTime: Date.now(),
      duration: adType === 'video' ? 30000 : 15000, // 30s for video, 15s for banner
      completed: false,
      type: adType
    };

    console.log(this.currentAd);

    // Create ad content
    const content = document.createElement('div');
    content.style.cssText = 'padding: 20px; text-align: center;';
    content.innerHTML = `
      <div style="margin-bottom: 10px;">
        ${adType === 'video' ? 'Video Ad' : 'Banner Ad'} Playing
      </div>
      <div class="timer">30</div>
    `;
    
    this.adContainer.innerHTML = '';
    this.adContainer.appendChild(content);

    // Start countdown
    const timer = content.querySelector('.timer')!;
    const duration = this.currentAd.duration;
    const startTime = Date.now();

    const updateTimer = () => {
      if (!this.active || !this.currentAd) return;
      
      const elapsed = Date.now() - startTime;
      const remaining = Math.ceil((duration - elapsed) / 1000);
      
      if (remaining <= 0) {
        this.completeCurrentAd(true);
      } else {
        timer.textContent = remaining.toString();
        requestAnimationFrame(updateTimer);
      }
    };

    requestAnimationFrame(updateTimer);
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