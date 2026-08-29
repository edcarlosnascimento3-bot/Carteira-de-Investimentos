import { supabase } from './supabaseClient';

const PLACEHOLDER_UUID = '00000000-0000-0000-0000-000000000000';
const DB_NAME = 'InvestmentDB';
const DB_VERSION = 1;

function openDB() {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, DB_VERSION);
    request.onupgradeneeded = () => {
      const db = request.result;
      if (!db.objectStoreNames.contains('data')) {
        db.createObjectStore('data', { keyPath: 'name' });
      }
    };
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
}

async function idbWrite(name, data) {
  const conn = await openDB();
  return new Promise((resolve, reject) => {
    const tx = conn.transaction('data', 'readwrite');
    tx.objectStore('data').put({ name, data });
    tx.oncomplete = () => { resolve(true); conn.close(); };
    tx.onerror = () => { reject(tx.error); conn.close(); };
  });
}

async function idbRead(name) {
  const conn = await openDB();
  return new Promise((resolve, reject) => {
    const tx = conn.transaction('data', 'readonly');
    const store = tx.objectStore('data');
    const req = store.get(name);
    req.onsuccess = () => { resolve(req.result ? req.result.data : null); conn.close(); };
    req.onerror = () => { reject(req.error); conn.close(); };
  });
}

function lsKey(name, userId) {
  return userId ? `investimento_${userId}_${name}` : `investimento_${name}`;
}

// Dados vazios (array [] ou objeto {}) no cache local não devem mascarar o
// Supabase: `if (cached)` seria verdadeiro para []/{} e nunca chegaria ao remoto.
function hasData(value) {
  if (value == null) return false;
  if (Array.isArray(value)) return value.length > 0;
  if (typeof value === 'object') return Object.keys(value).length > 0;
  return true;
}

function writeLocalStorage(name, data, userId) {
  try {
    localStorage.setItem(lsKey(name, userId), JSON.stringify(data));
    return true;
  } catch (e) {
    console.warn('[storage] localStorage write falhou:', name, e);
    return false;
  }
}

function readLocalStorage(name, userId) {
  try {
    const raw = localStorage.getItem(lsKey(name, userId));
    return raw ? JSON.parse(raw) : null;
  } catch (e) {
    console.warn('[storage] localStorage read falhou:', name, e);
    return null;
  }
}

async function getCurrentUserId() {
  const { data: { user } } = await supabase.auth.getUser();
  return user?.id ?? null;
}

async function readSupabase(name, retries = 5, delay = 600) {
  for (let attempt = 0; attempt < retries; attempt++) {
    try {
      const userId = await getCurrentUserId();

      if (userId) {
        const { data, error } = await supabase
          .from('app_data')
          .select('value')
          .eq('key', name)
          .eq('user_id', userId)
          .maybeSingle();
        if (!error && data?.value) return data.value;

        // Fallback: dados ainda sob o placeholder UUID
        const { data: legacy, error: legacyError } = await supabase
          .from('app_data')
          .select('value')
          .eq('key', name)
          .eq('user_id', PLACEHOLDER_UUID)
          .maybeSingle();

        if (!legacyError && legacy?.value) {
          await supabase.from('app_data')
            .upsert({ key: name, value: legacy.value, user_id: userId });
          return legacy.value;
        }

        // Se tem userId e não achou nada, retorna null (usuário novo ou sem dados)
        return null;
      }

      // Ainda sem sessao — aguarda e tenta de novo
      await new Promise(r => setTimeout(r, delay));
    } catch (e) {
      console.warn('[storage] Supabase read tentativa', attempt, 'falhou:', name, e.message);
      if (attempt < retries - 1) await new Promise(r => setTimeout(r, delay));
    }
  }
  return null;
}

const WRITE_DEBOUNCE_MS = 500;

// Writes coalescidos: várias chamadas seguidas de db.write() para o MESMO name
// (ou nomes diferentes) disparam uma única flush para o Supabase com o dado mais recente.
const pendingWrites = new Map();
let flushTimer = null;

function scheduleFlush(name, data) {
  pendingWrites.set(name, data);
  if (flushTimer) return;
  flushTimer = setTimeout(() => {
    flushTimer = null;
    void flushPendingWrites();
  }, WRITE_DEBOUNCE_MS);
}

async function flushPendingWrites() {
  const entries = Array.from(pendingWrites.entries());
  pendingWrites.clear();
  try {
    const userId = await getCurrentUserId();
    for (const [name, data] of entries) {
      writeLocalStorage(name, data, userId);
      await writeSupabase(name, data);
      try {
        await idbWrite(name, data);
      } catch (e) {
        console.warn('[storage] IndexedDB write falhou:', name, e);
      }
    }
  } catch (e) {
    console.warn('[storage] flush de writes falhou:', e);
  }
}

