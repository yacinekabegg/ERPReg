-- =============================================================================
-- ERP Reggenerate — IMPORT HISTORIQUE : etat du stock actuel (onglet STOCK Excel)
-- A executer APRES setup.sql, dans le SQL Editor Supabase. Idempotent.
-- Mapping de gamme = best-effort selon la granulometrie -> a revoir si besoin.
-- Stock importe par format via des mouvements 'Import stock initial'.
-- Les CLIENTS ne sont PAS importes (donnees trop heterogenes) : a creer dans l'app.
-- =============================================================================

-- 35 lots

-- EGGM130923  [MB 200µm] Egglin  val=OUI -> libere/STD
insert into public.lots (numero_lot_fournisseur, gamme_id, origine_id, fournisseur_id, granulometrie, date_reception, statut, quantite_recue) select 'EGGM130923',(select id from public.gammes where code='STD'),(select id from public.origines where code='TR'),(select id from public.fournisseurs where nom='Egglin'),'MB 200µm','2023-09-27','libere',5 where not exists (select 1 from public.lots where numero_lot_fournisseur='EGGM130923');
insert into public.mouvements_stock (lot_id, type, format, quantite, motif) select id,'ajustement','echantillotheque',0.6,'Import stock initial' from public.lots where numero_lot_fournisseur='EGGM130923';

-- 362-M-23-EL  [NC] Egglin  val=NON -> bloque/STD
insert into public.lots (numero_lot_fournisseur, gamme_id, origine_id, fournisseur_id, granulometrie, date_reception, statut, quantite_recue) select '362-M-23-EL',(select id from public.gammes where code='STD'),(select id from public.origines where code='TR'),(select id from public.fournisseurs where nom='Egglin'),'NC','2023-12-28','bloque',15 where not exists (select 1 from public.lots where numero_lot_fournisseur='362-M-23-EL');
insert into public.mouvements_stock (lot_id, type, format, quantite, motif) select id,'ajustement','nc',1.85,'Import stock initial' from public.lots where numero_lot_fournisseur='362-M-23-EL';

-- EGGM300126  [MB 200µm] Egglin  val=OUI -> libere/STD
insert into public.lots (numero_lot_fournisseur, gamme_id, origine_id, fournisseur_id, granulometrie, date_reception, statut, quantite_recue) select 'EGGM300126',(select id from public.gammes where code='STD'),(select id from public.origines where code='TR'),(select id from public.fournisseurs where nom='Egglin'),'MB 200µm','2024-02-14','libere',31 where not exists (select 1 from public.lots where numero_lot_fournisseur='EGGM300126');
insert into public.mouvements_stock (lot_id, type, format, quantite, motif) select id,'ajustement','nc',2.0,'Import stock initial' from public.lots where numero_lot_fournisseur='EGGM300126';

-- EGGM3008342-Pétales  [MB Pétales] Egglin  val=NA -> en_attente/STD
insert into public.lots (numero_lot_fournisseur, gamme_id, origine_id, fournisseur_id, granulometrie, date_reception, statut, quantite_recue) select 'EGGM3008342-Pétales',(select id from public.gammes where code='STD'),(select id from public.origines where code='TR'),(select id from public.fournisseurs where nom='Egglin'),'MB Pétales','2024-04-30','en_attente',8 where not exists (select 1 from public.lots where numero_lot_fournisseur='EGGM3008342-Pétales');

-- EGGM3008342  [MB 200µm] Egglin  val=OUI -> libere/STD
insert into public.lots (numero_lot_fournisseur, gamme_id, origine_id, fournisseur_id, granulometrie, date_reception, statut, quantite_recue) select 'EGGM3008342',(select id from public.gammes where code='STD'),(select id from public.origines where code='TR'),(select id from public.fournisseurs where nom='Egglin'),'MB 200µm','2024-04-30','libere',200 where not exists (select 1 from public.lots where numero_lot_fournisseur='EGGM3008342');
insert into public.mouvements_stock (lot_id, type, format, quantite, motif) select id,'ajustement','echantillotheque',0.5,'Import stock initial' from public.lots where numero_lot_fournisseur='EGGM3008342';
insert into public.mouvements_stock (lot_id, type, format, quantite, motif) select id,'ajustement','nc',4.3,'Import stock initial' from public.lots where numero_lot_fournisseur='EGGM3008342';

