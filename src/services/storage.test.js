import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';

const { supabase, state } = vi.hoisted(() => {
  const state = {
    user: null,
    data: new Map(),
    upsertCalls: [],
    readCalls: 0,
    removedChannels: [],
    channels: [],
    failUpsert: false,
  };

  const makeQuery = () => {
    const filters = [];
    const q = {
      select: () => q,
      eq: (col, val) => {
        filters.push([col, val]);
        return q;
      },
      maybeSingle: async () => {
        state.readCalls += 1;
        const userId = filters.find(([c]) => c === 'user_id')?.[1];
        const key = filters.find(([c]) => c === 'key')?.[1];
        const value = userId != null ? state.data.get(`${userId}:${key}`) : undefined;
        return { data: value !== undefined ? { value } : null, error: null };
      },
      upsert: async (row) => {
        state.upsertCalls.push(row);
        if (state.failUpsert) {
          return { error: { message: 'upsert simulada com falha' } };
        }
        state.data.set(`${row.user_id}:${row.key}`, row.value);
        return { error: null };
      },
    };
    return q;
  };

  const supabase = {
    auth: {
      getUser: async () => ({ data: { user: state.user } }),
    },
    from: () => makeQuery(),
    channel: (key) => {
      const channel = {
        key,
        _cb: null,
        on: (_type, _cfg, cb) => {
          channel._cb = cb;
          return channel;
        },
        subscribe: () => {
          state.channels.push(channel);
          return channel;
        },
      };
      return channel;
    },
    removeChannel: (ch) => {
      state.removedChannels.push(ch);
    },
  };

  return { supabase, state };
});

vi.mock('./supabaseClient', () => ({ supabase }));

import db, {
  subscribeToChanges,
  unsubscribeAll,
  pauseSubscriptions,
  resumeSubscriptions,
} from './storage';

const UID = 'user-1';
const PLA = '00000000-0000-0000-0000-000000000000';
const key = (userId, name) =>
  `investimento_${userId}_${name}`;

function installFakeIndexedDB() {
  const stores = new Map();
  globalThis.__fakeIdbStores = stores;

  const makeDB = () => ({
    objectStoreNames: { contains: (n) => n === 'data' },
    createObjectStore: () => undefined,
    transaction: () => {
      const tx = {
        error: new Error('fake tx error'),
        oncomplete: null,
        onerror: null,
        objectStore: () => ({
          put(record) {
            stores.set(record.name, record.data);
            queueMicrotask(() => tx.oncomplete?.());
          },
          get(name) {
            const req = {
              result: stores.has(name) ? { name, data: stores.get(name) } : null,
            };
            queueMicrotask(() => req.onsuccess?.());
            return req;
          },
        }),
      };
      return tx;
    },
    close: () => {},
  });

  globalThis.indexedDB = {
    open: () => {
      const request = {
        result: makeDB(),
        onupgradeneeded: null,
        onsuccess: null,
        onerror: null,
      };
      queueMicrotask(() => {
        request.onupgradeneeded?.();
        request.onsuccess?.();
      });
      return request;
    },
  };
}

function installFakeLocalStorage() {
  const map = new Map();
  const storage = {
    get length() {
      return map.size;
    },
    key: (i) => [...map.keys()][i] ?? null,
    getItem: (k) => (map.has(String(k)) ? map.get(String(k)) : null),
    setItem: (k, v) => map.set(String(k), String(v)),
    removeItem: (k) => {
      map.delete(String(k));
    },
    clear: () => map.clear(),
  };
  Object.defineProperty(globalThis, 'localStorage', {
    value: storage,
    configurable: true,
    writable: true,
  });
}

beforeEach(() => {
  installFakeLocalStorage();
  installFakeIndexedDB();
  localStorage.clear();
  state.user = null;
  state.data.clear();
  state.upsertCalls.length = 0;
  state.readCalls = 0;
  state.removedChannels.length = 0;
  state.channels.length = 0;
  state.failUpsert = false;
});

afterEach(async () => {
  await db.flush();
});

describe('storage — leitura', () => {
  it('usa cache do localStorage sem consultar o remoto', async () => {
    state.user = { id: UID };
    const dados = [{ id: 1 }];
    localStorage.setItem(key(UID, 'transacoes'), JSON.stringify(dados));

    const result = await db.read('transacoes');

    expect(result).toEqual(dados);
    expect(state.readCalls).toBe(0);
  });

  it('lê do Supabase e popula o cache local', async () => {
    state.user = { id: UID };
    state.data.set(`${UID}:transacoes`, [{ id: 2 }]);

    const result = await db.read('transacoes');

    expect(result).toEqual([{ id: 2 }]);
    expect(JSON.parse(localStorage.getItem(key(UID, 'transacoes')))).toEqual([{ id: 2 }]);
  });

  it('migra dados do placeholder UUID quando o usuário entra', async () => {
    state.user = { id: UID };
    state.data.set(`${PLA}:transacoes`, [{ id: 3 }]);

    const result = await db.read('transacoes');

    expect(result).toEqual([{ id: 3 }]);
    expect(state.upsertCalls).toEqual([{ key: 'transacoes', value: [{ id: 3 }], user_id: UID }]);
    expect(JSON.parse(localStorage.getItem(key(UID, 'transacoes')))).toEqual([{ id: 3 }]);
  });

  it('cache vazio ([]) não mascara o remoto', async () => {
    state.user = { id: UID };
    localStorage.setItem(key(UID, 'transacoes'), '[]');
    state.data.set(`${UID}:transacoes`, [{ id: 4 }]);

    const result = await db.read('transacoes');

    expect(result).toEqual([{ id: 4 }]);
  });

  it('faz fallback para IndexedDB quando não há cache nem remoto', async () => {
    state.user = { id: UID };
    await db.write('dados', { a: 1 });
    await db.flush();
    localStorage.clear();
    state.data.clear();

    const result = await db.read('dados');

    expect(result).toEqual({ a: 1 });
    expect(JSON.parse(localStorage.getItem(key(UID, 'dados')))).toEqual({ a: 1 });
  });

  it('retorna null quando o dado não existe em lugar nenhum', async () => {
    state.user = { id: UID };

    const result = await db.read('nao-existe');

    expect(result).toBeNull();
  });
});

