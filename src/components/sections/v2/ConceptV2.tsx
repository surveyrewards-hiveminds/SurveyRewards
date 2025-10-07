import { useState, useEffect, useRef } from "react";
import {
  ArrowRight,
  Users,
  PenTool,
  DollarSign,
  BarChart3,
} from "lucide-react";
import { motion } from "framer-motion";
import { Text } from "../../language/Text";
import { WobbleCard } from "../../ui/WobbleCard";
import { FloatingElement } from "../../ui/FloatingElement";

export default function ConceptV2() {
  const [isVisible, setIsVisible] = useState(false);
  const [activeStep, setActiveStep] = useState(0);
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

  useEffect(() => {
    if (isVisible) {
      const interval = setInterval(() => {
        setActiveStep((prev) => (prev + 1) % 4);
      }, 3000);
      return () => clearInterval(interval);
    }
  }, [isVisible]);

  const steps = [
    {
      icon: PenTool,
      titleKey: "conceptV2.step1.title",
      descriptionKey: "conceptV2.step1.description",
      detailKey: "conceptV2.step1.detail",
      color: "from-blue-500 to-cyan-500",
    },
    {
      icon: Users,
      titleKey: "conceptV2.step2.title",
      descriptionKey: "conceptV2.step2.description",
      detailKey: "conceptV2.step2.detail",
      color: "from-purple-500 to-pink-500",
    },
    {
      icon: DollarSign,
      titleKey: "conceptV2.step3.title",
      descriptionKey: "conceptV2.step3.description",
      detailKey: "conceptV2.step3.detail",
      color: "from-green-500 to-emerald-500",
    },
    {
      icon: BarChart3,
      titleKey: "conceptV2.step4.title",
      descriptionKey: "conceptV2.step4.description",
      detailKey: "conceptV2.step4.detail",
      color: "from-orange-500 to-red-500",
    },
  ];

  return (
    <section
      id="concept"
      ref={sectionRef}
      className="py-20 bg-gradient-to-br from-slate-900 via-blue-900 to-indigo-900 relative overflow-hidden"
    >
      {/* Background Elements */}
      <div className="absolute inset-0">
        <div className="absolute top-1/4 left-1/4 w-64 h-64 bg-blue-500/10 rounded-full blur-3xl animate-pulse" />
        <div
          className="absolute bottom-1/4 right-1/4 w-80 h-80 bg-purple-500/10 rounded-full blur-3xl animate-pulse"
          style={{ animationDelay: "2s" }}
        />
      </div>

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
            className="text-3xl md:text-5xl font-bold text-white mb-6"
          >
            <Text tid="conceptV2.title" />
          </motion.h2>
          <motion.p
            initial={{ opacity: 0, y: 20 }}
            animate={{
              opacity: isVisible ? 1 : 0,
              y: isVisible ? 0 : 20,
            }}
            transition={{ duration: 0.8, delay: 0.2, ease: "easeOut" }}
            className="text-lg text-white/80 max-w-3xl mx-auto"
          >
            <Text tid="conceptV2.subtitle" />
          </motion.p>
        </div>

        {/* Steps */}
        <div className="grid lg:grid-cols-4 gap-8 lg:gap-4 mb-16 items-stretch">
          {steps.map((step, index) => (
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
                delay: index * 0.2 + 0.4,
                type: "spring",
                stiffness: 100,
              }}
              className="relative flex"
            >
              {/* Step Card */}
              <WobbleCard
                containerClassName="w-full"
                className={`relative flex flex-col p-6 rounded-2xl backdrop-blur-sm border transition-all duration-500 cursor-pointer w-full ${
                  activeStep === index
                    ? "bg-white/20 border-white/40"
                    : "bg-white/10 border-white/20 hover:bg-white/15"
                }`}
              >
                <div
                  onClick={() => setActiveStep(index)}
                  className="h-full flex flex-col"
                >
                  {/* Step Number */}
                  <FloatingElement delay={index * 0.5} duration={3} yOffset={3}>
                    <motion.div
                      className="absolute -top-3 -left-3 w-8 h-8 bg-gradient-to-r from-cyan-400 to-purple-400 rounded-full flex items-center justify-center text-white font-bold text-sm"
                      whileHover={{ scale: 1.2 }}
                      animate={{
                        scale: activeStep === index ? [1, 1.1, 1] : 1,
                      }}
                      transition={{ duration: 0.5 }}
                    >
                      {index + 1}
                    </motion.div>
                  </FloatingElement>

                  {/* Icon */}
                  <motion.div
                    className={`flex items-center justify-center w-12 h-12 rounded-xl bg-gradient-to-r ${step.color} mb-4 flex-shrink-0`}
                    whileHover={{
                      scale: 1.15,
                      rotate: [0, -10, 10, 0],
                    }}
                    animate={{
                      scale: activeStep === index ? 1.1 : 1,
                    }}
                    transition={{ duration: 0.3 }}
                  >
                    <step.icon className="w-6 h-6 text-white" />
                  </motion.div>

                  {/* Content */}
                  <div className="flex-grow">
                    <h3 className="text-xl font-semibold text-white mb-2">
                      <Text tid={step.titleKey as any} />
                    </h3>
                    <p className="text-white/70 text-sm leading-relaxed">
                      <Text tid={step.descriptionKey as any} />
                    </p>
                  </div>

                  {/* Active Indicator */}
                  {activeStep === index && (
                    <motion.div
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      className="absolute inset-0 rounded-2xl bg-gradient-to-r from-cyan-500/20 to-purple-500/20"
                    >
                      <motion.div
                        className="absolute inset-0 rounded-2xl bg-gradient-to-r from-cyan-500/10 to-purple-500/10"
                        animate={{
                          opacity: [0.5, 1, 0.5],
                        }}
                        transition={{
                          duration: 2,
                          repeat: Infinity,
                          ease: "easeInOut",
                        }}
                      />
                    </motion.div>
                  )}
                </div>
              </WobbleCard>

              {/* Arrow */}
              {index < steps.length - 1 && (
                <div className="hidden lg:block absolute top-1/2 -right-2 transform -translate-y-1/2 z-10">
                  <motion.div
                    animate={{ x: [0, 5, 0] }}
                    transition={{ duration: 2, repeat: Infinity }}
                  >
                    <ArrowRight className="w-6 h-6 text-white/40" />
                  </motion.div>
                </div>
              )}
            </motion.div>
          ))}
        </div>

        {/* Active Step Details */}
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          animate={{
            opacity: isVisible ? 1 : 0,
            y: isVisible ? 0 : 30,
          }}
          transition={{ duration: 0.8, delay: 1.2 }}
          className="text-center"
        >
          <motion.div
            key={activeStep}
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 0.5 }}
            className="max-w-2xl mx-auto p-8 rounded-2xl bg-white/10 backdrop-blur-sm border border-white/20"
          >
            <h4 className="text-2xl font-semibold text-white mb-4">
              <Text tid={steps[activeStep].titleKey as any} />
            </h4>
            <p className="text-white/80 leading-relaxed whitespace-pre-line">
              <Text tid={steps[activeStep].detailKey as any} />
            </p>
          </motion.div>
        </motion.div>

        {/* Progress Dots */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: isVisible ? 1 : 0 }}
          transition={{ duration: 0.8, delay: 1.4 }}
          className="flex justify-center gap-2 mt-8"
        >
          {steps.map((_, index) => (
            <motion.button
              key={index}
              onClick={() => setActiveStep(index)}
              className={`w-3 h-3 rounded-full transition-all duration-300 ${
                activeStep === index
                  ? "bg-white"
                  : "bg-white/30 hover:bg-white/50"
              }`}
              whileHover={{ scale: 1.2 }}
              whileTap={{ scale: 0.9 }}
              animate={{
                scale: activeStep === index ? 1.25 : 1,
              }}
            />
          ))}
        </motion.div>
      </div>
    </section>
  );
}
