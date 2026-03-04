/** Временные заглушки для визуального ориентира, когда в городе нет СТО в базе. */
export interface StoListItem {
  id: number;
  name: string;
  rating: number;
  address: string;
}

export const MOCK_STOS: StoListItem[] = [
  { id: 1, name: "СТО АвтоМастер", rating: 4.8, address: "ул. Абая, 25" },
  { id: 2, name: "Turbo Service", rating: 4.6, address: "пр. Назарбаева, 10" },
  { id: 3, name: "Авто-Профи", rating: 4.9, address: "ул. Примерная, 12" },
  { id: 4, name: "Дизель Сервис", rating: 4.5, address: "ул. Сатпаева, 45" },
  { id: 5, name: "Масло и Фильтр", rating: 4.7, address: "пр. Достык, 88" },
  { id: 6, name: "Шиномонтаж Плюс", rating: 4.4, address: "ул. Толе би, 120" },
];
