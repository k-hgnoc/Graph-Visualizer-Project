/* ════════════════════════════════════════════
   dijkstra.js - Thuật toán Dijkstra
   CHAY QUA TAT CA CAC DINH (kể cả đỉnh cô lập)
   ════════════════════════════════════════════ */

window._dijkstraSteps = [];
window._stepIndex = -1;
let _dijkstraTimer = null;
let _dijkstraHighlightData = null;

// Helper: lấy nhãn đỉnh từ ID
function _getNodeLabel(id) {
    const node = graph.nodes.find(n => n.id === id);
    return node ? node.label : id;
}

/* ── Chạy thuật toán Dijkstra ── */
function runAlgorithm() {
    if (_dijkstraTimer) clearTimeout(_dijkstraTimer);

    const startId = getSelectedNodeId('start-node');
    const endId = getSelectedNodeId('end-node');
    const waypoints = getWaypoints();

    if (startId === null || endId === null) {
        log('Vui long chon dinh bat dau va dinh dich.');
        return;
    }

    if (graph.nodes.length === 0) {
        log('Do thi trong. Hay them dinh va canh truoc.');
        return;
    }

    const startLabel = _getNodeLabel(startId);
    const endLabel = _getNodeLabel(endId);
    const totalNodes = graph.nodes.length;

    log(`BAT DAU Dijkstra tu ${startLabel} den ${endLabel}`);
    log(`TONG SO DINH TRONG DO THI: ${totalNodes}`);

    if (waypoints.length > 0) {
        const waypointLabels = waypoints.map(id => _getNodeLabel(id));
        log(`Diem trung gian: ${waypointLabels.join(' -> ')}`);
    }

    _dijkstraHighlightData = null;
    _dijkstraSteps = _computeDijkstraWithWaypoints(startId, endId, waypoints);
    _stepIndex = -1;

    if (_dijkstraSteps.length === 0) {
        log('Khong tim thay duong di!');
        return;
    }

    _runStepAnimation(0);
}

/* ── Tính toán Dijkstra với waypoints ── */
function _computeDijkstraWithWaypoints(startId, endId, waypoints) {
    const route = [startId, ...waypoints, endId];
    const allSteps = [];
    let currentStart = startId;
    let globalStepCounter = 0;

    for (let i = 0; i < route.length - 1; i++) {
        const target = route[i + 1];
        const segmentStartLabel = _getNodeLabel(currentStart);
        const segmentTargetLabel = _getNodeLabel(target);

        if (route.length > 2) {
            log(`[Doan ${i + 1}] ${segmentStartLabel} -> ${segmentTargetLabel}`);
        }

        const steps = _computeDijkstraSteps(currentStart, target, globalStepCounter);

        if (steps.length === 0) {
            log(`Khong tim duoc duong tu ${segmentStartLabel} den ${segmentTargetLabel}`);
            return [];
        }

        steps.forEach(step => {
            step.segment = i;
            step.segmentStart = currentStart;
            step.segmentTarget = target;
        });

        allSteps.push(...steps);
        globalStepCounter += steps.length;
        currentStart = target;
    }

    return allSteps;
}

