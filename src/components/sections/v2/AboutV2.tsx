import { useState, useEffect, useRef } from "react";
import { CheckCircle, Shield, Award, Globe2 } from "lucide-react";
import { motion } from "framer-motion";
import { Text } from "../../language/Text";
import { WobbleCard } from "../../ui/WobbleCard";

export default function AboutV2() {
  const [isVisible, setIsVisible] = useState(false);
  const sectionRef = useRef<HTMLElement>(null);

  useEffect(() => {
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setIsVisible(true);
        }
      },
      { threshold: 0.1 }
    );

    if (sectionRef.current) {
      observer.observe(sectionRef.current);
    }

    return () => observer.disconnect();
  }, []);

  const features = [
    {
      icon: Shield,
      titleKey: "aboutV2.feature1.title",
      descriptionKey: "aboutV2.feature1.description",
      color: "from-green-400 to-emerald-500",
    },
    {
      icon: Award,
      titleKey: "aboutV2.feature2.title",
      descriptionKey: "aboutV2.feature2.description",
      color: "from-purple-400 to-pink-500",
    },
    {
      icon: Globe2,
      titleKey: "aboutV2.feature3.title",
      descriptionKey: "aboutV2.feature3.description",
      color: "from-indigo-400 to-purple-500",
    },
  ];

  return (
    <section
      id="about"
      ref={sectionRef}
      className="py-20 bg-white relative overflow-hidden"
    >
      {/* Background Pattern */}
      <div className="absolute inset-0 bg-gradient-to-br from-slate-50/50 to-blue-50/50" />
      <div className="absolute top-0 left-0 w-full h-64 bg-gradient-to-b from-slate-100/30 to-transparent" />

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
            <Text tid="aboutV2.title" />
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
            <Text tid="aboutV2.description" />
          </motion.p>
        </div>

        {/* Features Grid */}
        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-8">
          {features.map((feature, index) => (
            <motion.div
              key={index}
              initial={{ opacity: 0, y: 50, scale: 0.9 }}
              animate={{
                opacity: isVisible ? 1 : 0,
                y: isVisible ? 0 : 50,
                scale: isVisible ? 1 : 0.9,
              }}
              transition={{
                duration: 0.6,
                delay: index * 0.1 + 0.4,
                type: "spring",
                stiffness: 100,
              }}
            >
              <WobbleCard
                containerClassName="h-full"
                className="group relative p-8 rounded-2xl bg-white shadow-lg hover:shadow-2xl border border-gray-100 hover:border-gray-200 transition-all duration-500 h-full"
              >
                {/* Icon */}
                <motion.div
                  className={`inline-flex p-3 rounded-xl bg-gradient-to-r ${feature.color} mb-4`}
                  whileHover={{
                    scale: 1.1,
                    rotate: [0, -10, 10, 0],
                  }}
                  transition={{ duration: 0.3 }}
                >
                  <feature.icon className="w-6 h-6 text-white" />
                </motion.div>

                {/* Content */}
                <h3 className="text-xl font-semibold text-gray-900 mb-3 group-hover:text-blue-600 transition-colors">
                  <Text tid={feature.titleKey as any} />
                </h3>
                <p className="text-gray-600 leading-relaxed">
                  <Text tid={feature.descriptionKey as any} />
                </p>

                {/* Hover Effect */}
                <div className="absolute inset-0 rounded-2xl bg-gradient-to-r from-blue-500/5 to-purple-500/5 opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
              </WobbleCard>
            </motion.div>
          ))}
        </div>

        {/* Bottom CTA */}
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
            className="inline-flex items-center gap-2 px-6 py-3 rounded-full bg-gradient-to-r from-blue-50 to-purple-50 border border-blue-200 cursor-pointer transition-all duration-300 hover:shadow-lg"
          >
            <motion.div
              animate={{ scale: [1, 1.2, 1] }}
              transition={{ duration: 2, repeat: Infinity }}
            >
              <CheckCircle className="w-5 h-5 text-green-500" />
            </motion.div>
            <span className="text-sm font-medium text-gray-700">
              <Text tid="aboutV2.trusted" />
            </span>
          </motion.div>
        </motion.div>
      </div>
    </section>
  );
}
