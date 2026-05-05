/* ════════════════════════════════════════════
   prim.js - Thuật toán Prim
   ════════════════════════════════════════════ */

window._primSteps = [];
window._stepIndex = -1;
let _animationTimer = null;
let _currentMSTEdges = [];
let _currentMSTTotal = 0;
let _primHighlightData = null;

// Helper: lấy nhãn đỉnh từ ID
function _getNodeLabel(id) {
    const node = graph.nodes.find(n => n.id === id);
    return node ? node.label : id;
}

/* ── Chạy thuật toán Prim ── */
function runAlgorithm() {
    if (_animationTimer) clearTimeout(_animationTimer);

    const startId = getSelectedNodeId('start-node');
    if (startId === null) {
        log('⚠ Vui lòng chọn đỉnh xuất phát.');
        return;
    }

    if (graph.nodes.length === 0) {
        log('⚠ Đồ thị trống. Hãy thêm đỉnh và cạnh trước.');
        return;
    }

    const startNode = graph.nodes.find(n => n.id === startId);
    log(`▶ Bắt đầu Prim với đỉnh xuất phát: ${startNode?.label}`);

    _currentMSTEdges = [];
    _currentMSTTotal = 0;
    _primHighlightData = null;
    renderMSTEdges(_currentMSTEdges);
    renderMSTTotal(_currentMSTTotal);

    _primSteps = _computePrimSteps(startId);
    _stepIndex = -1;

    if (_primSteps.length === 0) {
        log('⚠ Không thể xây dựng MST (đồ thị không liên thông?)');
        return;
    }

    _runStepAnimation(0);
}

/* ── Tính toán các bước của Prim ── */
function _computePrimSteps(startId) {
    const steps = [];
    const nodeIds = graph.nodes.map(n => n.id);
    const n = nodeIds.length;

    const nodeLabels = {};
    graph.nodes.forEach(n => { nodeLabels[n.id] = n.label; });

    const adj = {};
    nodeIds.forEach(u => { adj[u] = {}; });
    graph.edges.forEach(e => {
        adj[e.from][e.to] = e.weight;
        adj[e.to][e.from] = e.weight;
    });

    const inMST = new Set();
    const key = {};
    const parent = {};
    const mstEdges = [];

    nodeIds.forEach(u => {
        key[u] = Infinity;
        parent[u] = null;
    });

    key[startId] = 0;
    let remaining = [...nodeIds];
    let total = 0;
    let iteration = 0;

    while (remaining.length > 0) {
        let u = null;
        let minKey = Infinity;
        for (const v of remaining) {
            if (key[v] < minKey) {
                minKey = key[v];
                u = v;
            }
        }

        if (u === null) break;

        remaining = remaining.filter(v => v !== u);
        inMST.add(u);

        let currentEdge = null;
        if (parent[u] !== null) {
            const w = key[u];
            total += w;
            const edgeInfo = {
                from: parent[u],
                to: u,
                weight: w,
                fromLabel: nodeLabels[parent[u]],
                toLabel: nodeLabels[u]
            };
            mstEdges.push(edgeInfo);
            currentEdge = { from: parent[u], to: u, weight: w };
        }

        steps.push({
            iteration: iteration++,
            inMST: new Set(inMST),
            currentEdge: currentEdge,
            currentVertex: u,
            currentVertexLabel: nodeLabels[u],
            mstEdges: [...mstEdges],
            total: total,
            isLast: remaining.length === 0
        });

        for (const v of remaining) {
            if (adj[u][v] !== undefined && adj[u][v] < key[v]) {
                key[v] = adj[u][v];
                parent[v] = u;
            }
        }
    }

    if (inMST.size !== n) {
        log(`⚠ Đồ thị không liên thông! Chỉ tạo được MST cho ${inMST.size}/${n} đỉnh.`);
    } else {
        log(`✔ Hoàn thành MST với tổng trọng số: ${total}`);
    }

    return steps;
}

