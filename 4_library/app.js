const S = {
  scene: 1,
  hotspots: [],
  selected: null,
  nextId: 1,
};

let isDrawing = false, drawStart = {x:0,y:0};
const container = document.getElementById('scene-container');
const img = document.getElementById('scene-img');
const drawSel = document.getElementById('draw-sel');
const wsCanvas = document.getElementById('workspace-particles');
const wsCtx = wsCanvas.getContext('2d');

let previewBlobUrl = null;

function switchScene(n) {
  S.scene = n;
  img.src = 'scene' + n + '.png';
  document.querySelectorAll('.scene-toggle button').forEach((b,i) => b.classList.toggle('active', i+1===n));
  wsParticles = wsParticles.filter(p => p.isAmbient);
}

function getPos(e) {
  const r = container.getBoundingClientRect();
  const cx = e.touches ? e.touches[0].clientX : e.clientX;
  const cy = e.touches ? e.touches[0].clientY : e.clientY;
  return { x: Math.max(0,Math.min(cx-r.left,r.width)), y: Math.max(0,Math.min(cy-r.top,r.height)) };
}

function pct(px,dim){ return (px/dim)*100; }
function px(p,dim){ return (p/100)*dim; }

container.addEventListener('mousedown', e => {
  if (e.target.classList.contains('resize-handle')) return;
  if (e.target.classList.contains('hotspot-box') || e.target.closest('.hotspot-box')) return;
  e.preventDefault();
  isDrawing = true;
  drawStart = getPos(e);
  drawSel.style.cssText = `display:block;left:${drawStart.x}px;top:${drawStart.y}px;width:0;height:0`;
});

document.addEventListener('mousemove', e => {
  if (!isDrawing) return;
  const p = getPos(e);
  const x=Math.min(p.x,drawStart.x), y=Math.min(p.y,drawStart.y);
  const w=Math.abs(p.x-drawStart.x), h=Math.abs(p.y-drawStart.y);
  drawSel.style.left=x+'px'; drawSel.style.top=y+'px';
  drawSel.style.width=w+'px'; drawSel.style.height=h+'px';
});

document.addEventListener('mouseup', e => {
  if (!isDrawing) return;
  isDrawing = false;
  drawSel.style.display = 'none';
  const p = getPos(e);
  const w=Math.abs(p.x-drawStart.x), h=Math.abs(p.y-drawStart.y);
  if (w<8||h<8) return;
  const dw=img.offsetWidth, dh=img.offsetHeight;
  const x=Math.min(p.x,drawStart.x), y=Math.min(p.y,drawStart.y);
  
  const hs = { 
    id:S.nextId++, name:'Hotspot '+S.hotspots.length, type:'book',
    xPct:pct(x,dw), yPct:pct(y,dh), wPct:pct(w,dw), hPct:pct(h,dh),
    message:'', title:'', youtubeEmbed:'', color:'gold',
    pCount: 25, pSize: 2.0, pSpeed: 1.0, pDir: 'up', hScene: 'both', fillOnRead: true
  };
  S.hotspots.push(hs);
  selectHs(hs.id);
  render();
});

function render() {
  document.querySelectorAll('.hotspot-box').forEach(el=>el.remove());
  const dw=img.offsetWidth, dh=img.offsetHeight;
  
  S.hotspots.forEach(hs => {
    if(hs.xPct < 0 || hs.yPct < 0) return;

    if (hs.id === S.selected && hs.hScene && hs.hScene !== 'both' && String(S.scene) !== hs.hScene) {
      switchScene(Number(hs.hScene));
    }

    if (hs.hScene && hs.hScene !== 'both' && String(S.scene) !== hs.hScene) {
      return;
    }

    const el = document.createElement('div');
    el.className = 'hotspot-box'+(hs.id===S.selected?' selected':'')+(hs.type==='bulb'?' bulb':'')+(hs.type==='particles'?' particles':'')+(hs.type==='starter'?' starter':'')+(hs.type==='video'?' video':'');
    el.dataset.id = hs.id;
    el.style.left=px(hs.xPct,dw)+'px'; el.style.top=px(hs.yPct,dh)+'px';
    el.style.width=px(hs.wPct,dw)+'px'; el.style.height=px(hs.hPct,dh)+'px';

    const lbl=document.createElement('div'); lbl.className='hs-label';
    lbl.textContent=(hs.type==='bulb'?'💡 ':hs.type==='particles'?'✨ ':hs.type==='starter'?'⭐ ':hs.type==='video'?'▶ ':'📖 ')+hs.name; el.appendChild(lbl);
    const rh=document.createElement('div'); rh.className='resize-handle'; el.appendChild(rh);

    el.addEventListener('mousedown', ev => {
      ev.stopPropagation();
      if (ev.target.classList.contains('resize-handle')) { startResize(ev,hs); return; }
      startDrag(ev,hs);
      selectHs(hs.id); render(); renderList();
    });
    container.appendChild(el);
  });
  renderList();
}

function startDrag(e,hs) {
  e.preventDefault();
  const dw=img.offsetWidth, dh=img.offsetHeight;
  const sp=getPos(e);
  const ox=px(hs.xPct,dw)-sp.x, oy=px(hs.yPct,dh)-sp.y;
  const mm=ev=>{const p=getPos(ev);hs.xPct=pct(p.x+ox,dw);hs.yPct=pct(p.y+oy,dh);render();};
  const mu=()=>{document.removeEventListener('mousemove',mm);document.removeEventListener('mouseup',mu);};
  document.addEventListener('mousemove',mm); document.addEventListener('mouseup',mu);
}

function startResize(e,hs) {
  e.preventDefault(); e.stopPropagation();
  const dw=img.offsetWidth, dh=img.offsetHeight;
  const mm=ev=>{
    const p=getPos(ev);
    const nw=p.x-px(hs.xPct,dw), nh=p.y-px(hs.yPct,dh);
    if(nw>10) hs.wPct=pct(nw,dw); if(nh>10) hs.hPct=pct(nh,dh); render();
  };
  const mu=()=>{document.removeEventListener('mousemove',mm);document.removeEventListener('mouseup',mu);};
  document.addEventListener('mousemove',mm); document.addEventListener('mouseup',mu);
}

function syncEditorFieldGroups(type) {
  const isBulb = type==='bulb';
  const isParticles = type==='particles';
  const isVideo = type==='video';
  document.getElementById('book-fields-group').style.display = (isBulb||isParticles||isVideo) ? 'none' : 'block';
  document.getElementById('video-fields-group').style.display = isVideo ? 'block' : 'none';
  document.getElementById('interaction-fields-group').style.display = (isBulb || isParticles) ? 'none' : 'block';
  document.getElementById('particle-fields-group').style.display = isBulb ? 'none' : 'block';
  document.getElementById('particle-fx-group').style.display = isParticles ? 'block' : 'none';
  document.getElementById('fg-color-label').textContent = isParticles ? 'Particle color' : 'Glow color';
}

function normalizeYouTubeUrl(url) {
  const raw = String(url || '').trim();
  if (!raw) return '';

  try {
    const parsed = new URL(raw);
    const host = parsed.hostname.replace(/^www\./i, '').toLowerCase();

    if (host === 'youtu.be') {
      const id = parsed.pathname.replace(/^\/+/, '').split('/')[0];
      return id ? `https://www.youtube.com/embed/${id}` : '';
    }

    if (host === 'youtube.com' || host === 'm.youtube.com') {
      if (parsed.pathname.startsWith('/embed/')) {
        const id = parsed.pathname.split('/')[2];
        return id ? `https://www.youtube.com/embed/${id}` : '';
      }

      if (parsed.pathname === '/watch') {
        const id = parsed.searchParams.get('v');
        return id ? `https://www.youtube.com/embed/${id}` : '';
      }

      if (parsed.pathname.startsWith('/shorts/')) {
        const id = parsed.pathname.split('/')[2];
        return id ? `https://www.youtube.com/embed/${id}` : '';
      }
    }
  } catch (err) {
    return '';
  }

  return '';
}

function normalizeGoogleDriveUrl(url) {
  const raw = String(url || '').trim();
  if (!raw) return '';

  try {
    const parsed = new URL(raw);
    const host = parsed.hostname.replace(/^www\./i, '').toLowerCase();
    if (host !== 'drive.google.com' && host !== 'docs.google.com') return '';

    let fileId = '';
    const pathMatch = parsed.pathname.match(/\/file\/d\/([^/]+)/i);
    if (pathMatch && pathMatch[1]) {
      fileId = pathMatch[1];
    } else {
      fileId = parsed.searchParams.get('id') || '';
    }

    if (!fileId) return '';
    return `https://drive.google.com/file/d/${fileId}/preview`;
  } catch (err) {
    return '';
  }
}

