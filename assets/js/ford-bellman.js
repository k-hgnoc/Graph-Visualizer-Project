/* ════════════════════════════════════════════
   ford-bellman.js - Thuật toán Ford-Bellman
   Animation step-by-step theo phong cách Dijkstra
   ════════════════════════════════════════════ */

window._fbSteps = [];
window._stepIndex = -1;
let _fbTimer = null;
let _fbHighlightData = null;

// Helper: lấy nhãn đỉnh từ ID
function _getNodeLabel(id) {
    const node = graph.nodes.find(n => n.id === id);
    return node ? node.label : id;
}

/* ── Chạy thuật toán Ford-Bellman ── */
function runAlgorithm() {
    if (_fbTimer) clearTimeout(_fbTimer);

    const startId = getSelectedNodeId('start-node');
    const endId   = getSelectedNodeId('end-node');

    if (startId === null || endId === null) {
        log('Vui lòng chọn đỉnh bắt đầu và đỉnh đích.');
        return;
    }

    if (graph.nodes.length === 0) {
        log('Đồ thị trống. Hãy thêm đỉnh và cạnh trước.');
        return;
    }

    const startLabel = _getNodeLabel(startId);
    const endLabel   = _getNodeLabel(endId);

    log(`BẮT ĐẦU Ford-Bellman từ ${startLabel} đến ${endLabel}`);
    log(`Số đỉnh: ${graph.nodes.length} | Số cạnh: ${graph.edges.length}`);

    _fbHighlightData = null;
    _fbSteps = _computeFordBellmanSteps(startId, endId);
    window._fbSteps = _fbSteps;
    _stepIndex = -1;
    window._stepIndex = -1;

    if (_fbSteps.length === 0) {
        log('Không có bước nào để thực thi!');
        return;
    }

    _runStepAnimation(0);
}

