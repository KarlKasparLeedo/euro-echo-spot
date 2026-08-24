# My Money Master

Finantsjälgija – Rakenduse Spetsifikatsioon

1. Ülevaade

Personaalne finantsjälgimise veebirakendus, mis aitab kasutajal jälgida oma rahalist seisu, seada kategooriapõhiseid eelarveid ning sisestada ja analüüsida kulutusi ja sissetulekuid. Eesmärk on anda kasutajale selge ülevaade oma rahaasjadest ning aidata tal eelarvet kontrolli all hoida.

Sihtgrupp: kõik täiskasvanud kasutajad, kes soovivad oma isiklikke rahaasju jälgida (mitte ainult üliõpilased).

Tehnoloogiad:

Frontend: React (Lovable genereeritud)

Andmebaas/autentimine: Supabase

Visualiseerimine: graafikud (pirukas-, tulp- ja joondiagrammid)





2. Andmemudel

users (Supabase Auth kaudu)

id

email

created_at

transactions

Väli

Tüüp

Kirjeldus

id

uuid

Unikaalne ID

user_id

uuid

Viide kasutajale

type

enum

expense või income

amount

decimal

Summa

category

text

Kategooria (ainult expense puhul, vt punkt 3)

merchant

text

Koht/kirjeldus (nt "Selver", "Bolt")

date

date

Tehingu kuupäev

note

text

Valikuline märkus

created_at

timestamp

Sisestamise aeg

Sissetulekute (income) puhul on vajalikud ainult amount, date ja valikuline note – kategooriat ei määrata.

budgets

Väli

Tüüp

Kirjeldus

id

uuid

Unikaalne ID

user_id

uuid

Viide kasutajale

category

text

Kategooria nimi

monthly_limit

decimal

Kuueelarve summa

rollover

boolean

Kas ülejääk kandub järgmisse kuusse

categories (fikseeritud loend, vt punkt 3)

Võib olla kõvakodeeritud rakenduses või eraldi tabelis, kui soovid kasutajal endal kategooriaid lisada/muuta.





3. Kategooriad (kulude jaoks)

Põhikategooriad koos näidis-alamkategooriatega (kasutatakse auto-kategoriseerimisel ja eelarvete seadmisel):

Eluase – üür/laenumakse, kommunaalid (elekter, vesi, küte), internet/telefon, kodukindlustus, mööbel/kodutehnika

Toit – toidupood, restoranid/kohvikud, kiirtoit, töölõuna

Transport – kütus, ühistransport, takso/Bolt/Uber, auto hooldus/kindlustus/parkimine

Tervis ja heaolu – arst/hambaravi, ravimid, sportimine/jõusaal, ilu ja hügieen

Meelelahutus ja vaba aeg – voogedastusteenused, kino/üritused/kontserdid, hobid, reisimine/puhkus

Isiklikud kulud – riided/jalatsid, elektroonika, kingitused, isiklikud tarbed

Pere ja lemmikloomad – lasteaed/kool, lapse tarbed, lemmikloomatoit/veterinaar

Finants ja kohustused – laenumaksed, kindlustused, säästud/investeeringud, pangateenustasud

Töö/haridus – kursused/koolitused, raamatud/tarkvara, kontoritarbed

Muu/liigitamata – sularahaväljavõtted, annetused, ootamatud kulud

Sissetulekud: ei kasuta kategooriaid, ainult summa + kuupäev + valikuline märkus.





4. Funktsionaalsus

4.1 Autentimine

Registreerimine ja sisselogimine (email + parool, Supabase Auth)

Iga kasutaja näeb ainult enda andmeid (row-level security)

4.2 Tehingute sisestamine

Kulutus: summa, koht/kirjeldus, kuupäev, kategooria (auto-pakutud koha nime põhjal, kasutaja saab muuta rippmenüüst), valikuline märkus

Sissetulek: summa, kuupäev, valikuline märkus

Kiirsisestuse vorm (võimalikult vähe klõpse tehingu lisamiseks)

4.3 Auto-kategoriseerimine

Lihtne reeglipõhine mudel: koha nime (merchant) põhjal võtmesõnade vaste kategooriaga (nt "Selver", "Rimi", "Maxima" → Toit; "Bolt", "Taxify" → Transport)

