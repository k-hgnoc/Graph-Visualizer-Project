/* ════════════════════════════════════════════
   workspace.js
   Canvas engine: vẽ đỉnh, cạnh, di chuyển,
   xóa, sync dropdown, lưu/mở đồ thị
   ════════════════════════════════════════════ */

/* ── State ── */
const graph = {
    nodes: [],   // { id, x, y, label }
    edges: []    // { id, from, to, weight }
};

let currentMode  = 'node';
let edgeFrom     = null;   // id của đỉnh đầu cạnh đang kéo
let dragNode     = null;   // id đỉnh đang kéo (move mode)
let dragOffset   = { x: 0, y: 0 };
let mousePos     = { x: 0, y: 0 };
let nodeCounter  = 0;
let edgeCounter  = 0;
let labelCounter = 0;

const NODE_R     = 20;
const COLORS = {
    nodeFill:     '#c084fc',
    nodeStroke:   '#7c3aed',
    nodeText:     '#ffffff',
    nodeHover:    '#e879f9',
    edgeLine:     '#94a3b8',
    edgeHighlight:'#7c3aed',
    edgeWeight:   '#64748b',
    startFill:    '#4ade80',
    startStroke:  '#16a34a',
    endFill:      '#f87171',
    endStroke:    '#dc2626',
};

/* ── Canvas refs ── */
let canvas, ctx, wrap;

/* ────────────────────────────────────────────
   INIT
──────────────────────────────────────────── */
window.addEventListener('load', () => {
    canvas = document.getElementById('graphCanvas');
    wrap   = document.getElementById('graph-map');
    if (!canvas || !wrap) return;
    ctx = canvas.getContext('2d');

    resizeCanvas();
    window.addEventListener('resize', resizeCanvas);

    canvas.addEventListener('mousedown',  onMouseDown);
    canvas.addEventListener('mousemove',  onMouseMove);
    canvas.addEventListener('mouseup',    onMouseUp);
    canvas.addEventListener('dblclick',   onDblClick);
    canvas.addEventListener('contextmenu', onRightClick);

    log('Sẵn sàng — chọn công cụ và vẽ đồ thị.');
    draw();
});

function resizeCanvas() {
    canvas.width  = wrap.clientWidth;
    canvas.height = wrap.clientHeight;
    draw();
}

/* ────────────────────────────────────────────
   MODE
──────────────────────────────────────────── */
function setMode(mode) {
    currentMode = mode;
    edgeFrom    = null;
    dragNode    = null;

    document.querySelectorAll('.tbtn[id^="mode-"]')
        .forEach(b => b.classList.remove('active'));
    const btn = document.getElementById('mode-' + mode);
    if (btn) btn.classList.add('active');

    canvas.style.cursor =
        mode === 'move'   ? 'grab' :
        mode === 'delete' ? 'not-allowed' :
        mode === 'edge'   ? 'crosshair' : 'default';

    const hint = document.getElementById('canvas-hint');
    if (hint) hint.style.display = graph.nodes.length ? 'none' : '';

    draw();
}

/* ────────────────────────────────────────────
   HELPERS
──────────────────────────────────────────── */
function getNodeAt(x, y) {
    return graph.nodes.find(n => Math.hypot(n.x - x, n.y - y) <= NODE_R);
}

function getEdgeAt(x, y) {
    const THRESH = 6;
    return graph.edges.find(e => {
        const a = graph.nodes.find(n => n.id === e.from);
        const b = graph.nodes.find(n => n.id === e.to);
        if (!a || !b) return false;
        const len = Math.hypot(b.x - a.x, b.y - a.y);
        if (len === 0) return false;
        const t = Math.max(0, Math.min(1,
            ((x - a.x) * (b.x - a.x) + (y - a.y) * (b.y - a.y)) / (len * len)
        ));
        const px = a.x + t * (b.x - a.x);
        const py = a.y + t * (b.y - a.y);
        return Math.hypot(x - px, y - py) < THRESH;
    });
}

function nextLabel() {
    const labels = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ';
    const idx    = labelCounter % 26;
    const suffix = Math.floor(labelCounter / 26) || '';
    labelCounter++;
    return labels[idx] + suffix;
}

/* ────────────────────────────────────────────
   MOUSE EVENTS
──────────────────────────────────────────── */
function clientToCanvas(e) {
    const r = canvas.getBoundingClientRect();
    return { x: e.clientX - r.left, y: e.clientY - r.top };
}

