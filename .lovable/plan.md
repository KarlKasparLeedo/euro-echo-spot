# Eesmärkide ülevaade kontodel + pere jagamine

## 1. Eesmärkide ülevaade kontode kaardil (Ülevaade)

Kontode kaardile lisandub eesmärkide osa:
- Iga eesmärgi rida: nimi, kogutud / siht, väike edenemisriba ja protsent.
- Ridade all kokkuvõte: "Eesmärkides kokku X € / Y €".
- Täidetud eesmärgid kuvatakse märkega "Täidetud" ja liiguvad loendi lõppu.
- Kui eesmärke pole, kuvatakse vaikne vihje lingiga eesmärkide lehele.

## 2. Pere (jagamine) — vastavalt valikutele

Loogika: iga eelarve ja eesmärk on vaikimisi privaatne. Ainult "jagatud" märkega read on pereliikmele nähtavad, koos panusega liikme kaupa.

**Pere loomine ja liitumine**
- Seadetes uus plokk "Pere": nupp "Loo pere", mis genereerib 6-tähemärgilise kutsekoodi.
- Teine liige sisestab koodi väljale "Liitu perega". Koodi saab uuendada või pere lahkuda.
- Liikmete loend nimede/e-postidega.

**Jagamise märkimine**
- Eelarve ja eesmärgi vormidel lisandub lüliti "Jaga perega".
- Jagatud eelarvel/eesmärgil on nimekirjas väike pere-ikoon.

**Uus leht "Pere"**
- Selle kuu jagatud eelarved: eelarve nimi, kulutatud/limiit, edenemisriba ning jaotus liikme kaupa (kes kui palju kulutas).
- Jagatud eesmärgid: kogutud/siht, edenemisriba ning iga liikme panus eurodes.
- Kuu valija, et vaadata ka eelmisi kuid.
- Mitte kunagi ei kuvata kontojääke, palka, üksiktehinguid ega privaatseid eelarveid/eesmärke.

**Privaatsus**
- Partner näeb ainult: jagatud eelarve/eesmärgi nime, summasid ja liikmete panuseid.
- Kõik muu (kogumiskonto, sissetulekud, tehingud, privaatsed eelarved) jääb nähtamatuks.

## Tehniline osa

Andmebaas (üks migratsioon):
- `households` (nimi, kutsekood unikaalne) ja `household_members` (household_id, user_id) + GRANTid + RLS.
- Turvafunktsioonid (SECURITY DEFINER, rekursiooni vältimiseks): `current_household_id()`, `is_household_member(uuid)`.
- `budgets` ja `goals` saavad veeru `shared boolean not null default false`.
- Täiendavad SELECT-poliitikad: pereliige näeb teise liikme ridu ainult siis, kui `shared = true` ja mõlemad on samas peres. Kirjutamine jääb ainult omanikule.
- Jagatud eelarve kulude nägemiseks lisandub `transactions`-ile piiratud SELECT-poliitika: pereliige näeb ainult neid tehinguid, mille kategooria vastab samas peres jagatud eelarvele. Vaates kuvatakse ainult summad liikme kaupa, mitte kaupmehed ega märkmed.
- `goal_allocations` ja `savings_movements` jäävad privaatseks; jagatud eesmärgi panus arvutatakse `goal_allocations` pealt lisapoliitikaga, mis lubab näha ainult jagatud eesmärkide ridu (summa + liige).
- `profiles` saab veeru `display_name`, et pere vaates oleks liikmel nimi (vaikimisi e-posti algus).

Kood:
- `src/lib/household.ts`: pere loomine, koodiga liitumine, lahkumine, liikmete ja jagatud andmete päringud.
- `src/components/AccountsCard.tsx` (või olemasolev kontode kaart ülevaates): eesmärkide sektsioon.
- Uus route `src/routes/_authenticated/family.tsx` + navipunkt "Pere" AppShellis.
- Seadete lehele pere plokk; eelarve- ja eesmärgivormidele "Jaga perega" lüliti.
