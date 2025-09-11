import { clamp, el, normalizeHex, capitalize, escapeHtml, hslToHex, shadeHex, jitterHex } from './utils.js';

// State
let mix = []; // {id, name, shape, sizeMm, color, density, seed}
let seedCounter = 1;
let nailBase = '#f3d9cf';
const glitterOpacity = 1.0; // full opacity with color variation for realism
const densityMax = 200; // 2x original

// DOM refs
const stage = el('#stage');
const addRandomBtn = el('#add-random');
const clearBtn = el('#clear-mix');
const rerollBtn = el('#reroll');
const exportBtn = el('#export-json');
const importBtn = el('#import-json');
const randomizeBtn = el('#randomize');
const baseColor = el('#base-color');
const baseColorHex = el('#base-color-hex');
const glitterList = el('#glitter-list');

// Helpers
function autoName(shape, sizeMm){
  return `${capitalize(shape)} ${Number(sizeMm).toFixed(1)}mm`;
}

// Rendering
function render(){
  stage.innerHTML = '';
  const svgNS = 'http://www.w3.org/2000/svg';
  const svg = document.createElementNS(svgNS, 'svg');
  svg.setAttribute('viewBox', `0 0 300 450`);
  svg.setAttribute('role','img');
  svg.setAttribute('aria-label','Fingernail with glitter preview');
  svg.style.width = '100%';
  svg.style.height = '100%';

  // defs: glitter drop shadow
  const defs = document.createElementNS(svgNS, 'defs');

  // Drop shadow filter that each piece can use so layering shows
  const filt = document.createElementNS(svgNS, 'filter');
  filt.setAttribute('id', 'pieceShadow');
  filt.setAttribute('x', '-30%'); filt.setAttribute('y', '-30%');
  filt.setAttribute('width','160%'); filt.setAttribute('height','160%');
  const feOffset = document.createElementNS(svgNS, 'feOffset');
  feOffset.setAttribute('dx','0.4'); feOffset.setAttribute('dy','0.6');
  feOffset.setAttribute('in','SourceAlpha'); feOffset.setAttribute('result','off');
  const feBlur = document.createElementNS(svgNS, 'feGaussianBlur');
  feBlur.setAttribute('in','off'); feBlur.setAttribute('stdDeviation','0.7'); feBlur.setAttribute('result','blur');
  const feColor = document.createElementNS(svgNS, 'feColorMatrix');
  feColor.setAttribute('in','blur');
  feColor.setAttribute('type','matrix');
  feColor.setAttribute('values','0 0 0 0 0  0 0 0 0 0  0 0 0 0 0  0 0 0 .01 0');
  const feMerge = document.createElementNS(svgNS,'feMerge');
  const feM1 = document.createElementNS(svgNS,'feMergeNode'); feM1.setAttribute('in','blur');
  const feM2 = document.createElementNS(svgNS,'feMergeNode'); feM2.setAttribute('in','SourceGraphic');
  feMerge.appendChild(feM1); feMerge.appendChild(feM2);
  filt.appendChild(feOffset); filt.appendChild(feBlur); filt.appendChild(feColor); filt.appendChild(feMerge);
  defs.appendChild(filt);

  // Clip path for nail
  const clip = document.createElementNS(svgNS, 'clipPath');
  clip.setAttribute('id', 'nail-clip');
  const nailClip = document.createElementNS(svgNS,'path');
  nailClip.setAttribute('d', `
    M 95 120
    Q 150 80 205 120
    L 205 360
    Q 150 400 95 360
    Z
  `);
  clip.appendChild(nailClip);
  defs.appendChild(clip);
  svg.appendChild(defs);

  // Finger and nail
  const group = document.createElementNS(svgNS,'g');

  const finger = document.createElementNS(svgNS,'path');
  finger.setAttribute('d', `
    M 150 450
    L 50 450
    L 50 220
    C 50 120, 80 70, 150 70
    C 220 70, 250 120, 250 220
    L 250 450
    L 150 450
    Z
  `);
  finger.setAttribute('fill', '#f1d2c5');
  finger.setAttribute('stroke', 'rgba(0,0,0,0.08)');
  finger.setAttribute('stroke-width', '2');
  group.appendChild(finger);

  const nail = document.createElementNS(svgNS,'path');
  nail.setAttribute('d', `
    M 95 120
    Q 150 80 205 120
    L 205 360
    Q 150 400 95 360
    Z
  `);
  nail.setAttribute('fill', nailBase);
  nail.setAttribute('stroke', 'rgba(0,0,0,0.08)');
  nail.setAttribute('stroke-width', '1.5');
  group.appendChild(nail);

  svg.appendChild(group);

  // Glitter layer
  const glitterLayer = document.createElementNS(svgNS,'g');
  glitterLayer.setAttribute('clip-path','url(#nail-clip)');

  const nailBox = {x: 95, y: 80, w: 110, h: 280}; // cropped to focus on nail area

  function piecesFor(density, sizeMm){
    const pxPerMm = 110 / 13; // ~8.46 px/mm
    const sPx = Math.max(0.5, sizeMm * pxPerMm);
    const basePieces = density * 3.2;
    const sizeFactor = 16 / (sPx*sPx + 6);
    return Math.round(basePieces * sizeFactor);
  }

  function rng(seed){
    let s = seed >>> 0;
    return () => {
      s = (s + 0x6D2B79F5) | 0;
      let t = Math.imul(s ^ (s >>> 15), 1 | s);
      t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
      return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    };
  }

  // Collect all glitter pieces with random z-order for realistic layering
  const allPieces = [];
  
  for(const g of mix){
    const rand = rng(g.seed);
    const pxPerMm = 110 / 13;
    const sizePx = clamp(g.sizeMm * pxPerMm, 0.5, 30);
    const count = piecesFor(g.density, g.sizeMm);

    for(let i=0;i<count;i++){
      // Generate coordinates that better fit the nail shape
      // Use rejection sampling to get better distribution
      let x, y, nailWidth;
      let attempts = 0;
      const centerX = 150; // nail center X coordinate
      
      do {
        const u = rand();
        const v = rand();
        x = nailBox.x + (u) * nailBox.w;
        y = nailBox.y + (v) * nailBox.h;
        
        // Simple nail shape approximation for better distribution
        const normalizedY = (y - 80) / 280; // 0 at top, 1 at bottom
        
        if (normalizedY < 0.125) { // top curved part (y: 80-120)
          const curveProgress = normalizedY / 0.125;
          nailWidth = 55 * (0.3 + 0.7 * curveProgress); // narrow at top, wider moving down
        } else if (normalizedY > 0.875) { // bottom curved part (y: 360-400)
          const curveProgress = (1 - normalizedY) / 0.125;
          nailWidth = 55 * (0.3 + 0.7 * curveProgress); // narrow at bottom, wider moving up
        } else { // middle straight part
          nailWidth = 55;
        }
        
        attempts++;
      } while (Math.abs(x - centerX) > nailWidth && attempts < 20);
      
      // Fallback to original method if rejection sampling fails
      if (attempts >= 20) {
        const u = rand();
        const v = rand();
        x = nailBox.x + (u) * nailBox.w;
        y = nailBox.y + (v) * nailBox.h;
      }
      const rot = rand() * Math.PI * 2;
      const zOrder = rand(); // Random z-order for this piece

      // Create a wrapper group for the piece to separate shadow from rotation
      const pieceGroup = document.createElementNS(svgNS,'g');
      pieceGroup.setAttribute('filter', 'url(#pieceShadow)');

      let shapeEl;
      if(g.shape === 'circle'){
        shapeEl = document.createElementNS(svgNS,'circle');
        shapeEl.setAttribute('cx', x.toFixed(2));
        shapeEl.setAttribute('cy', y.toFixed(2));
        shapeEl.setAttribute('r', (sizePx/2).toFixed(2));
      } else if(g.shape === 'square'){
        shapeEl = document.createElementNS(svgNS,'rect');
        const s = sizePx;
        shapeEl.setAttribute('x', (x - s/2).toFixed(2));
        shapeEl.setAttribute('y', (y - s/2).toFixed(2));
        shapeEl.setAttribute('width', s.toFixed(2));
        shapeEl.setAttribute('height', s.toFixed(2));
        shapeEl.setAttribute('transform', `rotate(${(rot*57.2958).toFixed(2)} ${x.toFixed(2)} ${y.toFixed(2)})`);
        shapeEl.setAttribute('rx', (Math.min(2, s*0.2)).toFixed(2));
      } else {
        // hexagon
        shapeEl = document.createElementNS(svgNS,'polygon');
        const r = sizePx/2;
        const pts = [];
        for(let k=0;k<6;k++){
          const a = rot + Math.PI/6 + k * Math.PI/3;
          const px = x + r * Math.cos(a);
          const py = y + r * Math.sin(a);
          pts.push(`${px.toFixed(2)},${py.toFixed(2)}`);
        }
        shapeEl.setAttribute('points', pts.join(' '));
      }

      // Subtle brightness and saturation jitter to simulate light reflection
      const lightnessJitter = (rand()-0.5)*0.08;
      const saturationJitter = (rand()-0.5)*0.06;
      const fill = jitterHex(g.color, lightnessJitter, saturationJitter);
      shapeEl.setAttribute('fill', fill);
      shapeEl.setAttribute('opacity', glitterOpacity);

      pieceGroup.appendChild(shapeEl);
      
      // Add to collection with z-order for sorting
      allPieces.push({ element: pieceGroup, zOrder });
    }
  }
  
  // Sort all pieces by z-order and add to glitter layer
  allPieces.sort((a, b) => a.zOrder - b.zOrder);
  for(const piece of allPieces) {
    glitterLayer.appendChild(piece.element);
  }

  svg.appendChild(glitterLayer);
  stage.appendChild(svg);
}

