export interface STO {
  id: number;
  name: string;
  city: string;
  cityId: string;
  rating: number;
  image: string;
  address: string;
  phone?: string;
  services?: string[];
}

export const MOCK_STO: STO[] = [
  {
    id: 1,
    name: "AutoPro Service",
    city: "Алматы",
    cityId: "almaty",
    rating: 4.8,
    image: "https://images.unsplash.com/photo-1486262715619-67b85e0b08d3?w=600&h=400&fit=crop",
    address: "ул. Абая 25",
    phone: "+7 727 123 4567",
    services: ["Диагностика", "ТО", "Шиномонтаж"],
  },
  {
    id: 2,
    name: "АвтоМастер Алматы",
    city: "Алматы",
    cityId: "almaty",
    rating: 4.6,
    image: "https://images.unsplash.com/photo-1625047509168-a7026f36de04?w=600&h=400&fit=crop",
    address: "пр. Достык 45",
    phone: "+7 727 234 5678",
    services: ["Кузовной ремонт", "Покраска"],
  },
  {
    id: 3,
    name: "СТО Центр",
    city: "Алматы",
    cityId: "almaty",
    rating: 4.9,
    image: "https://images.unsplash.com/photo-1581092160562-40aa08e78837?w=600&h=400&fit=crop",
    address: "ул. Сейфуллина 78",
    phone: "+7 727 345 6789",
    services: ["Диагностика", "ТО", "Ремонт двигателя"],
  },
  {
    id: 4,
    name: "АвтоСервис Астана",
    city: "Астана",
    cityId: "astana",
    rating: 4.7,
    image: "https://images.unsplash.com/photo-1549317661-bd32c8ce0db2?w=600&h=400&fit=crop",
    address: "пр. Кабанбай батыра 12",
    phone: "+7 717 123 4567",
    services: ["ТО", "Шиномонтаж"],
  },
  {
    id: 5,
    name: "Столичный Авто",
    city: "Астана",
    cityId: "astana",
    rating: 4.5,
    image: "https://images.unsplash.com/photo-1502877338535-766e1452684a?w=600&h=400&fit=crop",
    address: "ул. Кенесары 34",
    phone: "+7 717 234 5678",
    services: ["Диагностика", "Ремонт ходовой"],
  },
  {
    id: 6,
    name: "АвтоДок Шымкент",
    city: "Шымкент",
    cityId: "shymkent",
    rating: 4.4,
    image: "https://images.unsplash.com/photo-1558618666-fcd25c85cd64?w=600&h=400&fit=crop",
    address: "ул. Байзакова 56",
    phone: "+7 725 123 4567",
    services: ["ТО", "Шиномонтаж", "Диагностика"],
  },
];
