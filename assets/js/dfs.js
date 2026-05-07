/* ════════════════════════════════════════════
   dfs.js - Depth First Search (Log thuần text, không emoji)
   ════════════════════════════════════════════ */

window._dfsSteps = [];
window._stepIndex = -1;
let _dfsTimer = null;
let _dfsHighlightData = null;

// Helper: lấy nhãn đỉnh từ ID
function _getNodeLabel(id) {
    const node = graph.nodes.find(n => n.id === id);
    return node ? node.label : id;
}

/* ── Chạy DFS ── */
function runAlgorithm() {
    if (_dfsTimer) clearTimeout(_dfsTimer);

    const startId = getSelectedNodeId('start-node');

    if (startId === null) {
        log('⚠ Vui lòng chọn đỉnh xuất phát.');
        return;
    }

    if (graph.nodes.length === 0) {
        log('⚠ Đồ thị trống. Hãy thêm đỉnh và cạnh trước.');
        return;
    }

    const startLabel = _getNodeLabel(startId);
    log(`BAT DAU DFS tu dinh ${startLabel}`);

    _dfsHighlightData = null;
    _dfsSteps = _computeDFSSteps(startId);
    _stepIndex = -1;

    if (_dfsSteps.length === 0) {
        log('Khong the thuc hien DFS.');
        return;
    }

    _runStepAnimation(0);
}

