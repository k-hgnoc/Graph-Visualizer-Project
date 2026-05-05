// 1. CẤU TRÚC DỮ LIỆU DSU
class DisjointSet {
    constructor(vertices) {
        this.parent = {}; this.rank = {};
        vertices.forEach(v => { this.parent[v] = v; this.rank[v] = 0; });
    }
    find(v) {
        if (this.parent[v] !== v) this.parent[v] = this.find(this.parent[v]);
        return this.parent[v];
    }
    union(u, v) {
        let rootU = this.find(u), rootV = this.find(v);
        if (rootU !== rootV) {
            if (this.rank[rootU] > this.rank[rootV]) this.parent[rootV] = rootU;
            else if (this.rank[rootU] < this.rank[rootV]) this.parent[rootU] = rootV;
            else { this.parent[rootV] = rootU; this.rank[rootU]++; }
            return true;
        }
        return false;
    }
}

// ==========================================
// 2. TÍNH TOÁN & GOM NHÓM ĐỈNH
// ==========================================
function runKruskalAlgorithm(vertices, edges) {
    const mst = [], rejected = []; 
    const sortedEdges = [...edges].sort((a, b) => a.weight - b.weight);
    const ds = new DisjointSet(vertices);

    for (let edge of sortedEdges) {
        if (ds.union(edge.source, edge.target)) mst.push(edge);
        else rejected.push(edge); 
    }

    // Gom các đỉnh có cùng nguồn cội vào chung một mảng
    const compGroups = {};
    vertices.forEach(v => {
        const root = ds.find(v);
        if (!compGroups[root]) compGroups[root] = [];
        compGroups[root].push(v);
    });
    
    // Tạo ra mảng dạng: [['1', '2'], ['3', '4']] để mớm cho hàm UI
    const componentsArray = Object.values(compGroups); 

    return { 
        mstEdges: mst, 
        rejectedEdges: rejected, 
        sortedEdges: sortedEdges, 
        componentsArray: componentsArray,
        connectedComponents: componentsArray.length
    }; 
}

// 3. VẼ ĐÈ DẠ QUANG (CHỈ VẼ ĐƯỜNG THẲNG TÍM / ĐỎ)
function drawKruskalHighlight() {
    if (!window.lastKruskalResult) return;
    const cvs = document.querySelector('canvas');
    if (!cvs) return;
    const ctx = cvs.getContext('2d');
    const { mstEdges, rejectedEdges } = window.lastKruskalResult;
    
    const getNode = id => graph.nodes.find(n => n.id === id);
    
    const drawHighlighter = (uId, vId, color) => {
        const u = getNode(uId); const v = getNode(vId);
        if (!u || !v) return;
        ctx.save(); ctx.beginPath(); ctx.moveTo(u.x, u.y); ctx.lineTo(v.x, v.y);
        ctx.strokeStyle = color; ctx.lineWidth = 10; ctx.globalAlpha = 0.6; ctx.lineCap = 'round';
        ctx.stroke(); ctx.restore();
    };

    rejectedEdges.forEach(e => drawHighlighter(e.source, e.target, '#ff6b6b')); // Bị loại -> Đỏ
    mstEdges.forEach(e => drawHighlighter(e.source, e.target, '#a855f7'));     // MST -> Tím
}

// 4. CHIẾM QUYỀN NÚT BẤM VÀ ĐẨY LÊN UI
const kruskalRunner = function() {
    if (!window.isKruskalHooked) {
        if (typeof drawGraph === 'function') {
            const oldDraw = drawGraph; window.drawGraph = function() { oldDraw(); drawKruskalHighlight(); }; window.isKruskalHooked = true;
        } else if (typeof render === 'function') {
            const oldRender = render; window.render = function() { oldRender(); drawKruskalHighlight(); }; window.isKruskalHooked = true;
        }
    }

    const dsDinh = graph.nodes.map(n => n.id); 
    const dsCanh = graph.edges.map(e => ({ source: e.from, target: e.to, weight: parseFloat(e.weight) }));

    if (dsDinh.length === 0) { alert("Đồ thị đang trống!"); return; }

    const result = runKruskalAlgorithm(dsDinh, dsCanh);
    window.lastKruskalResult = result;

    if (typeof drawGraph === 'function') drawGraph();
    else if (typeof render === 'function') render();
    else drawKruskalHighlight();

    // --- GỌI HÀM RENDER UI CỦA NHÓM ĐỂ IN HUY HIỆU LIÊN THÔNG ---
    if (typeof renderComponents === 'function') {
        renderComponents(result.componentsArray);
    } else {
        const elConnected = document.getElementById('comp-list');
        if (elConnected) elConnected.innerHTML = `<span style="font-size:14px; color:var(--text); font-weight:bold;">${result.connectedComponents}</span> <span style="font-size:11px; color:var(--text-muted);">thành phần</span>`;
    }

    // Cập nhật UI các thông số khác
    const mstEdges = result.mstEdges; const sortedEdges = result.sortedEdges;
    let totalCost = 0; mstEdges.forEach(e => totalCost += e.weight);

    const resCost = document.getElementById('mst-total'); if (resCost) resCost.innerText = totalCost;
    const elSelected = document.getElementById('accepted-count'); const elIgnored = document.getElementById('rejected-count');
    if (elSelected) elSelected.innerText = mstEdges.length; if (elIgnored) elIgnored.innerText = dsCanh.length - mstEdges.length;

    const tbody = document.getElementById('sorted-edge-list');
    if (tbody) {
        tbody.innerHTML = sortedEdges.map(e => {
            const isSelected = mstEdges.some(mstEdge => mstEdge.source === e.source && mstEdge.target === e.target);
            return `<tr ${isSelected ? 'style="color: var(--pink); font-weight: bold;"' : 'style="opacity: 0.4;"'}><td>${isSelected ? '✔' : '✖'}</td><td>${e.source}</td><td>${e.target}</td><td>${e.weight}</td></tr>`;
        }).join('');
    }
};
window.runAlgorithm = kruskalRunner; window.runKruskal = kruskalRunner;