/* ── Tính toán các bước Dijkstra (CHAY QUA TAT CA CAC DINH) ── */
function _computeDijkstraSteps(startId, endId, startStepCounter) {
    const steps = [];
    const nodeIds = graph.nodes.map(n => n.id);
    const nodeLabels = {};
    graph.nodes.forEach(n => { nodeLabels[n.id] = n.label; });
    const totalVertices = nodeIds.length;

    // Xây dựng adjacency list
    const adj = {};
    nodeIds.forEach(u => { adj[u] = []; });
    graph.edges.forEach(e => {
        adj[e.from].push({ to: e.to, weight: e.weight });
        adj[e.to].push({ to: e.from, weight: e.weight });
    });

    // Khởi tạo
    const dist = {};
    const prev = {};
    const settled = new Set();
    const settledOrder = [];

    nodeIds.forEach(u => {
        dist[u] = Infinity;
        prev[u] = null;
    });
    dist[startId] = 0;

    // Danh sách các đỉnh chưa xét (BAN DAU LA TAT CA CAC DINH)
    let remaining = [...nodeIds];
    let stepCounter = startStepCounter;
    let iteration = 0;

    log(`Khoi tao: dist[${nodeLabels[startId]}] = 0, cac dinh khac = INF`);
    log(`Danh sach cac dinh can xet: ${nodeIds.map(id => nodeLabels[id]).join(', ')}`);

    // CHAY CHO DEN KHI HET TAT CA CAC DINH TRONG remaining
    while (remaining.length > 0) {
        // Tim dinh co dist nho nhat trong so cac dinh chua xet
        let u = null;
        let minDist = Infinity;

        log(`  Dang tim dinh nho nhat trong ${remaining.length} dinh chua xet: ${remaining.map(id => nodeLabels[id]).join(', ')}`);

        for (const v of remaining) {
            const distV = dist[v] === Infinity ? Infinity : dist[v];
            if (distV < minDist) {
                minDist = distV;
                u = v;
            }
        }

        // Neu u = null hoac dist[u] = Infinity => cac dinh con lai khong the tiep can
        if (u === null || dist[u] === Infinity) {
            log(`  Cac dinh con lai KHONG THE TIEP CAN tu dinh xuat phat:`);
            for (const v of remaining) {
                if (!settled.has(v)) {
                    log(`    --> Dinh ${nodeLabels[v]}: KHONG CO DUONG DI (dist = INF) - danh dau da xet`);
                    settled.add(v);
                    settledOrder.push(v);

                    steps.push({
                        stepId: stepCounter++,
                        iteration: iteration++,
                        dist: { ...dist },
                        prev: { ...prev },
                        settled: new Set(settled),
                        current: v,
                        currentLabel: nodeLabels[v],
                        currentEdge: null,
                        distMap: _buildDistMap(nodeIds, nodeLabels, dist, prev, settled),
                        isComplete: false,
                        isUnreachable: true,
                        settledCount: settled.size,
                        totalVertices: totalVertices
                    });
                }
            }
            break;
        }

        // Danh dau dinh u da duoc xet
        settled.add(u);
        settledOrder.push(u);

        const distToU = dist[u] === Infinity ? 'INF' : dist[u];
        const isEndVertex = u === endId;

        log(`[Lan ${iteration + 1}] CHON DINH ${nodeLabels[u]} (dist = ${distToU}) - DA XET: ${settled.size}/${totalVertices} dinh`);

        // Snapshot TRUOC KHI RELAX
        steps.push({
            stepId: stepCounter++,
            iteration: iteration,
            dist: { ...dist },
            prev: { ...prev },
            settled: new Set(settled),
            current: u,
            currentLabel: nodeLabels[u],
            currentEdge: null,
            distMap: _buildDistMap(nodeIds, nodeLabels, dist, prev, settled),
            isComplete: false,
            isUnreachable: false,
            settledCount: settled.size,
            totalVertices: totalVertices,
            action: 'select_vertex'
        });

        // Relax cac canh tu u
        const neighbors = adj[u] || [];

        if (neighbors.length === 0) {
            log(`  --> Dinh ${nodeLabels[u]} KHONG CO CANH NOI VOI DINH NAO`);
        }

        for (const edge of neighbors) {
            const v = edge.to;
            if (!settled.has(v)) {
                const newDist = dist[u] + edge.weight;
                const oldDistShow = dist[v] === Infinity ? 'INF' : dist[v];
                const newDistShow = newDist;

                if (newDist < dist[v]) {
                    dist[v] = newDist;
                    prev[v] = u;

                    log(`  --> Relax: ${nodeLabels[u]} -(${edge.weight})-> ${nodeLabels[v]}: CAP NHAT ${oldDistShow} -> ${newDistShow}`);

                    steps.push({
                        stepId: stepCounter++,
                        iteration: iteration,
                        dist: { ...dist },
                        prev: { ...prev },
                        settled: new Set(settled),
                        current: u,
                        currentLabel: nodeLabels[u],
                        currentEdge: { from: u, to: v, weight: edge.weight },
                        distMap: _buildDistMap(nodeIds, nodeLabels, dist, prev, settled),
                        isComplete: false,
                        isRelaxStep: true,
                        relaxFrom: u,
                        relaxTo: v,
                        relaxWeight: edge.weight,
                        newDist: newDist,
                        settledCount: settled.size,
                        totalVertices: totalVertices
                    });
                } else {
                    log(`  --> Relax: ${nodeLabels[u]} -(${edge.weight})-> ${nodeLabels[v]}: KHONG CAP NHAT (${newDistShow} >= ${oldDistShow})`);

                    steps.push({
                        stepId: stepCounter++,
                        iteration: iteration,
                        dist: { ...dist },
                        prev: { ...prev },
                        settled: new Set(settled),
                        current: u,
                        currentLabel: nodeLabels[u],
                        currentEdge: { from: u, to: v, weight: edge.weight },
                        distMap: _buildDistMap(nodeIds, nodeLabels, dist, prev, settled),
                        isComplete: false,
                        isRelaxStep: true,
                        relaxFrom: u,
                        relaxTo: v,
                        relaxWeight: edge.weight,
                        isUpdated: false,
                        settledCount: settled.size,
                        totalVertices: totalVertices
                    });
                }
            }
        }

        if (isEndVertex) {
            log(`  !!! DA TIM THAY DINH DICH ${nodeLabels[u]} !!! NHUNG VAN TIEP TUC XET CAC DINH CON LAI...`);
        }

        // LOAI BO u KHOI DANH SACH remaining
        remaining = remaining.filter(v => v !== u);

        log(`  Con lai ${remaining.length} dinh chua xet: ${remaining.length > 0 ? remaining.map(id => nodeLabels[id]).join(', ') : 'KHONG CON'}`);

        iteration++;

        // Snapshot sau khi xet xong dinh u
        steps.push({
            stepId: stepCounter++,
            iteration: iteration,
            dist: { ...dist },
            prev: { ...prev },
            settled: new Set(settled),
            current: null,
            currentLabel: null,
            currentEdge: null,
            distMap: _buildDistMap(nodeIds, nodeLabels, dist, prev, settled),
            isComplete: false,
            action: 'vertex_done',
            settledCount: settled.size,
            totalVertices: totalVertices
        });
    }

    // KET THUC - DA XET HET TAT CA CAC DINH
    log(`DA XET HET TAT CA ${totalVertices} DINH`);
    log(`Thu tu cac dinh da duoc xac dinh: ${settledOrder.map(id => nodeLabels[id]).join(' -> ')}`);

    // HIEN THI KET QUA KHOANG CACH CUOI CUNG CHO TAT CA CAC DINH
    log('KHOANG CACH TU DINH XUAT PHAT DEN CAC DINH KHAC:');
    for (const id of nodeIds) {
        const distVal = dist[id] === Infinity ? 'KHONG CO DUONG DI (INF)' : dist[id];
        const prevVal = prev[id] ? nodeLabels[prev[id]] : '-';
        log(`  ${nodeLabels[id]}: dist = ${distVal}, previous = ${prevVal}`);
    }

    // Tai tao duong di den dich
    const path = [];
    let current = endId;
    while (current !== null && current !== undefined && prev[current] !== undefined && prev[current] !== null) {
        path.unshift(current);
        current = prev[current];
    }
    if (current === startId) {
        path.unshift(startId);
    }

    if (path.length > 1 && path[0] === startId) {
        const pathLabels = path.map(id => nodeLabels[id]);
        const totalDist = dist[endId] === Infinity ? 'KHONG CO DUONG DI' : dist[endId];
        log(`DUONG DI TU ${nodeLabels[startId]} DEN ${nodeLabels[endId]}: ${pathLabels.join(' -> ')}`);
        log(`TONG CHI PHI: ${totalDist}`);
    } else if (path.length === 1 && path[0] === startId && startId === endId) {
        log(`DIEM BAT DAU TRUNG VOI DIEM DICH: ${nodeLabels[startId]}`);
    } else {
        log(`KHONG TON TAI DUONG DI TU ${nodeLabels[startId]} DEN ${nodeLabels[endId]}`);
    }

    return steps;
}

