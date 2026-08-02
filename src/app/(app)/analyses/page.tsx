import PageHead from '@/components/PageHead';
import { AccessDenied, ModuleNotice } from '@/components/Placeholder';
import AnalyseForm from './AnalyseForm';
import DeleteButton from '@/components/DeleteButton';
import { getAppUser, hasAnyRole } from '@/lib/appUser';
import { createClient, supabaseConfigured } from '@/lib/supabase/server';
import { redirect } from 'next/navigation';

export const dynamic = 'force-dynamic';

type Row = {
  id: string;
  type_analyse: string;
  date_analyse: string;
  valeurs: string | null;
  commentaire: string | null;
  lots: { numero_lot_fournisseur: string | null } | null;
};

async function load(): Promise<{ analyses: Row[]; lots: { id: string; label: string }[] }> {
  if (!supabaseConfigured()) return { analyses: [], lots: [] };
  try {
  const supabase = createClient();
  const [aRes, lRes] = await Promise.all([
    supabase
      .from('suivi_analyses')
      .select('id, type_analyse, date_analyse, valeurs, commentaire, lots(numero_lot_fournisseur)')
      .order('date_analyse', { ascending: false })
      .limit(100),
    supabase.from('lots').select('id, numero_lot_fournisseur').order('created_at', { ascending: false }).limit(200),
  ]);
  return {
    analyses: (aRes.data as unknown as Row[]) ?? [],
    lots: ((lRes.data as any[]) ?? []).map((l) => ({ id: l.id as string, label: (l.numero_lot_fournisseur as string) ?? l.id })),
  };
  } catch {
    return { analyses: [], lots: [] };
  }
}

export default async function AnalysesPage() {
  const user = await getAppUser();
  if (!user) redirect('/login');
  if (!hasAnyRole(user.roles, ['qualite'])) {
    return (
      <>
        <PageHead title="Suivi des analyses" />
        <AccessDenied />
      </>
    );
  }

  const { analyses, lots } = await load();
  const canDelete = user.roles.includes('admin');

  return (
    <>
      <PageHead
        title="Suivi des analyses"
        subtitle="Registre libre des analyses ponctuelles et biannuelles (collagène, métaux lourds…). Non exploité automatiquement par l'ERP."
      />

      {!supabaseConfigured() && (
        <div style={{ marginBottom: 16 }}>
          <ModuleNotice sprint="Mode démo">Branchez Supabase pour saisir des analyses.</ModuleNotice>
        </div>
      )}

      <div className="card" style={{ marginBottom: 20 }}>
        <h3 style={{ marginTop: 0 }}>Nouvelle analyse</h3>
        <AnalyseForm lots={lots} />
      </div>

      <div className="card">
        <h3 style={{ marginTop: 0 }}>Historique</h3>
        {analyses.length === 0 ? (
          <div className="notice" style={{ border: 0, padding: 0 }}>Aucune analyse enregistrée.</div>
        ) : (
          <table>
            <thead>
              <tr>
                <th>Date</th>
                <th>Type</th>
                <th>Lot</th>
                <th>Valeurs</th>
                <th>Commentaire</th>
                {canDelete && <th></th>}
              </tr>
            </thead>
            <tbody>
              {analyses.map((a) => (
                <tr key={a.id}>
                  <td>{a.date_analyse}</td>
                  <td>{a.type_analyse}</td>
                  <td>{a.lots?.numero_lot_fournisseur ?? '—'}</td>
                  <td>{a.valeurs ?? '—'}</td>
                  <td>{a.commentaire ?? '—'}</td>
                  {canDelete && (
                    <td>
                      <DeleteButton type="analyse" id={a.id} label="cette analyse" canDelete={canDelete} />
                    </td>
                  )}
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </>
  );
}