/* ── Tính toán các bước DFS (log đầy đủ, không emoji) ── */
function _computeDFSSteps(startId) {
    const steps = [];
    const nodeLabels = {};
    graph.nodes.forEach(n => { nodeLabels[n.id] = n.label; });

    // Xây dựng adjacency list
    const adj = {};
    graph.nodes.forEach(n => { adj[n.id] = []; });
    graph.edges.forEach(e => {
        adj[e.from].push(e.to);
        adj[e.to].push(e.from);
    });

    // Sắp xếp neighbor theo alphabet
    for (const u in adj) {
        adj[u].sort();
    }

    // DFS state
    const visited = new Set();
    const visiting = new Set();
    const parent = {};
    const treeEdges = [];
    const backEdges = [];
    const visitOrder = [];

    let hasCycle = false;
    let componentCount = 0;
    let stepCounter = 0;
    let maxDepth = 0;

    // Hàm DFS đệ quy
    function dfsRecursive(u, p, depth) {
        if (depth > maxDepth) maxDepth = depth;
        // BƯỚC 1: Thăm đỉnh mới
        visited.add(u);
        visiting.add(u);
        parent[u] = p;

        log(`[${stepCounter + 1}] Tham dinh ${nodeLabels[u]}${p ? ` (tu ${nodeLabels[p]})` : ' (diem bat dau)'}`);

        steps.push({
            stepId: stepCounter++,
            action: 'visit',
            visited: new Set(visited),
            visiting: new Set(visiting),
            current: u,
            currentLabel: nodeLabels[u],
            treeEdges: [...treeEdges],
            backEdges: [...backEdges],
            visitOrder: [...visitOrder],
            hasCycle: hasCycle,
            componentCount: componentCount + (visitOrder.length === 0 ? 1 : 0),
            maxDepth: maxDepth,
            visitedCount: visited.size
        });

        visitOrder.push(u);

        // Xét các đỉnh kề
        const neighbors = adj[u] || [];

        for (const v of neighbors) {
            if (v === p) {
                log(`[${stepCounter + 1}] Bo qua canh ${nodeLabels[u]} -> ${nodeLabels[v]} (quay lai dinh cha)`);
                steps.push({
                    stepId: stepCounter++,
                    action: 'skip_parent',
                    visited: new Set(visited),
                    visiting: new Set(visiting),
                    current: u,
                    skipVertex: v,
                    treeEdges: [...treeEdges],
                    backEdges: [...backEdges],
                    visitOrder: [...visitOrder],
                    hasCycle: hasCycle,
                    componentCount: componentCount,
                    maxDepth: maxDepth,
                    visitedCount: visited.size
                });
                continue;
            }

            if (!visited.has(v)) {
                // Tree edge - sẽ đi tiếp
                treeEdges.push({ from: u, to: v });

                log(`[${stepCounter + 1}] Tree edge: ${nodeLabels[u]} -> ${nodeLabels[v]} (chua tham, se de quy)`);
                steps.push({
                    stepId: stepCounter++,
                    action: 'tree_edge',
                    visited: new Set(visited),
                    visiting: new Set(visiting),
                    current: u,
                    nextVertex: v,
                    currentEdge: { from: u, to: v },
                    edgeType: 'tree',
                    treeEdges: [...treeEdges],
                    backEdges: [...backEdges],
                    visitOrder: [...visitOrder],
                    hasCycle: hasCycle,
                    componentCount: componentCount,
                    maxDepth: maxDepth,
                    visitedCount: visited.size
                });

                dfsRecursive(v, u, depth + 1);
            }
            else if (visiting.has(v)) {
                // Back edge - phát hiện chu trình
                if (!hasCycle) {
                    hasCycle = true;
                }
                backEdges.push({ from: u, to: v });

                log(`[${stepCounter + 1}] Back edge: ${nodeLabels[u]} -> ${nodeLabels[v]} (PHAT HIEN CHU TRINH!)`);
                steps.push({
                    stepId: stepCounter++,
                    action: 'back_edge',
                    visited: new Set(visited),
                    visiting: new Set(visiting),
                    current: u,
                    backVertex: v,
                    currentEdge: { from: u, to: v },
                    edgeType: 'back',
                    treeEdges: [...treeEdges],
                    backEdges: [...backEdges],
                    visitOrder: [...visitOrder],
                    hasCycle: hasCycle,
                    componentCount: componentCount,
                    maxDepth: maxDepth,
                    visitedCount: visited.size
                });
            }
            else {
                // Forward/Cross edge (đã thăm và không còn trong stack)
                log(`[${stepCounter + 1}] Forward/Cross edge: ${nodeLabels[u]} -> ${nodeLabels[v]} (da tham truoc do)`);
                steps.push({
                    stepId: stepCounter++,
                    action: 'forward_edge',
                    visited: new Set(visited),
                    visiting: new Set(visiting),
                    current: u,
                    forwardVertex: v,
                    treeEdges: [...treeEdges],
                    backEdges: [...backEdges],
                    visitOrder: [...visitOrder],
                    hasCycle: hasCycle,
                    componentCount: componentCount,
                    maxDepth: maxDepth,
                    visitedCount: visited.size
                });
            }
        }

        // Kết thúc xử lý đỉnh - quay lui
        visiting.delete(u);

        log(`[${stepCounter + 1}] Quay lui khoi dinh ${nodeLabels[u]}`);
        steps.push({
            stepId: stepCounter++,
            action: 'backtrack',
            visited: new Set(visited),
            visiting: new Set(visiting),
            current: null,
            backtrackVertex: u,
            treeEdges: [...treeEdges],
            backEdges: [...backEdges],
            visitOrder: [...visitOrder],
            hasCycle: hasCycle,
            componentCount: componentCount,
            maxDepth: maxDepth,
            visitedCount: visited.size,
            finished: true
        });
    }

    // Đếm số thành phần liên thông
    const allNodes = graph.nodes.map(n => n.id);
    let remaining = new Set(allNodes);

    while (remaining.size > 0) {
        let nextStart = null;
        for (const node of remaining) {
            if (!visited.has(node)) {
                nextStart = node;
                break;
            }
        }

        if (nextStart === null) break;

        componentCount++;

        if (nextStart !== startId || steps.length === 0) {
            log(`Thanh phan lien thong #${componentCount} (bat dau tu dinh ${nodeLabels[nextStart]})`);
        }

        dfsRecursive(nextStart, null, 0);

        remaining = new Set(allNodes.filter(n => !visited.has(n)));
    }

    log(`KET QUA:`);
    log(`  - So thanh phan lien thong: ${componentCount}`);
    log(`  - ${hasCycle ? 'CO chu trinh trong do thi' : 'KHONG co chu trinh'}`);
    log(`  - Thu tu duyet: ${visitOrder.map(id => nodeLabels[id]).join(' -> ')}`);

    return steps;
}