-- EGGM3001325  [MB 90µm] Egglin  val=NA -> en_attente/PLUS
insert into public.lots (numero_lot_fournisseur, gamme_id, origine_id, fournisseur_id, granulometrie, date_reception, statut, quantite_recue) select 'EGGM3001325',(select id from public.gammes where code='PLUS'),(select id from public.origines where code='TR'),(select id from public.fournisseurs where nom='Egglin'),'MB 90µm','2024-05-01','en_attente',1.5 where not exists (select 1 from public.lots where numero_lot_fournisseur='EGGM3001325');
insert into public.mouvements_stock (lot_id, type, format, quantite, motif) select id,'ajustement','echantillotheque',0.8,'Import stock initial' from public.lots where numero_lot_fournisseur='EGGM3001325';

-- EGGM3000215  [MB 200µm] Egglin  val=OUI -> libere/STD
insert into public.lots (numero_lot_fournisseur, gamme_id, origine_id, fournisseur_id, granulometrie, date_reception, statut, quantite_recue) select 'EGGM3000215',(select id from public.gammes where code='STD'),(select id from public.origines where code='TR'),(select id from public.fournisseurs where nom='Egglin'),'MB 200µm','2024-06-07','libere',300 where not exists (select 1 from public.lots where numero_lot_fournisseur='EGGM3000215');
insert into public.mouvements_stock (lot_id, type, format, quantite, motif) select id,'ajustement','echantillotheque',0.8,'Import stock initial' from public.lots where numero_lot_fournisseur='EGGM3000215';
insert into public.mouvements_stock (lot_id, type, format, quantite, motif) select id,'ajustement','nc',0.3,'Import stock initial' from public.lots where numero_lot_fournisseur='EGGM3000215';

-- 2661989  [MB Eggnovo] Eggnovo  val=NA -> en_attente/STD
insert into public.lots (numero_lot_fournisseur, gamme_id, origine_id, fournisseur_id, granulometrie, date_reception, statut, quantite_recue) select '2661989',(select id from public.gammes where code='STD'),(select id from public.origines where code='ES'),(select id from public.fournisseurs where nom='Eggnovo'),'MB Eggnovo','2024-07-01','en_attente',0 where not exists (select 1 from public.lots where numero_lot_fournisseur='2661989');

-- EGGM3000828  [MB Compression] Egglin  val=OUI -> libere/STD
insert into public.lots (numero_lot_fournisseur, gamme_id, origine_id, fournisseur_id, granulometrie, date_reception, statut, quantite_recue) select 'EGGM3000828',(select id from public.gammes where code='STD'),(select id from public.origines where code='TR'),(select id from public.fournisseurs where nom='Egglin'),'MB Compression','2024-09-18','libere',55 where not exists (select 1 from public.lots where numero_lot_fournisseur='EGGM3000828');
insert into public.mouvements_stock (lot_id, type, format, quantite, motif) select id,'ajustement','echantillon',5.0,'Import stock initial' from public.lots where numero_lot_fournisseur='EGGM3000828';

-- EGGM3003828 1  [MB 90-110 µm] Egglin  val=OUI -> libere/PLUS
insert into public.lots (numero_lot_fournisseur, gamme_id, origine_id, fournisseur_id, granulometrie, date_reception, statut, quantite_recue) select 'EGGM3003828 1',(select id from public.gammes where code='PLUS'),(select id from public.origines where code='TR'),(select id from public.fournisseurs where nom='Egglin'),'MB 90-110 µm','2024-09-18','libere',1.5 where not exists (select 1 from public.lots where numero_lot_fournisseur='EGGM3003828 1');
insert into public.mouvements_stock (lot_id, type, format, quantite, motif) select id,'ajustement','echantillotheque',0.1,'Import stock initial' from public.lots where numero_lot_fournisseur='EGGM3003828 1';

