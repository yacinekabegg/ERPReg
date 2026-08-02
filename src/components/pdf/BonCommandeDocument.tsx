import React from 'react';
import { Document, Page, View, Text, StyleSheet } from '@react-pdf/renderer';
import { COA_ENTREPRISE } from '@/lib/coa-template';

export type BonCommandeData = {
  numero: string;
  numero_bdc: string | null;
  fournisseur: string;
  gamme: string;
  origine: string;
  quantite: number;
  date_commande: string;
  date_prevue: string | null;
  commentaires: string | null;
};

const BRAND = '#2eb2a4';
const s = StyleSheet.create({
  page: { padding: 40, fontSize: 10, fontFamily: 'Helvetica', color: '#1a1d21', lineHeight: 1.4 },
  headerRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start' },
  title: { fontSize: 16, fontFamily: 'Helvetica-Bold', color: BRAND, marginTop: 18 },
  company: { textAlign: 'right' },
  companyName: { fontFamily: 'Helvetica-Bold', color: BRAND, fontSize: 12 },
  row: { flexDirection: 'row', marginBottom: 6, marginTop: 4 },
  label: { width: 200, color: '#666666' },
  val: { fontFamily: 'Helvetica-Bold' },
  block: { marginTop: 20 },
  foot: { marginTop: 40, color: '#666666', fontSize: 9 },
});

function fmt(d: string | null): string {
  if (!d) return '—';
  const m = /^(\d{4})-(\d{2})-(\d{2})/.exec(d);
  return m ? `${m[3]}/${m[2]}/${m[1]}` : d;
}

export function BonCommandeDocument({ data }: { data: BonCommandeData }) {
  return (
    <Document title={`Bon de commande ${data.numero_bdc ?? data.numero}`}>
      <Page size="A4" style={s.page}>
        <View style={s.headerRow}>
          <Text style={s.title}>Bon de commande fournisseur</Text>
          <View style={s.company}>
            <Text style={s.companyName}>{COA_ENTREPRISE.nom}</Text>
            <Text>{COA_ENTREPRISE.adresse1}</Text>
            <Text>{COA_ENTREPRISE.adresse2}</Text>
          </View>
        </View>

        <View style={s.block}>
          <View style={s.row}>
            <Text style={s.label}>N° de bon de commande :</Text>
            <Text style={s.val}>{data.numero_bdc ?? data.numero}</Text>
          </View>
          <View style={s.row}>
            <Text style={s.label}>Fournisseur :</Text>
            <Text style={s.val}>{data.fournisseur}</Text>
          </View>
          <View style={s.row}>
            <Text style={s.label}>Produit / gamme :</Text>
            <Text style={s.val}>{data.gamme}</Text>
          </View>
          <View style={s.row}>
            <Text style={s.label}>Origine :</Text>
            <Text style={s.val}>{data.origine}</Text>
          </View>
          <View style={s.row}>
            <Text style={s.label}>Quantité commandée :</Text>
            <Text style={s.val}>{data.quantite} kg</Text>
          </View>
          <View style={s.row}>
            <Text style={s.label}>Date de commande :</Text>
            <Text style={s.val}>{fmt(data.date_commande)}</Text>
          </View>
          <View style={s.row}>
            <Text style={s.label}>Réception prévue :</Text>
            <Text style={s.val}>{fmt(data.date_prevue)}</Text>
          </View>
          {data.commentaires ? (
            <View style={s.row}>
              <Text style={s.label}>Commentaires :</Text>
              <Text style={s.val}>{data.commentaires}</Text>
            </View>
          ) : null}
        </View>

        <Text style={s.foot}>Document généré par l&apos;ERP Reggenerate — Circul&apos;Egg, {COA_ENTREPRISE.ville}.</Text>
      </Page>
    </Document>
  );
}