// Helper function to create SVG shape for buttons (smaller, simpler)
function createShapeButton(shape, size = 20) {
  const svgNS = 'http://www.w3.org/2000/svg';
  const svg = document.createElementNS(svgNS, 'svg');
  svg.setAttribute('width', size);
  svg.setAttribute('height', size);
  svg.setAttribute('viewBox', `0 0 ${size} ${size}`);
  svg.style.display = 'block';
  
  let shapeEl;
  const center = size / 2;
  
  if (shape === 'circle') {
    shapeEl = document.createElementNS(svgNS, 'circle');
    shapeEl.setAttribute('cx', center);
    shapeEl.setAttribute('cy', center);
    shapeEl.setAttribute('r', center - 3);
  } else if (shape === 'square') {
    shapeEl = document.createElementNS(svgNS, 'rect');
    const rectSize = size - 6;
    shapeEl.setAttribute('x', 3);
    shapeEl.setAttribute('y', 3);
    shapeEl.setAttribute('width', rectSize);
    shapeEl.setAttribute('height', rectSize);
    shapeEl.setAttribute('rx', 1);
  } else { // hex
    shapeEl = document.createElementNS(svgNS, 'polygon');
    const r = center - 3;
    const pts = [];
    for(let k = 0; k < 6; k++) {
      const a = Math.PI/6 + k * Math.PI/3;
      const x = center + r * Math.cos(a);
      const y = center + r * Math.sin(a);
      pts.push(`${x.toFixed(2)},${y.toFixed(2)}`);
    }
    shapeEl.setAttribute('points', pts.join(' '));
  }
  
  shapeEl.setAttribute('fill', 'currentColor');
  
  svg.appendChild(shapeEl);
  return svg.outerHTML;
}

