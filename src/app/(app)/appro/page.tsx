import PageHead from '@/components/PageHead';
import { AccessDenied, ModuleNotice } from '@/components/Placeholder';
import { getAppUser, hasAnyRole } from '@/lib/appUser';
import { redirect } from 'next/navigation';

export const dynamic = 'force-dynamic';

export default async function ApproPage() {
  const user = await getAppUser();
  if (!user) redirect('/login');
  if (!hasAnyRole(user.roles, ['prod_ops'])) {
    return (
      <>
        <PageHead title="Appro" />
        <AccessDenied />
      </>
    );
  }

  return (
    <>
      <PageHead
        title="Appro — arrivées prévues"
        subtitle="Anticiper les ruptures : arrivées de matière par gamme et origine, retards."
      />
      <ModuleNotice sprint="Sprint 4 (V1.1)">
        Écran à venir : saisie des arrivées prévues (gamme, origine, quantité, date
        prévue), calcul automatique du <strong>retard</strong>, et croisement
        stock disponible + arrivées − commandes pour anticiper les ruptures.
      </ModuleNotice>
    </>
  );
}
