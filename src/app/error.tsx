'use client';

export default function Error({ reset }: { error: Error & { digest?: string }; reset: () => void }) {
  return (
    <div style={{ minHeight: '70vh', display: 'grid', placeItems: 'center', padding: 24 }}>
      <div style={{ maxWidth: 440, textAlign: 'center' }}>
        <div style={{ fontSize: 40, marginBottom: 12 }}>🥚</div>
        <h2 style={{ margin: '0 0 8px' }}>Données momentanément indisponibles</h2>
        <p style={{ color: '#666666', marginTop: 0 }}>
          La base de données n&apos;a pas répondu (elle peut être en veille). Réessayez dans quelques
          secondes.
        </p>
        <div style={{ display: 'flex', gap: 10, justifyContent: 'center', marginTop: 16 }}>
          <button
            onClick={() => reset()}
            style={{ background: '#2eb2a4', color: '#fff', border: 0, borderRadius: 8, padding: '10px 16px', fontWeight: 600, cursor: 'pointer' }}
          >
            Réessayer
          </button>
          <button
            onClick={() => location.reload()}
            style={{ background: 'transparent', color: '#666666', border: '1px solid #e0e0e0', borderRadius: 8, padding: '10px 16px', cursor: 'pointer' }}
          >
            Recharger la page
          </button>
        </div>
      </div>
    </div>
  );
}