-- EGGM3003828 2  [MB 200-250 µm] Egglin  val=OUI -> libere/STD
insert into public.lots (numero_lot_fournisseur, gamme_id, origine_id, fournisseur_id, granulometrie, date_reception, statut, quantite_recue) select 'EGGM3003828 2',(select id from public.gammes where code='STD'),(select id from public.origines where code='TR'),(select id from public.fournisseurs where nom='Egglin'),'MB 200-250 µm','2024-09-18','libere',1.5 where not exists (select 1 from public.lots where numero_lot_fournisseur='EGGM3003828 2');
insert into public.mouvements_stock (lot_id, type, format, quantite, motif) select id,'ajustement','echantillotheque',1.3,'Import stock initial' from public.lots where numero_lot_fournisseur='EGGM3003828 2';

-- EGGM3003828 3  [MB 385-450µm] Egglin  val=OUI -> libere/STD
insert into public.lots (numero_lot_fournisseur, gamme_id, origine_id, fournisseur_id, granulometrie, date_reception, statut, quantite_recue) select 'EGGM3003828 3',(select id from public.gammes where code='STD'),(select id from public.origines where code='TR'),(select id from public.fournisseurs where nom='Egglin'),'MB 385-450µm','2024-09-18','libere',1.5 where not exists (select 1 from public.lots where numero_lot_fournisseur='EGGM3003828 3');
insert into public.mouvements_stock (lot_id, type, format, quantite, motif) select id,'ajustement','echantillotheque',1.3,'Import stock initial' from public.lots where numero_lot_fournisseur='EGGM3003828 3';

-- 24101801 - dispersible  [Mb micronisée] Lessonia  val=NON -> bloque/STD
insert into public.lots (numero_lot_fournisseur, gamme_id, origine_id, fournisseur_id, granulometrie, date_reception, statut, quantite_recue) select '24101801 - dispersible',(select id from public.gammes where code='STD'),(select id from public.origines where code='FR'),(select id from public.fournisseurs where nom='Lessonia'),'Mb micronisée','2024-10-29','bloque',80 where not exists (select 1 from public.lots where numero_lot_fournisseur='24101801 - dispersible');
insert into public.mouvements_stock (lot_id, type, format, quantite, motif) select id,'ajustement','sac',40.0,'Import stock initial' from public.lots where numero_lot_fournisseur='24101801 - dispersible';
insert into public.mouvements_stock (lot_id, type, format, quantite, motif) select id,'ajustement','echantillon',31.0,'Import stock initial' from public.lots where numero_lot_fournisseur='24101801 - dispersible';

-- 24100907 - granulée  [Mb granulée] Lessonia  val=OUI -> libere/STD
insert into public.lots (numero_lot_fournisseur, gamme_id, origine_id, fournisseur_id, granulometrie, date_reception, statut, quantite_recue) select '24100907 - granulée',(select id from public.gammes where code='STD'),(select id from public.origines where code='FR'),(select id from public.fournisseurs where nom='Lessonia'),'Mb granulée','2024-10-29','libere',8.18 where not exists (select 1 from public.lots where numero_lot_fournisseur='24100907 - granulée');
insert into public.mouvements_stock (lot_id, type, format, quantite, motif) select id,'ajustement','echantillon',8.18,'Import stock initial' from public.lots where numero_lot_fournisseur='24100907 - granulée';

-- EGGM3000611  [MB 200µm] Egglin  val=OUI -> libere/STD
insert into public.lots (numero_lot_fournisseur, gamme_id, origine_id, fournisseur_id, granulometrie, date_reception, statut, quantite_recue) select 'EGGM3000611',(select id from public.gammes where code='STD'),(select id from public.origines where code='TR'),(select id from public.fournisseurs where nom='Egglin'),'MB 200µm','2024-11-25','libere',300 where not exists (select 1 from public.lots where numero_lot_fournisseur='EGGM3000611');
insert into public.mouvements_stock (lot_id, type, format, quantite, motif) select id,'ajustement','echantillon',5.0,'Import stock initial' from public.lots where numero_lot_fournisseur='EGGM3000611';