/* ── Xây dựng bảng khoảng cách ── */
function _buildDistMap(nodeIds, nodeLabels, dist, prev, settled) {
    return nodeIds.map(id => ({
        label: nodeLabels[id],
        dist: dist[id],
        prev: prev[id] ? nodeLabels[prev[id]] : null,
        final: settled.has(id)
    }));
}

/* ── Chạy animation từng bước ── */
function _runStepAnimation(idx) {
    if (idx >= _dijkstraSteps.length) {
        _dijkstraTimer = null;
        log('KET THUC THUAT TOAN');
        _displayFinalResult();
        return;
    }

    window._dijkstraSteps = _dijkstraSteps;
    window._stepIndex = idx;
    _applyStep(_dijkstraSteps[idx]);
    updateStepButtons();

    const speedSlider = document.getElementById('speed-slider');
    const speed = speedSlider ? parseInt(speedSlider.value) : 3;
    const delay = 1300 - (speed * 200);

    _dijkstraTimer = setTimeout(() => {
        _runStepAnimation(idx + 1);
    }, Math.max(150, delay));
}

/* ── Áp dụng một bước ── */
function _applyStep(step) {
    if (!step) return;

    _dijkstraHighlightData = {
        settled: step.settled,
        current: step.current,
        currentEdge: step.currentEdge,
        distMap: step.distMap,
        isRelaxStep: step.isRelaxStep,
        relaxFrom: step.relaxFrom,
        relaxTo: step.relaxTo,
        relaxWeight: step.relaxWeight,
        settledCount: step.settledCount,
        totalVertices: step.totalVertices
    };

    if (step.distMap) {
        renderDistTable(step.distMap);
    }

    draw();
}

