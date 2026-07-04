'use client';

import { useEffect } from 'react';

// Enregistre le service worker pour l'installabilité PWA.
export default function RegisterSW() {
  useEffect(() => {
    if ('serviceWorker' in navigator) {
      navigator.serviceWorker.register('/sw.js').catch(() => {
        /* silencieux : la PWA reste fonctionnelle sans SW */
      });
    }
  }, []);
  return null;
}