-- EGGM3002310  [prot > 90%] Egglin  val=OUI -> libere/PROT90
insert into public.lots (numero_lot_fournisseur, gamme_id, origine_id, fournisseur_id, granulometrie, date_reception, statut, quantite_recue) select 'EGGM3002310',(select id from public.gammes where code='PROT90'),(select id from public.origines where code='TR'),(select id from public.fournisseurs where nom='Egglin'),'prot > 90%','2024-11-25','libere',15 where not exists (select 1 from public.lots where numero_lot_fournisseur='EGGM3002310');
insert into public.mouvements_stock (lot_id, type, format, quantite, motif) select id,'ajustement','echantillon',5.0,'Import stock initial' from public.lots where numero_lot_fournisseur='EGGM3002310';

-- EGGM3002502  [MB 200µm] Egglin  val=OUI -> libere/STD
insert into public.lots (numero_lot_fournisseur, gamme_id, origine_id, fournisseur_id, granulometrie, date_reception, statut, quantite_recue) select 'EGGM3002502',(select id from public.gammes where code='STD'),(select id from public.origines where code='TR'),(select id from public.fournisseurs where nom='Egglin'),'MB 200µm','2025-03-07','libere',150 where not exists (select 1 from public.lots where numero_lot_fournisseur='EGGM3002502');
insert into public.mouvements_stock (lot_id, type, format, quantite, motif) select id,'ajustement','echantillon',5.0,'Import stock initial' from public.lots where numero_lot_fournisseur='EGGM3002502';

-- EGGM3002502-90110  [MB 90-110 µm] Egglin  val=OUI -> libere/PLUS
insert into public.lots (numero_lot_fournisseur, gamme_id, origine_id, fournisseur_id, granulometrie, date_reception, statut, quantite_recue) select 'EGGM3002502-90110',(select id from public.gammes where code='PLUS'),(select id from public.origines where code='TR'),(select id from public.fournisseurs where nom='Egglin'),'MB 90-110 µm','2025-03-10','libere',100 where not exists (select 1 from public.lots where numero_lot_fournisseur='EGGM3002502-90110');
insert into public.mouvements_stock (lot_id, type, format, quantite, motif) select id,'ajustement','echantillon',5.0,'Import stock initial' from public.lots where numero_lot_fournisseur='EGGM3002502-90110';

-- EGGM3002504  [MB 200µm] Egglin  val=0 -> en_attente/STD
insert into public.lots (numero_lot_fournisseur, gamme_id, origine_id, fournisseur_id, granulometrie, date_reception, statut, quantite_recue) select 'EGGM3002504',(select id from public.gammes where code='STD'),(select id from public.origines where code='TR'),(select id from public.fournisseurs where nom='Egglin'),'MB 200µm','2025-05-06','en_attente',100 where not exists (select 1 from public.lots where numero_lot_fournisseur='EGGM3002504');

-- EGGM3002504-M  [MB 90-110 µm] Egglin  val=OUI -> libere/PLUS
insert into public.lots (numero_lot_fournisseur, gamme_id, origine_id, fournisseur_id, granulometrie, date_reception, statut, quantite_recue) select 'EGGM3002504-M',(select id from public.gammes where code='PLUS'),(select id from public.origines where code='TR'),(select id from public.fournisseurs where nom='Egglin'),'MB 90-110 µm','2025-05-06','libere',100 where not exists (select 1 from public.lots where numero_lot_fournisseur='EGGM3002504-M');
insert into public.mouvements_stock (lot_id, type, format, quantite, motif) select id,'ajustement','echantillon',4.0,'Import stock initial' from public.lots where numero_lot_fournisseur='EGGM3002504-M';