// Helper function to create shape-specific swatch SVG
function createShapeSwatch(shape, color) {
  const svgNS = 'http://www.w3.org/2000/svg';
  const size = 24;
  
  const svg = document.createElementNS(svgNS, 'svg');
  svg.setAttribute('width', size);
  svg.setAttribute('height', size);
  svg.setAttribute('viewBox', `0 0 ${size} ${size}`);
  svg.style.display = 'block';
  
  let shapeEl;
  const center = size / 2;
  
  if (shape === 'circle') {
    shapeEl = document.createElementNS(svgNS, 'circle');
    shapeEl.setAttribute('cx', center);
    shapeEl.setAttribute('cy', center);
    shapeEl.setAttribute('r', center - 2);
  } else if (shape === 'square') {
    shapeEl = document.createElementNS(svgNS, 'rect');
    const rectSize = size - 4;
    shapeEl.setAttribute('x', 2);
    shapeEl.setAttribute('y', 2);
    shapeEl.setAttribute('width', rectSize);
    shapeEl.setAttribute('height', rectSize);
    shapeEl.setAttribute('rx', 2);
  } else { // hex
    shapeEl = document.createElementNS(svgNS, 'polygon');
    const r = center - 2;
    const pts = [];
    for(let k = 0; k < 6; k++) {
      const a = Math.PI/6 + k * Math.PI/3;
      const x = center + r * Math.cos(a);
      const y = center + r * Math.sin(a);
      pts.push(`${x.toFixed(2)},${y.toFixed(2)}`);
    }
    shapeEl.setAttribute('points', pts.join(' '));
  }
  
  shapeEl.setAttribute('fill', color);
  shapeEl.setAttribute('stroke', 'rgba(255,255,255,0.2)');
  shapeEl.setAttribute('stroke-width', '1');
  
  svg.appendChild(shapeEl);
  return svg.outerHTML;
}

