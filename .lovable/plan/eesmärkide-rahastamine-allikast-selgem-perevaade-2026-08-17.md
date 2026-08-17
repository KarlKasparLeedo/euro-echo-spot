# Eesmärkide rahastamine allikast + selgem perevaade

## 1. Eesmärki ei saa enam "niisama" täita

Praegu saab eesmärgi juures käsitsi kirjutada kogutud summa. See asendub päris rahaliigutusega: iga lisatud euro peab tulema kuskilt.

Eesmärgi kaardil on nupp **"Lisa raha"**, mis avab akna:
- Summa (€)
- Allikas:
  - **Kogumiskonto vaba puhver** — raha on juba kogumiskontol, see lihtsalt märgitakse eesmärgi sahtlisse (vaba puhver väheneb, kogusumma jääb samaks). Näidatakse, kui palju vaba puhvrit on; rohkem lisada ei saa.
  - **Selle kuu raha** — raha kantakse kuukontolt kogumiskontole ja märgitakse kohe eesmärgi sahtlisse (tekib sissemakse + eesmärgi märge). Näidatakse selle kuu vaba jääki.
- Kinnitus loob liikumised ja uuendab eesmärgi progressi.

Käsitsi "Kogutud summa" väli eemaldatakse. Alles jääb "Võta tagasi", mis tõstab raha eesmärgist vabasse puhvrisse.

## 2. Pere jagatud eelarvete diagramm loogilisemaks

Praegune riba segab kokku eelarve ja kulu, mis on raskesti loetav. Uus loogika:

- Iga kategooria saab **ühe ühise skaala**, mille laius = pere ühine eelarve selles kategoorias.
- Selle sees on **iga liikme kulu oma värviga järjest** (virnastatud), nii et kohe näeb, kes kui suure osa ühisest eelarvest ära kasutas.
- Kasutamata osa jääb heledaks "veel vaba" alaks; ületamisel läheb üle piiri jääv osa punaseks ja piiri kohale tuleb tähis.
- Iga liikme rida legendis: värvitäpp, nimi, kulutatud / tema enda eelarveosa ja protsent.
- Kategooria päises: kulutatud kokku / eelarve kokku ja "jäänud X €".

```text
Toidukaubad            420 € / 600 €   (jäänud 180 €)
[####Karl####|##Mari##|            ] |
 Karl 260 € / 300 €  ·  Mari 160 € / 300 €
```

## Tehniline osa

- `src/components/GoalFundDialog.tsx` (uus): summa + allikas, valideerib vaba puhvri ja kuu jäägi vastu.
- `src/lib/finance.ts`: uus `fundGoal(goalId, amount, source)` — puhvrist ainult `goal`-liikumine; kuurahast `deposit` + `goal`-liikumine ning `goals.saved_amount` uuendus.
- `src/routes/_authenticated/goals.tsx`: eemaldatakse käsitsi kogutud summa väli ja `update`-mutatsioon, lisandub "Lisa raha" nupp/dialoog.
- `src/routes/_authenticated/family.tsx`: eelarveriba asendatakse virnastatud liikmete kuludega ühisel eelarve-skaalal, ületuse tähis ja täiendatud legend.
- Andmebaasi muudatusi ei ole vaja.
