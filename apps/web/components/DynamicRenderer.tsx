"use client"
import React from 'react';
import { WidgetLibrary } from './widgets/index';
import WidgetErrorBoundary from './WidgetErrorBoundary';

export default function DynamicRenderer({ widget, color, telemetryData, history = [], allWidgets = [] }: any) {
  const Component = WidgetLibrary[widget.type];

  if (!Component) {
    console.warn(`⚠️ Widget tipo "${widget.type}" no encontrado en WidgetLibrary.`);
    return null;
  }

  const enrichedWidget = { ...widget, latestData: telemetryData ?? null };
  const { key: _telemetryKey, ...safeProps } = widget.props || {};

  return (
    <WidgetErrorBoundary>
      <Component
        data={enrichedWidget}
        color={color}
        history={history}
        latestTelemetry={telemetryData ?? null}
        allWidgets={allWidgets}
        {...safeProps}
      />
    </WidgetErrorBoundary>
  );
}