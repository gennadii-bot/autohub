import { useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import { useCity } from "../../context/CityContext";

const HERO_IMAGE = "/hero-engine-dark.jpg";

const titleVariants = {
  hidden: { opacity: 0, y: 32 },
  visible: {
    opacity: 1,
    y: 0,
    transition: { duration: 0.6, ease: [0.25, 0.46, 0.45, 0.94] as const },
  },
};

const subtitleVariants = {
  hidden: { opacity: 0, y: 24 },
  visible: {
    opacity: 1,
    y: 0,
    transition: { duration: 0.5, delay: 0.15, ease: [0.25, 0.46, 0.45, 0.94] as const },
  },
};

const ctaVariants = {
  hidden: { opacity: 0, y: 20 },
  visible: {
    opacity: 1,
    y: 0,
    transition: { duration: 0.5, delay: 0.3, ease: [0.25, 0.46, 0.45, 0.94] as const },
  },
};

const markerPulseTransition = {
  duration: 2,
  repeat: Infinity,
  ease: "easeInOut" as const,
};

export function HeroSection() {
  const navigate = useNavigate();
  const { selectedCityId } = useCity();

  const handleFindSto = () => {
    if (selectedCityId) {
      navigate(`/sto?city_id=${selectedCityId}`);
    } else {
      navigate("/select-city");
    }
  };

  return (
    <section className="relative min-h-screen overflow-hidden">
      {/* Background: engine image */}
      <div className="absolute inset-0">
        <img
          src={HERO_IMAGE}
          alt=""
          className="h-full w-full object-cover object-center"
          onError={(e) => {
            const target = e.target as HTMLImageElement;
            target.onerror = null;
            target.src =
              "https://images.unsplash.com/photo-1580273916550-e323be2ae537?w=1920&h=1080&fit=crop";
          }}
        />
        <div
          className="absolute inset-0 bg-gradient-to-b from-black/70 via-black/75 to-black/85"
          aria-hidden
        />
        <div
          className="absolute inset-0 backdrop-blur-[2px]"
          aria-hidden
        />
      </div>

      {/* Map overlay */}
      <div
        className="absolute bottom-0 right-0 w-full max-w-md translate-x-8 translate-y-8 opacity-40 sm:max-w-lg md:translate-x-16 md:translate-y-12 md:opacity-50"
        aria-hidden
      >
        <svg
          viewBox="0 0 400 280"
          className="h-48 w-full sm:h-56 md:h-64"
          fill="none"
        >
          <path
            d="M120 45 L180 40 L240 50 L280 75 L300 110 L305 150 L295 190 L275 230 L245 260 L200 270 L155 260 L120 235 L95 195 L85 150 L90 100 L105 65 Z"
            stroke="rgba(255,255,255,0.15)"
            strokeWidth="1.5"
            fill="rgba(0,0,0,0.3)"
          />
          <g className="hero-map-markers">
            <motion.circle
              animate={{ scale: [1, 1.15, 1], opacity: [0.8, 1, 0.8] }}
              transition={markerPulseTransition}
              cx="180"
              cy="120"
              r="6"
              fill="#22d3ee"
              className="drop-shadow-[0_0_8px_rgba(34,211,238,0.8)]"
            />
            <motion.circle
              animate={{ scale: [1, 1.15, 1], opacity: [0.8, 1, 0.8] }}
              transition={{ ...markerPulseTransition, delay: 0.5 }}
              cx="250"
              cy="90"
              r="5"
              fill="#a78bfa"
              className="drop-shadow-[0_0_8px_rgba(167,139,250,0.8)]"
            />
            <motion.circle
              animate={{ scale: [1, 1.15, 1], opacity: [0.8, 1, 0.8] }}
              transition={{ ...markerPulseTransition, delay: 1 }}
              cx="220"
              cy="180"
              r="5"
              fill="#fb923c"
              className="drop-shadow-[0_0_8px_rgba(251,146,60,0.8)]"
            />
          </g>
        </svg>
      </div>

      {/* Content */}
      <div className="relative z-10 flex min-h-screen flex-col justify-center px-4 py-24 text-center sm:px-6 sm:py-32 md:text-left">
        <div className="mx-auto w-full max-w-2xl">
          <motion.h1
            variants={titleVariants}
            initial="hidden"
            animate="visible"
            className="text-3xl font-semibold leading-tight text-white sm:text-5xl md:text-6xl"
          >
            Онлайн-запись в автосервис
          </motion.h1>
          <motion.p
            variants={subtitleVariants}
            initial="hidden"
            animate="visible"
            className="mt-4 text-lg text-white/70 sm:text-xl"
          >
            Найдите СТО рядом, сравните услуги и запишитесь за 60 секунд.
          </motion.p>

          <motion.div
            variants={ctaVariants}
            initial="hidden"
            animate="visible"
            className="mt-10 flex justify-center"
          >
            <motion.button
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.98 }}
              onClick={handleFindSto}
              className="h-14 rounded-2xl bg-gradient-to-r from-emerald-400 to-violet-500 px-8 font-semibold text-white shadow-lg shadow-emerald-500/25 transition-shadow hover:shadow-emerald-500/40"
            >
              Найти СТО
            </motion.button>
          </motion.div>
        </div>
      </div>
    </section>
  );
}
