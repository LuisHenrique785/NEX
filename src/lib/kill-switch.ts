import { useEffect, useState } from 'react';
import { supabase } from './supabase';

export interface KillSwitchConfig {
  locked: boolean;
  price_label: string;
  contact: string;
  message: string;
}

const DEFAULT: KillSwitchConfig = {
  locked: false,
  price_label: 'R$ 1.500/mês',
  contact: '(35) 9 9726-8054',
  message: 'Este sistema está temporariamente suspenso.',
};

export function useKillSwitch() {
  const [config, setConfig] = useState<KillSwitchConfig>(DEFAULT);
  const [checked, setChecked] = useState(false);

  useEffect(() => {
    let cancelled = false;
    async function check() {
      try {
        const { data } = await supabase
          .from('app_config')
          .select('locked, price_label, contact, message')
          .eq('id', 1)
          .single();
        if (!cancelled && data) {
          setConfig({ ...DEFAULT, ...data });
        }
      } catch {
        // table doesn't exist yet — stay unlocked
      } finally {
        if (!cancelled) setChecked(true);
      }
    }
    check();
    return () => { cancelled = true; };
  }, []);

  return { config, checked };
}
