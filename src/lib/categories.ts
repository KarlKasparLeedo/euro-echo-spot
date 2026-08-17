export const CATEGORIES = [
  "Eluase",
  "Toit",
  "Transport",
  "Tervis ja heaolu",
  "Meelelahutus ja vaba aeg",
  "Isiklikud kulud",
  "Pere ja lemmikloomad",
  "Finants ja kohustused",
  "Töö/haridus",
  "Muu/liigitamata",
] as const;

export type Category = (typeof CATEGORIES)[number];

export const SUBCATEGORIES: Record<string, string[]> = {
  Eluase: ["üür/laenumakse", "kommunaalid", "internet/telefon", "kodukindlustus", "mööbel/kodutehnika"],
  Toit: ["toidupood", "restoranid/kohvikud", "kiirtoit", "töölõuna"],
  Transport: ["kütus", "ühistransport", "takso", "auto hooldus/kindlustus/parkimine"],
  "Tervis ja heaolu": ["arst/hambaravi", "ravimid", "sportimine/jõusaal", "ilu ja hügieen"],
  "Meelelahutus ja vaba aeg": ["voogedastus", "kino/üritused", "hobid", "reisimine/puhkus"],
  "Isiklikud kulud": ["riided/jalatsid", "elektroonika", "kingitused", "isiklikud tarbed"],
  "Pere ja lemmikloomad": ["lasteaed/kool", "lapse tarbed", "lemmikloomatoit/veterinaar"],
  "Finants ja kohustused": ["laenumaksed", "kindlustused", "säästud/investeeringud", "pangateenustasud"],
  "Töö/haridus": ["kursused/koolitused", "raamatud/tarkvara", "kontoritarbed"],
  "Muu/liigitamata": ["sularahaväljavõtted", "annetused", "ootamatud kulud"],
};

const RULES: Array<[string[], Category]> = [
  [
    ["selver", "rimi", "maxima", "coop", "prisma", "lidl", "grossi", "toidupood", "wolt", "bolt food", "kohvik", "restoran", "mcdonald", "hesburger", "subway", "kohvi"],
    "Toit",
  ],
  [
    ["bolt", "taxify", "uber", "circle k", "neste", "olerex", "alexela", "kütus", "tallink", "elron", "ühistransport", "parkimine", "parkway", "euroopa autoosad"],
    "Transport",
  ],
  [
    ["apotheka", "benu", "sudameapteek", "südameapteek", "apteek", "hambaravi", "arst", "kliinik", "mysport", "myfitness", "jõusaal", "gym", "juuksur"],
    "Tervis ja heaolu",
  ],
  [
    ["netflix", "spotify", "hbo", "disney", "kino", "apollo", "forum cinemas", "piletilevi", "kontsert", "steam", "playstation", "reis", "hotell", "airbnb", "booking"],
    "Meelelahutus ja vaba aeg",
  ],
  [
    ["elektrilevi", "eesti energia", "imatra", "telia", "elisa", "tele2", "üür", "korteriühistu", "vesi", "gaas", "ikea", "jysk", "bauhoff", "k-rauta", "espak"],
    "Eluase",
  ],
  [
    ["zara", "h&m", "reserved", "euronics", "on24", "kaubamaja", "apple", "telefonipood", "kingitus"],
    "Isiklikud kulud",
  ],
  [["lemmikloom", "petcity", "musti", "veterinaar", "lasteaed", "kool", "beebi"], "Pere ja lemmikloomad"],
  [["laen", "kindlustus", "swedbank", "seb", "lhv", "coop pank", "investeering", "sääst", "teenustasu"], "Finants ja kohustused"],
  [["koolitus", "kursus", "raamat", "rahva raamat", "apollo raamat", "udemy", "coursera", "tarkvara", "kontoritarbed"], "Töö/haridus"],
];

export function guessCategory(merchant: string): Category | null {
  const m = merchant.trim().toLowerCase();
  if (!m) return null;
  for (const [keywords, category] of RULES) {
    if (keywords.some((k) => m.includes(k))) return category;
  }
  return null;
}

export const CATEGORY_COLORS: Record<string, string> = {
  Eluase: "hsl(203 70% 45%)",
  Toit: "hsl(158 60% 40%)",
  Transport: "hsl(188 62% 42%)",
  "Tervis ja heaolu": "hsl(174 55% 38%)",
  "Meelelahutus ja vaba aeg": "hsl(226 55% 58%)",
  "Isiklikud kulud": "hsl(255 45% 60%)",
  "Pere ja lemmikloomad": "hsl(140 45% 48%)",
  "Finants ja kohustused": "hsl(211 55% 35%)",
  "Töö/haridus": "hsl(196 45% 55%)",
  "Muu/liigitamata": "hsl(210 12% 55%)",
};

export function formatEur(value: number): string {
  return new Intl.NumberFormat("et-EE", { style: "currency", currency: "EUR" }).format(value || 0);
}
