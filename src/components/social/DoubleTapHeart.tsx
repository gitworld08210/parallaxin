import { useEffect, useState } from "react";
import { Heart } from "lucide-react";

/**
 * Centered heart burst overlay for double-tap-to-like.
 * Mounted inside a relatively-positioned parent. Self-unmounts after the animation.
 */
export const DoubleTapHeart = ({ trigger }: { trigger: number }) => {
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    if (!trigger) return;
    setVisible(true);
    // Haptic on supported devices
    try { (navigator as any).vibrate?.(18); } catch { /* ignore */ }
    const t = setTimeout(() => setVisible(false), 700);
    return () => clearTimeout(t);
  }, [trigger]);

  if (!visible) return null;
  return (
    <div className="pointer-events-none absolute inset-0 grid place-items-center">
      <Heart
        className="h-24 w-24 text-white drop-shadow-[0_4px_12px_rgba(0,0,0,0.45)] fill-white/95"
        style={{
          animation: "dt-heart 700ms cubic-bezier(0.16, 1, 0.3, 1) forwards",
        }}
      />
      <style>{`
        @keyframes dt-heart {
          0%   { transform: scale(0.4); opacity: 0; }
          20%  { transform: scale(1.15); opacity: 1; }
          55%  { transform: scale(1); opacity: 1; }
          100% { transform: scale(0.95); opacity: 0; }
        }
      `}</style>
    </div>
  );
};
