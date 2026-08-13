const mockData = { data: [], error: null };
const mockSingle = { data: {}, error: null };
const mockMaybeSingle = { data: null, error: null };

const chain = () => ({
  select: chain,
  from: chain,
  eq: chain,
  in: chain,
  order: chain,
  limit: chain,
  insert: chain,
  update: chain,
  single: () => Promise.resolve(mockSingle),
  maybeSingle: () => Promise.resolve(mockMaybeSingle),
  then: (resolve: any) => resolve(mockData),
  catch: () => {}
});

export const supabase: any = {
  from: chain,
  auth: {
    getUser: () => Promise.resolve({ data: { user: null }, error: null }),
    getSession: () => Promise.resolve({ data: { session: null }, error: null }),
    signInWithPassword: () => Promise.resolve({ data: { session: null, user: null }, error: null }),
    signOut: () => Promise.resolve({ error: null }),
    onAuthStateChanged: () => (() => {}),
    updateUser: () => Promise.resolve({ data: { user: null }, error: null }),
    refreshSession: () => Promise.resolve({ data: { session: null, user: null }, error: null }),
    resend: () => Promise.resolve({ data: null, error: null }),
  },
  functions: {
    invoke: () => Promise.resolve({ data: null, error: null }),
  },
  storage: {
    from: chain,
  },
  rpc: () => Promise.resolve({ data: null, error: null }),
};

export const createClient = () => supabase;
