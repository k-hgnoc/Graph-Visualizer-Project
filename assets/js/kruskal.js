/* ════════════════════════════════════════════
   kruskal.js - Thuật toán Kruskal
   Animation step-by-step theo phong cách Dijkstra
   ════════════════════════════════════════════ */

window._kruskalSteps = [];
window._stepIndex    = -1;
let _kruskalTimer    = null;
let _kruskalHighlightData = null;

// Màu các thành phần liên thông (phải khớp với COMP_COLORS trong HTML)
const _COMP_PALETTE = [
    '#c084fc', '#4fc3f7', '#4ade80',
    '#fb923c', '#f87171', '#facc15',
    '#38bdf8', '#a3e635', '#f472b6'
];

/* ── Helper: lấy nhãn đỉnh từ ID ── */
function _getNodeLabel(id) {
    const node = graph.nodes.find(n => n.id === id);
    return node ? node.label : id;
}

/* ══════════════════════════
   CẤU TRÚC DỮ LIỆU DSU
   ══════════════════════════ */
class _DSU {
    constructor(vertices) {
        this.parent = {};
        this.rank   = {};
        vertices.forEach(v => { this.parent[v] = v; this.rank[v] = 0; });
    }
    find(v) {
        if (this.parent[v] !== v) this.parent[v] = this.find(this.parent[v]);
        return this.parent[v];
    }
    union(u, v) {
        const ru = this.find(u), rv = this.find(v);
        if (ru === rv) return false;
        if (this.rank[ru] > this.rank[rv])      this.parent[rv] = ru;
        else if (this.rank[ru] < this.rank[rv]) this.parent[ru] = rv;
        else { this.parent[rv] = ru; this.rank[ru]++; }
        return true;
    }
    snapshot() {
        return { parent: { ...this.parent }, rank: { ...this.rank } };
    }
    // Trả về map: id -> root
    getRoots(vertices) {
        const roots = {};
        vertices.forEach(v => { roots[v] = this.find(v); });
        return roots;
    }
}

/* ══════════════════════════
   CHẠY THUẬT TOÁN
   ══════════════════════════ */
function runAlgorithm() {
    if (_kruskalTimer) clearTimeout(_kruskalTimer);

    if (graph.nodes.length === 0) {
        log('Đồ thị trống. Hãy thêm đỉnh và cạnh trước.');
        return;
    }

    log(`BẮT ĐẦU Kruskal | ${graph.nodes.length} đỉnh, ${graph.edges.length} cạnh`);

    _kruskalHighlightData = null;
    _kruskalSteps = _computeKruskalSteps();
    window._kruskalSteps = _kruskalSteps;
    _stepIndex = -1;
    window._stepIndex = -1;

    if (_kruskalSteps.length === 0) {
        log('Không có bước nào để thực thi!');
        return;
    }

    _runStepAnimation(0);
}

