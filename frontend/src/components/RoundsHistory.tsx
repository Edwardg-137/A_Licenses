'use client';

const PRIORITY_STYLES: Record<string, string> = {
  ALTA: 'bg-red-100 text-red-800',
  MEDIA: 'bg-yellow-100 text-yellow-800',
  BAJA: 'bg-blue-100 text-blue-800',
};

export interface ObservationItem {
  id: string;
  round: number;
  priority: string;
  text: string;
  resolvedAt: string | null;
  createdAt: string;
  author: { fullName: string };
  document: { requirement: { code: string; name: string } } | null;
}

/** Historial de rondas de corrección: observaciones agrupadas por ronda. */
export default function RoundsHistory({
  observations,
}: {
  observations: ObservationItem[];
}) {
  if (observations.length === 0) return null;

  const rounds = new Map<number, ObservationItem[]>();
  for (const obs of observations) {
    const list = rounds.get(obs.round) ?? [];
    list.push(obs);
    rounds.set(obs.round, list);
  }

  return (
    <section className="mt-6 rounded-lg border bg-white p-6 shadow-sm">
      <h2 className="text-lg font-semibold">Historial de rondas de corrección</h2>
      <div className="mt-4 space-y-5">
        {Array.from(rounds.entries()).map(([round, items]) => (
          <div key={round}>
            <h3 className="text-sm font-semibold text-gray-700">Ronda {round}</h3>
            <ul className="mt-2 space-y-2">
              {items.map((obs) => (
                <li
                  key={obs.id}
                  className="rounded border border-gray-200 bg-gray-50 p-3 text-sm"
                >
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="font-medium">
                      {obs.document?.requirement.code ?? 'General'} —{' '}
                      {obs.document?.requirement.name}
                    </span>
                    <span
                      className={`rounded px-2 py-0.5 text-xs font-medium ${PRIORITY_STYLES[obs.priority] ?? 'bg-gray-100 text-gray-700'}`}
                    >
                      {obs.priority}
                    </span>
                    <span
                      className={`rounded px-2 py-0.5 text-xs ${
                        obs.resolvedAt
                          ? 'bg-green-100 text-green-800'
                          : 'bg-orange-100 text-orange-800'
                      }`}
                    >
                      {obs.resolvedAt ? 'Resuelta' : 'Pendiente'}
                    </span>
                  </div>
                  <p className="mt-1 text-gray-700">{obs.text}</p>
                  <p className="mt-1 text-xs text-gray-400">
                    {obs.author.fullName} · {new Date(obs.createdAt).toLocaleString('es-GT')}
                  </p>
                </li>
              ))}
            </ul>
          </div>
        ))}
      </div>
    </section>
  );
}
