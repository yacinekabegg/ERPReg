import React from 'react';
import { Document, Page, View, Text, StyleSheet } from '@react-pdf/renderer';
import {
  COA_SECTIONS,
  COA_ENTREPRISE,
  COA_DECLARATION_FR,
  COA_DECLARATION_EN,
  type CoaData,
} from '@/lib/coa-template';

const BRAND = '#1f7a5c';
const s = StyleSheet.create({
  page: { padding: 36, fontSize: 8.5, fontFamily: 'Helvetica', color: '#1a1d21', lineHeight: 1.35 },
  headerRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start' },
  title: { fontSize: 13, fontFamily: 'Helvetica-Bold', color: BRAND, marginTop: 18 },
  titleSub: { fontSize: 9, color: '#667085' },
  company: { textAlign: 'right' },
  companyName: { fontFamily: 'Helvetica-Bold', color: BRAND, fontSize: 11 },
  meta: { marginTop: 16, marginBottom: 10 },
  metaRow: { flexDirection: 'row', marginBottom: 3 },
  metaLabel: { width: 200, color: '#667085' },
  metaVal: { fontFamily: 'Helvetica-Bold' },
  decl: { marginVertical: 10, fontSize: 7.5, color: '#333', textAlign: 'justify' },
  declEn: { marginTop: 4, fontSize: 7.5, color: '#667085', textAlign: 'justify' },
  sectionTitle: {
    marginTop: 10, marginBottom: 2, fontFamily: 'Helvetica-Bold', color: BRAND,
    fontSize: 9.5, borderBottomWidth: 1, borderBottomColor: BRAND, paddingBottom: 2,
  },
  th: { flexDirection: 'row', backgroundColor: '#eef6f2', paddingVertical: 3, paddingHorizontal: 4 },
  tr: { flexDirection: 'row', borderBottomWidth: 0.5, borderBottomColor: '#e4e7ec', paddingVertical: 3, paddingHorizontal: 4 },
  cName: { width: '34%' },
  cMethod: { width: '30%', color: '#667085' },
  cCrit: { width: '14%' },
  cRes: { width: '14%', fontFamily: 'Helvetica-Bold' },
  cUnit: { width: '8%', color: '#667085' },
  thText: { fontFamily: 'Helvetica-Bold', fontSize: 7.5 },
  labelEn: { color: '#98a2b3', fontSize: 7 },
  footer: { marginTop: 22, flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-end' },
  sign: { alignItems: 'center' },
  signName: { fontFamily: 'Helvetica-Bold', marginTop: 26 },
});

function fmtDate(d: string): string {
  if (!d) return '—';
  const m = /^(\d{4})-(\d{2})-(\d{2})/.exec(d);
  return m ? `${m[3]}/${m[2]}/${m[1]}` : d;
}

export function CoaDocument({ data }: { data: CoaData }) {
  const decl = (t: string) =>
    t.replace('{signataire}', data.signataire).replace('{fonction}', data.fonction);

  return (
    <Document title={`CoA ${data.numero_lot}`}>
      <Page size="A4" style={s.page}>
        <View style={s.headerRow}>
          <View>
            <Text style={s.title}>Certificat d&apos;analyse</Text>
            <Text style={s.titleSub}>Certificate of analysis</Text>
          </View>
          <View style={s.company}>
            <Text style={s.companyName}>{COA_ENTREPRISE.nom}</Text>
            <Text>{COA_ENTREPRISE.adresse1}</Text>
            <Text>{COA_ENTREPRISE.adresse2}</Text>
          </View>
        </View>

        <View style={s.meta}>
          <View style={s.metaRow}>
            <Text style={s.metaLabel}>Nom du produit / product name :</Text>
            <Text style={s.metaVal}>{data.produit}</Text>
          </View>
          <View style={s.metaRow}>
            <Text style={s.metaLabel}>N° de lot / batch number :</Text>
            <Text style={s.metaVal}>{data.numero_lot}</Text>
          </View>
          <View style={s.metaRow}>
            <Text style={s.metaLabel}>Date de fabrication / manufacture date :</Text>
            <Text style={s.metaVal}>{fmtDate(data.date_fabrication)}</Text>
          </View>
          <View style={s.metaRow}>
            <Text style={s.metaLabel}>Date d&apos;expiration / expiry date :</Text>
            <Text style={s.metaVal}>{fmtDate(data.date_expiration)}</Text>
          </View>
        </View>

        <Text style={s.decl}>{decl(COA_DECLARATION_FR)}</Text>
        <Text style={s.declEn}>{decl(COA_DECLARATION_EN)}</Text>

        {COA_SECTIONS.map((section) => (
          <View key={section.titreFr} wrap={false}>
            <Text style={s.sectionTitle}>
              {section.titreFr} / {section.titreEn}
            </Text>
            <View style={s.th}>
              <Text style={[s.cName, s.thText]}>Caractéristique</Text>
              <Text style={[s.cMethod, s.thText]}>Méthode / method</Text>
              <Text style={[s.cCrit, s.thText]}>Critère</Text>
              <Text style={[s.cRes, s.thText]}>Résultat</Text>
              <Text style={[s.cUnit, s.thText]}>Unité</Text>
            </View>
            {section.params.map((p) => {
              const v = data.params[p.cle];
              return (
                <View key={p.cle} style={s.tr}>
                  <View style={s.cName}>
                    <Text>{p.labelFr}</Text>
                    <Text style={s.labelEn}>{p.labelEn}</Text>
                  </View>
                  <Text style={s.cMethod}>{p.methode}</Text>
                  <Text style={s.cCrit}>{p.critere}</Text>
                  <Text style={s.cRes}>{v?.resultat || '—'}</Text>
                  <Text style={s.cUnit}>{p.unite}</Text>
                </View>
              );
            })}
          </View>
        ))}

        <View style={s.footer}>
          <View>
            <Text>Fait à / made in : {COA_ENTREPRISE.ville}</Text>
            <Text>Le / on : {fmtDate(new Date().toISOString())}</Text>
          </View>
          <View style={s.sign}>
            <Text style={{ color: '#667085' }}>{data.fonction}</Text>
            <Text style={s.signName}>{data.signataire}</Text>
          </View>
        </View>
      </Page>
    </Document>
  );
}
