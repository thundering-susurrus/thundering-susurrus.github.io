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

// Poisson Disc Sampling for natural glitter distribution
export function poissonDiscSampling(bounds, minRadius, rng) {
  const { x: minX, y: minY, w: width, h: height } = bounds;
  const maxX = minX + width;
  const maxY = minY + height;
  
  // Grid cell size should be minRadius / sqrt(2) to ensure only one sample per cell
  const cellSize = minRadius / Math.sqrt(2);
  const gridWidth = Math.ceil(width / cellSize);
  const gridHeight = Math.ceil(height / cellSize);
  
  // Grid to track occupied cells
  const grid = new Array(gridWidth * gridHeight).fill(null);
  
  // Active list of points to try extending from
  const active = [];
  const points = [];
  
  // Helper to convert world coordinates to grid indices
  const worldToGrid = (x, y) => {
    const gx = Math.floor((x - minX) / cellSize);
    const gy = Math.floor((y - minY) / cellSize);
    return { gx, gy, index: gy * gridWidth + gx };
  };
  
  // Helper to check if a point is valid (not too close to existing points)
  const isValidPoint = (x, y) => {
    if (x < minX || x >= maxX || y < minY || y >= maxY) return false;
    
    const { gx, gy } = worldToGrid(x, y);
    
    // Check surrounding cells in a 5x5 grid (2 cells in each direction)
    for (let dy = -2; dy <= 2; dy++) {
      for (let dx = -2; dx <= 2; dx++) {
        const nx = gx + dx;
        const ny = gy + dy;
        
        if (nx < 0 || nx >= gridWidth || ny < 0 || ny >= gridHeight) continue;
        
        const index = ny * gridWidth + nx;
        const neighbor = grid[index];
        
        if (neighbor) {
          const dist = Math.sqrt((x - neighbor.x) ** 2 + (y - neighbor.y) ** 2);
          if (dist < minRadius) return false;
        }
      }
    }
    
    return true;
  };
  
  // Add a point to the grid and active list
  const addPoint = (x, y) => {
    const point = { x, y };
    const { index } = worldToGrid(x, y);
    
    grid[index] = point;
    points.push(point);
    active.push(point);
    
    return point;
  };
  
  // Start with a random point in the center area
  const startX = minX + width * (0.3 + rng() * 0.4);
  const startY = minY + height * (0.3 + rng() * 0.4);
  addPoint(startX, startY);
  
  // Generate points
  while (active.length > 0) {
    // Pick a random active point
    const activeIndex = Math.floor(rng() * active.length);
    const activePoint = active[activeIndex];
    let found = false;
    
    // Try up to 30 times to generate a valid point around the active point
    for (let attempts = 0; attempts < 30; attempts++) {
      // Generate a random point in the annulus between minRadius and 2*minRadius
      const angle = rng() * Math.PI * 2;
      const radius = minRadius + rng() * minRadius; // minRadius to 2*minRadius
      
      const x = activePoint.x + Math.cos(angle) * radius;
      const y = activePoint.y + Math.sin(angle) * radius;
      
      if (isValidPoint(x, y)) {
        addPoint(x, y);
        found = true;
        break;
      }
    }
    
    // If no valid point was found, remove this point from the active list
    if (!found) {
      active.splice(activeIndex, 1);
    }
  }
  
  return points;
}