-- EGGM3002504-F  [MB Flocons] Egglin  val=NA -> en_attente/STD
insert into public.lots (numero_lot_fournisseur, gamme_id, origine_id, fournisseur_id, granulometrie, date_reception, statut, quantite_recue) select 'EGGM3002504-F',(select id from public.gammes where code='STD'),(select id from public.origines where code='TR'),(select id from public.fournisseurs where nom='Egglin'),'MB Flocons','2025-05-06','en_attente',10 where not exists (select 1 from public.lots where numero_lot_fournisseur='EGGM3002504-F');
insert into public.mouvements_stock (lot_id, type, format, quantite, motif) select id,'ajustement','sac',10.0,'Import stock initial' from public.lots where numero_lot_fournisseur='EGGM3002504-F';

-- EGGM3002505  [MB 200µm] Egglin  val=OUI -> libere/STD
insert into public.lots (numero_lot_fournisseur, gamme_id, origine_id, fournisseur_id, granulometrie, date_reception, statut, quantite_recue) select 'EGGM3002505',(select id from public.gammes where code='STD'),(select id from public.origines where code='TR'),(select id from public.fournisseurs where nom='Egglin'),'MB 200µm','2025-05-21','libere',200 where not exists (select 1 from public.lots where numero_lot_fournisseur='EGGM3002505');
insert into public.mouvements_stock (lot_id, type, format, quantite, motif) select id,'ajustement','echantillon',15.0,'Import stock initial' from public.lots where numero_lot_fournisseur='EGGM3002505';

-- EGGM3002506-M  [MB 90-110 µm] Egglin  val=OUI -> libere/PLUS
insert into public.lots (numero_lot_fournisseur, gamme_id, origine_id, fournisseur_id, granulometrie, date_reception, statut, quantite_recue) select 'EGGM3002506-M',(select id from public.gammes where code='PLUS'),(select id from public.origines where code='TR'),(select id from public.fournisseurs where nom='Egglin'),'MB 90-110 µm','2025-07-08','libere',150 where not exists (select 1 from public.lots where numero_lot_fournisseur='EGGM3002506-M');
insert into public.mouvements_stock (lot_id, type, format, quantite, motif) select id,'ajustement','echantillon',5.0,'Import stock initial' from public.lots where numero_lot_fournisseur='EGGM3002506-M';

-- EGGM3002506  [MB 200µm] Egglin  val=OUI -> libere/STD
insert into public.lots (numero_lot_fournisseur, gamme_id, origine_id, fournisseur_id, granulometrie, date_reception, statut, quantite_recue) select 'EGGM3002506',(select id from public.gammes where code='STD'),(select id from public.origines where code='TR'),(select id from public.fournisseurs where nom='Egglin'),'MB 200µm','2025-07-08','libere',100 where not exists (select 1 from public.lots where numero_lot_fournisseur='EGGM3002506');
insert into public.mouvements_stock (lot_id, type, format, quantite, motif) select id,'ajustement','echantillon',2.5,'Import stock initial' from public.lots where numero_lot_fournisseur='EGGM3002506';

-- EGGM3002507-M  [MB 90-110 µm] Egglin  val=OUI -> libere/PLUS
insert into public.lots (numero_lot_fournisseur, gamme_id, origine_id, fournisseur_id, granulometrie, date_reception, statut, quantite_recue) select 'EGGM3002507-M',(select id from public.gammes where code='PLUS'),(select id from public.origines where code='TR'),(select id from public.fournisseurs where nom='Egglin'),'MB 90-110 µm','2025-07-25','libere',150 where not exists (select 1 from public.lots where numero_lot_fournisseur='EGGM3002507-M');
insert into public.mouvements_stock (lot_id, type, format, quantite, motif) select id,'ajustement','echantillon',5.0,'Import stock initial' from public.lots where numero_lot_fournisseur='EGGM3002507-M';