function normalizeVideoUrl(url) {
  const raw = String(url || '').trim();
  if (!raw) return '';
  return normalizeYouTubeUrl(raw) || normalizeGoogleDriveUrl(raw) || '';
}

function getVideoProviderLabel(url) {
  const normalized = String(url || '').trim().toLowerCase();
  if (!normalized) return '';
  if (normalized.includes('drive.google.com')) return 'Google Drive';
  if (normalized.includes('youtube.com') || normalized.includes('youtu.be')) return 'YouTube';
  return 'video';
}

function setVideoUrlFeedback(rawValue, embedUrl) {
  const statusEl = document.getElementById('f-video-status');
  if (!statusEl) return;

  const raw = String(rawValue || '').trim();
  if (!raw) {
    statusEl.textContent = 'Paste a YouTube or Google Drive link.';
    statusEl.className = 'input-help';
    return;
  }

  if (embedUrl) {
    statusEl.textContent = `${getVideoProviderLabel(embedUrl)} link detected. Ready to preview.`;
    statusEl.className = 'input-help success';
    return;
  }

  statusEl.textContent = 'This link is not recognized as an embeddable YouTube or Google Drive video.';
  statusEl.className = 'input-help error';
}

function setDriveTestStatus(message, tone = '') {
  const statusEl = document.getElementById('drive-test-status');
  if (!statusEl) return;
  statusEl.textContent = message;
  statusEl.className = `input-help${tone ? ` ${tone}` : ''}`;
}

function videoPlayerSrc(url) {
  const embed = normalizeVideoUrl(url);
  if (!embed) return '';
  if (embed.includes('drive.google.com')) return embed;
  return embed + (embed.includes('?') ? '&' : '?') + 'autoplay=1&rel=0';
}

function openVideoUrl(url, title = 'Video test') {
  const src = videoPlayerSrc(url);
  if (!src) return false;
  const overlayTitle = document.getElementById('video-title-bar');
  const overlayFrame = document.getElementById('video-frame');
  const overlay = document.getElementById('video-overlay');

  if (overlayTitle && overlayFrame && overlay) {
    overlayTitle.textContent = title;
    overlayFrame.src = src;
    overlay.classList.add('open');
    videoOpen = true;
    return true;
  }

  const modal = document.getElementById('preview-modal');
  const frame = document.getElementById('preview-frame');
  const titleEl = document.querySelector('.preview-title');
  if (modal && frame) {
    if (titleEl) titleEl.textContent = title;
    frame.src = src;
    modal.classList.add('open');
    modal.setAttribute('aria-hidden', 'false');
    return true;
  }

  return false;
}

function runDriveLinkTest() {
  const input = document.getElementById('drive-test-input');
  const raw = String(input?.value || '').trim();
  const embedUrl = normalizeGoogleDriveUrl(raw);

  if (!raw) {
    setDriveTestStatus('Paste a Google Drive file link first.', 'error');
    return;
  }

  if (!embedUrl) {
    setDriveTestStatus('That Google Drive link could not be converted into an embeddable preview URL.', 'error');
    return;
  }

  const opened = openVideoUrl(embedUrl, 'Google Drive test');
  setDriveTestStatus(
    opened
      ? 'Google Drive preview opened in the player.'
      : 'The link was recognized, but the player could not be opened.',
    opened ? 'success' : 'error'
  );
}

function normalizeHotspot(hs, fallbackId) {
  const fallbackScene = ['1', '2', 'both'].includes(String(hs?.hScene)) ? String(hs.hScene) : 'both';
  const safeId = Number.isFinite(Number(hs?.id)) ? Number(hs.id) : fallbackId;
  const rawYoutube = typeof hs?.youtubeEmbed === 'string' ? hs.youtubeEmbed.trim() : '';
  const normalizedYoutube = normalizeVideoUrl(rawYoutube);
  return {
    id: safeId,
    name: hs?.name || `Hotspot ${safeId}`,
    type: hs?.type || 'book',
    xPct: Number.isFinite(Number(hs?.xPct)) ? Number(hs.xPct) : 0,
    yPct: Number.isFinite(Number(hs?.yPct)) ? Number(hs.yPct) : 0,
    wPct: Number.isFinite(Number(hs?.wPct)) ? Number(hs.wPct) : 8,
    hPct: Number.isFinite(Number(hs?.hPct)) ? Number(hs.hPct) : 8,
    message: typeof hs?.message === 'string' ? hs.message : '',
    title: typeof hs?.title === 'string' ? hs.title : '',
    youtubeEmbed: normalizedYoutube || rawYoutube,
    color: ['gold', 'purple', 'teal', 'rose'].includes(hs?.color) ? hs.color : 'gold',
    pCount: Number.isFinite(Number(hs?.pCount)) ? Number(hs.pCount) : 25,
    pSize: Number.isFinite(Number(hs?.pSize)) ? Number(hs.pSize) : 2.0,
    pSpeed: Number.isFinite(Number(hs?.pSpeed)) ? Number(hs.pSpeed) : 1.0,
    pDir: hs?.pDir || 'up',
    hScene: fallbackScene,
    fillOnRead: hs?.fillOnRead !== false
  };
}

function normalizeProjectData(data) {
  const hotspots = Array.isArray(data?.hotspots)
    ? data.hotspots.map((hs, index) => normalizeHotspot(hs, index + 1))
    : [];
  const maxId = hotspots.reduce((max, hs) => Math.max(max, hs.id), 0);
  return {
    hotspots,
    nextId: Math.max(Number(data?.nextId) || 0, maxId + 1)
  };
}

function selectHs(id) {
  S.selected=id;
  const hs=S.hotspots.find(h=>h.id===id); if(!hs) return;
  const panel=document.getElementById('editor-panel'); panel.classList.add('visible');
  document.getElementById('f-name').value=hs.name;
  document.getElementById('f-type').value=hs.type;
  document.getElementById('f-title').value=hs.title;
  document.getElementById('f-msg').value=hs.message;
  document.getElementById('f-youtube').value=hs.youtubeEmbed || '';
  document.getElementById('f-color').value=hs.color;
  document.getElementById('f-hScene').value=hs.hScene || 'both';
  document.getElementById('f-fillOnRead').checked = hs.fillOnRead !== false;
  
  const pc = hs.pCount !== undefined ? hs.pCount : 25;
  const ps = hs.pSize !== undefined ? hs.pSize : 2.0;
  const psp = hs.pSpeed !== undefined ? hs.pSpeed : 1.0;
  
  document.getElementById('f-pCount').value = pc;
  document.getElementById('v-pCount').textContent = pc;
  document.getElementById('f-pSize').value = ps;
  document.getElementById('v-pSize').textContent = Number(ps).toFixed(1);
  document.getElementById('f-pSpeed').value = psp;
  document.getElementById('v-pSpeed').textContent = Number(psp).toFixed(1);
  document.getElementById('f-pDir').value = hs.pDir || 'up';
  syncEditorFieldGroups(hs.type);
  setVideoUrlFeedback(hs.youtubeEmbed || '', normalizeVideoUrl(hs.youtubeEmbed || ''));
}

function upd(field,val) {
  const hs=S.hotspots.find(h=>h.id===S.selected); if(!hs) return;
  hs[field]=val;
  if(field==='type'){
    syncEditorFieldGroups(val);
  }
  render();
}

function updChecked(field,val) {
  const hs=S.hotspots.find(h=>h.id===S.selected); if(!hs) return;
  hs[field]=Boolean(val);
  render();
}

function updYoutube(val) {
  const raw = String(val || '').trim();
  const embedUrl = normalizeVideoUrl(raw);
  const storedValue = embedUrl || raw;
  upd('youtubeEmbed', storedValue);
  setVideoUrlFeedback(raw, embedUrl);
  if (embedUrl && document.activeElement !== document.getElementById('f-youtube')) {
    document.getElementById('f-youtube').value = embedUrl;
  }
}

function syncSelectedVideoField() {
  const hs=S.hotspots.find(h=>h.id===S.selected);
  if(!hs || hs.type!=='video') return;
  updYoutube(document.getElementById('f-youtube').value);
}

function updNum(field,val) {
  const hs=S.hotspots.find(h=>h.id===S.selected); if(!hs) return;
  hs[field]=parseFloat(val);
}

function deleteSelected() {
  S.hotspots=S.hotspots.filter(h=>h.id!==S.selected); S.selected=null;
  document.getElementById('editor-panel').classList.remove('visible'); render();
}

