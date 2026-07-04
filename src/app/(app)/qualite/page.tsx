import PageHead from '@/components/PageHead';
import { AccessDenied, ModuleNotice } from '@/components/Placeholder';
import { getAppUser, hasAnyRole } from '@/lib/appUser';
import { redirect } from 'next/navigation';

export const dynamic = 'force-dynamic';

export default async function QualitePage() {
  const user = await getAppUser();
  if (!user) redirect('/login');
  if (!hasAnyRole(user.roles, ['qualite'])) {
    return (
      <>
        <PageHead title="Qualité" />
        <AccessDenied />
      </>
    );
  }

  return (
    <>
      <PageHead
        title="Qualité"
        subtitle="File des lots à valider. Décision 100 % humaine, sans seuil calculé."
      />
      <ModuleNotice sprint="Sprint 2">
        Écran à venir : file des lots « en attente » / « en cours », fiche lot avec
        CoA fournisseur, <strong>upload du CoA Circul'Egg</strong> et champs informatifs
        facultatifs, puis les boutons <span className="badge ok">Libérer</span>{' '}
        <span className="badge danger">Bloquer</span>{' '}
        <span className="badge danger">Refuser</span> + commentaire.
        Libérer un lot le rend automatiquement vendable.
      </ModuleNotice>
    </>
  );
}
