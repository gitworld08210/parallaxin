import { useBackButton } from '@/hooks/useBackButton';
import { useStatusBar } from '@/hooks/useStatusBar';

const useNativeApp = () => {
  useBackButton();
  useStatusBar();
};

export default useNativeApp;
