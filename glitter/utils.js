// small helpers exported for use by app.js
export const clamp = (v, min, max) => Math.min(max, Math.max(min, v));
export const el = (q, root=document) => root.querySelector(q);

export function normalizeHex(hex){
  hex = (hex || '').trim();
  if(!hex) return '#000000';
  if(!hex.startsWith('#')) hex = '#'+hex;
  if(hex.length===4) hex = '#'+hex[1]+hex[1]+hex[2]+hex[2]+hex[3]+hex[3];
  return hex.slice(0,7).toLowerCase();
}

export function capitalize(s){ return s.charAt(0).toUpperCase()+s.slice(1); }

export function escapeHtml(s){
  return String(s ?? '').replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
}

// Color conversions
export function hexToHsl(hex){
  hex = normalizeHex(hex);
  const r = parseInt(hex.slice(1,3),16)/255;
  const g = parseInt(hex.slice(3,5),16)/255;
  const b = parseInt(hex.slice(5,7),16)/255;
  const max = Math.max(r,g,b), min = Math.min(r,g,b);
  let h=0, s=0, l = (max+min)/2;
  if(max===min){ h = s = 0; }
  else {
    const d = max-min;
    s = l > 0.5 ? d/(2-max-min) : d/(max+min);
    switch(max){
      case r: h = (g-b)/d + (g<b?6:0); break;
      case g: h = (b-r)/d + 2; break;
      case b: h = (r-g)/d + 4; break;
    }
    h /= 6;
  }
  return {h, s, l};
}

export function hslToHex(h, s, l){
  let r, g, b;
  if(s===0){ r=g=b=l; }
  else {
    const hue2rgb = (p,q,t) => {
      if(t<0) t+=1;
      if(t>1) t-=1;
      if(t<1/6) return p+(q-p)*6*t;
      if(t<1/2) return q;
      if(t<2/3) return p+(q-p)*(2/3 - t)*6;
      return p;
    };
    const q = l < 0.5 ? l * (1+s) : l + s - l*s;
    const p = 2*l - q;
    r = hue2rgb(p,q,h+1/3);
    g = hue2rgb(p,q,h);
    b = hue2rgb(p,q,h-1/3);
  }
  const toHex = x => ('0'+Math.round(x*255).toString(16)).slice(-2);
  return `#${toHex(r)}${toHex(g)}${toHex(b)}`;
}

export function shadeHex(hex, lightnessDelta){
  const {h, s, l} = hexToHsl(hex);
  // clamp is small local util to avoid circular import; duplicate simple clamp
  const c = (v, a, b) => Math.min(b, Math.max(a, v));
  return hslToHex(h, s, c(l + lightnessDelta, 0, 1));
}

export function jitterHex(hex, lightnessDelta, saturationDelta){
  const {h, s, l} = hexToHsl(hex);
  // clamp is small local util to avoid circular import; duplicate simple clamp
  const c = (v, a, b) => Math.min(b, Math.max(a, v));
  return hslToHex(h, c(s + saturationDelta, 0, 1), c(l + lightnessDelta, 0, 1));
}