/* ── Tính toán toàn bộ các bước Kruskal ── */
function _computeKruskalSteps() {
    const steps   = [];
    const nodeIds = graph.nodes.map(n => n.id);
    const dsu     = new _DSU(nodeIds);

    // Sort cạnh theo trọng số tăng dần
    const sortedEdges = [...graph.edges]
        .sort((a, b) => parseFloat(a.weight) - parseFloat(b.weight))
        .map(e => ({
            id:        e.id,
            from:      e.from,
            to:        e.to,
            weight:    parseFloat(e.weight),
            fromLabel: _getNodeLabel(e.from),
            toLabel:   _getNodeLabel(e.to),
            status:    'pending'  // 'pending' | 'accepted' | 'rejected'
        }));

    log(`Sắp xếp ${sortedEdges.length} cạnh theo trọng số tăng dần:`);
    log(sortedEdges.map(e => `${e.fromLabel}→${e.toLabel}(${e.weight})`).join(', '));

    const mstEdges    = [];  // cạnh đã chọn vào MST
    let mstTotal      = 0;
    let edgeStatuses  = sortedEdges.map(e => ({ ...e }));

    // Snapshot hàm tiện ích
    function makeSnapshot(type, currentEdgeId, accepted) {
        const roots      = dsu.getRoots(nodeIds);
        const components = _groupByRoot(nodeIds, roots);
        const compLabels = components.map(group =>
            group.map(id => _getNodeLabel(id))
        );

        return {
            type,
            currentEdgeId,
            accepted,
            mstEdges:   mstEdges.map(e => ({ ...e })),
            mstTotal,
            sortedEdges: edgeStatuses.map(e => ({ ...e })),
            components: compLabels,
            roots:      { ...roots }
        };
    }

    // Step khởi đầu
    steps.push(makeSnapshot('init', null, null));

    // Duyệt từng cạnh
    for (let i = 0; i < sortedEdges.length; i++) {
        const edge = sortedEdges[i];

        // Snapshot: đang XÉT cạnh này
        edgeStatuses[i].status = 'examining';
        steps.push(makeSnapshot('examine', edge.id, null));
        log(`[Bước ${i + 1}] Xét cạnh ${edge.fromLabel}→${edge.toLabel} (w=${edge.weight})`);

        const canAdd = dsu.union(edge.from, edge.to);

        if (canAdd) {
            // Chấp nhận
            mstEdges.push({ ...edge });
            mstTotal += edge.weight;
            edgeStatuses[i].status = 'accepted';

            log(`  ✓ Chấp nhận — tổng MST: ${mstTotal}`);
            steps.push(makeSnapshot('accept', edge.id, true));
        } else {
            // Từ chối (tạo chu trình)
            edgeStatuses[i].status = 'rejected';
            log(`  ✗ Từ chối — tạo chu trình`);
            steps.push(makeSnapshot('reject', edge.id, false));
        }
    }

    // Step hoàn thành
    steps.push({ ...makeSnapshot('done', null, null), isDone: true });

    const roots      = dsu.getRoots(nodeIds);
    const components = _groupByRoot(nodeIds, roots);
    log(`MST hoàn thành! Tổng trọng số: ${mstTotal} | ${components.length} thành phần liên thông`);
    log(`Các cạnh MST: ${mstEdges.map(e => `${e.fromLabel}→${e.toLabel}(${e.weight})`).join(', ')}`);

    return steps;
}

/* ── Nhóm đỉnh theo root trong DSU ── */
function _groupByRoot(nodeIds, roots) {
    const groups = {};
    nodeIds.forEach(id => {
        const r = roots[id];
        if (!groups[r]) groups[r] = [];
        groups[r].push(id);
    });
    return Object.values(groups);
}

/* ── Chạy animation từng bước ── */
function _runStepAnimation(idx) {
    if (idx >= _kruskalSteps.length) {
        _kruskalTimer = null;
        log('KẾT THÚC THUẬT TOÁN');
        _displayFinalResult();
        return;
    }

    window._stepIndex = idx;
    applyStep(_kruskalSteps[idx]);
    updateStepButtons();

    const speedSlider = document.getElementById('speed-slider');
    const speed = speedSlider ? parseInt(speedSlider.value) : 3;
    const delay = 1100 - (speed * 180);

    _kruskalTimer = setTimeout(() => {
        _runStepAnimation(idx + 1);
    }, Math.max(100, delay));
}

/* ── Áp dụng một bước (HTML gọi hàm này qua stepNext/stepPrev cũng được) ── */
function applyStep(step) {
    if (!step) return;

    _kruskalHighlightData = step;

    // Cập nhật UI bên trái
    if (typeof renderSortedEdges === 'function') {
        renderSortedEdges(step.sortedEdges || []);
    }
    if (typeof renderComponents === 'function') {
        renderComponents(step.components || []);
    }
    if (document.getElementById('mst-total')) {
        document.getElementById('mst-total').textContent = step.mstTotal ?? 0;
    }

    draw();
}

/* ── Kết quả cuối ── */
function _displayFinalResult() {
    const lastStep = _kruskalSteps[_kruskalSteps.length - 1];
    if (!lastStep) return;

    if (document.getElementById('mst-total'))
        document.getElementById('mst-total').textContent = lastStep.mstTotal ?? 0;
    if (typeof renderSortedEdges === 'function')
        renderSortedEdges(lastStep.sortedEdges || []);
    if (typeof renderComponents === 'function')
        renderComponents(lastStep.components || []);

    draw();
}

/* ════════════════════════════════════
   VẼ CANVAS VỚI HIGHLIGHT
   ════════════════════════════════════ */
