import PageHead from '@/components/PageHead';
import { AccessDenied, ModuleNotice } from '@/components/Placeholder';
import { getAppUser, hasAnyRole } from '@/lib/appUser';
import { redirect } from 'next/navigation';

export const dynamic = 'force-dynamic';

export default async function DepartsPage() {
  const user = await getAppUser();
  if (!user) redirect('/login');
  if (!hasAnyRole(user.roles, ['sales', 'depart'])) {
    return (
      <>
        <PageHead title="Départs" />
        <AccessDenied />
      </>
    );
  }

  const isSales = user.roles.includes('sales') || user.roles.includes('admin');
  const isDepart = user.roles.includes('depart') || user.roles.includes('admin');

  return (
    <>
      <PageHead
        title="Départs"
        subtitle="Demandes de départ (échantillon / commande) puis préparation et expédition."
      />
      {isSales && (
        <ModuleNotice sprint="Sprint 3 · Sales">
          Créer une <strong>demande de départ</strong> : type (échantillon /
          commande), client, adresse, lignes gamme/quantité. Un échantillon est
          pré-rempli à <strong>50 g</strong> (modifiable), gratuit.
        </ModuleNotice>
      )}
      {isDepart && (
        <div style={{ marginTop: 12 }}>
          <ModuleNotice sprint="Sprint 3 · Équipe départ">
            File des demandes à exécuter : allocation de lots <strong>libérés</strong>{' '}
            uniquement, expédition (transporteur, poids/colis, n° de suivi) et
            décrément du stock.
          </ModuleNotice>
        </div>
      )}
    </>
  );
}
