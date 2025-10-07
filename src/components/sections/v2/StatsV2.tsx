import { useState, useEffect, useRef } from "react";
import { TrendingUp, Users, DollarSign, Globe } from "lucide-react";
import { motion } from "framer-motion";
import { Text } from "../../language/Text";
import { WobbleCard } from "../../ui/WobbleCard";
import { AnimatedCounter } from "../../ui/AnimatedCounter";
import { useStatsCount } from "../../../hooks/useStatsCount";

export default function StatsV2() {
  const [isVisible, setIsVisible] = useState(false);
  const sectionRef = useRef<HTMLElement>(null);
  const { users, surveys } = useStatsCount();

  const finalStats = {
    users: users || 50000, // Fallback to static value if loading/error
    surveys: surveys || 120000, // Fallback to static value if loading/error
    rewards: 2500000, // Keep hardcoded as requested
    countries: 85, // Keep hardcoded as requested
  };

  useEffect(() => {
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setIsVisible(true);
        }
      },
      { threshold: 0.3 }
    );

    if (sectionRef.current) {
      observer.observe(sectionRef.current);
    }

    return () => observer.disconnect();
  }, []);

  const stats = [
    {
      icon: Users,
      valueKey: "statsV2.stat1.value",
      labelKey: "statsV2.stat1.label",
      value: finalStats.users,
      suffix: "+",
      color: "from-blue-500 to-cyan-500",
    },
    {
      icon: TrendingUp,
      valueKey: "statsV2.stat2.value",
      labelKey: "statsV2.stat2.label",
      value: finalStats.surveys,
      suffix: "+",
      color: "from-purple-500 to-pink-500",
    },
    {
      icon: DollarSign,
      valueKey: "statsV2.stat3.value",
      labelKey: "statsV2.stat3.label",
      value: 0, // Not used for rewards since we show text from translation
      useTranslationValue: true, // Flag to show translation text instead of number
      color: "from-green-500 to-emerald-500",
    },
    {
      icon: Globe,
      valueKey: "statsV2.stat4.value",
      labelKey: "statsV2.stat4.label",
      value: finalStats.countries,
      suffix: "",
      color: "from-orange-500 to-red-500",
    },
  ];

  return (
    <section
      ref={sectionRef}
      className="py-20 bg-white relative overflow-hidden"
    >
      {/* Background Pattern */}
      <div className="absolute inset-0 bg-gradient-to-r from-blue-50/50 to-purple-50/50" />

      <div className="relative z-10 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Header */}
        <div className="text-center mb-16">
          <motion.h2
            initial={{ opacity: 0, y: 30 }}
            animate={{
              opacity: isVisible ? 1 : 0,
              y: isVisible ? 0 : 30,
            }}
            transition={{ duration: 0.8, ease: "easeOut" }}
            className="text-3xl md:text-5xl font-bold text-gray-900 mb-6"
          >
            <Text tid="statsV2.title" />
          </motion.h2>
          <motion.p
            initial={{ opacity: 0, y: 20 }}
            animate={{
              opacity: isVisible ? 1 : 0,
              y: isVisible ? 0 : 20,
            }}
            transition={{ duration: 0.8, delay: 0.2, ease: "easeOut" }}
            className="text-lg text-gray-600 max-w-3xl mx-auto"
          >
            <Text tid="statsV2.subtitle" />
          </motion.p>
        </div>

        {/* Stats Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6 lg:gap-8">
          {stats.map((stat, index) => (
            <motion.div
              key={index}
              initial={{ opacity: 0, scale: 0.8, y: 50 }}
              animate={{
                opacity: isVisible ? 1 : 0,
                scale: isVisible ? 1 : 0.8,
                y: isVisible ? 0 : 50,
              }}
              transition={{
                duration: 0.6,
                delay: index * 0.1 + 0.4,
                type: "spring",
                stiffness: 120,
              }}
            >
              <WobbleCard
                containerClassName="h-full"
                className="text-center p-6 sm:p-8 rounded-2xl bg-white shadow-lg hover:shadow-xl border border-gray-100 transition-all duration-700 h-full"
              >
                {/* Icon */}
                <motion.div
                  className={`inline-flex p-3 sm:p-4 rounded-2xl bg-gradient-to-r ${stat.color} mb-4`}
                  whileHover={{
                    scale: 1.15,
                    rotate: [0, -5, 5, 0],
                  }}
                  transition={{ duration: 0.3 }}
                >
                  <stat.icon className="w-6 h-6 sm:w-8 sm:h-8 text-white" />
                </motion.div>

                {/* Value */}
                <div className="mb-2">
                  {stat.useTranslationValue ? (
                    <div className="text-2xl sm:text-3xl md:text-4xl font-bold text-gray-900">
                      <Text tid={stat.valueKey as any} />
                    </div>
                  ) : (
                    <AnimatedCounter
                      from={0}
                      to={stat.value}
                      duration={2.5}
                      prefix={(stat as any).prefix}
                      suffix={(stat as any).suffix}
                      formatter={(stat as any).formatter}
                      className="text-2xl sm:text-3xl md:text-4xl font-bold text-gray-900"
                    />
                  )}
                </div>

                {/* Label */}
                <p className="text-gray-600 font-medium">
                  <Text tid={stat.labelKey as any} />
                </p>
              </WobbleCard>
            </motion.div>
          ))}
        </div>

        {/* Bottom Message */}
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          animate={{
            opacity: isVisible ? 1 : 0,
            y: isVisible ? 0 : 30,
          }}
          transition={{ duration: 0.8, delay: 1.0 }}
          className="text-center mt-16"
        >
          <motion.div
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
            className="inline-flex items-center gap-3 px-8 py-4 rounded-full bg-gradient-to-r from-blue-500 to-purple-600 text-white shadow-lg cursor-pointer transition-all duration-300 hover:shadow-xl"
          >
            <motion.div
              animate={{
                rotate: [0, 10, -10, 0],
                scale: [1, 1.1, 1],
              }}
              transition={{
                duration: 2,
                repeat: Infinity,
                ease: "easeInOut",
              }}
            >
              <TrendingUp className="w-5 h-5" />
            </motion.div>
            <span className="font-semibold">
              <Text tid="statsV2.growingEveryDay" />
            </span>
          </motion.div>
        </motion.div>
      </div>
    </section>
  );
}