/* ── Chạy animation ── */
function _runStepAnimation(idx) {
    if (idx >= _primSteps.length) {
        _animationTimer = null;
        log('■ Kết thúc animation.');

        if (_primSteps.length > 0) {
            const lastStep = _primSteps[_primSteps.length - 1];
            _currentMSTEdges = lastStep.mstEdges;
            _currentMSTTotal = lastStep.total;
            renderMSTEdges(_currentMSTEdges);
            renderMSTTotal(_currentMSTTotal);

            // Log danh sách cạnh MST
            const edgeList = lastStep.mstEdges.map(e =>
                `${e.fromLabel}→${e.toLabel}(${e.weight})`
            ).join(', ');
            log(`Các cạnh trong MST: ${edgeList}`);
            log(`Tổng trọng số MST: ${lastStep.total}`);

            _updateCanvasHighlight({
                mstEdges: lastStep.mstEdges,
                currentVertex: null,
                currentEdge: null,
                isComplete: true
            });
        }
        return;
    }

    window._primSteps = _primSteps;
    window._stepIndex = idx;
    _applyStep(_primSteps[idx]);
    updateStepButtons();

    const speedSlider = document.getElementById('speed-slider');
    const speed = speedSlider ? parseInt(speedSlider.value) : 3;
    const delay = 1100 - (speed * 180);

    _animationTimer = setTimeout(() => {
        _runStepAnimation(idx + 1);
    }, Math.max(100, delay));
}

/* ── Áp dụng bước ── */
function _applyStep(step) {
    if (!step) return;

    _currentMSTEdges = step.mstEdges;
    _currentMSTTotal = step.total;

    renderMSTEdges(step.mstEdges);
    renderMSTTotal(step.total);

    _updateCanvasHighlight(step);

    // Log với nhãn đỉnh đúng (A, B, C... thay vì 1, 2, 3...)
    if (step.currentEdge) {
        const fromLabel = _getNodeLabel(step.currentEdge.from);
        const toLabel = _getNodeLabel(step.currentEdge.to);
        log(`[Bước ${step.iteration + 1}]  Thêm cạnh ${fromLabel} → ${toLabel} (trọng số: ${step.currentEdge.weight})`);
    } else if (step.currentVertexLabel) {
        log(`[Bước ${step.iteration + 1}] Đỉnh bắt đầu: ${step.currentVertexLabel}`);
    }
}

/* ── Cập nhật highlight và vẽ lại ── */
function _updateCanvasHighlight(step) {
    _primHighlightData = {
        mstEdges: step.mstEdges,
        currentVertex: step.currentVertex,
        currentEdge: step.currentEdge,
        isComplete: step.isComplete || false
    };
    draw();
}

