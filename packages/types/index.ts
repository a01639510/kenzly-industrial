// packages/types/src/index.ts

export type WidgetType = 'OEE_GAUGE' | 'PARETO_DOWNTIME' | 'PRODUCTION_LINE';

export interface DashboardWidget {
  id: string;
  type: WidgetType;
  title: string;
  gridSize: 'sm' | 'md' | 'lg'; // Para web es columnas, para mobile es altura
  apiEndpoint: string;          // De dónde saca la data este widget
}

export interface CompanyManifest {
  id: string;
  name: string;
  brand: {
    primaryColor: string;
    logoUrl: string;
  };
  navigation: {
    label: string;
    icon: string;
    moduleId: string;
  }[];
  dashboard: DashboardWidget[];
}