-- EGGM3002508  [MB 200µm] Egglin  val=OUI -> libere/STD
insert into public.lots (numero_lot_fournisseur, gamme_id, origine_id, fournisseur_id, granulometrie, date_reception, statut, quantite_recue) select 'EGGM3002508',(select id from public.gammes where code='STD'),(select id from public.origines where code='TR'),(select id from public.fournisseurs where nom='Egglin'),'MB 200µm','2025-08-11','libere',450 where not exists (select 1 from public.lots where numero_lot_fournisseur='EGGM3002508');
insert into public.mouvements_stock (lot_id, type, format, quantite, motif) select id,'ajustement','sac',5.0,'Import stock initial' from public.lots where numero_lot_fournisseur='EGGM3002508';
insert into public.mouvements_stock (lot_id, type, format, quantite, motif) select id,'ajustement','echantillon',5.0,'Import stock initial' from public.lots where numero_lot_fournisseur='EGGM3002508';

-- EGGM3002509-M  [MB 90-110 µm] Egglin  val=OUI -> libere/PLUS
insert into public.lots (numero_lot_fournisseur, gamme_id, origine_id, fournisseur_id, granulometrie, date_reception, statut, quantite_recue) select 'EGGM3002509-M',(select id from public.gammes where code='PLUS'),(select id from public.origines where code='TR'),(select id from public.fournisseurs where nom='Egglin'),'MB 90-110 µm',current_date,'libere',150 where not exists (select 1 from public.lots where numero_lot_fournisseur='EGGM3002509-M');
insert into public.mouvements_stock (lot_id, type, format, quantite, motif) select id,'ajustement','sac',5.0,'Import stock initial' from public.lots where numero_lot_fournisseur='EGGM3002509-M';

-- EGGM3002510-M  [MB 90-110 µm] Egglin  val=OUI -> libere/PLUS
insert into public.lots (numero_lot_fournisseur, gamme_id, origine_id, fournisseur_id, granulometrie, date_reception, statut, quantite_recue) select 'EGGM3002510-M',(select id from public.gammes where code='PLUS'),(select id from public.origines where code='TR'),(select id from public.fournisseurs where nom='Egglin'),'MB 90-110 µm','2025-10-27','libere',300 where not exists (select 1 from public.lots where numero_lot_fournisseur='EGGM3002510-M');
insert into public.mouvements_stock (lot_id, type, format, quantite, motif) select id,'ajustement','sac',25.0,'Import stock initial' from public.lots where numero_lot_fournisseur='EGGM3002510-M';

-- EGGM3002510  [MB 200µm] Egglin  val=OUI -> libere/STD
insert into public.lots (numero_lot_fournisseur, gamme_id, origine_id, fournisseur_id, granulometrie, date_reception, statut, quantite_recue) select 'EGGM3002510',(select id from public.gammes where code='STD'),(select id from public.origines where code='TR'),(select id from public.fournisseurs where nom='Egglin'),'MB 200µm','2025-11-12','libere',300 where not exists (select 1 from public.lots where numero_lot_fournisseur='EGGM3002510');
insert into public.mouvements_stock (lot_id, type, format, quantite, motif) select id,'ajustement','sac',15.0,'Import stock initial' from public.lots where numero_lot_fournisseur='EGGM3002510';

-- EGGM3002511  [MB 200µm] Egglin  val=OUI -> libere/STD
insert into public.lots (numero_lot_fournisseur, gamme_id, origine_id, fournisseur_id, granulometrie, date_reception, statut, quantite_recue) select 'EGGM3002511',(select id from public.gammes where code='STD'),(select id from public.origines where code='TR'),(select id from public.fournisseurs where nom='Egglin'),'MB 200µm','2025-12-16','libere',128 where not exists (select 1 from public.lots where numero_lot_fournisseur='EGGM3002511');
insert into public.mouvements_stock (lot_id, type, format, quantite, motif) select id,'ajustement','sac',-147.0,'Import stock initial' from public.lots where numero_lot_fournisseur='EGGM3002511';

