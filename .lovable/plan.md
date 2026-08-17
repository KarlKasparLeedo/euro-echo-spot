# Kuu ülejäägi suunamine eesmärki

## Mida see teeb

Kuu lõpus (või igal hetkel) näed, kui palju sel kuul üle jäi: kuu tulud miinus kuu kulud. Ühe nupuvajutusega saad selle summa (või osa sellest) lisada valitud säästueesmärgi juurde. Eesmärgi progressiriba liigub kohe edasi.

## Kus see asub

1. **Eesmärkide leht** — uus kaart lehe ülaosas: "Selle kuu ülejääk: X €", eesmärgi valik rippmenüüst, summa väli (eeltäidetud ülejäägiga, saad muuta) ja nupp "Suuna eesmärki".
2. **Töölaud** — bilansikaardi alla väike vihje "Sel kuul üle jäänud X € — suuna eesmärki", mis viib eesmärkide lehele.

## Käitumine

- Ülejääk = jooksva kuu tulud miinus jooksva kuu kulud. Kui see on null või negatiivne, näidatakse selle asemel rahulikku teadet ja nupp on passiivne.
- Suunamine liidab summa eesmärgi kogutud summale (ei kirjuta üle).
- Iga eesmärgi juures jääb alles ka praegune käsitsi summa muutmine.
- Eesmärgi täitumisel kuvatakse "Täidetud" märgis.
- Sama kuu ülejääki saab suunata mitmes osas mitmesse eesmärki; juba suunatud summa arvestatakse maha, et sama raha kaks korda ei suunataks.

## Tehniline osa

- Uus abifunktsioon `src/lib/finance.ts`-i: jooksva kuu ülejäägi arvutus olemasolevatest tehingutest.
- Suunatud summade jälgimiseks lisandub tabel `goal_allocations` (eesmärgi id, summa, kuu, kasutaja) koos RLS-i ja õigustega; sellest arvutatakse "veel suunamata ülejääk".
- `goals.saved_amount` uuendatakse suunamisel sama toiminguga.
- Eesmärkide lehele uus komponent ülejäägi kaardi jaoks; töölauale ainult link/vihje.