/* ── Tính toán toàn bộ các bước Ford-Bellman ── */
function _computeFordBellmanSteps(startId, endId) {
    const steps = [];
    const nodeIds    = graph.nodes.map(n => n.id);
    const nodeLabels = {};
    graph.nodes.forEach(n => { nodeLabels[n.id] = n.label; });

    const totalIter = nodeIds.length - 1;

    // Cạnh có hướng: dùng cả 2 chiều nếu đồ thị vô hướng
    // workspace.js lưu cạnh có hướng nên dùng trực tiếp
    const edges = graph.edges.map(e => ({
        from: e.from, to: e.to, weight: parseFloat(e.weight)
    }));

    // Khởi tạo
    const dist = {};
    const prev = {};
    nodeIds.forEach(u => { dist[u] = Infinity; prev[u] = null; });
    dist[startId] = 0;

    log(`Khởi tạo: dist[${nodeLabels[startId]}] = 0, các đỉnh khác = ∞`);

    // Step khởi tạo
    steps.push({
        type: 'init',
        dist: { ...dist },
        prev: { ...prev },
        currentEdge: null,
        iteration: 0,
        totalIter,
        hasNegCycle: false,
        negativeCycleEdges: [],
        updatedNode: null,
        distMap: _buildFBDistMap(nodeIds, nodeLabels, dist, prev, null)
    });

    // |V| - 1 vòng lặp relaxation
    for (let i = 0; i < totalIter; i++) {
        let anyUpdated = false;

        log(`[Vòng ${i + 1}/${totalIter}] Đang relax tất cả ${edges.length} cạnh...`);

        for (const edge of edges) {
            const { from: u, to: v, weight: w } = edge;
            const labelU = nodeLabels[u] || u;
            const labelV = nodeLabels[v] || v;

            // Snapshot: cạnh đang xét
            steps.push({
                type: 'examine_edge',
                dist: { ...dist },
                prev: { ...prev },
                currentEdge: { from: u, to: v, weight: w },
                iteration: i + 1,
                totalIter,
                hasNegCycle: false,
                negativeCycleEdges: [],
                updatedNode: null,
                distMap: _buildFBDistMap(nodeIds, nodeLabels, dist, prev, null)
            });

            if (dist[u] !== Infinity && dist[u] + w < dist[v]) {
                const oldDist = dist[v] === Infinity ? '∞' : dist[v];
                dist[v] = dist[u] + w;
                prev[v] = u;
                anyUpdated = true;

                log(`  Relax ${labelU} →(${w})→ ${labelV}: CẬP NHẬT ${oldDist} → ${dist[v]}`);

                // Snapshot: cạnh vừa được relax thành công
                steps.push({
                    type: 'relax_update',
                    dist: { ...dist },
                    prev: { ...prev },
                    currentEdge: { from: u, to: v, weight: w },
                    iteration: i + 1,
                    totalIter,
                    hasNegCycle: false,
                    negativeCycleEdges: [],
                    updatedNode: v,
                    distMap: _buildFBDistMap(nodeIds, nodeLabels, dist, prev, v)
                });
            } else {
                log(`  Relax ${labelU} →(${w})→ ${labelV}: bỏ qua (${dist[u] === Infinity ? '∞' : dist[u] + w} ≥ ${dist[v] === Infinity ? '∞' : dist[v]})`);
            }
        }

        // Snapshot cuối vòng lặp
        steps.push({
            type: 'iter_done',
            dist: { ...dist },
            prev: { ...prev },
            currentEdge: null,
            iteration: i + 1,
            totalIter,
            hasNegCycle: false,
            negativeCycleEdges: [],
            updatedNode: null,
            distMap: _buildFBDistMap(nodeIds, nodeLabels, dist, prev, null)
        });

        if (!anyUpdated) {
            log(`  → Không có cập nhật nào ở vòng ${i + 1}, dừng sớm.`);
            break;
        }
    }

    // ── Kiểm tra chu trình âm ──
    let hasNegCycle = false;
    let negCycleEdge = null;
    let negativeCycleEdges = [];

    for (const edge of edges) {
        const { from: u, to: v, weight: w } = edge;
        if (dist[u] !== Infinity && dist[u] + w < dist[v]) {
            hasNegCycle = true;
            negCycleEdge = edge;
            prev[v] = u; // tạm cập nhật để trace
            break;
        }
    }

    if (hasNegCycle && negCycleEdge) {
        // Trace chu trình âm
        let curr = negCycleEdge.to;
        for (let i = 0; i < nodeIds.length; i++) {
            curr = prev[curr];
        }
        // Thu thập các cạnh trong chu trình
        const cycleStart = curr;
        let walker = curr;
        const maxSteps = nodeIds.length + 2;
        let safeCount = 0;
        do {
            const p = prev[walker];
            if (!p) break;
            negativeCycleEdges.push({ from: p, to: walker });
            walker = p;
            safeCount++;
        } while (walker !== cycleStart && safeCount < maxSteps);

        log('⚠ PHÁT HIỆN CHU TRÌNH ÂM! Kết quả không đảm bảo tối ưu.');

        steps.push({
            type: 'neg_cycle',
            dist: { ...dist },
            prev: { ...prev },
            currentEdge: null,
            iteration: totalIter,
            totalIter,
            hasNegCycle: true,
            negativeCycleEdges,
            updatedNode: null,
            distMap: _buildFBDistMap(nodeIds, nodeLabels, dist, prev, null)
        });
    } else {
        // ── Kết quả cuối ──
        const finalDist = dist[endId];
        if (finalDist === Infinity) {
            log(`Không tìm thấy đường đi từ ${nodeLabels[startId]} đến ${nodeLabels[endId]}.`);
        } else {
            const path = [];
            let curr = endId;
            while (curr !== null && curr !== undefined) {
                path.unshift(nodeLabels[curr]);
                curr = prev[curr];
            }
            log(`Đường đi tối ưu: ${path.join(' → ')} | Chi phí: ${finalDist}`);
        }

        steps.push({
            type: 'done',
            dist: { ...dist },
            prev: { ...prev },
            currentEdge: null,
            iteration: totalIter,
            totalIter,
            hasNegCycle: false,
            negativeCycleEdges: [],
            updatedNode: null,
            distMap: _buildFBDistMap(nodeIds, nodeLabels, dist, prev, null),
            endId
        });
    }

    return steps;
}

/* ── Xây dựng bảng khoảng cách ── */
function _buildFBDistMap(nodeIds, nodeLabels, dist, prev, updatedNode) {
    return nodeIds.map(id => ({
        label:   nodeLabels[id],
        dist:    dist[id],
        prev:    prev[id] ? nodeLabels[prev[id]] : null,
        updated: id === updatedNode
    }));
}