function onMouseDown(e) {
    if (e.button !== 0) return;
    const { x, y } = clientToCanvas(e);
    const hit = getNodeAt(x, y);

    if (currentMode === 'node') {
        if (!hit) addNode(x, y);
        return;
    }

    if (currentMode === 'edge') {
        if (hit) {
            edgeFrom = hit.id;
            log(`Chọn đỉnh ${hit.label} — kéo tới đỉnh đích để tạo cạnh.`);
        }
        return;
    }

    if (currentMode === 'delete') {
        if (hit) { deleteNode(hit.id); return; }
        const eHit = getEdgeAt(x, y);
        if (eHit) deleteEdge(eHit.id);
        return;
    }

    if (currentMode === 'move') {
        if (hit) {
            dragNode   = hit.id;
            dragOffset = { x: x - hit.x, y: y - hit.y };
            canvas.style.cursor = 'grabbing';
        }
    }
}

function onMouseMove(e) {
    const { x, y } = clientToCanvas(e);
    mousePos = { x, y };

    if (currentMode === 'move' && dragNode !== null) {
        const n = graph.nodes.find(n => n.id === dragNode);
        if (n) {
            n.x = Math.max(NODE_R, Math.min(canvas.width  - NODE_R, x - dragOffset.x));
            n.y = Math.max(NODE_R, Math.min(canvas.height - NODE_R, y - dragOffset.y));
        }
    }
    draw();
}

function onMouseUp(e) {
    const { x, y } = clientToCanvas(e);

    if (currentMode === 'edge' && edgeFrom !== null) {
        const hit = getNodeAt(x, y);
        if (hit && hit.id !== edgeFrom) {
            promptWeight(edgeFrom, hit.id);
        }
        edgeFrom = null;
        draw();
        return;
    }

    if (currentMode === 'move') {
        dragNode = null;
        canvas.style.cursor = 'grab';
    }
}

function onDblClick(e) {
    if (currentMode !== 'node') return;
    const { x, y } = clientToCanvas(e);
    const hit = getNodeAt(x, y);
    if (hit) renameNode(hit);
}

function onRightClick(e) {
    e.preventDefault();
    const { x, y } = clientToCanvas(e);
    const hit = getNodeAt(x, y);
    if (hit) renameNode(hit);
}

/* ────────────────────────────────────────────
   GRAPH OPERATIONS
──────────────────────────────────────────── */
function addNode(x, y) {
    const hint = document.getElementById('canvas-hint');
    if (hint) hint.style.display = 'none';

    const id    = ++nodeCounter;
    const label = nextLabel();
    graph.nodes.push({ id, x, y, label });
    log(`Thêm đỉnh ${label} tại (${Math.round(x)}, ${Math.round(y)})`);
    syncDropdowns();
    draw();
}

function deleteNode(id) {
    const n = graph.nodes.find(n => n.id === id);
    if (!n) return;
    graph.nodes  = graph.nodes.filter(n => n.id !== id);
    graph.edges  = graph.edges.filter(e => e.from !== id && e.to !== id);
    log(`Đã xóa đỉnh ${n.label} và các cạnh liên quan.`);
    syncDropdowns();
    draw();
}

function deleteEdge(id) {
    const e = graph.edges.find(e => e.id === id);
    if (!e) return;
    const a = graph.nodes.find(n => n.id === e.from);
    const b = graph.nodes.find(n => n.id === e.to);
    graph.edges = graph.edges.filter(e => e.id !== id);
    log(`Đã xóa cạnh ${a?.label}→${b?.label}.`);
    draw();
}

function promptWeight(fromId, toId) {
    const a = graph.nodes.find(n => n.id === fromId);
    const b = graph.nodes.find(n => n.id === toId);

    // Kiểm tra cạnh đã tồn tại
    const exists = graph.edges.find(e =>
        (e.from === fromId && e.to === toId) ||
        (e.from === toId   && e.to === fromId)
    );
    if (exists) {
        log(`Cạnh ${a.label}↔${b.label} đã tồn tại.`);
        return;
    }

    const raw = prompt(`Trọng số cạnh ${a.label} → ${b.label}:`, '1');
    if (raw === null) return;
    const w = parseFloat(raw);
    if (isNaN(w)) { log('Trọng số không hợp lệ.'); return; }

    const id = ++edgeCounter;
    graph.edges.push({ id, from: fromId, to: toId, weight: w });
    log(`Thêm cạnh ${a.label} → ${b.label} (trọng số ${w})`);
    draw();
}

function renameNode(node) {
    const newLabel = prompt(`Đổi tên đỉnh "${node.label}" thành:`, node.label);
    if (!newLabel || newLabel.trim() === '') return;
    node.label = newLabel.trim().toUpperCase();
    log(`Đổi tên thành công: "${node.label}"`);
    syncDropdowns();
    draw();
}

