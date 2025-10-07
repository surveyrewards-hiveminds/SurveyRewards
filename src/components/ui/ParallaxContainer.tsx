import { useEffect, useRef, useState } from "react";
import { motion } from "framer-motion";

interface ParallaxContainerProps {
  children: React.ReactNode;
  className?: string;
  speed?: number;
}

export const ParallaxContainer = ({
  children,
  className = "",
  speed = 0.5,
}: ParallaxContainerProps) => {
  const ref = useRef<HTMLDivElement>(null);
  const [scrollY, setScrollY] = useState(0);

  useEffect(() => {
    const handleScroll = () => {
      if (ref.current) {
        const rect = ref.current.getBoundingClientRect();
        const scrollProgress = Math.max(
          0,
          Math.min(1, -rect.top / (rect.height + window.innerHeight))
        );
        setScrollY(scrollProgress * window.innerHeight * speed);
      }
    };

    window.addEventListener("scroll", handleScroll);
    handleScroll();

    return () => window.removeEventListener("scroll", handleScroll);
  }, [speed]);

  return (
    <div ref={ref} className={`relative overflow-hidden ${className}`}>
      <motion.div style={{ y: scrollY }} className="w-full h-full">
        {children}
      </motion.div>
    </div>
  );
};