// List UI
function refreshList(){
  glitterList.innerHTML = '';
  if(mix.length === 0){
    const empty = document.createElement('div');
    empty.className = 'chip';
    empty.innerHTML = `
      <div class="swatch" style="background: linear-gradient(45deg, #2a2f4d, #1a1f38);"></div>
      <div class="meta">
        <div class="title">No glitters yet -- click “+ Add randomized glitter”</div>
        <div class="mini">We'll auto-generate a name from shape and size. Click the name to expand/collapse.</div>
      </div>
      <div class="actions"></div>
      <div class="inline-editor"></div>
    `;
    glitterList.appendChild(empty);
    return;
  }

  for(const g of mix){
    const chip = document.createElement('div');
    chip.className = 'chip';
    chip.setAttribute('data-id', g.id);
    chip.innerHTML = `
      <div class="chip-header">
        <div class="swatch">${createShapeSwatch(g.shape, g.color)}</div>
        <div class="meta">
          <div class="title">${escapeHtml(g.name)}</div>
          <div class="mini">${g.shape} • ${g.sizeMm.toFixed(1)}mm • density ${g.density}</div>
        </div>
        <div class="actions">
          <button class="duplicate" title="Duplicate" aria-label="Duplicate glitter" data-action="duplicate">
            <div class="copy-icon"></div>
          </button>
          <button class="trash" title="Remove" aria-label="Remove glitter" data-action="remove">🗑️</button>
        </div>
      </div>

      <div class="inline-editor" aria-hidden="true">
        <div class="editor-grid">
          <div class="ed-field">
            <label class="ed-label">Shape</label>
            <div class="shape-buttons" data-shape-group="${g.id}">
              <button class="shape-btn${g.shape==='circle'?' active':''}" data-shape="circle" type="button">
                ${createShapeButton('circle')}
              </button>
              <button class="shape-btn${g.shape==='square'?' active':''}" data-shape="square" type="button">
                ${createShapeButton('square')}
              </button>
              <button class="shape-btn${g.shape==='hex'?' active':''}" data-shape="hex" type="button">
                ${createShapeButton('hex')}
              </button>
            </div>
          </div>
          <div class="ed-field">
            <label class="ed-label" for="size-${g.id}">Size (mm)</label>
            <input id="size-${g.id}" type="range" min="0.3" max="4" step="0.1" value="${g.sizeMm.toFixed(1)}" />
            <div class="legend"><span id="size-val-${g.id}">${g.sizeMm.toFixed(1)} mm</span></div>
          </div>
          <div class="ed-field">
            <label class="ed-label">Color</label>
            <div class="ed-row">
              <input id="color-${g.id}" type="color" value="${g.color}" />
              <input id="colorhex-${g.id}" type="text" value="${g.color}" />
            </div>
          </div>
          <div class="ed-field">
            <label class="ed-label" for="density-${g.id}">Density</label>
            <input id="density-${g.id}" type="range" min="1" max="${densityMax}" step="1" value="${g.density}" />
            <div class="legend"><span id="density-val-${g.id}">${g.density}</span></div>
          </div>
        </div>
      </div>
    `;

    // Smart toggle behavior
    const header = chip.querySelector('.chip-header');
    const editor = chip.querySelector('.inline-editor');
    const title = chip.querySelector('.title');
    
    function toggleEditor() {
      const open = editor.classList.toggle('open');
      editor.setAttribute('aria-hidden', open ? 'false' : 'true');
      chip.classList.toggle('expanded', open);
    }
    
    // Click anywhere on chip when collapsed, or on header when expanded
    chip.addEventListener('click', (e) => {
      // Don't toggle if clicking on interactive elements
      if (e.target.matches('button, input, select, option')) {
        return;
      }
      
      const isExpanded = editor.classList.contains('open');
      
      if (!isExpanded) {
        // Chip is collapsed - clicking anywhere should expand
        toggleEditor();
      } else {
        // Chip is expanded - only clicking on header should collapse
        if (header.contains(e.target)) {
          toggleEditor();
        }
      }
    });

    // Duplicate
    chip.querySelector('[data-action="duplicate"]').onclick = () => {
      const duplicate = {
        id: crypto.randomUUID(),
        name: g.name,
        shape: g.shape,
        sizeMm: g.sizeMm,
        color: g.color,
        density: g.density,
        seed: ++seedCounter
      };
      mix.push(duplicate);
      render();
      refreshList();
    };

    // Remove
    chip.querySelector('[data-action="remove"]').onclick = () => {
      mix = mix.filter(x => x.id !== g.id);
      render();
      // Remove just this chip instead of refreshing entire list
      chip.remove();
      // Only refresh the entire list if no items remain
      if(mix.length === 0) {
        refreshList();
      }
    };

    // Live editing - Shape buttons
    const shapeButtons = chip.querySelectorAll('.shape-btn');
    shapeButtons.forEach(btn => {
      btn.addEventListener('click', () => {
        // Update active state
        shapeButtons.forEach(b => b.classList.remove('active'));
        btn.classList.add('active');
        
        // Update glitter data
        g.shape = btn.dataset.shape;
        g.name = autoName(g.shape, g.sizeMm);
        title.textContent = g.name;
        chip.querySelector('.swatch').innerHTML = createShapeSwatch(g.shape, g.color);
        refreshMiniMeta(chip, g);
        render();
      });
    });

    const sizeInput = chip.querySelector(`#size-${g.id}`);
    const sizeVal = chip.querySelector(`#size-val-${g.id}`);
    sizeInput.addEventListener('input', () => {
      g.sizeMm = Number(sizeInput.value);
      sizeVal.textContent = `${g.sizeMm.toFixed(1)} mm`;
      g.name = autoName(g.shape, g.sizeMm);
      title.textContent = g.name;
      refreshMiniMeta(chip, g);
      render();
    });

    const densityInput = chip.querySelector(`#density-${g.id}`);
    const densityVal = chip.querySelector(`#density-val-${g.id}`);
    densityInput.addEventListener('input', () => {
      g.density = Number(densityInput.value);
      densityVal.textContent = `${g.density}`;
      refreshMiniMeta(chip, g);
      render();
    });

    const colorPicker = chip.querySelector(`#color-${g.id}`);
    const colorHex = chip.querySelector(`#colorhex-${g.id}`);
    colorPicker.addEventListener('input', () => {
      const val = normalizeHex(colorPicker.value);
      colorHex.value = val;
      g.color = val;
      chip.querySelector('.swatch').innerHTML = createShapeSwatch(g.shape, val);
      render();
    });
    colorHex.addEventListener('input', () => {
      const val = normalizeHex(colorHex.value);
      if(/^#([0-9a-f]{6})$/i.test(val)){
        colorPicker.value = val;
        g.color = val;
        chip.querySelector('.swatch').innerHTML = createShapeSwatch(g.shape, val);
        render();
      }
    });

    glitterList.appendChild(chip);
  }
}

