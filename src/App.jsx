import { useEffect } from 'react';
import { useUser } from './context/UserContext';
import { useAuth } from './context/AuthContext';
import LoginPage from './pages/LoginPage';
import { loadAtivosRegistry } from './services/tickerRegistry';
import Sidebar from './components/Layout/Sidebar';
import Principal from './pages/Principal';
import Ordens from './pages/Ordens';
import Compra from './pages/Compra';
import Venda from './pages/Venda';
import Bonificacao from './pages/Bonificacao';
import Lancamentos from './pages/Lancamentos';
import Carteira from './pages/Carteira';
import Recebiveis from './pages/Recebiveis';
import Rendimentos from './pages/Rendimentos';
import Ranking from './pages/Ranking';
import Graficos from './pages/Graficos';
import IRRF from './pages/IRRF';
import Relatorios from './pages/Relatorios';
import MIDI from './pages/MIDI';
import Meta from './pages/Meta';
import Analitico from './pages/Analitico';
import AnalisarAcoes from './pages/AnalisarAcoes';
import AnalisarFIIs from './pages/AnalisarFIIs';
import Conferencia from './pages/Conferencia';
import { useState } from 'react';

const pages = {
  principal: Principal,
  ordens: Ordens,
  compra: Compra,
  venda: Venda,
  bonificacao: Bonificacao,
  lancamentos: Lancamentos,
  carteira: Carteira,
  recebiveis: Recebiveis,
  rendimentos: Rendimentos,
  ranking: Ranking,
  graficos: Graficos,
  irrf: IRRF,
  relatorios: Relatorios,
  midi: MIDI,
  meta: Meta,
  analitico: Analitico,
  'analisar-acoes': AnalisarAcoes,
  'analisar-fiis': AnalisarFIIs,
  conferencia: Conferencia,
};

function App() {
  const { user, loading, signOut } = useAuth();
  const [activePage, setActivePage] = useState('principal');
  const [theme, setTheme] = useState(() => localStorage.getItem('app-theme') || 'dark');
  const { userName, setUserName, avatar, setAvatar } = useUser();

  useEffect(() => { loadAtivosRegistry(); }, []);

  useEffect(() => {
    document.documentElement.setAttribute('data-theme', theme);
    localStorage.setItem('app-theme', theme);
  }, [theme]);

  const toggleTheme = () => setTheme((t) => (t === 'dark' ? 'light' : 'dark'));

  if (loading) return null;

  if (!user) {
    return <LoginPage />;
  }

  const PageComponent = pages[activePage] || Principal;

  const handleFileChange = (e) => {
    const file = e.target.files[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (ev) => {
      const img = new Image();
      img.onload = () => {
        const MAX = 256;
        let { width, height } = img;
        if (width > MAX || height > MAX) {
          const scale = Math.min(MAX / width, MAX / height);
          width = Math.round(width * scale);
          height = Math.round(height * scale);
        }
        const canvas = document.createElement('canvas');
        canvas.width = width;
        canvas.height = height;
        const ctx = canvas.getContext('2d');
        ctx.drawImage(img, 0, 0, width, height);
        setAvatar(canvas.toDataURL('image/jpeg', 0.85));
      };
      img.onerror = () => setAvatar(ev.target.result);
      img.src = ev.target.result;
    };
    reader.readAsDataURL(file);
  };

  return (
    <div className="app">
      <Sidebar activePage={activePage} onNavigate={setActivePage} />

      <div className="user-header">
        <input
          type="text"
          className="user-name"
          value={userName}
          onChange={(e) => setUserName(e.target.value)}
          placeholder="Digite seu nome"
        />

        <input
          id="avatar-upload"
          type="file"
          accept="image/*"
          style={{ display: 'none' }}
          onChange={handleFileChange}
        />

        {avatar ? (
          <label htmlFor="avatar-upload" title="Clique para trocar a foto">
            <img src={avatar} alt="Avatar" className="user-avatar" />
          </label>
        ) : (
          <label htmlFor="avatar-upload" className="user-avatar-placeholder" title="Clique para adicionar foto">
            👤
          </label>
        )}

        <button className="btn-sair" onClick={signOut}>
          Sair
        </button>

        <div
          className="theme-selector"
          title={theme === 'dark' ? 'Mudar para tema claro' : 'Mudar para tema escuro'}
        >
          <span className="theme-icon theme-icon-sun">☀️</span>
          <button
            className="theme-toggle"
            data-theme={theme}
            onClick={toggleTheme}
            aria-label="Alternar tema claro/escuro"
          >
            <span className="theme-toggle-knob" />
          </button>
          <span className="theme-icon theme-icon-moon">🌙</span>
        </div>
      </div>

      <main className="main-content">
        <PageComponent />
      </main>
    </div>
  );
}

export default App;