function _drawWithKruskalHighlight() {
    if (!ctx) return;
    ctx.clearRect(0, 0, canvas.width, canvas.height);

    const hl = _kruskalHighlightData;
    if (!hl) return;

    // Map root → màu để tô đỉnh theo thành phần
    const rootColorMap = {};
    if (hl.roots) {
        const uniqueRoots = [...new Set(Object.values(hl.roots))];
        uniqueRoots.forEach((root, i) => {
            rootColorMap[root] = _COMP_PALETTE[i % _COMP_PALETTE.length];
        });
    }

    // Set cạnh trong MST
    const mstEdgeSet = new Set();
    if (hl.mstEdges) {
        hl.mstEdges.forEach(e => {
            mstEdgeSet.add(`${e.from}-${e.to}`);
            mstEdgeSet.add(`${e.to}-${e.from}`);
        });
    }

    // Cạnh đang xét
    const currentEdge = hl.currentEdgeId
        ? hl.sortedEdges?.find(e => e.id === hl.currentEdgeId)
        : null;

    // Cạnh bị từ chối
    const rejectedEdgeSet = new Set();
    if (hl.sortedEdges) {
        hl.sortedEdges.filter(e => e.status === 'rejected').forEach(e => {
            rejectedEdgeSet.add(`${e.from}-${e.to}`);
            rejectedEdgeSet.add(`${e.to}-${e.from}`);
        });
    }

    // ── Vẽ cạnh ──
    graph.edges.forEach(e => {
        const a = graph.nodes.find(n => n.id === e.from);
        const b = graph.nodes.find(n => n.id === e.to);
        if (!a || !b) return;

        const angle  = Math.atan2(b.y - a.y, b.x - a.x);
        const startX = a.x + NODE_R * Math.cos(angle);
        const startY = a.y + NODE_R * Math.sin(angle);
        const endX   = b.x - NODE_R * Math.cos(angle);
        const endY   = b.y - NODE_R * Math.sin(angle);

        const isCurrent  = currentEdge &&
            ((currentEdge.from === e.from && currentEdge.to === e.to) ||
             (currentEdge.from === e.to   && currentEdge.to === e.from));
        const isMST      = mstEdgeSet.has(`${e.from}-${e.to}`);
        const isRejected = rejectedEdgeSet.has(`${e.from}-${e.to}`);

        let strokeColor, lineWidth;

        if (isCurrent && hl.type === 'examine') {
            strokeColor = '#f59e0b';
            lineWidth   = 5;
            ctx.setLineDash([10, 8]);
        } else if (isCurrent && hl.type === 'reject') {
            strokeColor = '#ff6b6b';
            lineWidth   = 5;
            ctx.setLineDash([8, 6]);
        } else if (isMST) {
            strokeColor = '#8b5cf6';
            lineWidth   = 4;
            ctx.setLineDash([]);
        } else if (isRejected) {
            strokeColor = 'rgba(255, 107, 107, 0.4)';
            lineWidth   = 2;
            ctx.setLineDash([5, 5]);
        } else {
            strokeColor = '#64748b';
            lineWidth   = 2.5;
            ctx.setLineDash([]);
        }

        ctx.beginPath();
        ctx.moveTo(startX, startY);
        ctx.lineTo(endX, endY);
        ctx.strokeStyle = strokeColor;
        ctx.lineWidth   = lineWidth;
        ctx.stroke();
        ctx.setLineDash([]);

        // Mũi tên (nhỏ hơn vì đồ thị Kruskal thường vô hướng)
        ctx.beginPath();
        ctx.moveTo(endX, endY);
        ctx.lineTo(endX - 8 * Math.cos(angle - 0.4), endY - 8 * Math.sin(angle - 0.4));
        ctx.lineTo(endX - 8 * Math.cos(angle + 0.4), endY - 8 * Math.sin(angle + 0.4));
        ctx.closePath();
        ctx.fillStyle = strokeColor;
        ctx.fill();

        // Trọng số
        const mx = (a.x + b.x) / 2;
        const my = (a.y + b.y) / 2;
        ctx.fillStyle = '#1e1e2e';
        ctx.beginPath();
        ctx.arc(mx, my, 13, 0, Math.PI * 2);
        ctx.fill();

        if (isCurrent && hl.type === 'examine') { ctx.fillStyle = '#f59e0b'; ctx.font = 'bold 13px sans-serif'; }
        else if (isCurrent && hl.type === 'reject') { ctx.fillStyle = '#ff6b6b'; ctx.font = 'bold 13px sans-serif'; }
        else if (isMST)     { ctx.fillStyle = '#a855f7'; ctx.font = 'bold 13px sans-serif'; }
        else if (isRejected){ ctx.fillStyle = 'rgba(255,107,107,0.5)'; ctx.font = '11px sans-serif'; }
        else                { ctx.fillStyle = '#94a3b8'; ctx.font  = 'bold 12px sans-serif'; }

        ctx.textAlign    = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText(e.weight, mx, my);
    });

    // ── Vẽ đỉnh ──
    graph.nodes.forEach(n => {
        const root = hl.roots ? hl.roots[n.id] : null;
        const compColor = root ? (rootColorMap[root] || '#c084fc') : '#c084fc';

        // Kiểm tra đỉnh có thuộc MST không (có ít nhất 1 cạnh MST)
        const inMST = hl.mstEdges && hl.mstEdges.some(
            e => e.from === n.id || e.to === n.id
        );

        // Kiểm tra đỉnh thuộc cạnh đang xét
        const isCurrent = currentEdge &&
            (currentEdge.from === n.id || currentEdge.to === n.id);

        let fillColor, strokeColor, glowColor;

        if (isCurrent && hl.type === 'examine') {
            fillColor   = '#f59e0b';
            strokeColor = '#d97706';
            glowColor   = '#fbbf24';
        } else if (isCurrent && hl.type === 'accept') {
            fillColor   = '#4ade80';
            strokeColor = '#16a34a';
            glowColor   = '#86efac';
        } else if (isCurrent && hl.type === 'reject') {
            fillColor   = '#ff6b6b';
            strokeColor = '#dc2626';
            glowColor   = '#fca5a5';
        } else if (inMST) {
            fillColor   = compColor;
            strokeColor = '#7c3aed';
            glowColor   = compColor;
        } else {
            fillColor   = '#334155';
            strokeColor = '#475569';
            glowColor   = '#64748b';
        }

        if (isCurrent) {
            ctx.save();
            ctx.shadowColor = glowColor;
            ctx.shadowBlur  = 16;
        }

        // Ring thành phần màu
        if (inMST) {
            ctx.beginPath();
            ctx.arc(n.x, n.y, NODE_R + 5, 0, Math.PI * 2);
            ctx.strokeStyle = compColor + '55';
            ctx.lineWidth   = 3;
            ctx.stroke();
        }

        ctx.beginPath();
        ctx.arc(n.x, n.y, NODE_R, 0, Math.PI * 2);
        ctx.fillStyle   = fillColor;
        ctx.fill();
        ctx.strokeStyle = strokeColor;
        ctx.lineWidth   = 3;
        ctx.stroke();

        if (isCurrent) ctx.restore();

        ctx.fillStyle    = '#ffffff';
        ctx.font         = 'bold 14px sans-serif';
        ctx.textAlign    = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText(n.label, n.x, n.y);
    });

    // ── Status bar ──
    if (hl) {
        ctx.shadowBlur = 0;
        ctx.font      = 'bold 12px sans-serif';
        ctx.textAlign = 'left';

        const accepted = hl.mstEdges ? hl.mstEdges.length : 0;
        const total    = graph.edges.length;

        if (hl.isDone) {
            ctx.fillStyle = '#4ade80';
            ctx.fillText(`✓ MST Hoàn Thành — Tổng: ${hl.mstTotal}`, 15, 30);
        } else {
            ctx.fillStyle = '#a855f7';
            ctx.fillText(`Cạnh MST: ${accepted}/${graph.nodes.length - 1} | Tổng: ${hl.mstTotal}`, 15, 30);
        }

        // Cạnh đang xét
        if (currentEdge && !hl.isDone) {
            let statusText = '';
            if (hl.type === 'examine') statusText = `Đang xét: ${currentEdge.fromLabel}→${currentEdge.toLabel} (w=${currentEdge.weight})`;
            if (hl.type === 'accept')  statusText = `✓ Chấp nhận: ${currentEdge.fromLabel}→${currentEdge.toLabel}`;
            if (hl.type === 'reject')  statusText = `✗ Từ chối: ${currentEdge.fromLabel}→${currentEdge.toLabel} (chu trình)`;

            const color = hl.type === 'reject' ? '#ff6b6b'
                        : hl.type === 'accept' ? '#4ade80' : '#f59e0b';
            ctx.fillStyle = color;
            ctx.textAlign = 'right';
            ctx.fillText(statusText, canvas.width - 15, 30);
        }
    }
}