async function writeSupabase(name, data) {
  try {
    const userId = await getCurrentUserId();
    if (!userId) return false;
    const { error } = await supabase
      .from('app_data')
      .upsert({ key: name, value: data, user_id: userId });
    if (error) throw error;
    return true;
  } catch (e) {
    console.warn('[storage] Supabase write falhou:', name, e.message);
    return false;
  }
}

const db = {
  async read(name) {
    const userId = await getCurrentUserId();

    // 1) Tenta localStorage escopado por userId
    const cached = readLocalStorage(name, userId);
    if (hasData(cached)) return cached;

    // 2) Tenta Supabase
    const remote = await readSupabase(name);
    if (hasData(remote)) {
      writeLocalStorage(name, remote, userId);
      return remote;
    }

    // 3) Tenta localStorage legacy (sem userId) e sincroniza pro Supabase
    if (userId) {
      const legacy = readLocalStorage(name, null);
      if (hasData(legacy)) {
        await writeSupabase(name, legacy);
        writeLocalStorage(name, legacy, userId);
        return legacy;
      }
    }

    try {
      const idb = await idbRead(name);
      if (hasData(idb)) {
        writeLocalStorage(name, idb, userId);
        return idb;
      }
    } catch (e) {
      console.warn('[storage] IndexedDB read falhou:', name, e);
    }

    return null;
  },

  async readForce(name) {
    const userId = await getCurrentUserId();

    // Sempre busca do Supabase primeiro (ignora cache local)
    const remote = await readSupabase(name);
    if (hasData(remote)) {
      writeLocalStorage(name, remote, userId);
      return remote;
    }

    // Fallback: cache local
    const cached = readLocalStorage(name, userId);
    if (hasData(cached)) return cached;

    // Fallback: legacy
    if (userId) {
      const legacy = readLocalStorage(name, null);
      if (hasData(legacy)) {
        await writeSupabase(name, legacy);
        writeLocalStorage(name, legacy, userId);
        return legacy;
      }
    }

    return null;
  },

  async write(name, data) {
    const userId = await getCurrentUserId();
    writeLocalStorage(name, data, userId);
    scheduleFlush(name, data);
    return true;
  },

  // Força flush imediato dos writes pendentes (debounce) — usado em pagehide/visibilitychange.
  async flush() {
    if (flushTimer) {
      clearTimeout(flushTimer);
      flushTimer = null;
    }
    await flushPendingWrites();
  },
};

// Realtime subscriptions — mantém referências para evitar duplicates
const activeChannels = new Map();
let subscriptionsPaused = false;

function createChannel(channelKey, name, callback) {
  return supabase
    .channel(channelKey)
    .on('postgres_changes', {
      event: '*',
      schema: 'public',
      table: 'app_data',
      filter: `key=eq.${name}`,
    }, (payload) => {
      if (payload.new?.value) {
        callback(payload.new.value);
      }
    })
    .subscribe();
}

// Aba oculta não precisa de realtime — mantém o registro para recriar ao voltar
export function pauseSubscriptions() {
  if (subscriptionsPaused) return;
  subscriptionsPaused = true;
  for (const entry of activeChannels.values()) {
    if (entry.channel) {
      supabase.removeChannel(entry.channel);
      entry.channel = null;
    }
  }
}

export function resumeSubscriptions() {
  if (!subscriptionsPaused) return;
  subscriptionsPaused = false;
  for (const [channelKey, entry] of activeChannels) {
    if (!entry.channel) {
      entry.channel = createChannel(channelKey, entry.name, entry.callback);
    }
  }
}

export function subscribeToChanges(name, callback) {
  const channelKey = `app_data:${name}`;

  // Remove subscription anterior se existir
  if (activeChannels.has(channelKey)) {
    const prev = activeChannels.get(channelKey);
    if (prev.channel) supabase.removeChannel(prev.channel);
    activeChannels.delete(channelKey);
  }

  const entry = { name, callback, channel: null };
  if (!subscriptionsPaused) {
    entry.channel = createChannel(channelKey, name, callback);
  }
  activeChannels.set(channelKey, entry);

  return () => {
    if (entry.channel) supabase.removeChannel(entry.channel);
    activeChannels.delete(channelKey);
  };
}

export function unsubscribeAll() {
  for (const entry of activeChannels.values()) {
    if (entry.channel) supabase.removeChannel(entry.channel);
  }
  activeChannels.clear();
}

// Pausa as subscriptions quando a aba perde visibilidade e retoma ao voltar
if (typeof document !== 'undefined') {
  document.addEventListener('visibilitychange', () => {
    if (document.visibilityState === 'hidden') pauseSubscriptions();
    else resumeSubscriptions();
  });
}

export default db;
