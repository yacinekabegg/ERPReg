'use client';

import { useState } from 'react';

export default function RecapHebdo({ texte, count }: { texte: string; count: number }) {
  const [copied, setCopied] = useState(false);
  return (
    <div>
      <div className="btn-row" style={{ marginBottom: 10 }}>
        <button
          type="button"
          className="btn"
          onClick={() => {
            navigator.clipboard?.writeText(texte).then(
              () => {
                setCopied(true);
                setTimeout(() => setCopied(false), 2000);
              },
              () => {},
            );
          }}
        >
          📋 Copier le récap
        </button>
        {copied && <span className="badge ok">Copié</span>}
        <span style={{ color: 'var(--muted)' }}>{count} envoi(s) cette semaine</span>
      </div>
      <textarea
        readOnly
        value={texte}
        style={{
          width: '100%',
          minHeight: 160,
          fontFamily: 'ui-monospace, monospace',
          fontSize: 13,
          padding: 12,
          border: '1px solid var(--border)',
          borderRadius: 8,
          background: '#fff',
        }}
      />
    </div>
  );
}