function clearGraph() {
    if (!confirm('Xóa toàn bộ đồ thị?')) return;
    graph.nodes  = []; graph.edges = [];
    nodeCounter  = 0; edgeCounter = 0; labelCounter = 0;
    const hint = document.getElementById('canvas-hint');
    if (hint) hint.style.display = '';
    syncDropdowns();
    log('Đã xóa toàn bộ đồ thị.');
    draw();
}

/* ────────────────────────────────────────────
   DRAW
──────────────────────────────────────────── */
function draw() {
    if (!ctx) return;
    ctx.clearRect(0, 0, canvas.width, canvas.height);

    const startId = getSelectedNodeId('start-node');
    const endId   = getSelectedNodeId('end-node');

    // ── Vẽ cạnh ──
    graph.edges.forEach(e => {
        const a = graph.nodes.find(n => n.id === e.from);
        const b = graph.nodes.find(n => n.id === e.to);
        if (!a || !b) return;

        const angle = Math.atan2(b.y - a.y, b.x - a.x);
        const startX = a.x + NODE_R * Math.cos(angle);
        const startY = a.y + NODE_R * Math.sin(angle);
        const endX   = b.x - NODE_R * Math.cos(angle);
        const endY   = b.y - NODE_R * Math.sin(angle);

        ctx.beginPath();
        ctx.moveTo(startX, startY);
        ctx.lineTo(endX, endY);
        ctx.strokeStyle = COLORS.edgeLine;
        ctx.lineWidth   = 2;
        ctx.stroke();

        // Đầu mũi tên
        const hLen = 10, hAngle = 0.4;
        ctx.beginPath();
        ctx.moveTo(endX, endY);
        ctx.lineTo(endX - hLen * Math.cos(angle - hAngle), endY - hLen * Math.sin(angle - hAngle));
        ctx.lineTo(endX - hLen * Math.cos(angle + hAngle), endY - hLen * Math.sin(angle + hAngle));
        ctx.closePath();
        ctx.fillStyle = COLORS.edgeLine;
        ctx.fill();

        // Nhãn trọng số
        const mx = (a.x + b.x) / 2;
        const my = (a.y + b.y) / 2;
        ctx.save();
        ctx.fillStyle = '#ffffff';
        ctx.beginPath();
        ctx.arc(mx, my, 11, 0, Math.PI * 2);
        ctx.fill();
        ctx.strokeStyle = COLORS.edgeLine;
        ctx.lineWidth   = 1;
        ctx.stroke();
        ctx.fillStyle   = COLORS.edgeWeight;
        ctx.font        = 'bold 11px sans-serif';
        ctx.textAlign   = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText(e.weight, mx, my);
        ctx.restore();
    });

    // ── Cạnh đang kéo (edge mode) ──
    if (currentMode === 'edge' && edgeFrom !== null) {
        const a = graph.nodes.find(n => n.id === edgeFrom);
        if (a) {
            ctx.beginPath();
            ctx.moveTo(a.x, a.y);
            ctx.lineTo(mousePos.x, mousePos.y);
            ctx.strokeStyle = COLORS.edgeHighlight;
            ctx.lineWidth   = 2;
            ctx.setLineDash([6, 4]);
            ctx.stroke();
            ctx.setLineDash([]);
        }
    }

    // ── Vẽ đỉnh ──
    graph.nodes.forEach(n => {
        const isStart  = n.id === startId;
        const isEnd    = n.id === endId;
        const isHover  = currentMode !== 'move' &&
                         Math.hypot(mousePos.x - n.x, mousePos.y - n.y) <= NODE_R;
        const isSource = n.id === edgeFrom;

        let fill   = isStart ? COLORS.startFill : isEnd ? COLORS.endFill : COLORS.nodeFill;
        let stroke = isStart ? COLORS.startStroke : isEnd ? COLORS.endStroke : COLORS.nodeStroke;

        if (isHover || isSource) {
            fill   = COLORS.nodeHover;
            stroke = '#a21caf';
        }

        // Glow khi là start/end
        if (isStart || isEnd) {
            ctx.save();
            ctx.shadowColor = isStart ? '#4ade80' : '#f87171';
            ctx.shadowBlur  = 12;
        }

        ctx.beginPath();
        ctx.arc(n.x, n.y, NODE_R, 0, Math.PI * 2);
        ctx.fillStyle   = fill;
        ctx.fill();
        ctx.strokeStyle = stroke;
        ctx.lineWidth   = 2.5;
        ctx.stroke();

        if (isStart || isEnd) ctx.restore();

        // Label
        ctx.fillStyle    = COLORS.nodeText;
        ctx.font         = 'bold 13px sans-serif';
        ctx.textAlign    = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText(n.label, n.x, n.y);

        // Badge start/end
        if (isStart || isEnd) {
            const badge = isStart ? 'S' : 'E';
            const bx    = n.x + NODE_R * 0.7;
            const by    = n.y - NODE_R * 0.7;
            ctx.beginPath();
            ctx.arc(bx, by, 8, 0, Math.PI * 2);
            ctx.fillStyle   = isStart ? COLORS.startStroke : COLORS.endStroke;
            ctx.fill();
            ctx.fillStyle   = '#fff';
            ctx.font        = 'bold 9px sans-serif';
            ctx.textAlign   = 'center';
            ctx.textBaseline = 'middle';
            ctx.fillText(badge, bx, by);
        }
    });
}

