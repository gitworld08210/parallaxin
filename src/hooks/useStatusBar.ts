import { useEffect } from 'react';
import { StatusBar, Style } from '@capacitor/status-bar';
import { isNativePlatform } from '@/lib/capacitor';

export const useStatusBar = () => {
  useEffect(() => {
    if (!isNativePlatform()) return;

    StatusBar.setStyle({ style: Style.Dark });
    StatusBar.setBackgroundColor({ color: '#08070f' });
  }, []);
};
