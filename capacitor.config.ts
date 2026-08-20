import type { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'com.aurelix.app',
  appName: 'Aurelix',
  webDir: 'dist',
  plugins: {
    SplashScreen: {
      launchAutoHide: true,
      launchShowDuration: 2000,
      backgroundColor: '#08070f',
    },
    StatusBar: {
      style: 'DARK',
      backgroundColor: '#08070f',
    },
    Keyboard: {
      resize: 'body',
      style: 'DARK',
    },
  },
};

export default config;
