import { useEffect, useState, lazy, Suspense } from 'react';
import { Routes, Route, Navigate, useLocation } from 'react-router-dom';
import { useUser } from './context/UserContext';
import { useAuth } from './context/AuthContext';
import LoginPage from './pages/LoginPage';
import { loadAtivosRegistry } from './services/tickerRegistry';
import Sidebar from './components/Layout/Sidebar';
import Principal from './pages/Principal';

const Ordens = lazy(() => import('./pages/Ordens'));
const Compra = lazy(() => import('./pages/Compra'));
const Venda = lazy(() => import('./pages/Venda'));
const Bonificacao = lazy(() => import('./pages/Bonificacao'));
const Lancamentos = lazy(() => import('./pages/Lancamentos'));
const Carteira = lazy(() => import('./pages/Carteira'));
const Recebiveis = lazy(() => import('./pages/Recebiveis'));
const Rendimentos = lazy(() => import('./pages/Rendimentos'));
const Ranking = lazy(() => import('./pages/Ranking'));
const Graficos = lazy(() => import('./pages/Graficos'));
const IRRF = lazy(() => import('./pages/IRRF'));
const Relatorios = lazy(() => import('./pages/Relatorios'));
const MIDI = lazy(() => import('./pages/MIDI'));
const Meta = lazy(() => import('./pages/Meta'));
const Analitico = lazy(() => import('./pages/Analitico'));
const AnalisarAcoes = lazy(() => import('./pages/AnalisarAcoes'));
const AnalisarFIIs = lazy(() => import('./pages/AnalisarFIIs'));
const Conferencia = lazy(() => import('./pages/Conferencia'));

function PageLoader() {
  return (
    <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '50vh', opacity: 0.6 }}>
      <span>Carregando...</span>
    </div>
  );
}

function App() {
  const { user, loading, signOut } = useAuth();
  const [theme, setTheme] = useState(() => localStorage.getItem('app-theme') || 'dark');
  const { userName, setUserName, avatar, setAvatar } = useUser();
  const location = useLocation();

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
      img.onerror = () => setAvatar(null);
      img.src = ev.target.result;
    };
    reader.readAsDataURL(file);
  };

  return (
    <div className="app">
      <Sidebar />

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
        <Suspense fallback={<PageLoader />}>
          <Routes>
            <Route path="/" element={<Navigate to="/principal" replace />} />
            <Route path="/principal" element={<Principal />} />
            <Route path="/compra" element={<Compra />} />
            <Route path="/venda" element={<Venda />} />
            <Route path="/bonificacao" element={<Bonificacao />} />
            <Route path="/lancamentos" element={<Lancamentos />} />
            <Route path="/carteira" element={<Carteira />} />
            <Route path="/recebiveis" element={<Recebiveis />} />
            <Route path="/rendimentos" element={<Rendimentos />} />
            <Route path="/ranking" element={<Ranking />} />
            <Route path="/graficos" element={<Graficos />} />
            <Route path="/irrf" element={<IRRF />} />
            <Route path="/relatorios" element={<Relatorios />} />
            <Route path="/midi" element={<MIDI />} />
            <Route path="/meta" element={<Meta />} />
            <Route path="/analitico" element={<Analitico />} />
            <Route path="/analisar-acoes" element={<AnalisarAcoes />} />
            <Route path="/analisar-fiis" element={<AnalisarFIIs />} />
            <Route path="/conferencia" element={<Conferencia />} />
            <Route path="/ordens" element={<Ordens />} />
            <Route path="*" element={<Navigate to="/principal" replace />} />
          </Routes>
        </Suspense>
      </main>
    </div>
  );
}

export default App;
