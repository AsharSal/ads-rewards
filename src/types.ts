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
  // Additional fields needed for specific networks
  format?: 'popup' | 'banner' | 'native' | 'video' | 'interstitial';
  placementId?: string;  // Used by some networks like PropellerAds
  containerSelector?: string; // For in-page ad placements
  adSize?: string; // Format like "300x250" for banner ads
}

export interface Message {
  type: 'LOGIN' | 'LOGOUT' | 'UPDATE_SETTINGS' | 'START_ADS' | 'STOP_ADS' | 'AD_COMPLETED' |
        'LOGIN_SUCCESS' | 'LOGIN_ERROR' | 'LOGOUT_SUCCESS' | 'BALANCE_UPDATED' | 'UPDATE_AD_NETWORK';
  payload?: any;
}