/* ── Chạy animation từng bước ── */
function _runStepAnimation(idx) {
    if (idx >= _dfsSteps.length) {
        _dfsTimer = null;
        log('KET THUC DFS');
        _displayFinalResult();
        return;
    }

    window._dfsSteps = _dfsSteps;
    window._stepIndex = idx;
    _applyStep(_dfsSteps[idx]);
    updateStepButtons();

    const speedSlider = document.getElementById('speed-slider');
    const speed = speedSlider ? parseInt(speedSlider.value) : 3;
    const delay = 1300 - (speed * 200);

    _dfsTimer = setTimeout(() => {
        _runStepAnimation(idx + 1);
    }, Math.max(150, delay));
}

/* ── Áp dụng một bước (cập nhật UI và vẽ) ── */
function _applyStep(step) {
    if (!step) return;

    _dfsHighlightData = {
        visited: step.visited,
        visiting: step.visiting,
        current: step.current,
        currentEdge: step.currentEdge,
        edgeType: step.edgeType,
        treeEdges: step.treeEdges,
        backEdges: step.backEdges
    };

    // Cập nhật UI thứ tự duyệt
    if (step.visitOrder && step.visitOrder.length > 0) {
        const orderLabels = step.visitOrder.map(id => _getNodeLabel(id));
        renderVisitedOrder(orderLabels);
    }

    // Cập nhật chu trình
    if (step.hasCycle !== undefined) {
        renderCycleResult(step.hasCycle);
    }

    // Cập nhật số thành phần liên thông
    if (step.componentCount !== undefined) {
        renderComponentCount(step.componentCount);
    }

    // Cập nhật số đỉnh đã thăm
    if (typeof renderVisitedCount === 'function' && step.visitedCount !== undefined) {
        renderVisitedCount(step.visitedCount, graph.nodes.length);
    }

    // Cập nhật độ sâu lớn nhất
    if (typeof renderMaxDepth === 'function' && step.maxDepth !== undefined) {
        renderMaxDepth(step.maxDepth);
    }

    draw();
}

/* ── Hiển thị kết quả cuối cùng ── */
function _displayFinalResult() {
    const steps = _dfsSteps;
    if (steps.length === 0) return;

    let lastStep = steps[steps.length - 1];
    for (let i = steps.length - 1; i >= 0; i--) {
        if (steps[i].visitOrder && steps[i].visitOrder.length > 0) {
            lastStep = steps[i];
            break;
        }
    }

    if (lastStep.visitOrder) {
        const visitOrderLabels = lastStep.visitOrder.map(id => _getNodeLabel(id));
        renderVisitedOrder(visitOrderLabels);
    }

    if (lastStep.hasCycle !== undefined) {
        renderCycleResult(lastStep.hasCycle);
    }

    if (lastStep.componentCount !== undefined) {
        renderComponentCount(lastStep.componentCount);
    }

    // Đỉnh bắt đầu
    if (typeof renderStartNode === 'function') {
        const startId = getSelectedNodeId('start-node');
        renderStartNode(_getNodeLabel(startId));
    }

    // Số đỉnh đã thăm (lấy từ step cuối cùng)
    if (typeof renderVisitedCount === 'function') {
        const finalVisited = steps[steps.length - 1].visitedCount ?? lastStep.visitedCount ?? 0;
        renderVisitedCount(finalVisited, graph.nodes.length);
    }

    // Độ sâu lớn nhất (lấy max trong toàn bộ steps)
    if (typeof renderMaxDepth === 'function') {
        let maxD = 0;
        steps.forEach(s => { if (s.maxDepth !== undefined && s.maxDepth > maxD) maxD = s.maxDepth; });
        renderMaxDepth(maxD);
    }

    draw();
}