/* ────────────────────────────────────────────
   DROPDOWNS
──────────────────────────────────────────── */
function syncDropdowns() {
    const dropdowns = ['start-node', 'end-node'];
    const selects   = dropdowns.map(id => document.getElementById(id));
    const saved     = selects.map(s => s?.value || '');

    const opts = '<option value="" disabled>-- Chọn --</option>' +
        graph.nodes.map(n => `<option value="${n.id}">${n.label}</option>`).join('');

    selects.forEach((s, i) => {
        if (!s) return;
        s.innerHTML = opts;
        if (saved[i] && graph.nodes.find(n => n.id == saved[i])) s.value = saved[i];
    });

    // Sync waypoints
    document.querySelectorAll('.waypoint-select').forEach(s => {
        const cur = s.value;
        s.innerHTML = opts;
        if (cur && graph.nodes.find(n => n.id == cur)) s.value = cur;
    });

    // Redraw khi dropdown thay đổi (highlight start/end)
    selects.forEach(s => { if (s) s.onchange = () => draw(); });
}

function getSelectedNodeId(selectId) {
    const s = document.getElementById(selectId);
    return s && s.value ? parseInt(s.value) : null;
}

/* ────────────────────────────────────────────
   WAYPOINTS
──────────────────────────────────────────── */
function addWaypoint() {
    const list  = document.getElementById('waypoints-list');
    const empty = document.getElementById('waypoints-empty');

    const opts = '<option value="" disabled selected>-- Chọn --</option>' +
        graph.nodes.map(n => `<option value="${n.id}">${n.label}</option>`).join('');

    const row = document.createElement('div');
    row.className = 'waypoint-row';
    row.innerHTML = `
        <span class="waypoint-handle">⠿</span>
        <select class="waypoint-select">${opts}</select>
        <button class="waypoint-del" onclick="removeWaypoint(this)" title="Xóa">✕</button>
    `;
    list.appendChild(row);
    if (empty) empty.style.display = 'none';
}

function removeWaypoint(btn) {
    const list = document.getElementById('waypoints-list');
    btn.closest('.waypoint-row').remove();
    if (list.children.length === 0) {
        const empty = document.getElementById('waypoints-empty');
        if (empty) empty.style.display = '';
    }
}

function getWaypoints() {
    return [...document.querySelectorAll('.waypoint-select')]
        .map(s => parseInt(s.value)).filter(v => !isNaN(v));
}

/* ────────────────────────────────────────────
   LƯU / MỞ ĐỒ THỊ  (Supabase)
   Bảng: graphs(id uuid, name text,
               algorithms text, data jsonb)
──────────────────────────────────────────── */

// Lấy tên thuật toán từ URL (vd: dijkstra.html → 'dijkstra')
function getCurrentAlgorithm() {
    const path = window.location.pathname;
    const file = path.split('/').pop().replace('.html', '');
    return file || 'unknown';
}

async function saveGraph() {
    // FIX #5: check đăng nhập sớm
    if (!_getCurrentUserId()) {
        log('✘ Chưa đăng nhập — vui lòng đăng nhập để lưu đồ thị.');
        return;
    }
    const name = prompt('Tên đồ thị:', window._currentGraphName || 'my-graph');
    if (!name) return;
    window._currentGraphName = name;

    log(`Đang lưu "${name}" lên Supabase...`);

    try {
        const saved = await saveGraphToSupabase(
            name,
            getCurrentAlgorithm(),
            graph.nodes,
            graph.edges,
            window._currentGraphId || null  // FIX #4: UPDATE nếu đã có id, INSERT nếu chưa
        );
        window._currentGraphId = saved.id;  // FIX #4: lưu id sau lần đầu INSERT
        log(`✔ Đã lưu "${name}" (id: ${saved.id.slice(0,8)}…)`);
    } catch (err) {
        log(`✘ Lỗi lưu Supabase: ${err.message}`);
        // Fallback: lưu file JSON
        _saveGraphToFile(name);
    }
}