function refreshMiniMeta(chip, g){
  chip.querySelector('.meta .mini').textContent =
    `${g.shape} • ${g.sizeMm.toFixed(1)}mm • density ${g.density}`;
}

// Create randomized glitter and expand it
function addRandomGlitter(open=true){
  const shapes = ['circle','square','hex'];
  const shape = shapes[Math.floor(Math.random()*shapes.length)];
  const sizeMm = +(0.5 + Math.random()*3.0).toFixed(1);
  const hue = Math.floor(Math.random()*360);
  const sat = 0.45 + Math.random()*0.4;
  const lig = 0.55 + Math.random()*0.2;
  const color = hslToHex(hue/360, sat, lig);
  const density = 20 + Math.floor(Math.random()*(densityMax-20));
  const g = {
    id: crypto.randomUUID(),
    name: autoName(shape, sizeMm),
    shape, sizeMm, color, density, seed: ++seedCounter
  };
  mix.push(g);
  render();
  refreshList();
  if(open){
    // open the newly added editor
    const chip = glitterList.querySelector(`.chip[data-id="${g.id}"]`);
    if(chip){
      const editor = chip.querySelector('.inline-editor');
      editor.classList.add('open');
      editor.setAttribute('aria-hidden','false');
      chip.scrollIntoView({behavior:'smooth', block:'nearest'});
    }
  }
}