/* ── Ghi đè hàm draw ── */
const _kruskalOriginalDraw = window.draw;

window.draw = function () {
    if (_kruskalHighlightData) {
        _drawWithKruskalHighlight();
    } else if (_kruskalOriginalDraw) {
        _kruskalOriginalDraw();
    } else {
        _kruskalFallbackDraw();
    }
};

function _kruskalFallbackDraw() {
    if (!ctx) return;
    ctx.clearRect(0, 0, canvas.width, canvas.height);

    graph.edges.forEach(e => {
        const a = graph.nodes.find(n => n.id === e.from);
        const b = graph.nodes.find(n => n.id === e.to);
        if (!a || !b) return;

        const angle  = Math.atan2(b.y - a.y, b.x - a.x);
        const startX = a.x + NODE_R * Math.cos(angle);
        const startY = a.y + NODE_R * Math.sin(angle);
        const endX   = b.x - NODE_R * Math.cos(angle);
        const endY   = b.y - NODE_R * Math.sin(angle);

        ctx.beginPath();
        ctx.moveTo(startX, startY);
        ctx.lineTo(endX, endY);
        ctx.strokeStyle = '#94a3b8';
        ctx.lineWidth   = 2;
        ctx.stroke();

        const mx = (a.x + b.x) / 2;
        const my = (a.y + b.y) / 2;
        ctx.fillStyle = '#1e1e2e';
        ctx.beginPath();
        ctx.arc(mx, my, 11, 0, Math.PI * 2);
        ctx.fill();
        ctx.fillStyle    = '#64748b';
        ctx.font         = 'bold 11px sans-serif';
        ctx.textAlign    = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText(e.weight, mx, my);
    });

    graph.nodes.forEach(n => {
        ctx.beginPath();
        ctx.arc(n.x, n.y, NODE_R, 0, Math.PI * 2);
        ctx.fillStyle   = '#c084fc';
        ctx.fill();
        ctx.strokeStyle = '#7c3aed';
        ctx.lineWidth   = 2.5;
        ctx.stroke();
        ctx.fillStyle    = '#ffffff';
        ctx.font         = 'bold 13px sans-serif';
        ctx.textAlign    = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText(n.label, n.x, n.y);
    });
}

