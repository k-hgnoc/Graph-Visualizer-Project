// 1. BỘ NÃO TÍNH TOÁN CÓ TRUY VẾT
function solveFordBellman(vertices, edges, startVertex) {
    const distances = {};
    const predecessors = {};

    vertices.forEach(v => {
        distances[v] = Infinity;
        predecessors[v] = null;
    });
    distances[startVertex] = 0;

    for (let i = 0; i < vertices.length - 1; i++) {
        let updated = false;
        for (let edge of edges) {
            const { source: u, target: v, weight: w } = edge;
            if (distances[u] !== Infinity && distances[u] + w < distances[v]) {
                distances[v] = distances[u] + w;
                predecessors[v] = u;
                updated = true;
            }
        }
        if (!updated) break;
    }

    let hasNegativeCycle = false;
    let negCycleNode = null;
    let negativeCycleEdges = [];

    for (let edge of edges) {
        const { source: u, target: v, weight: w } = edge;
        if (distances[u] !== Infinity && distances[u] + w < distances[v]) {
            hasNegativeCycle = true;
            negCycleNode = v;
            predecessors[v] = u; 
            break;
        }
    }

    if (hasNegativeCycle && negCycleNode !== null) {
        for (let i = 0; i < vertices.length; i++) {
            negCycleNode = predecessors[negCycleNode];
        }
        let curr = negCycleNode;
        do {
            let prev = predecessors[curr];
            negativeCycleEdges.push({ source: prev, target: curr });
            curr = prev;
        } while (curr !== negCycleNode);
    }

    return { distances, predecessors, hasNegativeCycle, negativeCycleEdges };
}

function drawHighlightOverlay() {
    if (!window.lastAlgorithmResult) return;
    const cvs = document.querySelector('canvas');
    if (!cvs) return;
    const ctx = cvs.getContext('2d');
    const { result, endId } = window.lastAlgorithmResult;
    
    const getNode = id => graph.nodes.find(n => n.id === id);
    
    // Hàm vẽ nét highlight bút dạ quang
    const drawHighlighter = (uId, vId, color) => {
        const u = getNode(uId);
        const v = getNode(vId);
        if (!u || !v) return;
        
        ctx.save();
        ctx.beginPath();
        ctx.moveTo(u.x, u.y);
        ctx.lineTo(v.x, v.y);
        ctx.strokeStyle = color;
        ctx.lineWidth = 10; // Nét to
        ctx.globalAlpha = 0.4; // Trong suốt để thấy nét cũ bên dưới
        ctx.lineCap = 'round';
        ctx.stroke();
        ctx.restore();
    };

    if (result.hasNegativeCycle) {
        // Tô màu đỏ chu trình âm
        result.negativeCycleEdges.forEach(ce => {
            drawHighlighter(ce.source, ce.target, '#ff6b6b'); 
        });
    } else if (result.distances[endId] !== Infinity) {
        // Tô màu tím đường tối ưu
        let curr = endId;
        while (result.predecessors[curr] !== null && result.predecessors[curr] !== undefined) {
            let prev = result.predecessors[curr];
            drawHighlighter(prev, curr, '#a855f7'); 
            curr = prev;
        }
    }
}

// Gài mã độc (Hook) vào hàm vẽ của hệ thống để nó tự động tô màu
if (!window.isColorHooked) {
    if (typeof drawGraph === 'function') {
        const oldDraw = drawGraph;
        window.drawGraph = function() {
            oldDraw();
            drawHighlightOverlay();
        };
        window.isColorHooked = true;
    } else if (typeof render === 'function') {
        const oldRender = render;
        window.render = function() {
            oldRender();
            drawHighlightOverlay();
        };
        window.isColorHooked = true;
    }
}

// 3. CHIẾM QUYỀN NÚT BẤM
window.runAlgorithm = function() {
    let startId = null;
    let endId = null;

    const inputStart = document.getElementById('start-node');
    const inputEnd = document.getElementById('end-node');

    if (inputStart && inputStart.value) startId = inputStart.value.trim();
    if (inputEnd && inputEnd.value) endId = inputEnd.value.trim();

    if (!startId && window.startNode) startId = typeof window.startNode === 'object' ? window.startNode.id : window.startNode;
    if (!endId && window.endNode) endId = typeof window.endNode === 'object' ? window.endNode.id : window.endNode;

    if (!startId || !endId) {
        alert("Vui lòng chọn đỉnh bắt đầu và đỉnh đích!");
        return;
    }

    const dsDinh = graph.nodes.map(n => n.id); 
    const dsCanh = graph.edges.map(e => ({
        source: e.from, target: e.to, weight: parseFloat(e.weight) 
    }));

    if (dsDinh.length === 0) return;

    // Chạy thuật toán
    const result = solveFordBellman(dsDinh, dsCanh, startId);

    // Lưu kết quả lại để vẽ đè dạ quang
    window.lastAlgorithmResult = { result, startId, endId };

    // Kích hoạt vẽ đồ thị
    if (typeof drawGraph === 'function') drawGraph();
    else if (typeof render === 'function') render();
    else drawHighlightOverlay();

    // Đổ dữ liệu ra UI
    const totalCost = result.distances[endId];
    const resSub = document.getElementById('res-sub');
    if (resSub) resSub.innerText = (totalCost === Infinity || totalCost === undefined) ? "Không có đường đi" : totalCost;
    
    const resMain = document.getElementById('res-main');
    if (totalCost !== Infinity && totalCost !== undefined && !result.hasNegativeCycle) {
        let path = [];
        let curr = endId;
        while (curr !== null && curr !== undefined) {
            path.unshift(curr);
            curr = result.predecessors[curr];
        }
        if (resMain) resMain.innerText = path.join(" → ");
    } else {
        if (resMain) resMain.innerText = "--";
    }

    const negCycleEl = document.getElementById('neg-cycle-result');
    if (negCycleEl) {
        negCycleEl.innerHTML = result.hasNegativeCycle ? 
            '<span style="color:#ff6b6b; font-weight:bold;">CÓ</span>' : 
            '<span style="color:#4ade80; font-weight:bold;">KHÔNG</span>';
    }

    const tbody = document.getElementById('relax-table-body');
    if (tbody) {
        tbody.innerHTML = dsDinh.map(v => `
            <tr>
                <td>${v}</td>
                <td>${result.distances[v] === Infinity ? '∞' : result.distances[v]}</td>
                <td>${result.predecessors[v] || '-'}</td>
            </tr>
        `).join('');
    }
};