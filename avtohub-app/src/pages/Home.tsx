import { motion } from "framer-motion";
import { HeroSection } from "../components/home/HeroSection";
import { Container } from "../components/layout/Container";

const STEPS = [
  {
    title: "Выберите город",
    description: "Укажите ваш город или разрешите автоматическое определение",
  },
  {
    title: "Выберите СТО",
    description: "Просмотрите список доступных автосервисов",
  },
  {
    title: "Запишитесь",
    description: "Укажите дату и время — получите подтверждение",
  },
];

export function Home() {
  return (
    <div className="overflow-hidden">
      <HeroSection />

      <section id="how-it-works" className="scroll-mt-20 py-20">
        <Container>
          <motion.h2
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.4, ease: [0.25, 0.46, 0.45, 0.94] }}
            className="text-center text-2xl font-semibold text-white sm:text-3xl"
          >
            Как это работает
          </motion.h2>
          <div className="mt-12 grid gap-8 sm:grid-cols-3">
            {STEPS.map((step, i) => (
              <motion.div
                key={step.title}
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{
                  duration: 0.4,
                  delay: i * 0.1,
                  ease: [0.25, 0.46, 0.45, 0.94],
                }}
                whileHover={{ y: -4 }}
                className="glass-card p-6 transition-shadow hover:shadow-emerald-500/10"
              >
                <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-emerald-500/20 text-lg font-semibold text-emerald-400">
                  {i + 1}
                </div>
                <h3 className="mt-4 font-medium text-white">{step.title}</h3>
                <p className="mt-2 text-sm text-white/70">{step.description}</p>
              </motion.div>
            ))}
          </div>
        </Container>
      </section>
    </div>
  );
}