/* ── Clear highlight ── */
function clearHighlight() {
    _kruskalHighlightData = null;
    if (_kruskalOriginalDraw) {
        _kruskalOriginalDraw();
    } else {
        _kruskalFallbackDraw();
    }
}

/* ── Load đồ thị mẫu ── */
function _loadSampleKruskal() {
    graph.nodes = [];
    graph.edges = [];

    const sampleNodes = [
        { id: 1, x: 120, y: 200, label: 'A' },
        { id: 2, x: 300, y: 100, label: 'B' },
        { id: 3, x: 480, y: 150, label: 'C' },
        { id: 4, x: 120, y: 420, label: 'D' },
        { id: 5, x: 300, y: 360, label: 'E' },
        { id: 6, x: 480, y: 400, label: 'F' }
    ];

    const sampleEdges = [
        { id: 1, from: 1, to: 2, weight: 4 },
        { id: 2, from: 1, to: 4, weight: 3 },
        { id: 3, from: 2, to: 3, weight: 5 },
        { id: 4, from: 2, to: 5, weight: 6 },
        { id: 5, from: 3, to: 5, weight: 2 },
        { id: 6, from: 3, to: 6, weight: 7 },
        { id: 7, from: 4, to: 5, weight: 8 },
        { id: 8, from: 5, to: 6, weight: 4 }
    ];

    graph.nodes  = sampleNodes;
    graph.edges  = sampleEdges;
    nodeCounter  = 6;
    edgeCounter  = 8;
    labelCounter = 6;

    _kruskalHighlightData = null;
    syncDropdowns();
    draw();
    log('✔ Đã tải đồ thị mẫu (6 đỉnh). Nhấn "Xây Dựng MST" để bắt đầu.');

    const hint = document.getElementById('canvas-hint');
    if (hint) hint.style.display = 'none';
}

/* ── Alias để kruskal.html gọi loadSampleGraph() ── */
function kruskalRunner() { runAlgorithm(); }

window._loadSampleKruskal  = _loadSampleKruskal;
window.clearHighlight      = clearHighlight;
window.applyStep           = applyStep;
window.runAlgorithm        = runAlgorithm;
window.runKruskal          = kruskalRunner;