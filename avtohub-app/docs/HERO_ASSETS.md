# Hero Section — рекомендации по изображениям

## hero-engine-dark.jpg

**Путь:** `public/hero-engine-dark.jpg`

**Требования:**
- Тёмный двигатель автомобиля
- Cinematic освещение (боковой свет, контраст)
- Без текста и логотипов
- Стиль современного SaaS / премиум

**Рекомендуемые размеры:**
- 1920×1080 (Full HD) — минимум
- 2560×1440 (2K) — рекомендуется
- 3840×2160 (4K) — для Retina

**Формат:**
- WebP — приоритет (меньше вес, качество)
- JPEG — fallback (совместимость)

**Пример конвертации:**
```bash
# WebP (рекомендуется)
cwebp -q 85 hero-engine-dark.jpg -o hero-engine-dark.webp

# Или через Sharp/ImageMagick
```

**Fallback:** При отсутствии файла используется Unsplash CDN.

---

## Карта с маркерами

Карта Казахстана с glowing-маркерами реализована через SVG (inline в HeroSection.tsx).

Цвета маркеров:
- Бирюзовый: `#22d3ee`
- Фиолетовый: `#a78bfa`
- Оранжевый: `#fb923c`

---

## Структура папок

```
src/
├── components/
│   ├── home/
│   │   └── HeroSection.tsx    # Hero-блок
│   └── ui/
│       └── CustomSelect.tsx   # Стеклянный select
├── pages/
│   └── Home.tsx               # Главная страница
└── ...
public/
├── hero-engine-dark.jpg       # Фон hero
└── map-kazakhstan.svg         # Карта (CitySelect)
```
