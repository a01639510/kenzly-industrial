"use client"
import { useEffect, useState } from 'react';

export default function SchemaVisualizer() {
  const [schema, setSchema] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch(`${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001'}/admin/db-schema`)
      .then(res => res.json())
      .then(data => {
        setSchema(data);
        setLoading(false);
      });
  }, []);

  if (loading) return <p>Cargando estructura de base de datos...</p>;

  return (
    <div style={{ padding: '20px', backgroundColor: '#0f172a', borderRadius: '15px' }}>
      <h2 style={{ color: '#38bdf8', fontSize: '1rem', marginBottom: '20px' }}>SQL SCHEMA EXPLORER</h2>
      
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(250px, 1fr))', gap: '20px' }}>
        {Object.keys(schema).map((tableName) => (
          <div key={tableName} style={{ 
            backgroundColor: '#1e293b', 
            borderRadius: '10px', 
            border: '1px solid #334155',
            overflow: 'hidden'
          }}>
            <div style={{ backgroundColor: '#334155', padding: '8px 12px', fontWeight: 'bold', color: '#f8fafc', fontSize: '0.8rem' }}>
              TABLE: {tableName.toUpperCase()}
            </div>
            <div style={{ padding: '10px' }}>
              {schema[tableName].map((col: any) => (
                <div key={col.column_name} style={{ 
                  display: 'flex', 
                  justifyContent: 'space-between', 
                  fontSize: '0.75rem', 
                  padding: '4px 0',
                  borderBottom: '1px solid #0f172a'
                }}>
                  <span style={{ color: '#94a3b8' }}>{col.column_name}</span>
                  <span style={{ color: '#38bdf8', fontFamily: 'monospace' }}>{col.data_type}</span>
                </div>
              ))}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}