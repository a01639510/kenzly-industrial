"use client"
import { useEffect, useState } from 'react';

const API = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001';

export type Role = 'OPERADOR' | 'ANALISTA' | 'SUPERVISOR' | 'GERENTE';

const LEVEL: Record<Role, number> = { OPERADOR: 1, ANALISTA: 2, SUPERVISOR: 3, GERENTE: 4 };

export function useRole() {
  const [role, setRole]     = useState<Role>('OPERADOR');
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    fetch(`${API}/auth/verify`, { credentials: 'include' })
      .then(r => r.ok ? r.json() : null)
      .then(data => {
        if (data?.valid && data.user?.role) setRole(data.user.role as Role);
        setLoaded(true);
      })
      .catch(() => setLoaded(true));
  }, []);

  const canDo = (minRole: Role) => LEVEL[role] >= LEVEL[minRole];

  return { role, loaded, canDo };
}