/* ── VẼ CANVAS ── */
function _drawWithPrimHighlight() {
    if (!ctx) return;

    ctx.clearRect(0, 0, canvas.width, canvas.height);

    const startId = getSelectedNodeId('start-node');
    const endId = getSelectedNodeId('end-node');

    const mstEdgeSet = new Set();
    if (_primHighlightData && _primHighlightData.mstEdges) {
        _primHighlightData.mstEdges.forEach(edge => {
            mstEdgeSet.add(`${edge.from}-${edge.to}`);
            mstEdgeSet.add(`${edge.to}-${edge.from}`);
        });
    }

    // Vẽ cạnh
    graph.edges.forEach(e => {
        const a = graph.nodes.find(n => n.id === e.from);
        const b = graph.nodes.find(n => n.id === e.to);
        if (!a || !b) return;

        const angle = Math.atan2(b.y - a.y, b.x - a.x);
        const startX = a.x + NODE_R * Math.cos(angle);
        const startY = a.y + NODE_R * Math.sin(angle);
        const endX = b.x - NODE_R * Math.cos(angle);
        const endY = b.y - NODE_R * Math.sin(angle);

        const isMSTEdge = mstEdgeSet.has(`${e.from}-${e.to}`);
        const isCurrentEdge = _primHighlightData && _primHighlightData.currentEdge &&
            !_primHighlightData.isComplete &&
            ((_primHighlightData.currentEdge.from === e.from && _primHighlightData.currentEdge.to === e.to) ||
                (_primHighlightData.currentEdge.from === e.to && _primHighlightData.currentEdge.to === e.from));

        let strokeColor, lineWidth;

        if (isCurrentEdge) {
            strokeColor = '#f97316';
            lineWidth = 5;
        } else if (isMSTEdge) {
            strokeColor = '#a855f7';
            lineWidth = 4;
        } else {
            strokeColor = '#64748b';
            lineWidth = 2;
        }

        ctx.beginPath();
        ctx.moveTo(startX, startY);
        ctx.lineTo(endX, endY);
        ctx.strokeStyle = strokeColor;
        ctx.lineWidth = lineWidth;

        if (isCurrentEdge) {
            ctx.setLineDash([10, 8]);
        } else {
            ctx.setLineDash([]);
        }
        ctx.stroke();
        ctx.setLineDash([]);

        // Mũi tên
        ctx.beginPath();
        ctx.moveTo(endX, endY);
        ctx.lineTo(endX - 10 * Math.cos(angle - 0.4), endY - 10 * Math.sin(angle - 0.4));
        ctx.lineTo(endX - 10 * Math.cos(angle + 0.4), endY - 10 * Math.sin(angle + 0.4));
        ctx.closePath();
        ctx.fillStyle = strokeColor;
        ctx.fill();

        // Trọng số
        const mx = (a.x + b.x) / 2;
        const my = (a.y + b.y) / 2;

        ctx.fillStyle = '#1e1e2e';
        ctx.beginPath();
        ctx.arc(mx, my, 12, 0, Math.PI * 2);
        ctx.fill();

        if (isMSTEdge) {
            ctx.fillStyle = '#a855f7';
            ctx.font = 'bold 12px sans-serif';
        } else if (isCurrentEdge) {
            ctx.fillStyle = '#f97316';
            ctx.font = 'bold 12px sans-serif';
        } else {
            ctx.fillStyle = '#94a3b8';
            ctx.font = 'bold 11px sans-serif';
        }
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText(e.weight, mx, my);
    });

    // Vẽ đỉnh
    graph.nodes.forEach(n => {
        const isStart = n.id === startId;
        const isEnd = n.id === endId;
        const isCurrentVertex = _primHighlightData &&
            _primHighlightData.currentVertex === n.id &&
            !_primHighlightData.isComplete;

        let fillColor, strokeColor;

        if (isStart) {
            fillColor = '#22c55e';
            strokeColor = '#16a34a';
        } else if (isEnd) {
            fillColor = '#ef4444';
            strokeColor = '#dc2626';
        } else if (isCurrentVertex) {
            fillColor = '#f97316';
            strokeColor = '#ea580c';
        } else {
            fillColor = '#c084fc';
            strokeColor = '#7c3aed';
        }

        ctx.beginPath();
        ctx.arc(n.x, n.y, NODE_R, 0, Math.PI * 2);
        ctx.fillStyle = fillColor;
        ctx.fill();
        ctx.strokeStyle = strokeColor;
        ctx.lineWidth = 2.5;
        ctx.stroke();

        ctx.fillStyle = '#ffffff';
        ctx.font = 'bold 13px sans-serif';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText(n.label, n.x, n.y);

        if (isStart || isEnd) {
            const badge = isStart ? 'S' : 'E';
            const bx = n.x + NODE_R * 0.7;
            const by = n.y - NODE_R * 0.7;
            ctx.beginPath();
            ctx.arc(bx, by, 9, 0, Math.PI * 2);
            ctx.fillStyle = isStart ? '#16a34a' : '#dc2626';
            ctx.fill();
            ctx.fillStyle = '#fff';
            ctx.font = 'bold 10px sans-serif';
            ctx.fillText(badge, bx, by);
        }
    });

    if (_primHighlightData && _primHighlightData.isComplete) {
        ctx.font = 'bold 14px sans-serif';
        ctx.fillStyle = '#a855f7';
        ctx.shadowBlur = 0;
        ctx.textAlign = 'center';
        ctx.fillText('✓ MST Hoàn Thành', canvas.width / 2, 35);
    }
}

/* ── Ghi đè hàm draw ── */
const _originalDrawFunc = window.draw;

window.draw = function () {
    if (_primHighlightData) {
        _drawWithPrimHighlight();
    } else if (_originalDrawFunc) {
        _originalDrawFunc();
    } else {
        _fallbackDraw();
    }
};

