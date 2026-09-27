"use client";

import { useEffect } from "react";

// Wide elements (heroes, long list rows) don't tilt: a small rotation moves
// their edges a lot, which looks like warping.
const MAX_TILT_WIDTH = 600;

/**
 * Pointer-driven 3D tilt for every `.ov3d .tilt-3d` element on the page.
 * Sets --rx/--ry (rotation) and --mx/--my (glare position); CSS does the rest.
 *
 * Listens on the document because AdminShell shows a loading screen first,
 * so the page wrapper doesn't exist yet on the first render.
 */
export function useTilt(){
  useEffect(()=>{
    if(window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;

    const SELECTOR = ".ov3d .tilt-3d";
    let active: HTMLElement | null = null;
    // Untransformed box of the active card, captured when tilting starts. Hit
    // testing against it (not the tilted shape) stops the card flickering when
    // its rotated edge slides out from under the pointer.
    let box: DOMRect | null = null;

    const reset = (el: HTMLElement)=>{
      el.style.setProperty("--rx","0deg");
      el.style.setProperty("--ry","0deg");
      el.classList.remove("is-tilting");
    };

    const release = ()=>{
      if(active) reset(active);
      active = null;
      box = null;
    };

    const inside = (e: PointerEvent, r: DOMRect)=>
      e.clientX >= r.left && e.clientX <= r.right && e.clientY >= r.top && e.clientY <= r.bottom;

    const onMove = (e: PointerEvent)=>{
      if(e.pointerType === "touch") return;

      let el: HTMLElement | null;
      if(active && box && inside(e, box)){
        el = active;
      }else{
        el = (e.target as HTMLElement | null)?.closest?.(SELECTOR) as HTMLElement | null;
        if(el && el.getBoundingClientRect().width > MAX_TILT_WIDTH) el = null;
      }

      if(el !== active){
        release();
        if(!el) return;
        active = el;
        box = el.getBoundingClientRect();
      }
      if(!active || !box) return;

      const x = (e.clientX - box.left) / box.width;
      const y = (e.clientY - box.top) / box.height;
      const max = Number(active.dataset.tilt || 8);
      active.style.setProperty("--ry", ((x - .5) * max * 2).toFixed(2) + "deg");
      active.style.setProperty("--rx", ((.5 - y) * max * 2).toFixed(2) + "deg");
      active.style.setProperty("--mx", (x * 100).toFixed(1) + "%");
      active.style.setProperty("--my", (y * 100).toFixed(1) + "%");
      active.classList.add("is-tilting");
    };

    document.addEventListener("pointermove", onMove);
    document.addEventListener("pointerleave", release);
    window.addEventListener("blur", release);
    // The saved box is stale once the page scrolls or resizes
    window.addEventListener("scroll", release, true);
    window.addEventListener("resize", release);
    return ()=>{
      document.removeEventListener("pointermove", onMove);
      document.removeEventListener("pointerleave", release);
      window.removeEventListener("blur", release);
      window.removeEventListener("scroll", release, true);
      window.removeEventListener("resize", release);
      release();
    };
  },[]);
}
