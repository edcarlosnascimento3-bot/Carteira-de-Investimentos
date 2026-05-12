import './Sidebar.css';

/* ============================================================
   PONTO 1: CONECTAR MENU A TELAS REAIS
   - Cada item do menu possui um identificador unico (id)
   - Ao clicar, chama onNavigate(id) que muda a pagina no App
   - activePage controla qual item esta destacado
   ============================================================ */

// Estrutura do menu com itens e subitens
const menuItems = [
  { id: 'principal', label: 'Principal', icon: '🏠' },
  {
    id: 'ordens',
    label: 'Ordens',
    icon: '📋',
    submenu: [
      { id: 'ordens-compra', label: 'Compra', target: 'compra' },
      { id: 'ordens-venda', label: 'Venda', target: 'venda' },
      { id: 'ordens-bonificacao', label: 'Bonificação', target: 'bonificacao' },
    ],
  },
  { id: 'lancamentos', label: 'Lançamentos', icon: '📝' },
  { id: 'carteira', label: 'Carteira', icon: '💼' },
  { id: 'recebiveis', label: 'Proventos', icon: '💰' },
  { id: 'rendimentos', label: 'Rendimentos', icon: '📈' },
  { id: 'ranking', label: 'Ranking', icon: '🏆' },
  { id: 'graficos', label: 'Gráficos', icon: '📊' },
  { id: 'irrf', label: 'IRRF', icon: '🧾' },
  { id: 'relatorios', label: 'Relatórios', icon: '📄' },
  { id: 'midi', label: 'MIDI', icon: '🔗' },
  { id: 'meta', label: 'Meta', icon: '🎯' },
];

function Sidebar({ activePage, onNavigate }) {
  return (
    <aside className="sidebar">
      <div className="sidebar-header">
        <h1 className="app-title">📊 InvestPro</h1>
        <p className="app-subtitle">Carteira de Investimentos</p>
      </div>

      <nav className="menu">
        {menuItems.map((item) => (
          <div key={item.id} className="menu-group">
            {/* Item principal do menu */}
            <button
              className={`menu-item ${activePage === item.id ? 'active' : ''}`}
              onClick={() => onNavigate(item.id)}
              title={item.label}
            >
              <span className="menu-item-icon">{item.icon}</span>
              <span className="menu-item-label">{item.label}</span>
              {item.submenu && <span className="menu-arrow">▼</span>}
            </button>

            {/* Submenu (ex: Ordens > Compra, Venda) */}
            {item.submenu && (
              <div className="submenu">
                {item.submenu.map((sub) => (
                  <button
                    key={sub.id}
                    className="submenu-item"
                    onClick={() => onNavigate(sub.target)}
                  >
                    {sub.label}
                  </button>
                ))}
              </div>
            )}
          </div>
        ))}
      </nav>

      <div className="sidebar-footer">
        <p>v1.0.0</p>
      </div>
    </aside>
  );
}

export default Sidebar;
