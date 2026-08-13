import { useEffect } from "react";
import { useLocation } from "react-router-dom";

export const useScrollReset = () => {
  const { pathname } = useLocation();

  useEffect(() => {
    const main = document.querySelector('main');
    if (main) {
      main.scrollTo(0, 0);
    }
  }, [pathname]);
};
