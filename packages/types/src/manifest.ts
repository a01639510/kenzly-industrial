// packages/types/src/manifest.ts
export type WidgetType = 'GAUGE_CHART' | 'PARETO_CHART' | 'KPI_CARD' | 'DOWNTIME_LIST';

export interface WidgetConfig {
  id: string;
  type: WidgetType;
  title: string;
  props: Record<string, any>;
}

export interface ClientManifest {
  companyName: string;
  theme: {
    primaryColor: string;
    logoUrl: string;
  };
  dashboard: {
    widgets: WidgetConfig[];
  };
}