"use client"
import React, { useState } from 'react';
import { usePathname, useRouter } from 'next/navigation';
import styles from './Sidebar.module.css';
import { useTenant } from '../../contexts/TenantContext';
import { useRole } from '../../hooks/useRole';
import { api } from '../../lib/api';

interface Module {
  path: string;
  label: string;
  icon: string;
  minRole?: 'OPERADOR' | 'ANALISTA' | 'SUPERVISOR' | 'GERENTE';
}

const MODULES: Module[] = [
  { path: '',              label: 'Dashboard',       icon: '⊞' },
  { path: '/ordenes',      label: 'Órdenes',         icon: '◫', minRole: 'SUPERVISOR' },
  { path: '/oee',          label: 'OEE',             icon: '◎' },
  { path: '/calidad',      label: 'Calidad',         icon: '◆' },
  { path: '/paros',        label: 'Paros',           icon: '⏸' },
  { path: '/mantenimiento',label: 'Mantenimiento',   icon: '🔧' },
];

export default function Sidebar() {
  const {
    slug, manifest, primaryColor, tenantName,
    selectedAreaId, setSelectedAreaId,
    activeAssets, setActiveAssets,
  } = useTenant();
  const { role, canDo } = useRole();
  const router  = useRouter();
  const pathname = usePathname();
  const [collapsed, setCollapsed] = useState(false);

  const areas      = manifest?.areas ?? {};
  const isDashboard = pathname === `/${slug}`;

  const isActive = (modulePath: string) => {
    if (modulePath === '') return pathname === `/${slug}`;
    return pathname.startsWith(`/${slug}${modulePath}`);
  };

  const visibleModules = MODULES.filter(m => !m.minRole || canDo(m.minRole));

  const handleLogout = async () => {
    try { await api.auth.logout(); } catch {}
    router.push(`/login/${slug}`);
  };

  const getAvailableAssets = () => {
    if (!selectedAreaId || !areas[selectedAreaId]) return [];
    const widgets = [
      ...(areas[selectedAreaId].operator?.widgets ?? []),
      ...(areas[selectedAreaId].analyst?.widgets  ?? []),
    ];
    return Array.from(new Set(widgets.map((w: any) => w.props?.assetId).filter(Boolean)));
  };

  return (
    <aside
      className={`${styles.sidebar}${collapsed ? ' ' + styles.collapsed : ''}`}
      style={{ '--primary': primaryColor } as React.CSSProperties}
    >
      {/* Logo */}
      <div className={styles.logoArea}>
        {!collapsed && (
          <div>
            <div className={styles.brand}>{tenantName}</div>
            <div className={styles.brandSub}>KENZLY INDUSTRIAL</div>
          </div>
        )}
        <button className={styles.collapseBtn} onClick={() => setCollapsed(c => !c)} title="Colapsar">
          {collapsed ? '›' : '‹'}
        </button>
      </div>

      <div className={styles.nav}>
        {/* Area navigation — only on main dashboard */}
        {isDashboard && (
          <div className={styles.navSection}>
            {!collapsed && <span className={styles.navLabel}>PLANTA</span>}
            <button
              className={`${styles.navItem}${!selectedAreaId ? ' ' + styles.active : ''}`}
              onClick={() => { setSelectedAreaId(null); setActiveAssets([]); }}
              title="Todas las áreas"
            >
              <span className={styles.navIcon}>⊞</span>
              {!collapsed && <span className={styles.navText}>TODAS LAS ÁREAS</span>}
            </button>
            {Object.entries(areas).map(([id, area]: any) => (
              <button
                key={id}
                className={`${styles.navItem}${selectedAreaId === id ? ' ' + styles.active : ''}`}
                onClick={() => { setSelectedAreaId(id); setActiveAssets([]); }}
                title={area.name}
              >
                <span className={styles.navIcon}>◈</span>
                {!collapsed && <span className={styles.navText}>{area.name.toUpperCase()}</span>}
              </button>
            ))}
            {/* Asset chips for selected area */}
            {selectedAreaId && !collapsed && getAvailableAssets().length > 0 && (
              <div className={styles.assetChips}>
                {getAvailableAssets().map((assetId: string) => (
                  <button
                    key={assetId}
                    className={`${styles.assetChip}${activeAssets.includes(assetId) ? ' ' + styles.active : ''}`}
                    onClick={() =>
                      setActiveAssets(
                        activeAssets.includes(assetId)
                          ? activeAssets.filter(a => a !== assetId)
                          : [...activeAssets, assetId]
                      )
                    }
                  >
                    {assetId}
                  </button>
                ))}
              </div>
            )}
            <div className={styles.navDivider} />
          </div>
        )}

        {/* Module navigation */}
        <div className={styles.navSection}>
          {!collapsed && <span className={styles.navLabel}>MÓDULOS</span>}
          {visibleModules.map(mod => (
            <button
              key={mod.path}
              className={`${styles.navItem}${isActive(mod.path) ? ' ' + styles.active : ''}`}
              onClick={() => router.push(`/${slug}${mod.path}`)}
              title={mod.label}
            >
              <span className={styles.navIcon}>{mod.icon}</span>
              {!collapsed && <span className={styles.navText}>{mod.label}</span>}
            </button>
          ))}
        </div>
      </div>

      {/* Bottom: user info + logout */}
      <div className={styles.bottomSection}>
        {!collapsed && (
          <div className={styles.userInfo}>
            <div className={styles.userName}>KENZLY</div>
            <div className={styles.userRole}>{role}</div>
          </div>
        )}
        <button className={styles.logoutBtn} onClick={handleLogout} title="Cerrar sesión">
          <span>→</span>
          {!collapsed && 'SALIR'}
        </button>
      </div>
    </aside>
  );
}