-- EGGM3002512-M  [MB 90-110 µm] Egglin  val=OUI -> libere/PLUS
insert into public.lots (numero_lot_fournisseur, gamme_id, origine_id, fournisseur_id, granulometrie, date_reception, statut, quantite_recue) select 'EGGM3002512-M',(select id from public.gammes where code='PLUS'),(select id from public.origines where code='TR'),(select id from public.fournisseurs where nom='Egglin'),'MB 90-110 µm','2026-02-11','libere',0 where not exists (select 1 from public.lots where numero_lot_fournisseur='EGGM3002512-M');
insert into public.mouvements_stock (lot_id, type, format, quantite, motif) select id,'ajustement','sac',-150.0,'Import stock initial' from public.lots where numero_lot_fournisseur='EGGM3002512-M';
insert into public.mouvements_stock (lot_id, type, format, quantite, motif) select id,'ajustement','echantillotheque',1.0,'Import stock initial' from public.lots where numero_lot_fournisseur='EGGM3002512-M';

-- EGGM3002512  [MB 200µm] Egglin  val=OUI -> libere/STD
insert into public.lots (numero_lot_fournisseur, gamme_id, origine_id, fournisseur_id, granulometrie, date_reception, statut, quantite_recue) select 'EGGM3002512',(select id from public.gammes where code='STD'),(select id from public.origines where code='TR'),(select id from public.fournisseurs where nom='Egglin'),'MB 200µm','2026-02-11','libere',0 where not exists (select 1 from public.lots where numero_lot_fournisseur='EGGM3002512');
insert into public.mouvements_stock (lot_id, type, format, quantite, motif) select id,'ajustement','sac',-455.0,'Import stock initial' from public.lots where numero_lot_fournisseur='EGGM3002512';
insert into public.mouvements_stock (lot_id, type, format, quantite, motif) select id,'ajustement','echantillotheque',1.0,'Import stock initial' from public.lots where numero_lot_fournisseur='EGGM3002512';

-- EGGM3002602  [MB 200µm] Egglin  val=OUI -> libere/STD
insert into public.lots (numero_lot_fournisseur, gamme_id, origine_id, fournisseur_id, granulometrie, date_reception, statut, quantite_recue) select 'EGGM3002602',(select id from public.gammes where code='STD'),(select id from public.origines where code='TR'),(select id from public.fournisseurs where nom='Egglin'),'MB 200µm','2026-03-13','libere',300 where not exists (select 1 from public.lots where numero_lot_fournisseur='EGGM3002602');
insert into public.mouvements_stock (lot_id, type, format, quantite, motif) select id,'ajustement','sac',5.0,'Import stock initial' from public.lots where numero_lot_fournisseur='EGGM3002602';

-- EGGM3002602-M  [MB 90-110 µm] Egglin  val=OUI -> libere/PLUS
insert into public.lots (numero_lot_fournisseur, gamme_id, origine_id, fournisseur_id, granulometrie, date_reception, statut, quantite_recue) select 'EGGM3002602-M',(select id from public.gammes where code='PLUS'),(select id from public.origines where code='TR'),(select id from public.fournisseurs where nom='Egglin'),'MB 90-110 µm','2026-03-13','libere',150 where not exists (select 1 from public.lots where numero_lot_fournisseur='EGGM3002602-M');
insert into public.mouvements_stock (lot_id, type, format, quantite, motif) select id,'ajustement','sac',90.0,'Import stock initial' from public.lots where numero_lot_fournisseur='EGGM3002602-M';

-- EGGM3002602-CF  [MB plein air] Egglin  val=OUI -> libere/PA
insert into public.lots (numero_lot_fournisseur, gamme_id, origine_id, fournisseur_id, granulometrie, date_reception, statut, quantite_recue) select 'EGGM3002602-CF',(select id from public.gammes where code='PA'),(select id from public.origines where code='TR'),(select id from public.fournisseurs where nom='Egglin'),'MB plein air','2026-03-13','libere',150 where not exists (select 1 from public.lots where numero_lot_fournisseur='EGGM3002602-CF');
insert into public.mouvements_stock (lot_id, type, format, quantite, motif) select id,'ajustement','sac',130.0,'Import stock initial' from public.lots where numero_lot_fournisseur='EGGM3002602-CF';
