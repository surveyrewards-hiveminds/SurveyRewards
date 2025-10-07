import { motion } from "framer-motion";

interface BackgroundBeamsProps {
  className?: string;
}

export const BackgroundBeams = ({ className = "" }: BackgroundBeamsProps) => {
  const paths = [
    "M-420 0L-137 400L54 800L345 1200L636 1600",
    "M-290 0L-7 400L284 800L575 1200L866 1600",
    "M-160 0L123 400L514 800L805 1200L1096 1600",
    "M-30 0L253 400L744 800L1035 1200L1326 1600",
    "M100 0L383 400L974 800L1265 1200L1556 1600",
  ];

  return (
    <div className={`absolute inset-0 overflow-hidden ${className}`}>
      <svg
        className="absolute inset-0 h-full w-full"
        width="100%"
        height="100%"
        viewBox="0 0 1000 1600"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
      >
        {paths.map((path, index) => (
          <motion.path
            key={index}
            d={path}
            stroke={`url(#gradient-${index})`}
            strokeWidth="2"
            strokeLinecap="round"
            initial={{ pathLength: 0, opacity: 0 }}
            animate={{
              pathLength: 1,
              opacity: [0, 1, 0.5, 1, 0.5],
            }}
            transition={{
              pathLength: { duration: 5, ease: "easeInOut" },
              opacity: {
                duration: 5,
                repeat: Infinity,
                repeatType: "reverse",
                delay: index * 0.5,
              },
            }}
          />
        ))}
        <defs>
          {paths.map((_, index) => (
            <linearGradient
              key={index}
              id={`gradient-${index}`}
              x1="0%"
              y1="0%"
              x2="100%"
              y2="100%"
            >
              <stop stopColor="#3b82f6" stopOpacity="0" />
              <stop stopColor="#8b5cf6" stopOpacity="0.8" />
              <stop stopColor="#06b6d4" stopOpacity="0" />
            </linearGradient>
          ))}
        </defs>
      </svg>
    </div>
  );
};
