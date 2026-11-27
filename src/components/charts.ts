// Chart.js is vendored and loaded as a global by index.html.
declare const Chart: new (ctx: HTMLCanvasElement, config: unknown) => { destroy(): void };

const instances = new Map<string, { destroy(): void }>();

export function drawChart(canvasId: string, config: unknown): void {
  const canvas = document.getElementById(canvasId) as HTMLCanvasElement | null;
  if (!canvas || typeof Chart === 'undefined') return;
  instances.get(canvasId)?.destroy();
  instances.set(canvasId, new Chart(canvas, config));
}
