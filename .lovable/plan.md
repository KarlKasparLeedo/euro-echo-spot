# Kogumiskonto liikumised tehingute ajaloos

## Olukord

Kontrollisin andmebaasi: kogumiskontolt väljavõtmine kirjutab kaks kirjet — `savings_movements` rea (kogumiskonto miinus) ja kuu rahakoti sissetuleku ("Kogumiskontolt", 100 €, 17.08). Tehingute leht loeb ainult `transactions` tabelit, seega kogumiskonto poolt (raha läks kogumiskontolt välja) seal üldse ei kuvata. Lisaks tehti kaks varasemat väljavõtmist (11:38 ja 11:42) enne selle sissetuleku-kirje lisamist, mistõttu neil pole ka rahakoti rida.

## Mida teha

1. **Iga rida näitab konto ja suuna.** Igal real on konto silt ja selge suund, nt "Kogumiskonto → välja", "Kuu rahakott → sisse". Ülekannete puhul näidatakse mõlemat poolt kujul "Kogumiskonto → Kuu rahakott", nii et alati on näha, kust raha tuleb ja kuhu läheb. Miinus/pluss ja värv (kulu punane, tulu roheline) käivad konto sildiga kaasas.
2. **Tehingute ajalugu näitab ka kogumiskonto liikumisi.** Lehele lisandub kogumiskonto ridade voog: sissemakse, väljavõtmine, eesmärgile suunamine, eesmärgist vabastamine — praegu neid seal üldse pole.
3. **Uus filter "Konto".** Valikud: Kõik / Kuu rahakott / Kogumiskonto. Olemasolevad filtrid (tüüp, kategooria, kuupäev, otsing, sorteerimine) töötavad edasi ja rakenduvad mõlemale.
4. **Paarisliikumised on äratuntavad.** Väljavõtmisel näeb kahte rida sama kuupäeva ja märkusega: "Kogumiskonto → Kuu rahakott, −100 €" kogumiskonto poolel ja "+100 €" rahakoti poolel, nii et raha teekond on jälgitav.
5. **Kogumiskonto read on kirjeldavad, mitte muudetavad.** Neid ei saa tehingute lehel muuta ega kustutada (muutmine käib kogumiskonto vaates), et jäägid püsiksid kooskõlas.


## Tehniline osa

- `src/lib/finance.ts`: eksportida kogumiskonto liikumiste päring ühtses kujus (kuupäev, liik, summa, märkus, eesmärgi nimi) tehingute lehe jaoks.
- `src/routes/_authenticated/transactions.tsx`: teine `useQuery` liikumistele, ridade ühendamine ühte sorteeritavasse nimekirja diskrimineeriva väljaga `source: "wallet" | "savings"`, uus konto-filter, muutmisnupud ainult rahakoti ridadel.
- Andmemudelit ega migratsioone ei muudeta.
