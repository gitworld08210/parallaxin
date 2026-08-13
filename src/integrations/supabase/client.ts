const mock = {
  from: () => mock,
  select: () => mock,
  eq: () => mock,
  order: () => mock,
  limit: () => mock,
  insert: () => mock,
  update: () => mock,
  delete: () => mock,
  upsert: () => mock,
  neq: () => mock,
  in: () => mock,
  or: () => mock,
  maybeSingle: () => Promise.resolve({ data: null, error: null }),
  single: () => Promise.resolve({ data: null, error: null }),
  rpc: () => Promise.resolve({ data: null, error: null }),
  channel: () => mock,
  on: () => mock,
  subscribe: () => mock,
  removeChannel: () => mock,
  auth: {
    signInWithPassword: () => Promise.resolve({ data: {}, error: null }),
    signOut: () => Promise.resolve({ error: null }),
    onAuthStateChanged: () => () => {},
  },
  functions: {
    invoke: () => Promise.resolve({ data: null, error: null }),
  }
};
export const supabase = mock as any;
