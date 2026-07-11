---
name: liquid-glass-js
description: Apple-style WebGL "Liquid Glass" buttons and containers (dashersw/liquid-glass-js). Use when the user asks for liquid glass, Apple glass, refractive/frosted glass buttons, or nested glass containers with real-time refraction, rim lighting, and blur.
---

# Liquid Glass JS

WebGL-powered glass components — `Container` and `Button` — with real refraction, rim lighting, blur, and nested sampling. Vanilla JS globals; not on npm. Requires `html2canvas` at runtime to sample the page background.

## When to use

Reach for this when the user explicitly wants Apple/liquid glass effects on buttons or panels. Do NOT use for generic frosted glass — plain Tailwind `backdrop-blur` + translucent bg is lighter and enough for that. WebGL cost is only justified for the refractive/rim look.

## Files (bundled in `assets/`)

`container.js`, `button.js`, `glass.css`, `styles.css` (optional demo), `controls.js` + `controls.css` (dev-only parameter panel). Copy the ones you need into `public/vendor/liquid-glass/` and load via `<script>`/`<link>` tags — they define `window.Container` / `window.Button` globals. There is no ESM build; do not `import` them.

## Integration in this React + Vite project

1. Copy `container.js`, `button.js`, `glass.css` into `public/vendor/liquid-glass/`.
2. In `index.html`, before `</body>`:
   ```html
   <link rel="stylesheet" href="/vendor/liquid-glass/glass.css" />
   <script src="https://cdn.jsdelivr.net/npm/html2canvas@1.4.1/dist/html2canvas.min.js"></script>
   <script src="/vendor/liquid-glass/container.js"></script>
   <script src="/vendor/liquid-glass/button.js"></script>
   ```
3. Wrap in a React component that mounts into a ref and cleans up:
   ```tsx
   // src/components/glass/LiquidGlassButton.tsx
   import { useEffect, useRef } from "react";
   declare global { interface Window { Button: any } }

   export const LiquidGlassButton = ({ text, type = "pill", size = 24, onClick }:
     { text: string; type?: "rounded"|"circle"|"pill"; size?: number; onClick?: () => void }) => {
     const host = useRef<HTMLDivElement>(null);
     useEffect(() => {
       if (!host.current || !window.Button) return;
       const btn = new window.Button({ text, type, size, onClick });
       host.current.appendChild(btn.element);
       return () => btn.element.remove();
     }, [text, type, size, onClick]);
     return <div ref={host} />;
   };
   ```

## API cheat sheet

`new Container({ borderRadius=48, type='rounded'|'circle'|'pill', tintOpacity=0.2 })`
→ `.element`, `.addChild(el)`, `.removeChild(el)`, `.updateSizeFromDOM()`

`new Button({ text, size=48, type, onClick, warp=false, tintOpacity=0.2 })` — extends Container.

Nesting: create a `Container`, then `container.addChild(button.element)` so children sample the parent's glass output.

Global tuning (all instances): set `window.glassControls = { edgeIntensity, rimIntensity, baseIntensity, blurRadius, tintOpacity, ... }` and iterate `Container.instances` to push uniforms. Ranges live in the README table in assets.

## Gotchas

- `html2canvas` must load BEFORE `container.js` — otherwise page sampling silently no-ops.
- WebGL2 required; degrade gracefully with a plain Tailwind glass fallback for unsupported browsers.
- Each instance is a `<canvas>`; do not mount hundreds. One container with nested buttons is the intended pattern.
- SSR/preview iframes: guard with `typeof window !== 'undefined'` and check `window.Button` exists before `new`.
- Respect `prefers-reduced-motion` and skip the `warp` option there.
- License: MIT (dashersw/liquid-glass-js).
