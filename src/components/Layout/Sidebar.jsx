import { useState } from 'react';
import { NavLink, useLocation } from 'react-router-dom';
import './Sidebar.css';

const menuItems = [
  { path: '/principal', label: 'Principal', icon: '🏠' },
  {
    id: 'ordens',
    label: 'Ordens',
    icon: '📋',
    submenu: [
      { path: '/compra', label: 'Compra' },
      { path: '/venda', label: 'Venda' },
      { path: '/bonificacao', label: 'Bonificação' },
    ],
  },
  { path: '/lancamentos', label: 'Lançamentos', icon: '📝' },
  { path: '/carteira', label: 'Carteira', icon: '💼' },
  { path: '/recebiveis', label: 'Proventos', icon: '💰' },
  { path: '/renda-fixa', label: 'Renda Fixa', icon: '🔒' },
  { path: '/rendimentos', label: 'Calendário', icon: '📅' },
  { path: '/ranking', label: 'Ranking', icon: '🏆' },
  { path: '/graficos', label: 'Gráficos', icon: '📊' },
  { path: '/irrf', label: 'IRRF', icon: '🧾' },
  { path: '/irrf2', label: 'IRPF (Centro)', icon: '📋' },
  {
    id: 'analitico',
    label: 'Analítico',
    icon: '🔍',
    submenu: [
      { path: '/analisar-acoes', label: 'Analisar Ações' },
      { path: '/analisar-fiis', label: 'Analisar FIIs' },
    ],
  },
  { path: '/relatorios', label: 'Relatórios', icon: '📄' },
  { path: '/conferencia', label: 'Conferência', icon: '🔍' },
  { path: '/midi', label: 'MIDI', icon: '🔗' },
  { path: '/meta', label: 'Meta', icon: '🎯' },
];

function Sidebar() {
  const [openMenus, setOpenMenus] = useState([]);
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const location = useLocation();

  const toggleMenu = (id) => {
    setOpenMenus((prev) => prev.includes(id) ? prev.filter((i) => i !== id) : [...prev, id]);
  };

  const navigate = () => {
    setOpenMenus([]);
    setSidebarOpen(false);
  };

  const isActivePath = (path) => location.pathname === path;
  const isMenuActive = (item) => {
    if (item.path) return isActivePath(item.path);
    if (item.submenu) return item.submenu.some((sub) => isActivePath(sub.path));
    return false;
  };

  return (
    <>
      <button
        className="sidebar-toggle"
        onClick={() => setSidebarOpen((prev) => !prev)}
        aria-label={sidebarOpen ? 'Fechar menu' : 'Abrir menu'}
      >
        {sidebarOpen ? '✕' : '☰'}
      </button>

      {sidebarOpen && (
        <div className="sidebar-overlay" onClick={() => setSidebarOpen(false)} />
      )}

      <aside className={`sidebar ${sidebarOpen ? 'open' : ''}`}>
        <div className="sidebar-header">
          <h1 className="app-title">📊 InvestPro</h1>
          <p className="app-subtitle">Carteira de Investimentos</p>
        </div>

        <nav className="menu">
          {menuItems.map((item) => (
            <div key={item.id || item.path} className={`menu-group ${openMenus.includes(item.id) ? 'open' : ''}`}>
              {item.submenu ? (
                <>
                  <button
                    className={`menu-item ${isMenuActive(item) ? 'active' : ''}`}
                    onClick={() => toggleMenu(item.id)}
                    title={item.label}
                  >
                    <span className="menu-item-icon">{item.icon}</span>
                    <span className="menu-item-label">{item.label}</span>
                    <span className="menu-arrow">▼</span>
                  </button>
                  <div className="submenu">
                    {item.submenu.map((sub) => (
                      <NavLink
                        key={sub.path}
                        to={sub.path}
                        className={({ isActive }) => `submenu-item ${isActive ? 'active' : ''}`}
                        onClick={navigate}
                      >
                        {sub.label}
                      </NavLink>
                    ))}
                  </div>
                </>
              ) : (
                <NavLink
                  to={item.path}
                  className={({ isActive }) => `menu-item ${isActive ? 'active' : ''}`}
                  onClick={navigate}
                  title={item.label}
                >
                  <span className="menu-item-icon">{item.icon}</span>
                  <span className="menu-item-label">{item.label}</span>
                </NavLink>
              )}
            </div>
          ))}
        </nav>

        <div className="sidebar-footer">
          <p>v1.0.0</p>
        </div>
      </aside>
    </>
  );
}

export default Sidebar;
