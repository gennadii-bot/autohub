import { Link } from "react-router-dom";
import { motion } from "framer-motion";
import { Check } from "lucide-react";
import { Button } from "../components/ui/Button";
import { Container } from "../components/layout/Container";

export function Success() {
  return (
    <Container className="flex min-h-[60vh] flex-col items-center justify-center py-12 text-center">
      <motion.div
        initial={{ scale: 0.8, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        transition={{ duration: 0.3 }}
      >
        <div className="flex h-16 w-16 items-center justify-center rounded-full bg-green-100">
          <Check className="h-8 w-8 text-green-600" />
        </div>
        <motion.h1
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          className="mt-6 text-2xl font-semibold text-neutral-900"
        >
          Ваша заявка отправлена
        </motion.h1>
        <motion.p
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
          className="mt-2 text-neutral-600"
        >
          Мы свяжемся с вами для подтверждения записи.
        </motion.p>
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.3 }}
        >
          <Link to="/" className="mt-8 inline-block">
            <Button>На главную</Button>
          </Link>
        </motion.div>
      </motion.div>
    </Container>
  );
}
