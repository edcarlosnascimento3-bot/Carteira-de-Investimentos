import { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { supabase } from '../services/supabaseClient';

export default function LoginPage() {
  const { signIn, signUp, resetPassword, updatePassword } = useAuth();
  const [mode, setMode] = useState('login');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [error, setError] = useState('');
  const [message, setMessage] = useState('');
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    const hash = window.location.hash;
    if (hash.includes('type=recovery')) {
      setMode('recovery');
    }
  }, []);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setMessage('');
    setLoading(true);

    try {
      if (mode === 'login') {
        const { error } = await signIn(email, password);
        if (error) setError(error.message === 'Invalid login credentials'
          ? 'Email ou senha inválidos' : error.message);
      } else if (mode === 'signup') {
        if (password !== confirmPassword) {
          setError('Senhas não conferem');
          setLoading(false);
          return;
        }
        if (password.length < 6) {
          setError('Senha deve ter no mínimo 6 caracteres');
          setLoading(false);
          return;
        }
        const { error } = await signUp(email, password);
        if (error) {
          setError(error.message === 'User already registered'
            ? 'Este email já está cadastrado' : error.message);
        } else {
          setMessage('Conta criada! Verifique seu email para confirmar o cadastro.');
        }
      } else if (mode === 'forgot') {
        if (!email) {
          setError('Informe seu email');
          setLoading(false);
          return;
        }
        const { error } = await resetPassword(email);
        if (error) {
          setError(error.message);
        } else {
          setMessage('Email de recuperação enviado! Verifique sua caixa de entrada.');
        }
      } else if (mode === 'recovery') {
        if (password !== confirmPassword) {
          setError('Senhas não conferem');
          setLoading(false);
          return;
        }
        if (password.length < 6) {
          setError('Senha deve ter no mínimo 6 caracteres');
          setLoading(false);
          return;
        }
        const { error } = await updatePassword(password);
        if (error) {
          setError(error.message);
        } else {
          setMessage('Senha atualizada com sucesso! Redirecionando...');
          setTimeout(() => window.location.hash = '', 1500);
        }
      }
    } catch (err) {
      setError('Erro inesperado. Tente novamente.');
    }
    setLoading(false);
  };

  const switchMode = (newMode) => {
    setMode(newMode);
    setError('');
    setMessage('');
    setPassword('');
    setConfirmPassword('');
  };

  return (
    <div className="login-container">
      <div className="login-box">
        <h1 className="login-title">Carteira de<br />Investimentos</h1>

        <form onSubmit={handleSubmit} className="login-form" autoComplete="on">
          {mode !== 'recovery' && (
            <>
              <input
                type="email"
                placeholder="Email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                className="login-input"
                autoComplete="email"
              />

              {mode !== 'forgot' && (
                <input
                  type="password"
                  placeholder="Senha"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                  className="login-input"
                  autoComplete={mode === 'signup' ? 'new-password' : 'current-password'}
                />
              )}

              {mode === 'signup' && (
                <input
                  type="password"
                  placeholder="Confirmar senha"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  required
                  className="login-input"
                  autoComplete="new-password"
                />
              )}
            </>
          )}

          {mode === 'recovery' && (
            <>
              <p className="login-info">Digite sua nova senha:</p>
              <input
                type="password"
                placeholder="Nova senha"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                className="login-input"
                autoComplete="new-password"
              />
              <input
                type="password"
                placeholder="Confirmar nova senha"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                required
                className="login-input"
                autoComplete="new-password"
              />
            </>
          )}

          {error && <div className="login-error">{error}</div>}
          {message && <div className="login-message">{message}</div>}

          <button type="submit" className="login-button" disabled={loading}>
            {loading ? 'Aguarde...' : mode === 'login' ? 'Entrar' : mode === 'signup' ? 'Criar conta' : mode === 'forgot' ? 'Enviar código' : 'Atualizar senha'}
          </button>
        </form>

        <div className="login-links">
          {mode === 'login' && (
            <>
              <button onClick={() => switchMode('signup')} className="login-link">Criar conta</button>
              <button onClick={() => switchMode('forgot')} className="login-link">Esqueceu a senha?</button>
            </>
          )}
          {mode !== 'login' && mode !== 'recovery' && (
            <button onClick={() => switchMode('login')} className="login-link">Voltar ao login</button>
          )}
        </div>
      </div>
    </div>
  );
}
