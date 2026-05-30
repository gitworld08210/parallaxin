import { Variants } from "framer-motion";

export const easeOutExpo = [0.16, 1, 0.3, 1] as const;
export const easeInOutQuart = [0.76, 0, 0.24, 1] as const;

export const durations = {
  fast: 0.18,
  base: 0.28,
  slow: 0.48,
} as const;

export const fadeUp: Variants = {
  initial: { opacity: 0, y: 12 },
  animate: { opacity: 1, y: 0, transition: { duration: durations.base, ease: easeOutExpo } },
  exit: { opacity: 0, y: -8, transition: { duration: durations.fast, ease: easeOutExpo } },
};

export const fadeIn: Variants = {
  initial: { opacity: 0 },
  animate: { opacity: 1, transition: { duration: durations.base, ease: easeOutExpo } },
  exit: { opacity: 0, transition: { duration: durations.fast } },
};

export const scaleIn: Variants = {
  initial: { opacity: 0, scale: 0.96 },
  animate: { opacity: 1, scale: 1, transition: { duration: durations.base, ease: easeOutExpo } },
  exit: { opacity: 0, scale: 0.98, transition: { duration: durations.fast } },
};

export const slideUp: Variants = {
  initial: { y: "100%" },
  animate: { y: 0, transition: { type: "spring", stiffness: 360, damping: 36 } },
  exit: { y: "100%", transition: { duration: durations.base, ease: easeInOutQuart } },
};

export const stagger = (delay = 0.05): Variants => ({
  animate: { transition: { staggerChildren: delay } },
});

export const pagePrefersReducedMotion = (reduced: boolean): Variants =>
  reduced
    ? { initial: { opacity: 0 }, animate: { opacity: 1 }, exit: { opacity: 0 } }
    : fadeUp;