function _saveGraphToFile(name) {
    const data = JSON.stringify({
        name, nodes: graph.nodes, edges: graph.edges,
        nodeCounter, edgeCounter, labelCounter
    });
    const blob = new Blob([data], { type: 'application/json' });
    const a    = document.createElement('a');
    a.href     = URL.createObjectURL(blob);
    a.download = name + '.json';
    a.click();
    log(`Đã lưu file "${name}.json" về máy (fallback).`);
}

async function openGraph() {
    // Hiện modal chọn: Mở từ Supabase hoặc từ file
    const choice = confirm(
        'Chọn nguồn mở đồ thị:\n\n' +
        'OK  → Mở từ Supabase (danh sách đã lưu)\n' +
        'Hủy → Mở từ file .json trên máy'
    );

    if (choice) {
        await _openFromSupabase();
    } else {
        _openFromFile();
    }
}

async function _openFromSupabase() {
    log('Đang tải danh sách đồ thị từ Supabase...');
    try {
        const algo = getCurrentAlgorithm();
        const list = await listGraphsFromSupabase(algo);

        if (!list || list.length === 0) {
            log(`Chưa có đồ thị nào được lưu cho thuật toán "${algo}".`);
            return;
        }

        // Tạo chuỗi lựa chọn
        const options = list.map((g, i) => `${i + 1}. ${g.name} (${g.id.slice(0,8)}…)`).join('\n');
        const input   = prompt(
            `Chọn số thứ tự đồ thị muốn mở:\n\n${options}`,
            '1'
        );
        if (!input) return;

        const idx = parseInt(input) - 1;
        if (isNaN(idx) || idx < 0 || idx >= list.length) {
            log('Lựa chọn không hợp lệ.');
            return;
        }

        const chosen = list[idx];
        _loadGraphData(
            chosen.data.nodes  || [],
            chosen.data.edges  || [],
            chosen.name,
            chosen.id
        );
        log(`✔ Đã mở "${chosen.name}" từ Supabase.`);

    } catch (err) {
        log(`✘ Lỗi tải Supabase: ${err.message}`);
    }
}

function _openFromFile() {
    const input    = document.createElement('input');
    input.type     = 'file';
    input.accept   = '.json';
    input.onchange = e => {
        const file   = e.target.files[0];
        const reader = new FileReader();
        reader.onload = ev => {
            try {
                const d = JSON.parse(ev.target.result);
                _loadGraphData(
                    d.nodes || [], d.edges || [],
                    d.name  || file.name,
                    null
                );
                // Khôi phục counters nếu có
                if (d.nodeCounter)  nodeCounter  = d.nodeCounter;
                if (d.edgeCounter)  edgeCounter  = d.edgeCounter;
                if (d.labelCounter) labelCounter = d.labelCounter;
                log(`✔ Đã mở file "${d.name || file.name}".`);
            } catch {
                log('✘ File không hợp lệ.');
            }
        };
        reader.readAsText(file);
    };
    input.click();
}

function _loadGraphData(nodes, edges, name, id) {
    graph.nodes = nodes;
    graph.edges = edges;

    // Tính lại counters từ dữ liệu tải về
    nodeCounter  = nodes.length  ? Math.max(...nodes.map(n => n.id))  : 0;
    edgeCounter  = edges.length  ? Math.max(...edges.map(e => e.id))  : 0;
    labelCounter = nodes.length;

    window._currentGraphId   = id;
    window._currentGraphName = name;

    const hint = document.getElementById('canvas-hint');
    if (hint) hint.style.display = graph.nodes.length ? 'none' : '';


    syncDropdowns();
    draw();
}

function createNewGraph() {
    clearGraph();
}

/* ────────────────────────────────────────────
   LOG
──────────────────────────────────────────── */
function log(msg) {
    const panel = document.getElementById('execution-log');
    if (!panel) return;
    const now = new Date();
    const ts  = `${String(now.getMinutes()).padStart(2,'0')}:${String(now.getSeconds()).padStart(2,'0')}`;
    const div = document.createElement('div');
    div.className = 'log-entry';
    div.innerHTML = `<span class="ts">[${ts}]</span>${msg}`;
    panel.appendChild(div);
    panel.scrollTop = panel.scrollHeight;
}
