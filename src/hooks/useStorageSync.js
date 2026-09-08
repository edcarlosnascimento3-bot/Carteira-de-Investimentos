import { useState, useEffect, useRef } from 'react';
import { useAuth } from '../context/AuthContext';
import db, { subscribeToChanges, hasLocalDirty } from '../services/storage';
import { isEqualDeep } from '../utils/equality';

function defaultIsEmpty(value) {
  if (value == null) return true;
  if (Array.isArray(value)) return value.length === 0;
  if (typeof value === 'object') return Object.keys(value).length === 0;
  return false;
}

// Padroniza o ciclo de vida de um dado sincronizado com storage local + Supabase:
//  - load remoto (readForce) assim que o usuário existe
//  - subscribe realtime (outros dispositivos)
//  - refresh em visibilitychange
//  - persistência automática (db.write, com debounce interno) quando o dado muda
//  - flush pendente em pagehide/visibilitychange hidden
export function useStorageSync(STORAGE_NAME, options = {}) {
  const {
    initialValue = null,
    normalize,
    isEmpty,
    keepLocalIfPresent = false,
    fallbackLocalStorage = false,
  } = options;
  const { user } = useAuth();

  const [data, setData] = useState(initialValue);
  const [loaded, setLoaded] = useState(false);
  const dataRef = useRef(data);
  // true quando o estado local foi mutado via setData(função) — i.e. mudanças
  // diretas do usuário/normalização — e ainda não reconhecido pelo remote.
  // Usado para nunca sobrescrever dados locais mais novos com remote antigo.
  const dirtyRef = useRef(false);

  // setData(func) indica mutação local do usuário/conteúdo; setData(valor) indica
  // aplicação de dados remotos (readForce/realtime/refresh), que não marca dirty.
  const syncSetData = (updater) => {
    if (typeof updater === 'function') dirtyRef.current = true;
    setData(updater);
  };

  const isEmptyData = isEmpty || defaultIsEmpty;

  useEffect(() => {
    dataRef.current = data;
  }, [data]);

  // Carrega do Supabase (sempre remoto) quando o usuário existe
  useEffect(() => {
    if (!user) return;
    let active = true;
    db.readForce(STORAGE_NAME).then((remote) => {
      if (!active) return;
      setLoaded(true);
      setData((prev) => {
        // Se houve mutação local pendente (adição anexada antes do load), NÃO
        // sobrescrever com remote possivelmente desatualizado — local é a fonte.
        if (dirtyRef.current && !isEmptyData(prev) && !isEmptyData(remote)) {
          return prev;
        }
        if (isEmptyData(remote)) {
          if (fallbackLocalStorage && isEmptyData(prev)) {
            try {
              const raw = localStorage.getItem(`investimento_${STORAGE_NAME}`);
              if (raw) {
                const parsed = JSON.parse(raw);
                let next = normalize ? normalize(parsed) : parsed;
                if (!isEmptyData(next)) {
                  db.write(STORAGE_NAME, next);
                  return next;
                }
              }
            } catch {}
          }
          return prev;
        }
        if (keepLocalIfPresent && !isEmptyData(prev)) return prev;
        let next = normalize ? normalize(remote) : remote;
        dirtyRef.current = false;
        if (next !== remote) db.write(STORAGE_NAME, next);
        return next;
      });
    });
    return () => { active = false; };
  }, [STORAGE_NAME, user, keepLocalIfPresent, fallbackLocalStorage]);

  // Realtime: recebe atualizações de outros dispositivos
  useEffect(() => {
    if (!user || !loaded) return;
    const unsub = subscribeToChanges(STORAGE_NAME, (remote) => {
      if (isEmptyData(remote)) return;
      // Se há escrita local ainda não persistida no remote, o dado local é mais
      // novo — não sobrescrever. Sem escrita local pendente, o remote é fonte
      // segura e o dirtyRef local pode ser rearmado (reconhecimento remoto).
      if (hasLocalDirty(STORAGE_NAME)) return;
      dirtyRef.current = false;
      const next = normalize ? normalize(remote) : remote;
      if (!isEqualDeep(dataRef.current, next)) setData(next);
    });
    return unsub;
  }, [STORAGE_NAME, user, loaded]);

  // Refresh ao voltar à aba
  useEffect(() => {
    if (!user || !loaded) return;
    const handler = () => {
      if (document.visibilityState !== 'visible') return;
      db.readForce(STORAGE_NAME).then((remote) => {
        if (isEmptyData(remote)) return;
        // Escrita local ainda não persistida é mais nova que o remote — preservar.
        // Sem escrita local pendente, o remote é fonte segura e rearma dirtyRef.
        if (hasLocalDirty(STORAGE_NAME)) return;
        dirtyRef.current = false;
        const next = normalize ? normalize(remote) : remote;
        if (!isEqualDeep(dataRef.current, next)) setData(next);
      });
    };
    document.addEventListener('visibilitychange', handler);
    return () => document.removeEventListener('visibilitychange', handler);
  }, [STORAGE_NAME, user, loaded]);

  // Persiste quando o dado muda (db.write já tem debounce interno)
  useEffect(() => {
    if (!loaded) return;
    db.write(STORAGE_NAME, dataRef.current);
  }, [STORAGE_NAME, data, loaded]);

  // Flush dos writes pendentes quando a aba perde visibilidade/é fechada
  useEffect(() => {
    const flush = () => {
      if (document.visibilityState === 'hidden') db.flush();
    };
    document.addEventListener('visibilitychange', flush);
    window.addEventListener('pagehide', flush);
    return () => {
      document.removeEventListener('visibilitychange', flush);
      window.removeEventListener('pagehide', flush);
    };
  }, [STORAGE_NAME]);

  return { data, setData: syncSetData, loaded, dataRef };
}