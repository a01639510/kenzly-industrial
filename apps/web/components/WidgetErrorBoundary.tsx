"use client"
import React from 'react';

interface State { hasError: boolean }

export default class WidgetErrorBoundary extends React.Component<{ children: React.ReactNode }, State> {
  state: State = { hasError: false };

  static getDerivedStateFromError() {
    return { hasError: true };
  }

  render() {
    if (this.state.hasError) {
      return (
        <div style={{
          display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
          height: '100%', minHeight: '80px', gap: '6px',
          color: '#94a3b8', fontSize: '11px', fontWeight: '700'
        }}>
          <span style={{ fontSize: '18px' }}>⚠</span>
          ERROR EN WIDGET
        </div>
      );
    }
    return this.props.children;
  }
}
