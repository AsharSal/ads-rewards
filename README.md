# Ad Rewards Browser Extension

A browser extension that rewards users for watching video and banner ads.

## Features

- Compatible with Chrome and Firefox (Manifest V3)
- Google OAuth login
- Ad viewing in sidebar popup
- Video and banner ad support
- Earnings tracking
- Optional browsing data sharing for better ad targeting

## Development Setup

1. Install dependencies:
```bash
npm install
```

2. Build the extension:
```bash
npm run build
```

For development with auto-rebuild:
```bash
npm run watch
```

## Loading the Extension

### Chrome
1. Open Chrome and navigate to `chrome://extensions`
2. Enable "Developer mode" in the top right
3. Click "Load unpacked" and select the `dist` folder

### Firefox
1. Open Firefox and navigate to `about:debugging`
2. Click "This Firefox" on the left
3. Click "Load Temporary Add-on"
4. Select any file from the `dist` folder

## Configuration

Before using the extension, you need to:

1. Set up a Google OAuth 2.0 client ID
2. Replace the `${CLIENT_ID}` placeholder in `src/manifest.json`
3. Configure ad network credentials in the extension settings

## Ad Network Integration

The extension is designed to work with various ad networks:
- Adsterra
- PropellerAds
- AdMaven
- HilltopAds
- RevenueHits

To integrate with these networks, you'll need to:
1. Sign up for the desired ad network(s)
2. Get your publisher ID and zone ID
3. Configure them in the extension settings

## Testing

The extension includes validation for:
- Tab activity
- Video sound state
- Ad view duration
- User engagement

## Security Notes

- Uses secure OAuth 2.0 for authentication
- Implements proper ad engagement validation
- Follows browser extension security best practices
- Respects user privacy settings# ads-rewards