/* ── Hiển thị kết quả cuối cùng ── */
function _displayFinalResult() {
    const steps = _dijkstraSteps;
    if (steps.length === 0) return;

    let lastStep = steps[steps.length - 1];
    for (let i = steps.length - 1; i >= 0; i--) {
        if (steps[i].distMap && steps[i].distMap.length > 0) {
            lastStep = steps[i];
            break;
        }
    }

    const endId = getSelectedNodeId('end-node');

    if (lastStep.dist && lastStep.dist[endId] !== undefined && lastStep.dist[endId] !== Infinity) {
        const path = [];
        let current = endId;
        while (current !== null && current !== undefined && lastStep.prev && lastStep.prev[current] !== undefined && lastStep.prev[current] !== null) {
            path.unshift(current);
            current = lastStep.prev[current];
        }
        if (current === getSelectedNodeId('start-node')) {
            path.unshift(current);
        }

        if (path.length > 1) {
            const pathLabels = path.map(id => _getNodeLabel(id));
            const pathStr = pathLabels.join(' -> ');

            document.getElementById('res-main').textContent = pathStr;
            document.getElementById('res-main').classList.remove('placeholder');
            document.getElementById('res-sub').textContent = lastStep.dist[endId];
        } else {
            document.getElementById('res-main').textContent = 'Khong tim thay duong di';
            document.getElementById('res-sub').textContent = 'INF';
        }
    } else {
        document.getElementById('res-main').textContent = 'Khong tim thay duong di';
        document.getElementById('res-sub').textContent = 'INF';
    }

    draw();
}

