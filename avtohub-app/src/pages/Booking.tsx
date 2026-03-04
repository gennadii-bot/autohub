import { useEffect } from "react";
import { useNavigate, useSearchParams, Link } from "react-router-dom";
import { motion } from "framer-motion";
import { Container } from "../components/layout/Container";
import { Button } from "../components/ui/Button";

/** Legacy: redirects to STO page for booking (booking flow is now on /sto/:id). */
export function Booking() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const stoId = searchParams.get("stoId");

  useEffect(() => {
    if (stoId) {
      navigate(`/sto/${stoId}`, { replace: true });
    }
  }, [stoId, navigate]);

  if (stoId) {
    return null;
  }

  return (
    <Container className="py-12">
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        className="mx-auto max-w-md text-center"
      >
        <p className="text-white/70">Выберите СТО для записи</p>
        <Link to="/sto" className="mt-4 inline-block">
          <Button variant="secondary">К списку СТО</Button>
        </Link>
      </motion.div>
    </Container>
  );
}
