export interface UserProfile {
  email: string;
  name: string;
  balance: number;
}

export interface AdSettings {
  shareData: boolean;
}

export interface AdEngagement {
  adId: string;
  startTime: number;
  duration: number;
  completed: boolean;
  type: 'video' | 'banner';
}

export interface AdNetworkConfig {
  network: 'adsterra' | 'propellerads' | 'admaven' | 'hilltopads' | 'revenuehits';
  publisherId: string;
  zoneId?: string;
}

export interface Message {
  type: 'LOGIN' | 'LOGOUT' | 'UPDATE_SETTINGS' | 'START_ADS' | 'STOP_ADS' | 'AD_COMPLETED' |
        'LOGIN_SUCCESS' | 'LOGIN_ERROR' | 'LOGOUT_SUCCESS' | 'BALANCE_UPDATED';
  payload?: any;
}