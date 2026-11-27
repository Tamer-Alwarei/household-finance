const instances = new Map();
export function drawChart(canvasId, config) {
    const canvas = document.getElementById(canvasId);
    if (!canvas || typeof Chart === 'undefined')
        return;
    instances.get(canvasId)?.destroy();
    instances.set(canvasId, new Chart(canvas, config));
}
//# sourceMappingURL=charts.js.map