import { useEffect } from 'react';
import { App } from '@capacitor/app';
import { useNavigate, useLocation } from 'react-router-dom';
import { isNativePlatform } from '@/lib/capacitor';

export const useBackButton = () => {
  const navigate = useNavigate();
  const location = useLocation();

  useEffect(() => {
    if (!isNativePlatform()) return;

    const listener = App.addListener('backButton', () => {
      if (location.pathname === '/' || location.pathname === '/feed') {
        App.minimizeApp();
      } else {
        navigate(-1);
      }
    });

    return () => {
      listener.then((l) => l.remove());
    };
  }, [navigate, location.pathname]);
};
