# Spirit Books – Initial Input Brief v1

## Scope
- Taoizmus + buddhizmus tematikaju konyvek
- Admin menuben rogzitendo alapadatok
- Rogzitett rovid leiras, ajanlas, nehezsegi szint, tematikus pillek, kapcsolodo konyvek
- Nincs publikacio/SEO/ar/bolt integracio ebben a fazisban

## Non-goals
- Nincs teljes tartalomatiforditas vagy atiras
- Nincs jogi/kiadoi metadata kovetelmeny
- Nincs automatikus ajanlorendszer

## Data Contract (v1)
Minden konyv egy blokk. A *kotlezo mezok* mellett az *optional mezok* feltoltesa ajanlott, de nem kotelezo.

### Kotelezo mezok
- id: rovid stabil azonosito (slug)
- title: konyv cime
- author: szerzo
- tradition: taoizmus | buddhizmus | vegyes
- level: kezdo | kozep-halado | halado
- summary_short: 1-2 mondat
- recommendation: miert erdemes, kinek ajanlott (1-3 mondat)
- themes: 3-8 tematikus pill (slug lista)
- language: hu | en | egyeb
- format: konyv | kommentar | valogatas | szutra | essze
- status: olvasatlan | folyamatban | befejezett | referencia

### Optional mezok
- summary_long: 1-2 bekezdes
- prerequisites: elofeltetelek (slug lista)
- cautions: ha van felreertheto/nehez resz (1-2 mondat)
- tags: szabad cimkek (slug lista)
- notes: admin megjegyzes
- year: kiadas eve (ha fontos)
- related: kapcsolodo konyvek (id lista)

## Thematic Pills (v1 list)
Adj egy kezdeti listat (slug + label):
- slug: rovid_kulcs
- label: megjelenitett nev

## Books (seed list)
Hasznald ezt a sablont minden konyvhöz:

### book: <id>
title:
author:
tradition:
level:
summary_short:
recommendation:
themes: [slug, slug]
language:
format:
status:
summary_long:
prerequisites: []
cautions:
tags: []
notes:
year:
related: []