/* ── VẼ CANVAS VỚI HIGHLIGHT DFS ── */
function _drawWithDfsHighlight() {
    if (!ctx) return;

    ctx.clearRect(0, 0, canvas.width, canvas.height);

    const startId = getSelectedNodeId('start-node');
    const endId = getSelectedNodeId('end-node');

    const treeEdgeSet = new Set();
    const backEdgeSet = new Set();

    if (_dfsHighlightData) {
        (_dfsHighlightData.treeEdges || []).forEach(e => {
            treeEdgeSet.add(`${e.from}-${e.to}`);
            treeEdgeSet.add(`${e.to}-${e.from}`);
        });
        (_dfsHighlightData.backEdges || []).forEach(e => {
            backEdgeSet.add(`${e.from}-${e.to}`);
            backEdgeSet.add(`${e.to}-${e.from}`);
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

        const isTreeEdge = treeEdgeSet.has(`${e.from}-${e.to}`);
        const isBackEdge = backEdgeSet.has(`${e.from}-${e.to}`);
        const isCurrentEdge = _dfsHighlightData && _dfsHighlightData.currentEdge &&
            ((_dfsHighlightData.currentEdge.from === e.from && _dfsHighlightData.currentEdge.to === e.to) ||
                (_dfsHighlightData.currentEdge.from === e.to && _dfsHighlightData.currentEdge.to === e.from));

        let strokeColor, lineWidth;

        if (isCurrentEdge) {
            if (_dfsHighlightData.edgeType === 'back') {
                strokeColor = '#ef4444';
                lineWidth = 5;
            } else {
                strokeColor = '#f59e0b';
                lineWidth = 4;
            }
        } else if (isTreeEdge) {
            strokeColor = '#8b5cf6';
            lineWidth = 3.5;
        } else if (isBackEdge) {
            strokeColor = '#ef4444';
            lineWidth = 3;
            ctx.setLineDash([8, 6]);
        } else {
            strokeColor = '#64748b';
            lineWidth = 2;
        }

        ctx.beginPath();
        ctx.moveTo(startX, startY);
        ctx.lineTo(endX, endY);
        ctx.strokeStyle = strokeColor;
        ctx.lineWidth = lineWidth;
        ctx.stroke();
        ctx.setLineDash([]);

        ctx.beginPath();
        ctx.moveTo(endX, endY);
        ctx.lineTo(endX - 8 * Math.cos(angle - 0.3), endY - 8 * Math.sin(angle - 0.3));
        ctx.lineTo(endX - 8 * Math.cos(angle + 0.3), endY - 8 * Math.sin(angle + 0.3));
        ctx.closePath();
        ctx.fillStyle = strokeColor;
        ctx.fill();

        const mx = (a.x + b.x) / 2;
        const my = (a.y + b.y) / 2;
        ctx.fillStyle = '#1e1e2e';
        ctx.beginPath();
        ctx.arc(mx, my, 12, 0, Math.PI * 2);
        ctx.fill();
        ctx.fillStyle = strokeColor === '#64748b' ? '#94a3b8' : strokeColor;
        ctx.font = 'bold 11px sans-serif';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText(e.weight, mx, my);
    });

    // Vẽ đỉnh
    graph.nodes.forEach(n => {
        const isStart = n.id === startId;
        const isEnd = n.id === endId;
        const isVisited = _dfsHighlightData && _dfsHighlightData.visited && _dfsHighlightData.visited.has(n.id);
        const isVisiting = _dfsHighlightData && _dfsHighlightData.visiting && _dfsHighlightData.visiting.has(n.id);
        const isCurrent = _dfsHighlightData && _dfsHighlightData.current === n.id;

        let fillColor, strokeColor;

        if (isStart) {
            fillColor = '#22c55e';
            strokeColor = '#16a34a';
        } else if (isEnd && !isStart) {
            fillColor = '#ef4444';
            strokeColor = '#dc2626';
        } else if (isCurrent) {
            fillColor = '#f59e0b';
            strokeColor = '#d97706';
        } else if (isVisiting) {
            fillColor = '#fbbf24';
            strokeColor = '#f59e0b';
        } else if (isVisited) {
            fillColor = '#a855f7';
            strokeColor = '#7c3aed';
        } else {
            fillColor = '#c084fc';
            strokeColor = '#7c3aed';
        }

        if (isCurrent) {
            ctx.save();
            ctx.shadowColor = '#f59e0b';
            ctx.shadowBlur = 12;
        }

        ctx.beginPath();
        ctx.arc(n.x, n.y, NODE_R, 0, Math.PI * 2);
        ctx.fillStyle = fillColor;
        ctx.fill();
        ctx.strokeStyle = strokeColor;
        ctx.lineWidth = 2.5;
        ctx.stroke();

        if (isCurrent) {
            ctx.restore();
        }

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
            ctx.arc(bx, by, 8, 0, Math.PI * 2);
            ctx.fillStyle = isStart ? '#16a34a' : '#dc2626';
            ctx.fill();
            ctx.fillStyle = '#fff';
            ctx.font = 'bold 9px sans-serif';
            ctx.fillText(badge, bx, by);
        }
    });
}

