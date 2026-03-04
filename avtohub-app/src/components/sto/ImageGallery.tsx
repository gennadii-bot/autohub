import { useCallback, useEffect, useState } from "react";
import useEmblaCarousel from "embla-carousel-react";
import { ChevronLeft, ChevronRight, X } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { getStoImageUrl } from "../../utils/media";

interface ImageGalleryProps {
  images: string[];
  alt?: string;
  className?: string;
}

export function ImageGallery({ images, alt = "", className = "" }: ImageGalleryProps) {
  const [emblaRef, emblaApi] = useEmblaCarousel({ loop: true });
  const [selectedIndex, setSelectedIndex] = useState(0);
  const [fullscreenOpen, setFullscreenOpen] = useState(false);
  const [fullscreenIndex, setFullscreenIndex] = useState(0);

  const scrollPrev = useCallback(() => emblaApi?.scrollPrev(), [emblaApi]);
  const scrollNext = useCallback(() => emblaApi?.scrollNext(), [emblaApi]);

  const onSelect = useCallback(() => {
    if (!emblaApi) return;
    setSelectedIndex(emblaApi.selectedScrollSnap());
  }, [emblaApi]);

  useEffect(() => {
    if (!emblaApi) return;
    onSelect();
    emblaApi.on("select", onSelect);
    return () => {
      emblaApi.off("select", onSelect);
    };
  }, [emblaApi, onSelect]);

  const normalizedImages = images.filter(Boolean);
  const hasMultiple = normalizedImages.length > 1;

  const openFullscreen = (index: number) => {
    setFullscreenIndex(index);
    setFullscreenOpen(true);
  };

  const closeFullscreen = () => setFullscreenOpen(false);

  const fullscreenPrev = () => {
    setFullscreenIndex((i) => (i <= 0 ? normalizedImages.length - 1 : i - 1));
  };

  const fullscreenNext = () => {
    setFullscreenIndex((i) => (i >= normalizedImages.length - 1 ? 0 : i + 1));
  };

  if (normalizedImages.length === 0) {
    return (
      <div
        className={`flex h-[300px] items-center justify-center rounded-2xl bg-gray-800 text-gray-400 sm:h-[350px] ${className}`}
      >
        Фото отсутствует
      </div>
    );
  }

  if (!hasMultiple) {
    const src = getStoImageUrl(normalizedImages[0]);
    return (
      <div className={`relative overflow-hidden rounded-2xl ${className}`}>
        <img
          src={src}
          alt={alt}
          className="h-[300px] w-full cursor-pointer object-cover sm:h-[350px]"
          onClick={() => openFullscreen(0)}
        />
        <FullscreenModal
          images={normalizedImages}
          index={fullscreenIndex}
          open={fullscreenOpen}
          onClose={closeFullscreen}
          onPrev={fullscreenPrev}
          onNext={fullscreenNext}
          alt={alt}
        />
      </div>
    );
  }

  return (
    <div className={`relative ${className}`}>
      <div className="overflow-hidden rounded-2xl" ref={emblaRef}>
        <div className="flex">
          {normalizedImages.map((img, i) => (
            <div key={i} className="min-w-0 flex-[0_0_100%]">
              <img
                src={getStoImageUrl(img)}
                alt={`${alt} ${i + 1}`}
                className="h-[300px] w-full cursor-pointer object-cover sm:h-[350px]"
                onClick={() => openFullscreen(i)}
              />
            </div>
          ))}
        </div>
      </div>

      <div className="absolute left-2 top-1/2 -translate-y-1/2">
        <button
          type="button"
          onClick={scrollPrev}
          className="rounded-full bg-black/50 p-2 text-white backdrop-blur hover:bg-black/70"
        >
          <ChevronLeft className="h-6 w-6" />
        </button>
      </div>
      <div className="absolute right-2 top-1/2 -translate-y-1/2">
        <button
          type="button"
          onClick={scrollNext}
          className="rounded-full bg-black/50 p-2 text-white backdrop-blur hover:bg-black/70"
        >
          <ChevronRight className="h-6 w-6" />
        </button>
      </div>

      <div className="absolute bottom-3 left-0 right-0 flex justify-center gap-1.5">
        {normalizedImages.map((_, i) => (
          <button
            key={i}
            type="button"
            onClick={() => emblaApi?.scrollTo(i)}
            className={`h-2 rounded-full transition-all ${
              i === selectedIndex ? "w-6 bg-white" : "w-2 bg-white/50"
            }`}
          />
        ))}
      </div>
      <div className="absolute bottom-3 right-3 rounded-full bg-black/50 px-2 py-0.5 text-xs text-white backdrop-blur">
        {selectedIndex + 1} / {normalizedImages.length}
      </div>

      <FullscreenModal
        images={normalizedImages}
        index={fullscreenIndex}
        open={fullscreenOpen}
        onClose={closeFullscreen}
        onPrev={fullscreenPrev}
        onNext={fullscreenNext}
        alt={alt}
      />
    </div>
  );
}

function FullscreenModal({
  images,
  index,
  open,
  onClose,
  onPrev,
  onNext,
  alt,
}: {
  images: string[];
  index: number;
  open: boolean;
  onClose: () => void;
  onPrev: () => void;
  onNext: () => void;
  alt: string;
}) {
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (!open) return;
      if (e.key === "Escape") onClose();
      if (e.key === "ArrowLeft") onPrev();
      if (e.key === "ArrowRight") onNext();
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [open, onClose, onPrev, onNext]);

  return (
    <AnimatePresence>
      {open && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/95"
          onClick={onClose}
        >
          <button
            type="button"
            onClick={onClose}
            className="absolute right-4 top-4 rounded-full bg-white/10 p-2 text-white hover:bg-white/20"
          >
            <X className="h-6 w-6" />
          </button>
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              onPrev();
            }}
            className="absolute left-4 top-1/2 -translate-y-1/2 rounded-full bg-white/10 p-3 text-white hover:bg-white/20"
          >
            <ChevronLeft className="h-8 w-8" />
          </button>
          <img
            src={getStoImageUrl(images[index])}
            alt={`${alt} ${index + 1}`}
            className="max-h-[90vh] max-w-[90vw] object-contain"
            onClick={(e) => e.stopPropagation()}
          />
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              onNext();
            }}
            className="absolute right-4 top-1/2 -translate-y-1/2 rounded-full bg-white/10 p-3 text-white hover:bg-white/20"
          >
            <ChevronRight className="h-8 w-8" />
          </button>
          <div className="absolute bottom-4 left-1/2 -translate-x-1/2 rounded-full bg-black/50 px-4 py-2 text-sm text-white backdrop-blur">
            {index + 1} / {images.length}
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
