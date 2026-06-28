import { useRef, useEffect } from 'react';
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
  const { user, loading } = useAuth();
  const [activePage, setActivePage] = useState('principal');
  const { userName, setUserName, avatar, setAvatar } = useUser();
  const [editing, setEditing] = useState(false);
  const inputRef = useRef(null);

  useEffect(() => { loadAtivosRegistry(); }, []);

  if (loading) return null;

  if (!user) {
    return <LoginPage />;
  }

  const PageComponent = pages[activePage] || Principal;

  const handleFileChange = (e) => {
    const file = e.target.files[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = (ev) => setAvatar(ev.target.result);
      reader.readAsDataURL(file);
    }
  };

  const handleNameClick = () => {
    setEditing(true);
    setTimeout(() => inputRef.current?.focus(), 50);
  };

  const handleNameBlur = (e) => {
    const val = e.target.value.trim();
    if (val) setUserName(val);
    setEditing(false);
  };

  const handleNameKeyDown = (e) => {
    if (e.key === 'Enter') {
      inputRef.current?.blur();
    }
  };

  return (
    <div className="app">
      <Sidebar activePage={activePage} onNavigate={setActivePage} />

      <div className="user-header">
        <input
          type="text"
          ref={inputRef}
          className={`user-name ${editing ? 'editing' : ''}`}
          value={userName}
          onChange={(e) => setUserName(e.target.value)}
          onBlur={handleNameBlur}
          onKeyDown={handleNameKeyDown}
          readOnly={!editing}
          onClick={handleNameClick}
          title="Clique para editar o nome"
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
      </div>

      <main className="main-content">
        <PageComponent />
      </main>
    </div>
  );
}

export default App;