Kasutaja saab pakutud kategooriat muuta – süsteem võiks tulevikus sellest õppida (edasiarendus, vt punkt 7)

4.4 Eelarvete haldus

Iga kategooria kohta saab seada kuueelarve

Progressiriba iga kategooria juures: kulutatud summa vs eelarve

Hoiatus/märguanne, kui kategooria on 80% ja 100% eelarvest täis

Valik, kas kasutamata eelarve kandub järgmisse kuusse üle

4.5 Dashboard (pealeht)

Praegune bilanss (sissetulekud – kulud)

Kuu kulud kokku vs kuu sissetulekud kokku

Kulude jaotus kategooriate lõikes (pirukas- või tulpdiagramm)

Trendijoon kulude/sissetulekute kohta viimaste kuude lõikes

Viimased tehingud (lühinimekiri koos "vaata kõiki" lingiga)

"Burn rate" indikaator: praeguse kulutamistempo põhjal, kas raha jätkub kuu lõpuni

4.6 Tehingute ajalugu

Täielik nimekiri kõikidest tehingutest

Filtreerimine kategooria, tüübi (kulu/sissetulek), kuupäevavahemiku järgi

Otsing koha/märkuse järgi

Sorteerimine kuupäeva või summa järgi

4.7 Säästueesmärgid

Kasutaja saab seada eesmärgi (nt "Reis: 500€ kuni juuni")

Progressiriba eesmärgi täitumise kohta

Võimalus siduda eesmärk automaatse "säästu" kategooriaga

4.8 Korduvad tehingud

Fikseeritud kulud/sissetulekud (üür, palk, abonemendid), mis lisatakse automaatselt igal kuul





5. Disain

Puhas, minimalistlik välimus

Rahulikud, usaldust tekitavad värvid (nt sinine/roheline toonid; punane/oranž ainult hoiatuste jaoks)

Mobiilisõbralik (enamik kasutajaid sisestab tehinguid telefonis)

Selge visuaalne hierarhia: bilanss ja eelarve progress kõige nähtavamal kohal

Kiire ligipääs "lisa tehing" nupule (nt fikseeritud "+" nupp)





6. Ekraanid/vaated

Sisselogimine / registreerimine

Dashboard (pealeht)

Uus tehing (kulu/sissetulek)

Tehingute ajalugu (koos filtritega)

Eelarvete haldus (kategooriate loend + limiidid)

Kategooria detailvaade (kulud selles kategoorias ajas)

Seaded (profiil, väljalogimine)





7. Tulevased edasiarendused (nice-to-have)

Kviitungi pildistamine + OCR – automaatne summa ja koha tuvastamine kviitungi fotolt

AI-põhine kategoriseerimise õppimine – süsteem õpib kasutaja parandustest

AI-genereeritud kuukokkuvõte – tekstiline kokkuvõte kulutuste mustritest ja muutustest

Anomaaliate tuvastamine – hoiatus ebatavaliselt suurte kulutuste kohta

Ühiskulude jagamine – lihtne "kes kellele võlgu" funktsioon jagatud kulude jaoks

Ekspordifunktsioon – andmete eksport CSV/Excel kujul





8. Turvalisus ja andmekaitse

Kõik andmed seotud user_id kaudu, row-level security (RLS) Supabase's

Paroolid räsitakse Supabase Auth poolt automaatselt

Kasutaja andmed ei ole nähtavad teistele kasutajatele

This project was built with [Lovable](https://lovable.dev).

## Build with Lovable

Continue developing this project in the [Lovable editor](https://lovable.dev/projects/68450f89-9f6c-4bc2-b52e-7c881f2caf10).

- **Ship faster**: describe what you want to build and Lovable handles the code.
- **Stay in sync**: every change made in Lovable is committed straight to this repository.
- **Full ownership**: this code is yours. Push to `main` on GitHub and your changes sync back into Lovable, ready for your next prompt.

## Development

Prefer working locally? You need Node.js and npm — [install with nvm](https://github.com/nvm-sh/nvm#installing-and-updating).

```sh
git clone <this-repository-url>
cd <repository-name>
npm i
npm run dev
```
