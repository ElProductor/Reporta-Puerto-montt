import type * as LeafletNamespace from 'leaflet';

export interface ChartInstance {
  destroy(): void;
}

export interface ChartConstructor {
  new (canvas: HTMLCanvasElement, config: Record<string, unknown>): ChartInstance;
}

export interface ReportaDesktopBridge {
  readonly platform: string;
  readonly appName: string;
}

declare global {
  interface Window {
    L: typeof LeafletNamespace;
    Chart?: ChartConstructor;
    reportaDesktop?: ReportaDesktopBridge;
  }
}
