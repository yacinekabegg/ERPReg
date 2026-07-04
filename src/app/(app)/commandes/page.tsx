import PageHead from '@/components/PageHead';
import { AccessDenied, ModuleNotice } from '@/components/Placeholder';
import { getAppUser, hasAnyRole } from '@/lib/appUser';
import { redirect } from 'next/navigation';

export const dynamic = 'force-dynamic';

export default async function CommandesPage() {
  const user = await getAppUser();
  if (!user) redirect('/login');
  if (!hasAnyRole(user.roles, ['sales', 'prod_ops'])) {
    return (
      <>
        <PageHead title="Commandes" />
        <AccessDenied />
      </>
    );
  }

  return (
    <>
      <PageHead
        title="Commandes clients"
        subtitle="Saisies directement par les Sales dans l'outil."
      />
      <ModuleNotice sprint="Sprint 3">
        Écran à venir : création d'une commande client (client, adresse, lignes
        gamme/quantité), suivi du statut et lien vers la demande de départ.
        Les clients sont créés dans l'outil (pas de pré-chargement).
      </ModuleNotice>
    </>
  );
}
