# Kuu lõpetamine kogumiskontole + varasemate kuude aruanded

## 1. Kuu ülejääk läheb kogumiskontole

Täna saab kuu ülejäägi suunata ainult otse eesmärki. Lisan vahesammu: ülejääk liigub kogumiskontole ja sealt otsustad, kui palju läheb eesmärkidesse ja kui palju jääb puhvriks.

**Kuu lõpetamise kaart** (töölaual ja eesmärkide lehel):
- Näitab eelmise (või jooksva, kui kuu läbi) kuu tulemust: tulud, kulud, ülejääk.
- Nupp "Kanna ülejääk kogumiskontole" — summa on muudetav, vaikimisi kogu vaba ülejääk.
- Pärast kandmist tekib kogumiskonto liikumine ja kuu märgitakse lõpetatuks, et sama raha ei saaks kaks korda kanda.
- Kui kuu on juba lõpetatud, näidatakse kinnitust ja kantud summat.

**Kogumiskonto kaart** jääb samaks, aga jääk sisaldab nüüd ka kuu ülejääke ning sealt saab endiselt:
- suunata raha valitud eesmärki,
- võtta välja ootamatu suure kulu katteks,
- teha käsitsi sissemakse.

Eesmärkide lehel jääb ka otsesuunamise võimalus alles, kuid põhivoog on: ülejääk → kogumiskonto → eesmärk.

## 2. Aruanded (varasemad kuud)

Uus leht **Aruanded** navigatsioonis:
- Kuu valija (nimekiri kuudest, kus on andmeid).
- Valitud kuu kokkuvõte: tulud, kulud, ülejääk, kogumiskontole kantud summa, eesmärkidesse suunatud summa.
- Kulude jaotus kategooriate kaupa (sektor- ja tulpdiagramm) ning eelarve vs tegelik iga kategooria kohta.
- Kuude võrdlus: 12 kuu tulud/kulud/ülejääk tulpdiagrammina ja tabelina.
- Selle kuu tehingute nimekiri lingiga tehingute lehele.

## Tehniline osa

- Migratsioon: uus tabel `month_closures` (kuu, üle kantud summa) koos RLS-i ja GRANT-idega, et kuu lõpetamise saaks teha ainult korra.
- `src/lib/finance.ts`: `fetchMonthClosures`, `closeMonth(month, amount)`, `monthReport(key)` (tulud, kulud, kategooriate summad, eelarve võrdlus), `availableMonths(txns)`.
- Uus komponent `src/components/MonthCloseCard.tsx`.
- Uus marsruut `src/routes/_authenticated/reports.tsx` oma `head()`-iga; link lisatakse `AppShell` navigatsiooni.
- Kogumiskonto jääk arvutatakse edasi `savings_movements` põhjal — kuu lõpetamine loob liikumise `kind = "deposit"` märkega "kuu ülejääk".