describe('storage — escrita', () => {
  it('grava no localStorage, Supabase e IndexedDB após flush', async () => {
    state.user = { id: UID };
    const dados = [{ id: 1, valor: 100 }];

    await db.write('transacoes', dados);
    await db.flush();

    expect(JSON.parse(localStorage.getItem(key(UID, 'transacoes')))).toEqual(dados);
    expect(state.upsertCalls).toEqual([{ key: 'transacoes', value: dados, user_id: UID }]);
    expect(state.data.get(`${UID}:transacoes`)).toEqual(dados);
    expect(globalThis.__fakeIdbStores.get('transacoes')).toEqual(dados);
  });

  it('coalesce escritas do mesmo nome em um único upsert com o valor mais novo', async () => {
    state.user = { id: UID };
    const v1 = [{ id: 1 }];
    const v2 = [{ id: 2 }, { id: 3 }];

    await db.write('transacoes', v1);
    await db.write('transacoes', v2);
    await db.flush();

    expect(state.upsertCalls).toHaveLength(1);
    expect(state.upsertCalls[0].value).toEqual(v2);
    expect(JSON.parse(localStorage.getItem(key(UID, 'transacoes')))).toEqual(v2);
    expect(globalThis.__fakeIdbStores.get('transacoes')).toEqual(v2);
  });

  it('convidado grava apenas no localStorage/IndexedDB, sem Supabase', async () => {
    const dados = [{ id: 7 }];

    await db.write('transacoes', dados);
    await db.flush();

    expect(state.upsertCalls).toHaveLength(0);
    expect(JSON.parse(localStorage.getItem(`investimento_transacoes`))).toEqual(dados);
    expect(globalThis.__fakeIdbStores.get('transacoes')).toEqual(dados);
  });

  it('re-tenta o upsert em caso de falha e remove da fila após sucesso', async () => {
    state.user = { id: UID };
    const dados = [{ id: 8 }];

    await db.write('transacoes', dados);
    state.failUpsert = true;
    await db.flush();

    expect(state.upsertCalls).toHaveLength(1);
    expect(state.data.get(`${UID}:transacoes`)).toBeUndefined();

    state.failUpsert = false;
    await db.flush();

    expect(state.upsertCalls).toHaveLength(2);
    expect(state.data.get(`${UID}:transacoes`)).toEqual(dados);
  });
});

describe('storage — subscriptions', () => {
  it('entrega payload do postgres_changes ao callback', () => {
    const cb = vi.fn();
    const unsub = subscribeToChanges('transacoes', cb);

    expect(state.channels).toHaveLength(1);
    state.channels[0]._cb({ old: null, new: { value: [{ id: 9 }] } });

    expect(cb).toHaveBeenCalledWith([{ id: 9 }]);
    unsub();
  });

  it('re-subscribe remove o canal anterior antes de criar um novo', () => {
    const cb1 = vi.fn();
    const cb2 = vi.fn();
    const unsub1 = subscribeToChanges('transacoes', cb1);

    const unsub2 = subscribeToChanges('transacoes', cb2);

    expect(state.removedChannels).toHaveLength(1);
    expect(state.channels).toHaveLength(2);
    state.channels[1]._cb({ new: { value: [] } });
    expect(cb1).not.toHaveBeenCalled();
    expect(cb2).toHaveBeenCalled();
    unsub1();
    unsub2();
  });

  it('unsubscribeAll remove todos os canais ativos', () => {
    const unsub1 = subscribeToChanges('a', vi.fn());
    const unsub2 = subscribeToChanges('b', vi.fn());

    unsubscribeAll();

    expect(state.removedChannels).toHaveLength(2);
    unsub1();
    unsub2();
  });

  it('pausa e retoma subscriptions: pausado não abre canal, retomar recria os pendentes', () => {
    const cb = vi.fn();

    pauseSubscriptions();
    const unsubA = subscribeToChanges('a', cb);
    expect(state.channels).toHaveLength(0);

    resumeSubscriptions();
    expect(state.channels).toHaveLength(1);

    const unsubB = subscribeToChanges('b', cb);
    expect(state.channels).toHaveLength(2);

    pauseSubscriptions();
    expect(state.removedChannels).toHaveLength(2);

    resumeSubscriptions();
    expect(state.channels).toHaveLength(4);

    unsubscribeAll();
    expect(state.removedChannels).toHaveLength(4);
    unsubA();
    unsubB();
  });
});