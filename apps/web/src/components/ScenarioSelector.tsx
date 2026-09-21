// src/components/ScenarioSelector.tsx

import React, { useEffect, useState } from 'react';

interface Scenario {
  id: string;
  description: string;
}

interface Props {
  selectedId: string;
  onSelect: (id: string) => void;
}

export default function ScenarioSelector({ selectedId, onSelect }: Props) {
  const [scenarios, setScenarios] = useState<Scenario[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    // For this educational lab we use a static list; replace with real API if needed
    setLoading(true);
    fetch('/api/scenario/list')
      .then((res) => {
        if (!res.ok) throw new Error('Failed to fetch scenarios');
        return res.json();
      })
      .then((data) => {
        // Expect data.scenarios array
        setScenarios(data.scenarios || []);
        setLoading(false);
      })
      .catch((e) => {
        console.error(e);
        setError(e.message);
        setLoading(false);
      });
  }, []);

  if (loading) return <p className="text-gray-400">Loading scenarios…</p>;
  if (error) return <p className="text-red-500">Error: {error}</p>;

  return (
    <div className="mb-4">
      <label className="block mb-1 font-medium text-gray-200">Scenario</label>
      <select
        value={selectedId}
        onChange={(e) => onSelect(e.target.value)}
        className="w-full p-2 bg-card text-gray-200 rounded"
      >
        <option value="" disabled>
          -- Select a scenario --
        </option>
        {scenarios.map((s) => (
          <option key={s.id} value={s.id}>
            {s.description}
          </option>
        ))}
      </select>
    </div>
  );
}
