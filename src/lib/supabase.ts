import { createClient } from '@supabase/supabase-js';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL || 'https://bwkzbkabvisqbelocdff.supabase.co';
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY || 'sb_publishable_3dzUU2hGNdPLm1hQHeKJgg_gGGvvjf0';

// Realtime completamente desativado — o app usa polling (setInterval).
// Isso evita o erro "send was called before connect" do WebSocket.
const clientOptions = {
  realtime: {
    autoConnectRealtime: false,
    params: { eventsPerSecond: 0 },
  },
  global: {
    headers: { 'x-client-info': 'resenha-moura' },
  },
};

export const supabase = createClient(supabaseUrl, supabaseAnonKey, clientOptions);

// Desconecta o canal Realtime imediatamente para garantir que nenhuma
// conexão WebSocket seja aberta em segundo plano.
try {
  supabase.removeAllChannels();
} catch (_) {
  // Ignora se não houver canais
}

export const tempAuthClient = createClient(supabaseUrl, supabaseAnonKey, {
  auth: { persistSession: false },
  ...clientOptions,
});
try {
  tempAuthClient.removeAllChannels();
} catch (_) {
  // Ignora
}

// Access from console for maintenance/registration
if (typeof window !== 'undefined') {
  (window as any).supabase = supabase;
}
