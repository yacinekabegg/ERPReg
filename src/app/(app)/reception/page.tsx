import PageHead from '@/components/PageHead';
import { AccessDenied, ModuleNotice } from '@/components/Placeholder';
import { getAppUser } from '@/lib/appUser';
import { hasAnyRole } from '@/lib/appUser';
import { redirect } from 'next/navigation';

export const dynamic = 'force-dynamic';

export default async function ReceptionPage() {
  const user = await getAppUser();
  if (!user) redirect('/login');
  if (!hasAnyRole(user.roles, ['prod_ops'])) {
    return (
      <>
        <PageHead title="Réception" />
        <AccessDenied />
      </>
    );
  }

  return (
    <>
      <PageHead
        title="Réception"
        subtitle="Entrée des lots en stock et upload du CoA fournisseur."
      />
      <ModuleNotice sprint="Sprint 1">
        Écran à venir : formulaire de saisie d'un lot (gamme, origine, quantité, DLUO,
        n° de lot fournisseur, emplacement) avec <strong>upload du CoA fournisseur</strong>.
        Le n° de lot Circul'Egg est généré automatiquement
        (<code>REG-GAMME-ORIGINE-AAMMJJ-seq</code>) et le lot entre en zone
        <strong> quarantaine</strong>, statut « en attente ».
      </ModuleNotice>
    </>
  );
}
