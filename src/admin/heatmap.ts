import type * as LeafletNamespace from 'leaflet';
import type { Map as LeafletMap, Layer } from 'leaflet';

export interface HeatPoint {
  readonly lat: number;
  readonly lng: number;
  readonly intensity: number;
  readonly label?: string;
}

function buildColorPalette(): Uint8ClampedArray {
  const paletteCanvas = document.createElement('canvas');
  paletteCanvas.width = 256;
  paletteCanvas.height = 1;
  const ctx = paletteCanvas.getContext('2d');
  if (!ctx) return new Uint8ClampedArray(256 * 4);
  const grad = ctx.createLinearGradient(0, 0, 256, 0);
  grad.addColorStop(0.2, '#2563eb');
  grad.addColorStop(0.45, '#06b6d4');
  grad.addColorStop(0.65, '#22c55e');
  grad.addColorStop(0.82, '#eab308');
  grad.addColorStop(1.0, '#dc2626');
  ctx.fillStyle = grad;
  ctx.fillRect(0, 0, 256, 1);
  return ctx.getImageData(0, 0, 256, 1).data;
}

function buildKernelSprite(radius: number, blur: number): HTMLCanvasElement {
  const total = radius + blur;
  const kernel = document.createElement('canvas');
  kernel.width = total * 2;
  kernel.height = total * 2;
  const ctx = kernel.getContext('2d');
  if (ctx) {
    const grad = ctx.createRadialGradient(total, total, 0, total, total, total);
    grad.addColorStop(0, 'rgba(0,0,0,1)');
    grad.addColorStop(0.45, 'rgba(0,0,0,0.55)');
    grad.addColorStop(1, 'rgba(0,0,0,0)');
    ctx.fillStyle = grad;
    ctx.fillRect(0, 0, kernel.width, kernel.height);
  }
  return kernel;
}

/**
 * Capa térmica HTML5 Canvas sobre Leaflet (estilo kernel radial de densidad).
 */
export function createCanvasHeatmapLayer(
  L: typeof LeafletNamespace,
  points: readonly HeatPoint[],
  options: { readonly radius?: number; readonly blur?: number } = {},
): Layer {
  const radius = options.radius ?? 22;
  const blur = options.blur ?? 14;
  const palette = buildColorPalette();
  const kernel = buildKernelSprite(radius, blur);
  const halfKernel = radius + blur;

  let canvas: HTMLCanvasElement | null = null;
  let leafletMap: LeafletMap | null = null;

  const redraw = (): void => {
    if (!canvas || !leafletMap) return;
    const size = leafletMap.getSize();
    if (size.x <= 0 || size.y <= 0) return;

    canvas.width = size.x;
    canvas.height = size.y;
    const topLeft = leafletMap.containerPointToLayerPoint([0, 0]);
    L.DomUtil.setPosition(canvas, topLeft);

    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    ctx.clearRect(0, 0, size.x, size.y);
    if (points.length === 0) return;

    const maxIntensity = points.reduce((m, p) => Math.max(m, p.intensity), 1);
    for (const point of points) {
      const pt = leafletMap.latLngToContainerPoint([point.lat, point.lng]);
      if (pt.x < -halfKernel || pt.y < -halfKernel || pt.x > size.x + halfKernel || pt.y > size.y + halfKernel) {
        continue;
      }
      ctx.globalAlpha = Math.max(0.18, Math.min(1, point.intensity / maxIntensity));
      ctx.drawImage(kernel, pt.x - halfKernel, pt.y - halfKernel);
    }

    ctx.globalAlpha = 1;
    const img = ctx.getImageData(0, 0, size.x, size.y);
    const data = img.data;
    for (let i = 0; i < data.length; i += 4) {
      const alpha = data[i + 3] ?? 0;
      if (alpha > 0) {
        const offset = alpha * 4;
        data[i] = palette[offset] ?? 0;
        data[i + 1] = palette[offset + 1] ?? 0;
        data[i + 2] = palette[offset + 2] ?? 0;
        data[i + 3] = Math.min(210, Math.round(alpha * 0.85));
      }
    }
    ctx.putImageData(img, 0, 0);
  };

  const HeatmapLayerClass = L.Layer.extend({
    onAdd(mapInstance: LeafletMap): void {
      leafletMap = mapInstance;
      canvas = L.DomUtil.create('canvas', 'leaflet-heatmap-layer') as HTMLCanvasElement;
      canvas.style.pointerEvents = 'none';
      const pane = mapInstance.getPane('overlayPane');
      if (pane) pane.appendChild(canvas);
      mapInstance.on('moveend zoomend viewreset resize', redraw);
      redraw();
    },
    onRemove(mapInstance: LeafletMap): void {
      mapInstance.off('moveend zoomend viewreset resize', redraw);
      if (canvas && canvas.parentNode) {
        canvas.parentNode.removeChild(canvas);
      }
      canvas = null;
      leafletMap = null;
    },
  });

  return new (HeatmapLayerClass as unknown as new () => Layer)();
}