/* ── Chạy animation từng bước ── */
function _runStepAnimation(idx) {
    if (idx >= _fbSteps.length) {
        _fbTimer = null;
        log('KẾT THÚC THUẬT TOÁN');
        _displayFinalResult();
        return;
    }

    window._stepIndex = idx;
    applyStep(_fbSteps[idx]);
    updateStepButtons();

    const speedSlider = document.getElementById('speed-slider');
    const speed = speedSlider ? parseInt(speedSlider.value) : 3;
    const delay = 1300 - (speed * 200);

    _fbTimer = setTimeout(() => {
        _runStepAnimation(idx + 1);
    }, Math.max(150, delay));
}

/* ── Áp dụng một bước ── */
function applyStep(step) {
    if (!step) return;

    _fbHighlightData = {
        type:               step.type,
        dist:               step.dist,
        prev:               step.prev,
        currentEdge:        step.currentEdge,
        iteration:          step.iteration,
        totalIter:          step.totalIter,
        hasNegCycle:        step.hasNegCycle,
        negativeCycleEdges: step.negativeCycleEdges || [],
        updatedNode:        step.updatedNode,
        endId:              step.endId || getSelectedNodeId('end-node')
    };

    if (step.distMap) renderRelaxTable(step.distMap);
    if (typeof renderIterCount === 'function') {
        renderIterCount(step.iteration || 0, step.totalIter || 0);
    }
    if (step.hasNegCycle && typeof renderNegCycleResult === 'function') {
        renderNegCycleResult(true);
    }

    draw();
}

/* ── Hiển thị kết quả cuối cùng ── */
function _displayFinalResult() {
    const steps = _fbSteps;
    if (steps.length === 0) return;

    const lastStep = steps[steps.length - 1];
    const endId    = getSelectedNodeId('end-node');
    const startId  = getSelectedNodeId('start-node');

    if (lastStep.hasNegCycle) {
        if (typeof renderNegCycleResult === 'function') renderNegCycleResult(true);
        document.getElementById('res-main').textContent = 'Có chu trình âm';
        document.getElementById('res-sub').textContent  = '—';
        return;
    }

    if (typeof renderNegCycleResult === 'function') renderNegCycleResult(false);

    const dist = lastStep.dist;
    const prev = lastStep.prev;

    if (dist[endId] !== undefined && dist[endId] !== Infinity) {
        const path = [];
        let curr = endId;
        while (curr !== null && curr !== undefined) {
            path.unshift(_getNodeLabel(curr));
            curr = prev[curr];
        }
        document.getElementById('res-main').textContent = path.join(' → ');
        document.getElementById('res-main').classList.remove('placeholder');
        document.getElementById('res-sub').textContent  = dist[endId];
    } else {
        document.getElementById('res-main').textContent = 'Không tìm thấy đường đi';
        document.getElementById('res-sub').textContent  = '∞';
    }

    draw();
}

/* ════════════════════════════════════
   VẼ CANVAS VỚI HIGHLIGHT
   ════════════════════════════════════ */