function insertPageBreak() {
  const ta=document.getElementById('f-msg');
  const marker='\n---next---\n';
  const start=ta.selectionStart, end=ta.selectionEnd;
  ta.value=ta.value.slice(0,start)+marker+ta.value.slice(end);
  ta.selectionStart=ta.selectionEnd=start+marker.length;
  ta.focus();
  upd('message', ta.value);
}

function insertImagePageMarker(dataUrl) {
  const ta=document.getElementById('f-msg');
  const marker='\n---next---\n';
  const imgMarker=`[[img:${dataUrl}]]`;
  const insert = `${marker}${imgMarker}${marker}`;
  const start=ta.selectionStart, end=ta.selectionEnd;
  ta.value=ta.value.slice(0,start)+insert+ta.value.slice(end);
  const cursor = start + insert.length;
  ta.selectionStart=ta.selectionEnd=cursor;
  ta.focus();
  upd('message', ta.value);
}

function resizeImageToDataUrl(file, maxW = 550, maxH = 800) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onerror = () => reject(reader.error || new Error('Failed to read image'));
    reader.onload = () => {
      const im = new Image();
      im.onerror = () => reject(new Error('Failed to decode image'));
      im.onload = () => {
        const scale = Math.min(1, maxW / im.width, maxH / im.height);
        const w = Math.max(1, Math.round(im.width * scale));
        const h = Math.max(1, Math.round(im.height * scale));
        const c = document.createElement('canvas');
        c.width = w; c.height = h;
        const cx = c.getContext('2d');
        cx.drawImage(im, 0, 0, w, h);
        const outType = file.type === 'image/png' ? 'image/png' : 'image/jpeg';
        const out = outType === 'image/jpeg'
          ? c.toDataURL(outType, 0.9)
          : c.toDataURL(outType);
        resolve(out);
      };
      im.src = String(reader.result);
    };
    reader.readAsDataURL(file);
  });
}

async function handleImageUpload(input) {
  const file = input.files && input.files[0];
  if (!file) return;
  try {
    const dataUrl = await resizeImageToDataUrl(file);
    insertImagePageMarker(dataUrl);
  } catch (e) {
    console.error(e);
  } finally {
    input.value = '';
  }
}

document.addEventListener('keydown', e=>{
  if((e.key==='Delete'||e.key==='Backspace')&&S.selected!==null&&document.activeElement.tagName!=='INPUT'&&document.activeElement.tagName!=='TEXTAREA') deleteSelected();
  if(e.key==='Escape' && document.getElementById('preview-modal')?.classList.contains('open')) closePreview();
});

function renderList() {
  const list=document.getElementById('hs-list');
  document.getElementById('hs-count').textContent=S.hotspots.length;
  if(!S.hotspots.length){list.innerHTML='<div class="none-msg">Drag on the image<br>to place a hotspot</div>';return;}
  list.innerHTML=S.hotspots.map(hs=>`
    <div class="hs-item${hs.id===S.selected?' selected':''}" onclick="selectHs(${hs.id});render()">
      <div class="hs-item-name">${hs.type==='bulb'?'💡':hs.type==='particles'?'✨':hs.type==='starter'?'⭐':hs.type==='video'?'▶':'📖'} ${hs.name}</div>
      <div class="hs-item-sub">${hs.type==='bulb'?'Scene switch':hs.type==='particles'?'Visual only':hs.type==='starter'?'Starter Box Sequence':hs.type==='video'?'Video player':hs.title||'untitled'} (${hs.hScene==='both'?'Global': hs.hScene==='1'?'S1':'S2'})</div>
    </div>`).join('');
}

let wsParticles = [];
function resizeWorkspaceCanvas() {
  wsCanvas.width = img.offsetWidth || 100;
  wsCanvas.height = img.offsetHeight || 100;
}
window.addEventListener('resize', () => { resizeWorkspaceCanvas(); render(); });
img.addEventListener('load', resizeWorkspaceCanvas);
setTimeout(resizeWorkspaceCanvas, 300);

const colorFXMap = {
  gold: 'rgba(235, 200, 110, ',
  purple: 'rgba(175, 130, 240, ',
  teal: 'rgba(90, 210, 185, ',
  rose: 'rgba(240, 120, 155, '
};

function dirToVelocity(dir, speed) {
  const s = speed || 1.0;
  const drift = () => (Math.random() * 0.15 - 0.075) * s;
  const base  = () => (Math.random() * 0.25 + 0.15) * s;
  switch(dir) {
    case 'down':       return { sx: drift(),  sy:  base() };
    case 'left':       return { sx: -base(),  sy:  drift() };
    case 'right':      return { sx:  base(),  sy:  drift() };
    case 'up-left':    return { sx: -base(),  sy: -base() };
    case 'up-right':   return { sx:  base(),  sy: -base() };
    case 'down-left':  return { sx: -base(),  sy:  base() };
    case 'down-right': return { sx:  base(),  sy:  base() };
    default:           return { sx: drift(),  sy: -base() };
  }
}

function processLiveParticles() {
  wsCtx.clearRect(0, 0, wsCanvas.width, wsCanvas.height);
  const W = wsCanvas.width;
  const H = wsCanvas.height;
  if(W === 0 || H === 0) { requestAnimationFrame(processLiveParticles); return; }

  let ambientBaseColor = S.scene === 1 ? 'rgba(165, 140, 230, ' : 'rgba(235, 210, 160, ';
  let ambientMax = S.scene === 1 ? 25 : 35;
  
  while(wsParticles.filter(p => p.isAmbient).length < ambientMax) {
    wsParticles.push({
      isAmbient: true,
      x: Math.random() * W,
      y: Math.random() * H,
      r: Math.random() * 1.5 + 0.4,
      sx: Math.random() * 0.2 - 0.1,
      sy: S.scene === 1 ? (Math.random() * -0.15 - 0.02) : (Math.random() * -0.25 - 0.05),
      op: Math.random() * 0.3 + 0.1,
      a: Math.random() * Math.PI
    });
  }

  S.hotspots.forEach(hs => {
    if(hs.type !== 'particles') return;
    const sceneFilter = hs.hScene || 'both';
    if(sceneFilter !== 'both' && String(S.scene) !== sceneFilter) return;

    const hX = px(hs.xPct, W), hY = px(hs.yPct, H);
    const hW = px(hs.wPct, W), hH = px(hs.hPct, H);
    
    const countGoal = hs.pCount !== undefined ? hs.pCount : 25;
    const activeCluster = wsParticles.filter(p => p.hsId === hs.id);
    
    if(activeCluster.length < countGoal && hW > 5 && hH > 5) {
      const vel = dirToVelocity(hs.pDir || 'up', hs.pSpeed || 1.0);
      wsParticles.push({
        hsId: hs.id,
        x: hX + Math.random() * hW,
        y: hY + Math.random() * hH,
        r: Math.random() * (hs.pSize || 2.0) * 0.6 + 0.3,
        sx: vel.sx,
        sy: vel.sy,
        op: Math.random() * 0.5 + 0.2,
        a: Math.random() * Math.PI,
        colorBase: colorFXMap[hs.color] || colorFXMap.gold
      });
    }
  });

  wsParticles = wsParticles.filter(p => {
    p.a += 0.015;
    const currentOp = p.op + Math.sin(p.a) * 0.1;
    
    if(p.isAmbient) {
      p.x += p.sx; p.y += p.sy;
      if(p.y < 0) p.y = H;
      if(p.x < 0 || p.x > W) p.x = Math.random() * W;
      
      wsCtx.beginPath();
      wsCtx.arc(p.x, p.y, p.r, 0, Math.PI * 2);
      wsCtx.fillStyle = ambientBaseColor + Math.max(0.02, Math.min(currentOp, 0.5)) + ')';
      wsCtx.fill();
      return true;
    } else {
      const parent = S.hotspots.find(h => h.id === p.hsId);
      if(!parent || parent.type !== 'particles') return false;

      const sf = parent.hScene || 'both';
      if(sf !== 'both' && String(S.scene) !== sf) return false;
      
      p.x += p.sx; p.y += p.sy;
      
      const pX = px(parent.xPct, W), pY = px(parent.yPct, H);
      const pW = px(parent.wPct, W), pH = px(parent.hPct, H);
      
      if(p.x < pX || p.x > pX + pW || p.y < pY - pH*0.5 || p.y > pY + pH) {
        if(Math.random() > 0.1) {
          const dir = parent.pDir || 'up';
          if(dir === 'up' || dir === 'up-left' || dir === 'up-right') {
            p.x = pX + Math.random() * pW; p.y = pY + pH;
          } else if(dir === 'down' || dir === 'down-left' || dir === 'down-right') {
            p.x = pX + Math.random() * pW; p.y = pY;
          } else if(dir === 'left') {
            p.x = pX + pW; p.y = pY + Math.random() * pH;
          } else if(dir === 'right') {
            p.x = pX; p.y = pY + Math.random() * pH;
          } else {
            p.x = pX + Math.random() * pW; p.y = pY + pH;
          }
          const vel = dirToVelocity(dir, parent.pSpeed || 1.0);
          p.sx = vel.sx; p.sy = vel.sy;
          p.r = Math.random() * (parent.pSize || 2.0) * 0.6 + 0.3;
        } else {
          return false;
        }
      }
      
      wsCtx.beginPath();
      wsCtx.arc(p.x, p.y, p.r, 0, Math.PI * 2);
      wsCtx.fillStyle = (colorFXMap[parent.color] || colorFXMap.gold) + Math.max(0.02, Math.min(currentOp, 0.7)) + ')';
      wsCtx.fill();
      return true;
    }
  });

  requestAnimationFrame(processLiveParticles);
}
requestAnimationFrame(processLiveParticles);