function _fallbackDraw() {
    if (!ctx) return;
    ctx.clearRect(0, 0, canvas.width, canvas.height);

    graph.edges.forEach(e => {
        const a = graph.nodes.find(n => n.id === e.from);
        const b = graph.nodes.find(n => n.id === e.to);
        if (!a || !b) return;

        const angle = Math.atan2(b.y - a.y, b.x - a.x);
        const startX = a.x + NODE_R * Math.cos(angle);
        const startY = a.y + NODE_R * Math.sin(angle);
        const endX = b.x - NODE_R * Math.cos(angle);
        const endY = b.y - NODE_R * Math.sin(angle);

        ctx.beginPath();
        ctx.moveTo(startX, startY);
        ctx.lineTo(endX, endY);
        ctx.strokeStyle = '#94a3b8';
        ctx.lineWidth = 2;
        ctx.stroke();

        ctx.beginPath();
        ctx.moveTo(endX, endY);
        ctx.lineTo(endX - 8 * Math.cos(angle - 0.3), endY - 8 * Math.sin(angle - 0.3));
        ctx.lineTo(endX - 8 * Math.cos(angle + 0.3), endY - 8 * Math.sin(angle + 0.3));
        ctx.closePath();
        ctx.fillStyle = '#94a3b8';
        ctx.fill();

        const mx = (a.x + b.x) / 2;
        const my = (a.y + b.y) / 2;
        ctx.fillStyle = '#1e1e2e';
        ctx.beginPath();
        ctx.arc(mx, my, 11, 0, Math.PI * 2);
        ctx.fill();
        ctx.fillStyle = '#64748b';
        ctx.font = 'bold 11px sans-serif';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText(e.weight, mx, my);
    });

    graph.nodes.forEach(n => {
        ctx.beginPath();
        ctx.arc(n.x, n.y, NODE_R, 0, Math.PI * 2);
        ctx.fillStyle = '#c084fc';
        ctx.fill();
        ctx.strokeStyle = '#7c3aed';
        ctx.lineWidth = 2.5;
        ctx.stroke();
        ctx.fillStyle = '#ffffff';
        ctx.font = 'bold 13px sans-serif';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText(n.label, n.x, n.y);
    });
}

function clearHighlight() {
    _primHighlightData = null;
    if (_originalDrawFunc) {
        _originalDrawFunc();
    } else {
        _fallbackDraw();
    }
}

function renderMSTEdges(edges) {
    const tbody = document.getElementById('mst-edge-list');
    if (!tbody) return;

    if (!edges || edges.length === 0) {
        tbody.innerHTML = '<tr><td colspan="3" style="color:var(--text-muted);">Chưa có dữ liệu</td></tr>';
        const countEl = document.getElementById('mst-edge-count');
        if (countEl) countEl.textContent = '0';
        return;
    }

    tbody.innerHTML = edges.map(e => `
        <tr>
            <td style="color:#a855f7; font-weight:700;">${e.fromLabel || e.from}</td>
            <td style="color:#a855f7; font-weight:700;">${e.toLabel || e.to}</td>
            <td style="color:#f97316; font-weight:700;">${e.weight}</td>
        </tr>
    `).join('');

    const countEl = document.getElementById('mst-edge-count');
    if (countEl) countEl.textContent = edges.length;
}

function renderMSTTotal(total) {
    const el = document.getElementById('mst-total');
    if (el) el.textContent = total;
}

function _loadSamplePrim() {
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

    graph.nodes = sampleNodes;
    graph.edges = sampleEdges;

    nodeCounter = 6;
    edgeCounter = 8;
    labelCounter = 6;

    setTimeout(() => {
        const startSelect = document.getElementById('start-node');
        if (startSelect) startSelect.value = '1';
        syncDropdowns();
    }, 100);

    _primHighlightData = null;
    _currentMSTEdges = [];
    _currentMSTTotal = 0;
    renderMSTEdges([]);
    renderMSTTotal(0);

    syncDropdowns();
    draw();
    log('✔ Đã tải đồ thị mẫu. Chọn đỉnh A và nhấn "Xây Dựng MST" để bắt đầu.');

    const hint = document.getElementById('canvas-hint');
    if (hint) hint.style.display = 'none';
}

window._loadSamplePrim = _loadSamplePrim;
window.clearHighlight = clearHighlight;