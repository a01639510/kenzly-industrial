import React from 'react';
import { useConfig } from '@backly/config';

interface KpiCardProps {
  title: string;
  value: string | number;
  unit?: string;
}

export const KpiCard: React.FC<KpiCardProps> = ({ title, value, unit }) => {
  const { theme } = useConfig(); 
  
  return (
    <div style={{ 
      borderLeft: `4px solid ${theme.primaryColor}`, 
      padding: '1rem', 
      borderRadius: '8px',
      boxShadow: '0 2px 4px rgba(0,0,0,0.1)'
    }}>
      <h4 style={{ margin: 0, color: '#666' }}>{title}</h4>
      <p style={{ fontSize: '1.5rem', fontWeight: 'bold', margin: '0.5rem 0' }}>
        {value} <span style={{ fontSize: '1rem', fontWeight: 'normal' }}>{unit}</span>
      </p>
    </div>
  );
};