function handleImport(input) {
  const file = input.files[0];
  if (!file) return;

  const reader = new FileReader();
  reader.onload = function(e) {
    const fileContent = e.target.result;
    const parser = new DOMParser();
    const doc = parser.parseFromString(fileContent, 'text/html');
    const manifestElement = doc.getElementById('project-manifest');

    if (!manifestElement) {
      alert("Error: This HTML file doesn't have an editor save manifest. Make sure to load a site.html generated by this editor.");
      return;
    }

    try {
      const rawData = JSON.parse(manifestElement.textContent);
      if (rawData && Array.isArray(rawData.hotspots)) {
        const data = normalizeProjectData(rawData);
        S.hotspots = data.hotspots;
        S.nextId = data.nextId;
        S.selected = null;
        
        document.getElementById('editor-panel').classList.remove('visible');
        switchScene(1);
        render();
        alert(`Successfully imported project! ${S.hotspots.length} hotspots restored.`);
      } else {
        alert("Manifest parsing error: Project data formatting mismatch.");
      }
    } catch(err) {
      alert("Failed to load project manifest structure: " + err.message);
    }
  };
  
  reader.readAsText(file);
  input.value = '';
}

function buildSiteHtml() {
  syncSelectedVideoField();
  S.hotspots = S.hotspots.map((hs, index) => normalizeHotspot(hs, index + 1));
  const colorMap = {
    gold:   { glow:'rgba(201,169,110,0.5)', border:'#c9a96e', grad:'rgba(201,169,110,0.18)' },
    purple: { glow:'rgba(150,100,220,0.5)', border:'#9664dc', grad:'rgba(150,100,220,0.18)' },
    teal:   { glow:'rgba(80,180,160,0.5)',  border:'#50b4a0', grad:'rgba(80,180,160,0.18)' },
    rose:   { glow:'rgba(220,100,130,0.5)', border:'#dc6482', grad:'rgba(220,100,130,0.18)' },
  };

  return `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<title>Cozy Library</title>
<script src="https://unpkg.com/page-flip@2.0.7/dist/js/page-flip.browser.js"><\/script>
<script src="https://cdnjs.cloudflare.com/ajax/libs/typed.js/2.1.0/typed.umd.js"><\/script>
<style>
*{box-sizing:border-box;margin:0;padding:0}
html,body{width:100%;height:100%;overflow:hidden;background:#000}
#wrap{width:100vw;height:100vh;display:flex;align-items:center;justify-content:center}
#stage{position:relative;line-height:0;max-width:100vw;max-height:100vh}

@keyframes ambientBreathe {
  0%, 100% { filter: brightness(1) contrast(1); }
  50% { filter: brightness(1.04) contrast(0.98); }
}

.sc{display:block;width:100vw;height:100vh;object-fit:fill;transition:opacity 1s ease;animation:ambientBreathe 7s ease-in-out infinite}
#s2{position:absolute;top:0;left:0;width:100%;height:100%;object-fit:fill;opacity:0}
#particles-canvas{position:absolute;inset:0;width:100%;height:100%;pointer-events:none;z-index:5}
#hots{position:absolute;inset:0;z-index:10}
.hs{position:absolute;cursor:pointer;border:2px solid transparent;background:transparent;transition:opacity 0.5s ease, visibility 0.5s ease, background-color 0.4s ease;}

@keyframes hsGlowPulse{0%,100%{opacity:.18}50%{opacity:.92}}
.hs-glow{position:absolute;inset:0;border-radius:5px;pointer-events:none;border:2px solid;animation:hsGlowPulse 2.8s ease-in-out infinite}
.hs:hover .hs-glow{opacity:1;animation:none}
.hs.is-read{
  background:var(--read-fill, transparent);
  border-color:var(--read-border, transparent);
  box-shadow:0 0 22px var(--read-shadow, transparent), inset 0 0 18px var(--read-shadow, transparent);
}

@keyframes bulbPulse{0%,100%{opacity:.22;box-shadow:0 0 10px rgba(255,200,50,.2);border-color:rgba(255,224,130,.2)}50%{opacity:.9;box-shadow:0 0 28px rgba(255,200,50,.55),0 0 48px rgba(255,200,50,.2);border-color:rgba(255,224,130,.65)}}
.hs[data-type=bulb]{border-radius:50%;border:2px solid transparent;animation:bulbPulse 2.8s ease-in-out infinite}
.hs[data-type=bulb]:hover{background:rgba(255,224,130,0.12);border-color:rgba(255,224,130,0.6);box-shadow:0 0 30px rgba(255,200,50,0.5),0 0 60px rgba(255,200,50,0.2);animation:none;opacity:1}

@keyframes starterPulse {
  0%,100%{box-shadow: 0 0 15px rgba(255,183,178,0.3); border-color: rgba(255,183,178,0.4); background: rgba(255,183,178,0.02);}
  50%{box-shadow: 0 0 30px rgba(255,183,178,0.85); border-color: rgba(255,183,178,1); background: rgba(255,183,178,0.12);}
}
.hs[data-type=starter]{animation: starterPulse 2s infinite ease-in-out; z-index: 120; border: 2px solid;}

.hs[data-type=particles]{border:none!important;background:transparent!important;cursor:default;pointer-events:none}

.hidden-element { opacity: 0 !important; pointer-events: none !important; visibility: hidden !important; }

.intro-text-container {
  position: absolute;
  top: 15%;
  left: 50%;
  transform: translateX(-50%);
  z-index: 150;
  text-align: center;
  width: 80%;
  max-width: 800px;
  pointer-events: none;
}
.intro-typewriter-text {
  font-family: 'Courier New', Courier, monospace;
  font-size: 1.8rem;
  font-weight: bold;
  display: inline-block;
  white-space: normal;
  word-wrap: break-word;
  color: #e8bbff;
  text-shadow: 0 0 8px rgba(232, 187, 255, 0.6);
}

.flash{position:fixed;inset:0;background:#fff;opacity:0;pointer-events:none;z-index:200}

#overlay{
  position:fixed;inset:0;
  background:rgba(4,2,10,0.88);
  display:flex;flex-direction:column;
  align-items:center;justify-content:center;
  z-index:100;
  opacity:0;pointer-events:none;
  transition:opacity 0.4s ease;
  backdrop-filter:blur(12px) saturate(0.7);
}
#overlay.open{opacity:1;pointer-events:all}

#book-close-bar{
  display:flex;align-items:center;justify-content:space-between;
  width:min(760px,92vw);
  padding:0 4px 10px;
  flex-shrink:0;
}
#book-title-bar{
  font-family:'Georgia',serif;font-size:15px;
  color:#c9a96e;font-style:italic;letter-spacing:0.05em;
}
.close-btn{
  background:transparent;border:1px solid #cbb88a;
  border-radius:50%;width:28px;height:28px;cursor:pointer;
  color:#9a7a4a;font-size:13px;
  display:flex;align-items:center;justify-content:center;
  transition:all 0.2s;font-family:inherit;
}
.close-btn:hover{background:rgba(201,169,110,0.15);color:#5a3a10;border-color:#9a7040;}

#book-mount{
  width:min(760px,92vw);
  height:min(500px,78vh);
  flex-shrink:0;
  position:relative;
}

.spf-page{
  display:flex;flex-direction:column;
  height:100%;width:100%;
  overflow:hidden;
  background:#fff;
}
.spf-page.cover{
  background:linear-gradient(162deg,#1e0f08 0%,#3e2214 30%,#2c1710 60%,#1a0c06 100%);
  border:1px solid rgba(90,52,24,0.7);
  display:flex;flex-direction:column;align-items:center;justify-content:center;
  position:relative;overflow:hidden;
}
.spf-page.cover::before{
  content:'';position:absolute;inset:0;
  background:url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='180' height='180'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.65' numOctaves='5' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='180' height='180' filter='url(%23n)' opacity='0.055'/%3E%3C/svg%3E");
  pointer-events:none;
}
.spf-page.cover::after{
  content:'';position:absolute;
  inset:14px;
  border:1px solid rgba(201,169,110,0.3);
  border-radius:4px;pointer-events:none;
}
.cover-title{
  font-family:'Georgia',serif;
  font-size:clamp(15px,3vw,22px);
  color:#c9a96e;
  text-align:center;padding:0 32px;
  text-shadow:0 2px 10px rgba(0,0,0,0.7),0 0 28px rgba(201,169,110,0.4);
  letter-spacing:0.07em;line-height:1.5;
  position:relative;z-index:1;
}
.cover-orn{
  color:rgba(138,96,64,0.9);font-size:24px;
  margin:10px 0;position:relative;z-index:1;
  text-shadow:0 1px 6px rgba(0,0,0,0.5);
}
.spf-page.paper{
  background:#fff;
}
.page-head{
  padding:16px 22px 10px;
  border-bottom:1px solid #e8e8e8;
  flex-shrink:0;background:#fff;
}
.page-head-title{
  font-family:'Georgia',serif;font-size:13px;
  color:#333;letter-spacing:0.04em;font-style:italic;
}
.page-body{flex:1;padding:24px 24px 16px;overflow-y:auto;background:#fff;background-image:repeating-linear-gradient(transparent,transparent 29px,#e8e8e8 29px,#e8e8e8 30px);background-size:100% 30px;background-attachment:local;}
.page-body.blank{background:#fff;background-image:none}
.page-body.image{padding:0;background:#fff;background-image:none;display:flex;align-items:center;justify-content:center;overflow:hidden;width:100%;height:100%;}
.page-body.image img{width:100vh;height:100vw;max-width:100%;max-height:100%;object-fit:contain;display:block;transform: rotate(0deg);}
.page-body.video{padding:18px;background:#111;background-image:none;display:flex;align-items:center;justify-content:center}
.video-frame-wrap{width:100%;aspect-ratio:16/9;max-height:100%;border:1px solid rgba(201,169,110,0.22);border-radius:10px;overflow:hidden;box-shadow:0 12px 30px rgba(0,0,0,0.28)}
.video-frame-wrap iframe{width:100%;height:100%;border:0;display:block;background:#000}
.typed-target{font-family:'Segoe Print','Arial Black',sans-serif;font-weight:bold;font-size:14px;color:#1a1a1a;line-height:30px;padding-top:14px;white-space:pre-wrap;word-wrap:break-word;overflow-wrap:break-word;min-height:120px;width:100%;}
.typed-cursor{color:#666;font-weight:300}
.page-foot{
  padding:7px 18px;
  border-top:1px solid #e8e8e8;
  text-align:center;font-size:10px;
  color:#aaa;font-style:italic;
  font-family:'Georgia',serif;flex-shrink:0;background:#fff;
}
#book-nav{
  display:flex;align-items:center;gap:14px;
  padding:10px 4px 0;
  font-family:'Georgia',serif;font-size:12px;color:#5a4a7a;
  flex-shrink:0;
}
#book-nav button{
  background:#1a1720;border:1px solid #3a3050;color:#c9a96e;
  padding:5px 14px;border-radius:6px;cursor:pointer;font-family:inherit;font-size:12px;
  transition:all 0.2s;
}
#book-nav button:hover{background:#2a2535;border-color:#7a60b0;}
#page-indicator{color:#7a6a9a;}

#video-overlay{
  position:fixed;inset:0;
  background:rgba(92,92,92,0.82);
  display:flex;flex-direction:column;
  align-items:center;justify-content:center;
  z-index:110;
  opacity:0;pointer-events:none;
  transition:opacity 0.28s ease;
  backdrop-filter:blur(8px);
}
#video-overlay.open{opacity:1;pointer-events:all}
#video-close-bar{
  display:flex;align-items:center;justify-content:space-between;
  width:min(820px,78vw);
  padding:0 4px 10px;
}
#video-title-bar{
  font-family:'Georgia',serif;font-size:15px;
  color:#c9a96e;font-style:italic;letter-spacing:0.05em;
}
#video-shell{
  width:min(820px,78vw);
  aspect-ratio:16/9;
  max-width:calc(100vw - 48px);
  max-height:min(68vh,620px);
  background:#000;
  border-radius:16px;
  overflow:hidden;
  box-shadow:0 30px 80px rgba(0,0,0,0.42);
  position:relative;
}
#video-shell:fullscreen{
  width:100vw;
  max-width:none;
  max-height:none;
  height:100vh;
  border-radius:0;
}
#video-frame{width:100%;height:100%;border:0;background:#000;display:block}
#video-controls{
  position:absolute;
  right:14px;
  bottom:14px;
  display:flex;
  gap:10px;
  z-index:2;
}
.video-action-btn {
  display: none; /* <--- Add this line */
  
  background: rgba(18, 18, 18, 0.72);
  border: 1px solid rgba(255, 255, 255, 0.2);
  color: #f3f3f3;
  padding: 8px 14px;
  border-radius: 999px;
  cursor: pointer;
  font-family: inherit;
  font-size: 12px;
  line-height: 1;
  backdrop-filter: blur(8px);
  transition: background 0.2s ease, border-color 0.2s ease, transform 0.2s ease;
}
.video-action-btn:hover{
  background:rgba(32,32,32,0.88);
  border-color:rgba(255,255,255,0.38);
  transform:translateY(-1px);
}
</style>
</head>
<body>
<div id="wrap">
  <div id="stage">
    <img class="sc" id="s1" src="scene1.png" alt="">
    <img class="sc" id="s2" src="scene2.png" alt="">
    <canvas id="particles-canvas"></canvas>
    <div id="hots"></div>
  </div>
</div>

<div class="intro-text-container">
  <div id="introTextElement" class="intro-typewriter-text"></div>
</div>

<div id="overlay">
  <div id="book-close-bar">
    <span id="book-title-bar">Cozy Library</span>
    <button class="close-btn" id="close-btn-top" title="Close (Esc)">✕</button>
  </div>
  <div id="book-mount"></div>
  <div id="book-nav">
    <button id="btn-prev">◀ Prev</button>
    <span id="page-indicator">Cover</span>
    <button id="btn-next">Next ▶</button>
  </div>
</div>
<div id="video-overlay">
  <div id="video-close-bar">
    <span id="video-title-bar">YouTube Video</span>
    <button class="close-btn" id="close-btn-video" title="Close (Esc)">✕</button>
  </div>
  <div id="video-shell">
    <iframe id="video-frame" title="YouTube video player" allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share" allowfullscreen referrerpolicy="strict-origin-when-cross-origin"></iframe>
    <div id="video-controls">
      <button class="video-action-btn" id="btn-video-fullscreen" type="button">Full screen</button>
      <button class="video-action-btn" id="btn-video-close" type="button">Close</button>
    </div>
  </div>
</div>
<div class="flash" id="flash"></div>

<script>
const hotspots=${JSON.stringify(S.hotspots)}.map((hs, index) => normalizeHotspot(hs, index + 1));
const CM=${JSON.stringify(colorMap)};
let curScene=1, typed=null, pageFlip=null, bookOpen=false, videoOpen=false;
let writingChunks=[], writePtr=0, typingActive=false, currentTypingChunk=-1;
const typedChunks=new Set();
const completedText=new Map();

let hasStarterBox = hotspots.some(h => h.type === 'starter');
let sequenceState = hasStarterBox ? "intro-typing" : "active-exploration"; 

function normalizeHotspot(hs, fallbackId) {
  const fallbackScene = ['1', '2', 'both'].includes(String(hs && hs.hScene)) ? String(hs.hScene) : 'both';
  const safeId = Number.isFinite(Number(hs && hs.id)) ? Number(hs.id) : fallbackId;
  const rawYoutube = hs && typeof hs.youtubeEmbed === 'string' ? hs.youtubeEmbed.trim() : '';
  const normalizedYoutube = normalizeVideoUrl(rawYoutube);
  return {
    ...hs,
    id: safeId,
    name: hs && hs.name ? hs.name : 'Hotspot ' + safeId,
    type: hs && hs.type ? hs.type : 'book',
    message: hs && typeof hs.message === 'string' ? hs.message : '',
    title: hs && typeof hs.title === 'string' ? hs.title : '',
    youtubeEmbed: normalizedYoutube || rawYoutube,
    color: hs && hs.color ? hs.color : 'gold',
    hScene: fallbackScene,
    fillOnRead: !hs || hs.fillOnRead !== false
  };
}

function normalizeYouTubeUrl(url) {
  const raw = String(url || '').trim();
  if (!raw) return '';

  try {
    const parsed = new URL(raw);
    const host = parsed.hostname.replace(/^www\\./i, '').toLowerCase();

    if (host === 'youtu.be') {
      const id = parsed.pathname.replace(/^\\/+/, '').split('/')[0];
      return id ? 'https://www.youtube.com/embed/' + id : '';
    }

    if (host === 'youtube.com' || host === 'm.youtube.com') {
      if (parsed.pathname.startsWith('/embed/')) {
        const id = parsed.pathname.split('/')[2];
        return id ? 'https://www.youtube.com/embed/' + id : '';
      }

      if (parsed.pathname === '/watch') {
        const id = parsed.searchParams.get('v');
        return id ? 'https://www.youtube.com/embed/' + id : '';
      }

      if (parsed.pathname.startsWith('/shorts/')) {
        const id = parsed.pathname.split('/')[2];
        return id ? 'https://www.youtube.com/embed/' + id : '';
      }
    }
  } catch (err) {
    return '';
  }

  return '';
}

function normalizeGoogleDriveUrl(url) {
  const raw = String(url || '').trim();
  if (!raw) return '';

  try {
    const parsed = new URL(raw);
    const host = parsed.hostname.replace(/^www\\./i, '').toLowerCase();
    if (host !== 'drive.google.com' && host !== 'docs.google.com') return '';

    let fileId = '';
    const pathMatch = parsed.pathname.match(/\\/file\\/d\\/([^/]+)/i);
    if (pathMatch && pathMatch[1]) {
      fileId = pathMatch[1];
    } else {
      fileId = parsed.searchParams.get('id') || '';
    }

    if (!fileId) return '';
    return 'https://drive.google.com/file/d/' + fileId + '/preview';
  } catch (err) {
    return '';
  }
}

function normalizeVideoUrl(url) {
  const raw = String(url || '').trim();
  if (!raw) return '';
  return normalizeYouTubeUrl(raw) || normalizeGoogleDriveUrl(raw) || '';
}

function videoPlayerSrc(url) {
  const embed = normalizeVideoUrl(url);
  if (!embed) return '';
  if (embed.includes('drive.google.com')) return embed;
  return embed + (embed.includes('?') ? '&' : '?') + 'autoplay=1&rel=0';
}

function openVideoUrl(url, title) {
  const src = videoPlayerSrc(url);
  if(!src) return false;
  document.getElementById('video-title-bar').textContent = title || 'Video';
  document.getElementById('video-frame').src = src;
  document.getElementById('video-overlay').classList.add('open');
  videoOpen = true;
  return true;
}

function markHotspotRead(el, hs) {
  if (!el || hs.fillOnRead === false || hs.type === 'bulb' || hs.type === 'particles') return;
  const c = CM[hs.color] || CM.gold;
  el.classList.add('is-read');
  el.style.setProperty('--read-fill', c.grad);
  el.style.setProperty('--read-border', c.border);
  el.style.setProperty('--read-shadow', c.glow);
}

function updateHotspotVisibility() {
  document.querySelectorAll('.hs').forEach(el => {
    const hScene = el.dataset.hscene || 'both';
    const hsType = el.dataset.type;
    
    let shouldShow = true;
    if (hScene !== 'both' && String(curScene) !== hScene) {
      shouldShow = false;
    }
    if (hasStarterBox && sequenceState !== "active-exploration" && hsType !== 'starter') {
      shouldShow = false;
    }

    if (shouldShow) {
      el.classList.remove('hidden-element');
    } else {
      el.classList.add('hidden-element');
    }
  });
}

function parseWriting(message){
  const chunks=(message||'').split(/\\n---next---\\n/i).map(s=>s.trim()).filter(Boolean);
  return chunks.length?chunks:['This page is empty...'];
}

function isImgChunk(chunk){
  const s=(chunk||'').trim();
  return s.startsWith('[[img:') && s.endsWith(']]');
}
function imgSrc(chunk){
  const s=(chunk||'').trim();
  return s.slice(6, -2).trim();
}
function isYoutubeChunk(chunk){
  const s=(chunk||'').trim();
  return s.startsWith('[[youtube:') && s.endsWith(']]');
}
function youtubeSrc(chunk){
  const s=(chunk||'').trim();
  return normalizeVideoUrl(s.slice(10, -2).trim());
}

function build(){
  const hots=document.getElementById('hots'); hots.innerHTML='';
  hotspots.forEach(hs=>{
    const el=document.createElement('div');
    el.className='hs'; el.dataset.type=hs.type;
    el.dataset.hscene = hs.hScene || 'both';
    el.style.cssText='left:'+hs.xPct+'%;top:'+hs.yPct+'%;width:'+hs.wPct+'%;height:'+hs.hPct+'%';

    if(hs.type!=='bulb' && hs.type!=='particles'){
      const c=CM[hs.color]||CM.gold;
      const g=document.createElement('div'); g.className='hs-glow';
      g.style.borderColor=c.border;
      g.style.background='linear-gradient(145deg,'+c.grad+',transparent 42%,transparent 58%,'+c.grad+')';
      g.style.boxShadow='0 0 16px '+c.glow+',inset 0 0 16px '+c.glow;
      el.appendChild(g);
    }
    
    if(hs.type==='bulb') el.addEventListener('click',()=>switchScene());
    else if(hs.type==='video') {
      el.addEventListener('click', () => {
        openVideo(hs);
        markHotspotRead(el, hs);
      });
    }
    else if(hs.type==='book' || hs.type==='starter') {
      el.addEventListener('click', () => {
        openBook(hs);
        markHotspotRead(el, hs);
      });
    }
    if(hs.type==='particles') el.style.pointerEvents='none';
    hots.appendChild(el);
  });

  updateHotspotVisibility();

  if(hasStarterBox) {
    runIntroSequence();
  }
}

function runIntroSequence() {
  const introEl = document.getElementById('introTextElement');
  const msg = "i dont remmeber my room being filled with so many books.. i wonder who put them";
  let i = 0;
  introEl.textContent = "";
  
  function run() {
    if (i < msg.length) {
      introEl.textContent += msg.charAt(i);
      i++;
      setTimeout(run, 45);
    } else {
      sequenceState = "intro-finished";
      window.addEventListener('click', clearIntroText, { once: true });
    }
  }
  run();
}

function clearIntroText() {
  document.getElementById('introTextElement').textContent = "";
  sequenceState = "active-exploration";
  updateHotspotVisibility();
}

function switchScene(){
  if(hasStarterBox && sequenceState !== "active-exploration") return;
  const fl=document.getElementById('flash');
  fl.style.opacity='0';
  setTimeout(()=>{
    curScene=curScene===1?2:1;
    document.getElementById('s1').style.opacity=curScene===1?1:0;
    document.getElementById('s2').style.opacity=curScene===2?1:0;
    particlesArray = particlesArray.filter(p => p.isAmbient);
    updateHotspotVisibility();
  },220);
}

const canvas = document.getElementById('particles-canvas');
const ctx = canvas.getContext('2d');
let particlesArray = [];
const fxColors = {
  gold: 'rgba(235, 200, 110, ',
  purple: 'rgba(175, 130, 240, ',
  teal: 'rgba(90, 210, 185, ',
  rose: 'rgba(240, 120, 155, '
};

function resizeCanvas() {
  canvas.width = canvas.parentElement.clientWidth;
  canvas.height = canvas.parentElement.clientHeight;
}
window.addEventListener('resize', resizeCanvas);
resizeCanvas();

function dirToVelocity(dir, speed) {
  const s = speed || 1.0;
  const drift = () => (Math.random() * 0.15 - 0.075) * s;
  const base  = () => (Math.random() * 0.25 + 0.15) * s;
  switch(dir) {
    case 'down':       return { sx: drift(),  sy:  base() };
    case 'left':       return { sx: -base(),  sy:  drift() };
    case 'right':      return { sx:  base(),  sy:  drift() };
    case 'up-left':    return { sx: -base(),  sy: -base() };
    case 'up-right':   return { sx:  base(),  sy: -base() };
    case 'down-left':  return { sx: -base(),  sy:  base() };
    case 'down-right': return { sx:  base(),  sy:  base() };
    default:           return { sx: drift(),  sy: -base() };
  }
}

function animateParticles() {
  ctx.clearRect(0, 0, canvas.width, canvas.height);
  const W = canvas.width;
  const H = canvas.height;
  
  if(W > 0 && H > 0) {
    let ambColor = curScene === 1 ? 'rgba(165, 140, 230, ' : 'rgba(235, 210, 160, ';
    let ambMax = curScene === 1 ? 25 : 35;
    while(particlesArray.filter(p => p.isAmbient).length < ambMax) {
      particlesArray.push({
        isAmbient: true,
        x: Math.random() * W,
        y: Math.random() * H,
        radius: Math.random() * 1.5 + 0.4,
        speedX: Math.random() * 0.2 - 0.1,
        speedY: curScene === 1 ? (Math.random() * -0.15 - 0.02) : (Math.random() * -0.25 - 0.05),
        baseOpacity: Math.random() * 0.3 + 0.1,
        angle: Math.random() * Math.PI
      });
    }

    hotspots.forEach(hs => {
      if(hs.type !== 'particles') return;
      if(hasStarterBox && sequenceState !== "active-exploration") return;
      const sceneFilter = hs.hScene || 'both';
      if(sceneFilter !== 'both' && String(curScene) !== sceneFilter) return;

      const hX = (hs.xPct / 100) * W, hY = (hs.yPct / 100) * H;
      const hW = (hs.wPct / 100) * W, hH = (hs.hPct / 100) * H;
      const targetCount = hs.pCount !== undefined ? hs.pCount : 25;
      
      if(particlesArray.filter(p => p.hsId === hs.id).length < targetCount && hW > 5 && hH > 5) {
        const vel = dirToVelocity(hs.pDir || 'up', hs.pSpeed || 1.0);
        particlesArray.push({
          hsId: hs.id,
          x: hX + Math.random() * hW,
          y: hY + Math.random() * hH,
          radius: Math.random() * (hs.pSize || 2.0) * 0.6 + 0.3,
          speedX: vel.sx,
          speedY: vel.sy,
          baseOpacity: Math.random() * 0.5 + 0.2,
          angle: Math.random() * Math.PI
        });
      }
    });

    particlesArray = particlesArray.filter(p => {
      p.angle += 0.015;
      const opacity = p.baseOpacity + Math.sin(p.angle) * 0.1;
      
      if(p.isAmbient) {
        p.x += p.speedX; p.y += p.speedY;
        if(p.y < 0) p.y = H;
        if(p.x < 0 || p.x > W) p.x = Math.random() * W;
        ctx.beginPath(); ctx.arc(p.x, p.y, p.radius, 0, Math.PI * 2);
        ctx.fillStyle = ambColor + Math.max(0.02, Math.min(opacity, 0.5)) + ')';
        ctx.fill();
        return true;
      } else {
        const origin = hotspots.find(h => h.id === p.hsId);
        if(!origin || origin.type !== 'particles') return false;
        
        const sf = origin.hScene || 'both';
        if(sf !== 'both' && String(curScene) !== sf) return false;
        
        p.x += p.speedX; p.y += p.speedY;
        const bX = (origin.xPct / 100) * W, bY = (origin.yPct / 100) * H;
        const bW = (origin.wPct / 100) * W, bH = (origin.hPct / 100) * H;
        
        if(p.x < bX || p.x > bX + bW || p.y < bY - bH*0.5 || p.y > bY + bH) {
          if(Math.random() > 0.12) {
            const dir = origin.pDir || 'up';
            if(dir === 'up' || dir === 'up-left' || dir === 'up-right') {
              p.x = bX + Math.random() * bW; p.y = bY + bH;
            } else if(dir === 'down' || dir === 'down-left' || dir === 'down-right') {
              p.x = bX + Math.random() * bW; p.y = bY;
            } else if(dir === 'left') {
              p.x = bX + bW; p.y = bY + Math.random() * bH;
            } else if(dir === 'right') {
              p.x = bX; p.y = bY + Math.random() * bH;
            } else {
              p.x = bX + Math.random() * bW; p.y = bY + bH;
            }
            const vel = dirToVelocity(dir, origin.pSpeed || 1.0);
            p.speedX = vel.sx; p.speedY = vel.sy;
            p.radius = Math.random() * (origin.pSize || 2.0) * 0.6 + 0.3;
          } else { return false; }
        }
        ctx.beginPath(); ctx.arc(p.x, p.y, p.radius, 0, Math.PI * 2);
        ctx.fillStyle = (fxColors[origin.color] || fxColors.gold) + Math.max(0.02, Math.min(opacity, 0.7)) + ')';
        ctx.fill();
        return true;
      }
    });
  }
  requestAnimationFrame(animateParticles);
}
setTimeout(() => { resizeCanvas(); animateParticles(); }, 250);

function buildBookPages(title,message){
  const t=title||'The Lost Pages';
  const chunks=parseWriting(message);
  const mk=(cls,hard)=>{
    const el=document.createElement('div'); el.className='spf-page '+cls;
    if(hard) el.setAttribute('data-density','hard'); return el;
  };
  const mkContent=(chunk,side,chunkIdx,showHead)=>{
    const page=mk('paper '+side,false);
    if(showHead){
      const head=document.createElement('div'); head.className='page-head';
      const headTitle=document.createElement('span'); headTitle.className='page-head-title';
      headTitle.textContent=t; head.appendChild(headTitle); page.appendChild(head);
    }
    const isImg = isImgChunk(chunk);
    const isVideo = isYoutubeChunk(chunk);
    const body=document.createElement('div');
    body.className = isImg ? 'page-body image' : isVideo ? 'page-body video' : 'page-body';
    if(isImg){
      const image=document.createElement('img');
      image.src = imgSrc(chunk);
      image.alt = 'Image page';
      body.appendChild(image);
    }else if(isVideo){
      const wrap=document.createElement('div'); wrap.className='video-frame-wrap';
      const frame=document.createElement('iframe');
      frame.src = youtubeSrc(chunk);
      frame.title = 'Embedded video';
      frame.allow = 'accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share';
      frame.allowFullscreen = true;
      frame.referrerPolicy = 'strict-origin-when-cross-origin';
      wrap.appendChild(frame);
      body.appendChild(wrap);
    }else{
      const typedEl=document.createElement('div'); typedEl.className='typed-target';
      typedEl.setAttribute('data-role','typing'); typedEl.setAttribute('data-chunk-index',String(chunkIdx));
      body.appendChild(typedEl);
    }
    page.appendChild(body);
    if(chunkIdx===0){
      const foot=document.createElement('div'); foot.className='page-foot';
      foot.textContent='click Next ▶ to continue · esc to close'; page.appendChild(foot);
    }
    return page;
  };
  const mkBlank=(side)=>{
    const page=mk('paper '+side,false);
    const body=document.createElement('div'); body.className='page-body blank';
    page.appendChild(body); return page;
  };

  const front=mk('cover',true);
  front.innerHTML='<div class="cover-orn">❧</div><div class="cover-title"></div><div class="cover-orn">❧</div>';
  front.querySelector('.cover-title').textContent=t;

  const pages=[front];
  chunks.forEach((chunk,i)=>{
    const side=i%2===0?'left':'right'; pages.push(mkContent(chunk,side,i,i===0));
  });
  if(chunks.length%2===1) pages.push(mkBlank('right'));

  const back=mk('cover',true);
  back.innerHTML='<div class="cover-orn">❧</div><div class="cover-title">— fin —</div><div class="cover-orn">❧</div>';
  pages.push(back);
  return pages;
}

function destroyBook(){
  if(typed){typed.destroy();typed=null;}
  if(pageFlip){pageFlip.destroy();pageFlip=null;}
  const mount=document.getElementById('book-mount'); if(mount) mount.innerHTML='';
  writingChunks=[]; writePtr=0; typingActive=false; currentTypingChunk=-1;
  typedChunks.clear(); completedText.clear();
}

function restoreAllTypedText(){
  completedText.forEach((text,idx)=>{
    const el=document.querySelector('#book-mount [data-chunk-index="'+idx+'"]');
    if(el) el.textContent=text;
  });
}

function typeChunk(idx){
  if(idx>=writingChunks.length) return;
  const chunk = writingChunks[idx];
  if(isImgChunk(chunk) || isYoutubeChunk(chunk)) return;
  const el=document.querySelector('#book-mount [data-chunk-index="'+idx+'"]');
  if(!el) return;
  if(completedText.has(idx)){
    el.textContent=completedText.get(idx); typedChunks.add(idx); return;
  }
  if(typed){typed.destroy();typed=null;}
  el.textContent=''; currentTypingChunk=idx;
  typed=new Typed(el,{
    strings:[writingChunks[idx]], typeSpeed:26, showCursor:true, cursorChar:'|',
    onComplete:()=>{
      completedText.set(idx,writingChunks[idx]); typedChunks.add(idx);
      el.textContent=writingChunks[idx]; typed=null; currentTypingChunk=-1;
    }
  });
  // Restore any previously completed text on other visible pages
  restoreAllTypedText();
}

function finishCurrentTyping(){
  if(!typed||currentTypingChunk<0) return;
  const el=document.querySelector('#book-mount [data-chunk-index="'+currentTypingChunk+'"]');
  if(el){
    const finalText = writingChunks[currentTypingChunk] || '';
    el.textContent = finalText;
    completedText.set(currentTypingChunk, finalText);
    typedChunks.add(currentTypingChunk);
  }
  typed.destroy(); typed=null; currentTypingChunk=-1;
}

function revealNextChunk(){
  if(!pageFlip||writePtr>=writingChunks.length) return;
  finishCurrentTyping();
  const idx=writePtr++;
  if(idx%2===0){
    const targetPage=1+idx;
    const onTurn=(e)=>{ if(e.data===targetPage){ pageFlip.off('flip',onTurn); typeChunk(idx); restoreAllTypedText(); } };
    pageFlip.on('flip',onTurn); pageFlip.flip(targetPage,'bottom');
  }else{
    typeChunk(idx);
    restoreAllTypedText();
  }
}

function startWritingSequence(){
  if(typingActive||!writingChunks.length) return;
  typingActive=true; typedChunks.clear(); completedText.clear(); writePtr=1;
  typeChunk(0);
}

function createPageFlip(pages){
  const mount=document.getElementById('book-mount'); mount.innerHTML='';
  const container=document.createElement('div'); container.id='book-container'; mount.appendChild(container);
  const mountW=mount.clientWidth||Math.min(760,window.innerWidth*0.92);
  const mountH=mount.clientHeight||Math.min(500,window.innerHeight*0.78);
  pageFlip=new St.PageFlip(container,{
    width:Math.max(280,Math.floor(mountW/2)), height:Math.max(360,mountH),
    size:'fixed', showCover:true, drawShadow:true, flippingTime:900, usePortrait:false, autoSize:true, maxShadowOpacity:0.45, mobileScrollSupport:true,
  });
  pageFlip.loadFromHTML(pages);
  pageFlip.on('flip',()=>{updateIndicator();restoreAllTypedText();});
}

function updateIndicator(){
  if(!pageFlip) return;
  const idx=pageFlip.getCurrentPageIndex(), total=pageFlip.getPageCount(), el=document.getElementById('page-indicator');
  if(idx===0) el.textContent='Cover';
  else if(idx>=total-1) el.textContent='— fin —';
  else el.textContent='Page '+idx+' · spread '+Math.ceil(idx/2)+'/'+Math.ceil((total-2)/2);
}

function syncVideoFullscreenButton(){
  const btn=document.getElementById('btn-video-fullscreen');
  const shell=document.getElementById('video-shell');
  if(!btn || !shell) return;
  btn.textContent = document.fullscreenElement===shell ? 'Exit full screen' : 'Full screen';
}

function toggleVideoFullscreen(){
  const shell=document.getElementById('video-shell');
  if(!shell) return;
  if(document.fullscreenElement===shell){
    if(document.exitFullscreen) document.exitFullscreen();
    return;
  }
  if(shell.requestFullscreen) shell.requestFullscreen().catch(()=>{});
}

function openVideo(hs){
  if(sequenceState === "intro-typing") return;
  if(sequenceState === "intro-finished") {
    clearIntroText();
  }
  if(bookOpen) closeBook();
  openVideoUrl(hs.youtubeEmbed, hs.title || hs.name || 'Video');
  syncVideoFullscreenButton();
}

function openBook(hs){
  if(sequenceState === "intro-typing") return;
  if(sequenceState === "intro-finished") {
    clearIntroText();
  }
  
  if(videoOpen) closeVideo();
  destroyBook(); writingChunks=parseWriting(hs.message);
  document.getElementById('book-title-bar').textContent=hs.title||'Cozy Library';
  document.getElementById('overlay').classList.add('open'); bookOpen=true;
  
  if(hs.type === 'starter') {
    bookOpen = "starter";
  }

  requestAnimationFrame(()=>{
    requestAnimationFrame(()=>{
      createPageFlip(buildBookPages(hs.title,hs.message)); updateIndicator();
      setTimeout(()=>{
        if(pageFlip&&pageFlip.getCurrentPageIndex()===0){
          pageFlip.on('flip',function onCoverOpen(e){ if(e.data>=1){ pageFlip.off('flip',onCoverOpen); startWritingSequence(); } });
          pageFlip.flipNext('bottom');
        }
      },400);
    });
  });
}

function closeBook(){ 
  if(!bookOpen) return;
  
  if(bookOpen === "starter") {
    const sBox = document.querySelector('.hs[data-type=starter]');
    if(sBox) sBox.remove();
    hasStarterBox = false;
    sequenceState = "active-exploration";
  }

  bookOpen=false; 
  destroyBook(); 
  document.getElementById('overlay').classList.remove('open'); 
  updateHotspotVisibility();
}

function closeVideo(){
  if(!videoOpen) return;
  const shell=document.getElementById('video-shell');
  if(document.fullscreenElement===shell && document.exitFullscreen){
    document.exitFullscreen().catch(()=>{});
  }
  videoOpen = false;
  document.getElementById('video-overlay').classList.remove('open');
  document.getElementById('video-frame').src = '';
  syncVideoFullscreenButton();
  updateHotspotVisibility();
}

document.getElementById('btn-next').addEventListener('click',()=>{
  if(!pageFlip) return;
  if(typed && currentTypingChunk >= 0 && writePtr >= writingChunks.length){
    finishCurrentTyping();
    pageFlip.flipNext('bottom');
    setTimeout(restoreAllTypedText, 100);
    return;
  }
  if(writePtr<writingChunks.length){
    revealNextChunk();
    return;
  }
  pageFlip.flipNext('bottom');
  setTimeout(restoreAllTypedText, 100);
});
document.getElementById('btn-prev').addEventListener('click',()=>{
  if(!pageFlip) return;
  if(typed && currentTypingChunk >= 0) finishCurrentTyping();
  pageFlip.flipPrev('bottom');
  setTimeout(restoreAllTypedText, 100);
});
document.getElementById('close-btn-top').addEventListener('click',closeBook);
document.getElementById('close-btn-video').addEventListener('click',closeVideo);
document.getElementById('btn-video-close').addEventListener('click',closeVideo);
document.getElementById('btn-video-fullscreen').addEventListener('click',toggleVideoFullscreen);
document.addEventListener('fullscreenchange',syncVideoFullscreenButton);
document.addEventListener('keydown',e=>{
  if(e.key!=='Escape') return;
  if(bookOpen) closeBook();
  if(videoOpen) closeVideo();
});

build();
<\/script>

<script id="project-manifest" type="application/json">${JSON.stringify({hotspots: S.hotspots, nextId: S.nextId})}<\/script>

</body>
</html>`;
}

