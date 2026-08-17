# Perega liitumise testimine – praegu see ei tööta

Testida saad kahe kasutajaga, aga liitumine ebaõnnestub kohe. Põhjus on andmebaasi ligipääsureeglites.

## Mis praegu katki on

Kutsekoodiga liitumine otsib kõigepealt peret koodi järgi. Kuid pere lugemise reegel lubab peret näha ainult siis, kui oled juba selle pere liige või selle looja. Uus kasutaja ei ole kumbki, seega otsing tagastab tühja tulemuse ja kasutaja näeb teadet "Sellist kutsekoodi ei leitud".

Sama loogika tõttu ei saa liitumine kunagi õnnestuda, ükskõik kui õige kood on.

## Mida teha

1. Lisada andmebaasi turvaline funktsioon `join_household_by_code(kood)`, mis:
   - leiab pere kutsekoodi järgi (mööda ligipääsureeglist, kontrollitult),
   - keeldub, kui kasutaja on juba mõnes peres,
   - lisab kasutaja liikmeks ja tagastab pere nime.
2. Muuta `src/lib/household.ts` funktsioon `joinHousehold` kasutama seda funktsiooni otsingu + lisamise asemel.
3. Selgemad veateated: "Sellist kutsekoodi ei leitud" ja "Oled juba peres – lahku esmalt".
4. Kolida kogu pere haldus (nimi peres, pere loomine, kutsekoodiga liitumine, koodi kuvamine, perest lahkumine) Seadete lehelt "Pere" lehele. Seadetesse jääb ainult lühike viide lingiga "Pere" lehele.

## Pere leht pärast muudatust

- Kui sa ei kuulu peresse: esimesena kaart "Loo pere" / "Liitu kutsekoodiga" koos nimeväljaga.
- Kui kuulud peresse: pere nimi, kutsekood (kopeerimiseks), liikmete loend, "Lahku perest" ning selle all jagatud eelarved ja eesmärgid nagu praegu.

## Kuidas siis testida

- Kasutaja A: Pere → sisesta nimi → "Loo pere" → kopeeri kutsekood.
- Kasutaja B (teine e-post, soovitatavalt eraldi brauser või privaatne aken): Pere → sisesta nimi → sisesta kood → "Liitu".
- Mõlemad märgivad mõne eelarve ja eesmärgi "Jaga perega".
- Leht "Pere" peaks nüüd näitama jagatud eelarveid ja eesmärke koos liikmete panustega.

## Tehniline osa

- Uus migratsioon: `SECURITY DEFINER` funktsioon `public.join_household_by_code(_code text)` koos `SET search_path = public`, `GRANT EXECUTE TO authenticated`. Funktsioon kontrollib `auth.uid()` olemasolu, otsib `households` koodi järgi (suurtähtedeks normaliseeritud) ja teeb `INSERT INTO household_members`.
- `households` SELECT-poliitika jääb muutmata (koode ei tohi vabalt lugeda).
- `src/lib/household.ts`: `joinHousehold` → `supabase.rpc("join_household_by_code", { _code })`, vea sõnumite tõlge eesti keelde.
- `src/components/HouseholdCard.tsx` renderdatakse `src/routes/_authenticated/family.tsx` sees; eemaldatakse `settings.tsx`-ist ja pere-info kaart lehel asendatakse selle kaardiga.

## Ülevaate leht

- Eemaldada kaart "Kategooriad tulpadena" (`dashboard.tsx`, ~read 320–345 ning kasutuseta jäävad `BarChart`-impordid). Sektorite jaotus (sõõrdiagramm) ja muud kaardid jäävad alles.

## Sisselogimine kiiremaks ja stabiilsemaks

Praegu kontrollitakse igal navigeerimisel `beforeLoad`-is eraldi päringuga, kas onboarding on tehtud. See tähendab iga lehevahetuse juures kaks järjestikust võrgupäringut (kasutaja + profiil) enne kui midagi kuvatakse – sellest tulevad hangumised ja vilkumine.

- Onboardingu kontroll teha ainult üks kord sessiooni kohta: tulemus hoitakse mälus ja seda ei küsita uuesti igal lehel.
- Kasutaja päring `getUser()` asendada juba olemasoleva sessiooni kontrolliga, et esimene renderdus ei ootaks võrgu taga.
- Ülevaate lehel laadida andmed paralleelselt ja näidata vahepeal skeleton-olekut, mitte tühja lehte.
- Sisselogimise nupul selge laadimisolek, et topeltklõps ei tekitaks poolikut olekut.