/* ── Ghi đè hàm draw ── */
const _dfsOriginalDraw = window.draw;

window.draw = function () {
    if (_dfsHighlightData) {
        _drawWithDfsHighlight();
    } else if (_dfsOriginalDraw) {
        _dfsOriginalDraw();
    } else {
        _dfsFallbackDraw();
    }
};

function _dfsFallbackDraw() {
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
    _dfsHighlightData = null;
    if (_dfsOriginalDraw) {
        _dfsOriginalDraw();
    } else {
        _dfsFallbackDraw();
    }
}

function renderVisitedOrder(labels) {
    const el = document.getElementById('visited-order');
    if (!el) return;
    el.innerHTML = labels.map(l => `<span class="visited-badge">${l}</span>`).join('');
}

function renderCycleResult(hasCycle) {
    const el = document.getElementById('cycle-result');
    if (!el) return;
    el.innerHTML = hasCycle
        ? '<span class="cycle-badge cycle-yes">CO chu trinh</span>'
        : '<span class="cycle-badge cycle-no">KHONG co chu trinh</span>';
}

function renderComponentCount(n) {
    const el = document.getElementById('component-count');
    if (el) el.textContent = n;
}

function _loadSampleDFS() {
    graph.nodes = [];
    graph.edges = [];

    // Đồ thị phức tạp hơn để thể hiện DFS rõ ràng
    // Có nhánh sâu, chu trình và nhiều hướng đi

    const sampleNodes = [
        { id: 1, x: 120, y: 220, label: 'A' },
        { id: 2, x: 250, y: 100, label: 'B' },
        { id: 3, x: 250, y: 340, label: 'C' },
        { id: 4, x: 420, y: 80, label: 'D' },
        { id: 5, x: 420, y: 200, label: 'E' },
        { id: 6, x: 420, y: 340, label: 'F' },
        { id: 7, x: 600, y: 120, label: 'G' },
        { id: 8, x: 600, y: 300, label: 'H' }
    ];

    const sampleEdges = [
        // Nhánh chính
        { id: 1, from: 1, to: 2, weight: 1 },
        { id: 2, from: 1, to: 3, weight: 1 },

        // DFS sẽ đi sâu từ B
        { id: 3, from: 2, to: 4, weight: 1 },
        { id: 4, from: 2, to: 5, weight: 1 },

        // Đi tiếp xuống sâu
        { id: 5, from: 4, to: 7, weight: 1 },

        // Tạo chu trình
        { id: 6, from: 7, to: 5, weight: 1 },
        { id: 7, from: 5, to: 2, weight: 1 },

        // Nhánh khác từ A
        { id: 8, from: 3, to: 6, weight: 1 },

        // DFS quay lui rồi đi tiếp
        { id: 9, from: 6, to: 8, weight: 1 },

        // Nối chéo tạo nhiều lựa chọn
        { id: 10, from: 5, to: 6, weight: 1 }
    ];

    graph.nodes = sampleNodes;
    graph.edges = sampleEdges;

    nodeCounter = sampleNodes.length;
    edgeCounter = sampleEdges.length;
    labelCounter = sampleNodes.length;

    setTimeout(() => {
        const startSelect = document.getElementById('start-node');
        if (startSelect) startSelect.value = '1';
        syncDropdowns();
    }, 100);

    _dfsHighlightData = null;

    syncDropdowns();
    draw();

    log('Đã tải đồ thị mẫu DFS nâng cao.');

    const hint = document.getElementById('canvas-hint');
    if (hint) hint.style.display = 'none';
}

window._loadSampleDFS = _loadSampleDFS;
window.clearHighlight = clearHighlight;