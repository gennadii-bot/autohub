export interface City {
  id: string;
  name: string;
  region: string;
  type: "republican" | "regional";
}

export const REPUBLICAN_CITIES: City[] = [
  { id: "almaty", name: "Алматы", region: "Город республиканского значения", type: "republican" },
  { id: "astana", name: "Астана", region: "Столица", type: "republican" },
  { id: "shymkent", name: "Шымкент", region: "Город республиканского значения", type: "republican" },
];

export const REGIONS: { id: string; name: string }[] = [
  { id: "akmola", name: "Акмолинская" },
  { id: "aktobe", name: "Актюбинская" },
  { id: "almaty-region", name: "Алматинская" },
  { id: "atyrau", name: "Атырауская" },
  { id: "east-kazakhstan", name: "Восточно-Казахстанская" },
  { id: "zhambyl", name: "Жамбылская" },
  { id: "west-kazakhstan", name: "Западно-Казахстанская" },
  { id: "karaganda", name: "Карагандинская" },
  { id: "kostanay", name: "Костанайская" },
  { id: "kyzylorda", name: "Кызылординская" },
  { id: "mangystau", name: "Мангистауская" },
  { id: "pavlodar", name: "Павлодарская" },
  { id: "north-kazakhstan", name: "Северо-Казахстанская" },
  { id: "turkestan", name: "Туркестанская" },
  { id: "abai", name: "Абайская" },
  { id: "zhetysu", name: "Жетысуская" },
  { id: "ulytau", name: "Улытауская" },
];

export const REGIONAL_CITIES: City[] = [
  { id: "kokshetau", name: "Кокшетау", region: "Акмолинская", type: "regional" },
  { id: "stepnogorsk", name: "Степногорск", region: "Акмолинская", type: "regional" },
  { id: "aktobe-city", name: "Актобе", region: "Актюбинская", type: "regional" },
  { id: "taldykorgan", name: "Талдыкорган", region: "Алматинская", type: "regional" },
  { id: "kapshagay", name: "Капшагай", region: "Алматинская", type: "regional" },
  { id: "atyrau-city", name: "Атырау", region: "Атырауская", type: "regional" },
  { id: "ust-kamenogorsk", name: "Усть-Каменогорск", region: "Восточно-Казахстанская", type: "regional" },
  { id: "semey", name: "Семей", region: "Абайская", type: "regional" },
  { id: "taraz", name: "Тараз", region: "Жамбылская", type: "regional" },
  { id: "uralsk", name: "Уральск", region: "Западно-Казахстанская", type: "regional" },
  { id: "karaganda-city", name: "Караганда", region: "Карагандинская", type: "regional" },
  { id: "temirtau", name: "Темиртау", region: "Карагандинская", type: "regional" },
  { id: "zhanaozen", name: "Жанаозен", region: "Мангистауская", type: "regional" },
  { id: "kostanay-city", name: "Костанай", region: "Костанайская", type: "regional" },
  { id: "rudny", name: "Рудный", region: "Костанайская", type: "regional" },
  { id: "kyzylorda-city", name: "Кызылорда", region: "Кызылординская", type: "regional" },
  { id: "aktau", name: "Актау", region: "Мангистауская", type: "regional" },
  { id: "pavlodar", name: "Павлодар", region: "Павлодарская", type: "regional" },
  { id: "ekibastuz", name: "Экибастуз", region: "Павлодарская", type: "regional" },
  { id: "petropavl", name: "Петропавловск", region: "Северо-Казахстанская", type: "regional" },
  { id: "turkestan-city", name: "Туркестан", region: "Туркестанская", type: "regional" },
  { id: "kentau", name: "Кентау", region: "Туркестанская", type: "regional" },
  { id: "taldykorgan-zhetysu", name: "Талдыкорган", region: "Жетысуская", type: "regional" },
  { id: "zhezkazgan", name: "Жезказган", region: "Улытауская", type: "regional" },
];

export const ALL_CITIES: City[] = [...REPUBLICAN_CITIES, ...REGIONAL_CITIES];

export function getCityById(id: string): City | undefined {
  return ALL_CITIES.find((c) => c.id === id);
}
