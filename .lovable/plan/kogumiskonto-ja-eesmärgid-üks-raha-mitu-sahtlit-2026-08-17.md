# Kogumiskonto ja eesmärgid: üks raha, mitu sahtlit

## Probleem

Praegu eesmärki suunatud raha lahkub kogumiskontolt (liikumine „eesmärki" lahutatakse jäägist). Seega raha justkui kaob vaatest ja hädaolukorras pole selget viisi reisiraha tagasi võtta.

## Lahendus: sahtlite mudel

Kogumiskonto on üks päris rahakott. Eesmärgid on selle sees olevad sahtlid, mitte eraldi kontod.

```text
KOGUMISKONTO KOKKU            4 200 €
├─ Reis                        900 €  (siht 2 000 €)
├─ Uus diivan                  400 €  (siht 1 200 €)
└─ Vaba puhver               2 900 €
```

- **Kokku** = kõik sissemaksed miinus päris väljavõtmised. Eesmärki suunamine ei vähenda kokkusummat, see ainult märgistab osa rahast.
- **Vaba puhver** = kokku miinus eesmärkidesse märgistatud raha. See on ootamatute kulude jaoks mõeldud osa.
- **Eesmärgi täitumine** = sellesse sahtlisse märgistatud summa.

## Mida saab teha

1. **Lisa kogumiskontole** – raha tuleb sisse, läheb vaikimisi vabasse puhvrisse.
2. **Märgi eesmärgile** – tõstab raha puhvrist eesmärgi sahtlisse. Kokku ei muutu.
3. **Võta eesmärgilt tagasi** – uus tegevus. Tõstab raha eesmärgi sahtlist tagasi vabasse puhvrisse (nt „reisi raha on hädasti vaja").
4. **Võta kogumiskontolt välja** – päris raha lahkub. Kui vaba puhver ei kata summat, küsib rakendus, millistelt eesmärkidelt puudujääk katta, ja vähendab neid sahtleid. Nii ei lähe jääk kunagi valeks.
5. **Eesmärk täidetud → kuluta ära** – „Kasuta eesmärk ära" teeb väljavõtmise täpselt selle eesmärgi sahtlist ja märgib eesmärgi lõpetatuks.

## Kus seda näidatakse

- **Ülevaade (kontode kaart):** kuu kulutuste konto + kogumiskonto kokku + „sellest vaba X €". Eesmärkide ribad näitavad sahtlite seisu.
- **Kogumine:** suur kokkusumma üleval, all sahtlite nimekiri (vaba puhver esimesena) koos nuppudega „märgi eesmärgile" / „võta tagasi" ning liikumiste ajalugu selges keeles.
- **Eesmärgid:** iga eesmärgi juures progress ja nupp „võta tagasi kogumiskontole".

## Tehniline osa

- `savingsBalance` arvutab edaspidi ainult `deposit` miinus `withdrawal`; `goal`-tüüpi liikumised ei mõjuta kokkusummat.
- Uus liikumise liik `goal_release` (eesmärgilt tagasi puhvrisse). Nõuab andmebaasi muudatust `savings_movements.kind` lubatud väärtustele.
- Uued abifunktsioonid `src/lib/finance.ts`-is: `allocatedToGoals`, `freeBuffer`, `goalSavedFromMovements`, `releaseFromGoal`, `withdrawWithCoverage`.
- Eesmärgi täitumine loetakse kogumiskonto liikumistest (praeguse `goals.saved_amount` kõrval), nii et vaated ja sahtlid ei saa lahku minna.
- Olemasolevad `goal`-liikumised jäävad kehtima ja loetakse märgistuseks, seega ajalugu ei lähe katki; kokkusumma kasvab nende võrra tagasi õigeks.
- Puudutatavad failid: `src/lib/finance.ts`, `src/components/SavingsAccountCard.tsx`, `src/routes/_authenticated/savings.tsx`, `src/routes/_authenticated/goals.tsx`, `src/routes/_authenticated/dashboard.tsx`.
