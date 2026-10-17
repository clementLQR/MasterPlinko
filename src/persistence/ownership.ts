import { CONFIG } from '../config';

/** Web Locks arbitre les onglets sans bail temporel ni risque de double propriétaire. */
export async function claimWriter(onAcquire: () => Promise<void>, onWaiting: () => void): Promise<void> {
  if (!navigator.locks) throw new Error('Ce navigateur ne permet pas de sécuriser l’écriture entre onglets. Utilisez Chrome, Edge ou Firefox récent sur localhost.');
  let acquired = false;
  const request = navigator.locks.request(CONFIG.lockName, async () => {
    acquired = true;
    await onAcquire();
    await new Promise<void>(() => { /* Le navigateur libère le verrou à la fermeture de l’onglet. */ });
  });
  // L’onglet en attente n’effectue aucune lecture/écriture de partie avant acquisition.
  setTimeout(() => { if (!acquired) onWaiting(); }, 120);
  await request;
}