/* ── VẼ CANVAS VOI HIGHLIGHT ── */
function _drawWithDijkstraHighlight() {
    if (!ctx) return;

    ctx.clearRect(0, 0, canvas.width, canvas.height);

    const startId = getSelectedNodeId('start-node');
    const endId = getSelectedNodeId('end-node');

    // Tao set cac canh da xac dinh (tu prev)
    const pathEdges = new Set();
    if (_dijkstraHighlightData && _dijkstraHighlightData.distMap) {
        _dijkstraHighlightData.distMap.forEach(item => {
            if (item.prev) {
                const fromNode = graph.nodes.find(n => n.label === item.prev);
                const toNode = graph.nodes.find(n => n.label === item.label);
                if (fromNode && toNode) {
                    pathEdges.add(`${fromNode.id}-${toNode.id}`);
                    pathEdges.add(`${toNode.id}-${fromNode.id}`);
                }
            }
        });
    }

    // VE CANH
    graph.edges.forEach(e => {
        const a = graph.nodes.find(n => n.id === e.from);
        const b = graph.nodes.find(n => n.id === e.to);
        if (!a || !b) return;

        const angle = Math.atan2(b.y - a.y, b.x - a.x);
        const startX = a.x + NODE_R * Math.cos(angle);
        const startY = a.y + NODE_R * Math.sin(angle);
        const endX = b.x - NODE_R * Math.cos(angle);
        const endY = b.y - NODE_R * Math.sin(angle);

        const isEdgeInPath = pathEdges.has(`${e.from}-${e.to}`);
        const isCurrentEdge = _dijkstraHighlightData && _dijkstraHighlightData.currentEdge &&
            ((_dijkstraHighlightData.currentEdge.from === e.from && _dijkstraHighlightData.currentEdge.to === e.to) ||
                (_dijkstraHighlightData.currentEdge.from === e.to && _dijkstraHighlightData.currentEdge.to === e.from));

        let strokeColor, lineWidth;

        if (isCurrentEdge) {
            strokeColor = '#f59e0b';
            lineWidth = 5;
            ctx.setLineDash([10, 8]);
        } else if (isEdgeInPath) {
            strokeColor = '#8b5cf6';
            lineWidth = 4;
            ctx.setLineDash([]);
        } else {
            strokeColor = '#64748b';
            lineWidth = 2.5;
            ctx.setLineDash([]);
        }

        ctx.beginPath();
        ctx.moveTo(startX, startY);
        ctx.lineTo(endX, endY);
        ctx.strokeStyle = strokeColor;
        ctx.lineWidth = lineWidth;
        ctx.stroke();
        ctx.setLineDash([]);

        // Mui ten
        ctx.beginPath();
        ctx.moveTo(endX, endY);
        ctx.lineTo(endX - 8 * Math.cos(angle - 0.4), endY - 8 * Math.sin(angle - 0.4));
        ctx.lineTo(endX - 8 * Math.cos(angle + 0.4), endY - 8 * Math.sin(angle + 0.4));
        ctx.closePath();
        ctx.fillStyle = strokeColor;
        ctx.fill();

        // Trong so
        const mx = (a.x + b.x) / 2;
        const my = (a.y + b.y) / 2;
        ctx.fillStyle = '#1e1e2e';
        ctx.beginPath();
        ctx.arc(mx, my, 13, 0, Math.PI * 2);
        ctx.fill();

        if (isEdgeInPath) {
            ctx.fillStyle = '#a855f7';
            ctx.font = 'bold 13px sans-serif';
        } else if (isCurrentEdge) {
            ctx.fillStyle = '#f59e0b';
            ctx.font = 'bold 13px sans-serif';
        } else {
            ctx.fillStyle = '#94a3b8';
            ctx.font = 'bold 12px sans-serif';
        }
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText(e.weight, mx, my);
    });

    // VE DINH
    graph.nodes.forEach(n => {
        const isStart = n.id === startId;
        const isEnd = n.id === endId;
        const isSettled = _dijkstraHighlightData && _dijkstraHighlightData.settled && _dijkstraHighlightData.settled.has(n.id);
        const isCurrent = _dijkstraHighlightData && _dijkstraHighlightData.current === n.id;

        let fillColor, strokeColor, glowColor;

        if (isStart) {
            fillColor = '#22c55e';
            strokeColor = '#16a34a';
            glowColor = '#4ade80';
        } else if (isEnd) {
            fillColor = '#ef4444';
            strokeColor = '#dc2626';
            glowColor = '#f87171';
        } else if (isCurrent) {
            fillColor = '#f59e0b';
            strokeColor = '#d97706';
            glowColor = '#fbbf24';
        } else if (isSettled) {
            fillColor = '#a855f7';
            strokeColor = '#7c3aed';
            glowColor = '#c084fc';
        } else {
            fillColor = '#c084fc';
            strokeColor = '#7c3aed';
            glowColor = '#a855f7';
        }

        if (isCurrent || isStart || isEnd) {
            ctx.save();
            ctx.shadowColor = glowColor;
            ctx.shadowBlur = 15;
        }

        if (isSettled && !isCurrent && !isStart && !isEnd) {
            ctx.beginPath();
            ctx.arc(n.x, n.y, NODE_R + 4, 0, Math.PI * 2);
            ctx.fillStyle = 'rgba(168, 85, 247, 0.2)';
            ctx.fill();
        }

        ctx.beginPath();
        ctx.arc(n.x, n.y, NODE_R, 0, Math.PI * 2);
        ctx.fillStyle = fillColor;
        ctx.fill();
        ctx.strokeStyle = strokeColor;
        ctx.lineWidth = 3;
        ctx.stroke();

        if (isCurrent || isStart || isEnd) {
            ctx.restore();
        }

        ctx.fillStyle = '#ffffff';
        ctx.font = 'bold 14px sans-serif';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText(n.label, n.x, n.y);

        // Hien thi khoang cach
        if (_dijkstraHighlightData && _dijkstraHighlightData.distMap) {
            const distInfo = _dijkstraHighlightData.distMap.find(d => d.label === n.label);
            if (distInfo && distInfo.dist !== undefined && distInfo.dist !== Infinity && distInfo.dist !== 0) {
                ctx.fillStyle = '#fbbf24';
                ctx.font = 'bold 11px monospace';
                ctx.textAlign = 'center';
                ctx.fillText(distInfo.dist, n.x, n.y - NODE_R - 8);
            } else if (distInfo && distInfo.dist === Infinity) {
                ctx.fillStyle = '#64748b';
                ctx.font = '11px monospace';
                ctx.textAlign = 'center';
                ctx.fillText('∞', n.x, n.y - NODE_R - 8);
            }
        }

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

    // Hien thi tien trinh
    if (_dijkstraHighlightData && _dijkstraHighlightData.settledCount !== undefined) {
        ctx.font = 'bold 12px sans-serif';
        ctx.fillStyle = '#a855f7';
        ctx.shadowBlur = 0;
        ctx.textAlign = 'left';
        ctx.fillText(`Da xet: ${_dijkstraHighlightData.settledCount}/${_dijkstraHighlightData.totalVertices} dinh`, 15, 30);
    }
}

/* ── Ghi đè hàm draw ── */
const _dijkstraOriginalDraw = window.draw;

window.draw = function () {
    if (_dijkstraHighlightData) {
        _drawWithDijkstraHighlight();
    } else if (_dijkstraOriginalDraw) {
        _dijkstraOriginalDraw();
    } else {
        _dijkstraFallbackDraw();
    }
};

function _dijkstraFallbackDraw() {
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
    _dijkstraHighlightData = null;
    if (_dijkstraOriginalDraw) {
        _dijkstraOriginalDraw();
    } else {
        _dijkstraFallbackDraw();
    }
}

function renderDistTable(distMap) {
    const tbody = document.getElementById('dist-table-body');
    if (!tbody) return;

    if (!distMap || distMap.length === 0) {
        tbody.innerHTML = '<tr><td colspan="3" style="color:var(--text-muted);">Chua co du lieu</td></tr>';
        return;
    }

    tbody.innerHTML = distMap.map(r => {
        const distCls = r.final ? 'dist-final' : r.dist === Infinity ? 'dist-inf' : 'dist-val';
        const distTxt = r.dist === Infinity ? '∞' : r.dist;
        return `
            <tr>
                <td style="font-weight:bold; color:#c084fc;">${r.label}</td>
                <td class="${distCls}">${distTxt}</td>
                <td style="color:var(--text-muted);">${r.prev || '—'}</td>
            </tr>
        `;
    }).join('');
}

function _loadSampleDijkstra() {
    graph.nodes = [];
    graph.edges = [];

    const sampleNodes = [
        { id: 1, x: 100, y: 250, label: 'A' },
        { id: 2, x: 280, y: 150, label: 'B' },
        { id: 3, x: 280, y: 350, label: 'C' },
        { id: 4, x: 460, y: 100, label: 'D' },
        { id: 5, x: 460, y: 250, label: 'E' },
        { id: 6, x: 460, y: 400, label: 'F' }
    ];

    const sampleEdges = [
        { id: 1, from: 1, to: 2, weight: 7 },
        { id: 2, from: 1, to: 3, weight: 9 },
        { id: 3, from: 1, to: 5, weight: 14 },
        { id: 4, from: 2, to: 3, weight: 10 },
        { id: 5, from: 2, to: 4, weight: 15 },
        { id: 6, from: 3, to: 5, weight: 2 },
        { id: 7, from: 3, to: 6, weight: 11 },
        { id: 8, from: 4, to: 5, weight: 6 },
        { id: 9, from: 5, to: 6, weight: 9 }
    ];

    graph.nodes = sampleNodes;
    graph.edges = sampleEdges;

    nodeCounter = 6;
    edgeCounter = 9;
    labelCounter = 6;

    setTimeout(() => {
        const startSelect = document.getElementById('start-node');
        const endSelect = document.getElementById('end-node');
        if (startSelect) startSelect.value = '1';
        if (endSelect) endSelect.value = '6';
        syncDropdowns();
    }, 100);

    _dijkstraHighlightData = null;
    syncDropdowns();
    draw();
    log('Da tai do thi mau cho Dijkstra (6 dinh: A, B, C, D, E, F).');

    const hint = document.getElementById('canvas-hint');
    if (hint) hint.style.display = 'none';
}

window._loadSampleDijkstra = _loadSampleDijkstra;
window.clearHighlight = clearHighlight;