# Korduvad tehingud kahes tulbas, muutmine ja muutuv palk

## 1. Seaded: kaks tulpa

Korduvate tehingute kaart jaguneb kaheks kõrvuti veeruks (mobiilis üksteise all):

- **Sissetulekud** — kõik `income` read, all kokku "Kuus kokku X €".
- **Kulud** — kõik `expense` read koos kategooriaga, all kokku "Kuus kokku X €".

Lisamisvorm jääb üles alles, tüübi valik säilib.

## 2. Korduvad read jäävad ilma muutmisnuputa

Read on lihtsad: nimetus, summa, päev, aktiivsuse lüliti ja kustutamine. Eraldi "Muuda" nuppu igale reale ei tule.

## 3. Sinu sisestatud tehinguid saab muuta

Tehingute lehel avaneb klikiga tehingu vaade, kus saab muuta summat, kuupäeva, kategooriat, nimetust ja märkust ning tehingu kustutada. Sama vorm mis lisamisel, aga eeltäidetud.

## 4. Muutuv palk (põhipalk + boonus)

Korduva sissetuleku juures uus valik: **"Summa on iga kuu erinev"**. Sisestatud summa on siis oodatav põhipalk.

Käitumine:

- Tavalised korduvad read tekivad edasi automaatselt nagu praegu.
- Muutuva summaga sissetulek **ei lisandu automaatselt**. Alates palgapäevast ilmub töölauale (ja väikese märgina navigatsioonis) kinnituskaart: "Kas said palka 1500 €?" koos summaväljaga, mille saab üle kirjutada (nt 1500 + 300 boonust = 1800).
  - "Jah, õige" — lisab tehingu sisestatud summaga.
  - "Muuda summat" — sama väli, kinnitad tegeliku summa.
  - "Ei saanud veel" — kaart jääb alles ja küsib hiljem uuesti.
- Kinnitatud kuu kohta rohkem ei küsita. Kuu ülejääk ja eelarve indikaator arvestavad kohe tegeliku summaga.

## Tehniline osa

- Migratsioon: `recurring_transactions` lisandub `is_variable boolean not null default false`. Kinnitamise jälgimiseks piisab olemasolevast `last_applied_month` väljast (seatakse kinnitamisel).
- `applyRecurring` jätab `is_variable` read vahele; uus abifunktsioon `pendingVariableIncomes(recurring, today)` tagastab read, mille palgapäev on käes ja kuu kinnitamata.
- Uus komponent `src/components/ConfirmIncomeCard.tsx` töölauale.
- `settings.tsx` jaotatakse kaheks veeruks (sissetulekud / kulud); read jäävad vaaterežiimi.
- Tehingu muutmiseks laiendatakse `AddTransactionDialog` komponenti valikulise `transaction` propiga (update + delete), kasutus tehingute lehel.
