export const supabase: any = new Proxy({}, { get: () => () => ({ data: null, error: null }) });