// Actions
addRandomBtn.addEventListener('click', () => addRandomGlitter(true));
clearBtn.addEventListener('click', () => {
  if(confirm('Clear the entire mix?')) {
    mix = [];
    render();
    refreshList();
  }
});
rerollBtn.addEventListener('click', () => {
  mix = mix.map(g => ({...g, seed: (g.seed + Math.floor(Math.random()*1000) + 1)|0}));
  render();
});
exportBtn.addEventListener('click', () => {
  const payload = JSON.stringify({baseColor: nailBase, mix}, null, 2);
  const blob = new Blob([payload], {type:'application/json'});
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = 'glitter-mix.json';
  document.body.appendChild(a);
  a.click();
  a.remove();
  URL.revokeObjectURL(url);
});

importBtn.addEventListener('click', () => {
  const input = document.createElement('input');
  input.type = 'file';
  input.accept = '.json,application/json';
  input.onchange = (e) => {
    const file = e.target.files[0];
    if (!file) return;
    
    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const data = JSON.parse(e.target.result);
        
        // Validate the data structure
        if (!data.mix || !Array.isArray(data.mix)) {
          alert('Invalid JSON format: missing or invalid mix array');
          return;
        }
        
        // Import the mix
        mix = data.mix;
        
        // Import base color if present
        if (data.baseColor) {
          nailBase = normalizeHex(data.baseColor);
          baseColor.value = nailBase;
          baseColorHex.value = nailBase;
        }
        
        // Update the display
        render();
        refreshList();
        
      } catch (error) {
        alert('Error parsing JSON file: ' + error.message);
      }
    };
    reader.readAsText(file);
  };
  input.click();
});
randomizeBtn.addEventListener('click', () => {
  const count = 2 + Math.floor(Math.random()*3); // 2..4
  mix = [];
  for(let i=0;i<count;i++) addRandomGlitter(false);
  // render() and refreshList() already called by each addRandomGlitter()
});

// Base color controls (live)
baseColor.addEventListener('input', () => {
  const val = normalizeHex(baseColor.value);
  baseColorHex.value = val;
  nailBase = val;
  render();
});
baseColorHex.addEventListener('input', () => {
  const val = normalizeHex(baseColorHex.value);
  if(/^#([0-9a-f]{6})$/i.test(val)){
    baseColor.value = val;
    nailBase = val;
    render();
  }
});

// Initialize
nailBase = normalizeHex(baseColor.value);
// Seed with one randomized glitter and open it
addRandomGlitter(true);

// Ensure render on size changes
const ro = new ResizeObserver(() => render());
ro.observe(stage);