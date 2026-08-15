import { useEffect, useRef } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { applyNativeChrome, exitApp, isNativeApp, registerBackButton } from "@/lib/native";

/**
 * Wires the Android shell to the router. Renders nothing and is inert on web.
 *
 * Must be mounted inside the router so the hardware back button can move
 * through app history rather than closing the app.
 */
export const NativeShell = () => {
  const navigate = useNavigate();
  const location = useLocation();

  // The back listener is registered once; reading the path from a ref keeps the
  // handler current without tearing down and re-adding the native listener on
  // every navigation.
  const pathRef = useRef(location.pathname);
  pathRef.current = location.pathname;

  useEffect(() => {
    if (!isNativeApp()) return;
    void applyNativeChrome();
  }, []);

  useEffect(() => {
    if (!isNativeApp()) return;

    return registerBackButton(() => {
      const atRoot = pathRef.current === "/";
      const hasHistory = window.history.length > 1;

      // Only exit from the root screen. Elsewhere, step back — and if there is
      // no entry to step back to, send the user to the feed instead of leaving
      // them on a screen where back appears broken.
      if (!atRoot) {
        if (hasHistory) navigate(-1);
        else navigate("/", { replace: true });
        return;
      }

      void exitApp();
    });
  }, [navigate]);

  return null;
};

export default NativeShell;
