import { useEffect, useMemo, useState } from 'react';
import { Select } from '../../../../design-system/components/core/Select';
import { bridgeInvoke } from '../../../services/bridgeAdapter';

interface PersonaSelectorProps {
  value: string;
  onChange: (persona: string) => void;
}

export function PersonaSelector({ value, onChange }: PersonaSelectorProps) {
  const [options, setOptions] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let mounted = true;
    setLoading(true);
    bridgeInvoke<string[]>('get_personas')
      .then((personas) => {
        if (!mounted) return;
        setOptions(personas ?? []);
      })
      .catch(() => setOptions([]))
      .finally(() => setLoading(false));
    return () => {
      mounted = false;
    };
  }, []);

  const selectOptions = useMemo(() => {
    const all = Array.from(new Set([value, ...options].filter(Boolean)));
    return all.map((name) => ({ value: name, label: name }));
  }, [value, options]);

  return (
    <Select
      value={value}
      onChange={onChange}
      options={selectOptions}
      placeholder="Persona"
      disabled={loading || selectOptions.length === 0}
      aria-label="Active persona"
      className="w-32 sm:w-40"
    />
  );
}
