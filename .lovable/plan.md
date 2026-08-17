# Kogumiskonto liikumised tehingute ajaloos

## Olukord

Kontrollisin andmebaasi: kogumiskontolt väljavõtmine kirjutab kaks kirjet — `savings_movements` rea (kogumiskonto miinus) ja kuu rahakoti sissetuleku ("Kogumiskontolt", 100 €, 17.08). Tehingute leht loeb ainult `transactions` tabelit, seega kogumiskonto poolt (raha läks kogumiskontolt välja) seal üldse ei kuvata. Lisaks tehti kaks varasemat väljavõtmist (11:38 ja 11:42) enne selle sissetuleku-kirje lisamist, mistõttu neil pole ka rahakoti rida.

## Mida teha

1. **Tehingute ajalugu näitab ka kogumiskonto liikumisi.** Lehele lisandub kogumiskonto ridade voog: sissemakse, väljavõtmine, eesmärgile suunamine, eesmärgist vabastamine. Iga rida on selgelt märgistatud sildiga "Kogumiskonto" ja suunanoolega (välja / sisse), et eristuks kuu rahakoti tehingutest.
2. **Uus filter "Konto".** Valikud: Kõik / Kuu rahakott / Kogumiskonto. Nii saab vaadata kas ainult igapäevast rahavoogu või ainult kogumiskonto liikumisi. Olemasolevad filtrid (tüüp, kategooria, kuupäev, otsing, sorteerimine) töötavad edasi ja rakenduvad mõlemale.
3. **Paarisliikumised on äratuntavad.** Väljavõtmise puhul näeb kõrvuti kahte rida: "Kogumiskontolt välja 100 €" ja kuu rahakoti sissetulek "Kogumiskontolt +100 €", mõlemal sama kuupäev ja märkus, nii et raha teekond on jälgitav.
4. **Kogumiskonto read on kirjeldavad, mitte muudetavad.** Neid ei saa tehingute lehel muuta ega kustutada (muutmine käib kogumiskonto vaates), et jäägid püsiksid kooskõlas.

## Tehniline osa

- `src/lib/finance.ts`: eksportida kogumiskonto liikumiste päring ühtses kujus (kuupäev, liik, summa, märkus, eesmärgi nimi) tehingute lehe jaoks.
- `src/routes/_authenticated/transactions.tsx`: teine `useQuery` liikumistele, ridade ühendamine ühte sorteeritavasse nimekirja diskrimineeriva väljaga `source: "wallet" | "savings"`, uus konto-filter, muutmisnupud ainult rahakoti ridadel.
- Andmemudelit ega migratsioone ei muudeta.