function _drawWithFBHighlight() {
    if (!ctx) return;
    ctx.clearRect(0, 0, canvas.width, canvas.height);

    const startId = getSelectedNodeId('start-node');
    const endId   = getSelectedNodeId('end-node');
    const hl      = _fbHighlightData;

    // Tập hợp các cạnh trên đường đi tối ưu (prev tree)
    const pathEdges = new Set();
    if (hl && hl.prev) {
        for (const [v, u] of Object.entries(hl.prev)) {
            if (u !== null && u !== undefined) {
                pathEdges.add(`${u}-${v}`);
                pathEdges.add(`${v}-${u}`);
            }
        }
    }

    // Tập cạnh chu trình âm
    const negCycleSet = new Set();
    if (hl && hl.hasNegCycle && hl.negativeCycleEdges) {
        hl.negativeCycleEdges.forEach(ce => {
            negCycleSet.add(`${ce.from}-${ce.to}`);
            negCycleSet.add(`${ce.to}-${ce.from}`);
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

        const isCurrentEdge = hl && hl.currentEdge &&
            hl.currentEdge.from === e.from && hl.currentEdge.to === e.to;
        const isNegCycle = negCycleSet.has(`${e.from}-${e.to}`);
        const isPathEdge = pathEdges.has(`${e.from}-${e.to}`);

        let strokeColor, lineWidth;

        if (isNegCycle) {
            strokeColor = '#ff6b6b';
            lineWidth   = 5;
            ctx.setLineDash([10, 6]);
        } else if (isCurrentEdge) {
            strokeColor = '#f59e0b';
            lineWidth   = 5;
            ctx.setLineDash([10, 8]);
        } else if (isPathEdge && !hl?.hasNegCycle) {
            strokeColor = '#8b5cf6';
            lineWidth   = 4;
            ctx.setLineDash([]);
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

        // Mũi tên
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

        if (isNegCycle)       { ctx.fillStyle = '#ff6b6b'; ctx.font = 'bold 13px sans-serif'; }
        else if (isCurrentEdge) { ctx.fillStyle = '#f59e0b'; ctx.font = 'bold 13px sans-serif'; }
        else if (isPathEdge)    { ctx.fillStyle = '#a855f7'; ctx.font = 'bold 13px sans-serif'; }
        else                    { ctx.fillStyle = '#94a3b8'; ctx.font = 'bold 12px sans-serif'; }

        ctx.textAlign    = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText(e.weight, mx, my);
    });

    // ── Vẽ đỉnh ──
    graph.nodes.forEach(n => {
        const isStart   = n.id === startId;
        const isEnd     = n.id === endId;
        const isUpdated = hl && hl.updatedNode === n.id;

        let fillColor, strokeColor, glowColor;

        if (isStart) {
            fillColor   = '#22c55e';
            strokeColor = '#16a34a';
            glowColor   = '#4ade80';
        } else if (isEnd) {
            fillColor   = '#ef4444';
            strokeColor = '#dc2626';
            glowColor   = '#f87171';
        } else if (isUpdated) {
            fillColor   = '#f59e0b';
            strokeColor = '#d97706';
            glowColor   = '#fbbf24';
        } else {
            fillColor   = '#c084fc';
            strokeColor = '#7c3aed';
            glowColor   = '#a855f7';
        }

        // Glow effect
        if (isStart || isEnd || isUpdated) {
            ctx.save();
            ctx.shadowColor = glowColor;
            ctx.shadowBlur  = 15;
        }

        // Ring cho đỉnh vừa được cập nhật
        if (isUpdated && !isStart && !isEnd) {
            ctx.beginPath();
            ctx.arc(n.x, n.y, NODE_R + 4, 0, Math.PI * 2);
            ctx.fillStyle = 'rgba(245, 158, 11, 0.2)';
            ctx.fill();
        }

        ctx.beginPath();
        ctx.arc(n.x, n.y, NODE_R, 0, Math.PI * 2);
        ctx.fillStyle   = fillColor;
        ctx.fill();
        ctx.strokeStyle = strokeColor;
        ctx.lineWidth   = 3;
        ctx.stroke();

        if (isStart || isEnd || isUpdated) ctx.restore();

        // Nhãn đỉnh
        ctx.fillStyle    = '#ffffff';
        ctx.font         = 'bold 14px sans-serif';
        ctx.textAlign    = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText(n.label, n.x, n.y);

        // Hiển thị khoảng cách phía trên đỉnh
        if (hl && hl.dist) {
            const d = hl.dist[n.id];
            if (d !== undefined && d !== Infinity) {
                ctx.fillStyle = '#fbbf24';
                ctx.font      = 'bold 11px monospace';
                ctx.textAlign = 'center';
                ctx.fillText(d, n.x, n.y - NODE_R - 8);
            } else if (d === Infinity) {
                ctx.fillStyle = '#64748b';
                ctx.font      = '11px monospace';
                ctx.textAlign = 'center';
                ctx.fillText('∞', n.x, n.y - NODE_R - 8);
            }
        }

        // Badge S / E
        if (isStart || isEnd) {
            const badge = isStart ? 'S' : 'E';
            const bx    = n.x + NODE_R * 0.7;
            const by    = n.y - NODE_R * 0.7;
            ctx.beginPath();
            ctx.arc(bx, by, 9, 0, Math.PI * 2);
            ctx.fillStyle = isStart ? '#16a34a' : '#dc2626';
            ctx.fill();
            ctx.fillStyle    = '#fff';
            ctx.font         = 'bold 10px sans-serif';
            ctx.textAlign    = 'center';
            ctx.textBaseline = 'middle';
            ctx.fillText(badge, bx, by);
        }
    });

    // ── Thanh tiến trình vòng lặp ──
    if (hl && hl.totalIter > 0) {
        ctx.font      = 'bold 12px sans-serif';
        ctx.fillStyle = hl.hasNegCycle ? '#ff6b6b' : '#a855f7';
        ctx.shadowBlur = 0;
        ctx.textAlign  = 'left';
        const label = hl.hasNegCycle
            ? '⚠ Chu trình âm!'
            : `Vòng lặp: ${hl.iteration}/${hl.totalIter}`;
        ctx.fillText(label, 15, 30);
    }

    // ── Label cạnh đang xét ──
    if (hl && hl.currentEdge && !hl.hasNegCycle) {
        const u = graph.nodes.find(n => n.id === hl.currentEdge.from);
        const v = graph.nodes.find(n => n.id === hl.currentEdge.to);
        if (u && v) {
            ctx.font      = 'bold 11px sans-serif';
            ctx.fillStyle = '#f59e0b';
            ctx.textAlign = 'right';
            ctx.fillText(
                `Đang xét: ${u.label} →(${hl.currentEdge.weight})→ ${v.label}`,
                canvas.width - 15, 30
            );
        }
    }
}

/* ── Ghi đè hàm draw ── */
const _fbOriginalDraw = window.draw;

window.draw = function () {
    if (_fbHighlightData) {
        _drawWithFBHighlight();
    } else if (_fbOriginalDraw) {
        _fbOriginalDraw();
    } else {
        _fbFallbackDraw();
    }
};

function _fbFallbackDraw() {
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
    _fbHighlightData = null;
    if (_fbOriginalDraw) {
        _fbOriginalDraw();
    } else {
        _fbFallbackDraw();
    }
}

/* ── Load đồ thị mẫu có cạnh âm ── */
function _loadSampleFordBellman() {
    graph.nodes = [];
    graph.edges = [];

    const sampleNodes = [
        { id: 1, x: 100, y: 250, label: 'A' },
        { id: 2, x: 280, y: 130, label: 'B' },
        { id: 3, x: 280, y: 370, label: 'C' },
        { id: 4, x: 460, y: 130, label: 'D' },
        { id: 5, x: 460, y: 370, label: 'E' },
        { id: 6, x: 600, y: 250, label: 'F' }
    ];

    const sampleEdges = [
        { id: 1, from: 1, to: 2, weight:  6 },
        { id: 2, from: 1, to: 3, weight:  7 },
        { id: 3, from: 2, to: 4, weight:  5 },
        { id: 4, from: 2, to: 3, weight:  8 },
        { id: 5, from: 2, to: 5, weight: -4 },
        { id: 6, from: 3, to: 5, weight:  9 },
        { id: 7, from: 3, to: 4, weight: -3 },
        { id: 8, from: 4, to: 6, weight:  2 },
        { id: 9, from: 5, to: 4, weight:  7 },
        { id:10, from: 5, to: 6, weight:  6 }
    ];

    graph.nodes = sampleNodes;
    graph.edges = sampleEdges;
    nodeCounter  = 6;
    edgeCounter  = 10;
    labelCounter = 6;

    setTimeout(() => {
        const startSel = document.getElementById('start-node');
        const endSel   = document.getElementById('end-node');
        if (startSel) startSel.value = '1';
        if (endSel)   endSel.value   = '6';
        syncDropdowns();
    }, 100);

    _fbHighlightData = null;
    syncDropdowns();
    draw();
    log('Đã tải đồ thị mẫu Ford-Bellman (6 đỉnh, có cạnh âm). Nhấn "Bắt Đầu Tìm Đường".');

    const hint = document.getElementById('canvas-hint');
    if (hint) hint.style.display = 'none';
}

window._loadSampleFordBellman = _loadSampleFordBellman;
window.clearHighlight = clearHighlight;
window.applyStep = applyStep;