function exportSite() {
  if (!S.hotspots.length) { alert('Add at least one hotspot first.'); return; }
  const html = buildSiteHtml();
  const blob=new Blob([html],{type:'text/html'});
  const a=document.createElement('a'); a.href=URL.createObjectURL(blob);
  a.download='site.html'; a.click();
}

function previewSite() {
  const html = buildSiteHtml();
  openPreview(html);
}

function openPreview(html) {
  const modal = document.getElementById('preview-modal');
  const frame = document.getElementById('preview-frame');
  if (!modal || !frame) return;
  if (previewBlobUrl) {
    URL.revokeObjectURL(previewBlobUrl);
    previewBlobUrl = null;
  }
  const blob = new Blob([html], { type: 'text/html' });
  previewBlobUrl = URL.createObjectURL(blob);
  frame.src = previewBlobUrl;
  modal.classList.add('open');
  modal.setAttribute('aria-hidden', 'false');
}

function closePreview() {
  const modal = document.getElementById('preview-modal');
  const frame = document.getElementById('preview-frame');
  if (!modal || !frame) return;
  modal.classList.remove('open');
  modal.setAttribute('aria-hidden', 'true');
  frame.src = 'about:blank';
  if (previewBlobUrl) {
    URL.revokeObjectURL(previewBlobUrl);
    previewBlobUrl = null;
  }
}

function refreshPreview() {
  openPreview(buildSiteHtml());
}

document.getElementById('preview-modal')?.addEventListener('click', (e) => {
  if (e.target === document.getElementById('preview-modal')) closePreview();
});

function build() {
  render();
}
build();

