import { useState, useEffect, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { ArrowRight, Sparkles, Users, Trophy } from "lucide-react";
import { motion } from "framer-motion";
import { Text } from "../../language/Text";
import { Sparkles as SparklesEffect } from "../../ui/Sparkles";
import { FloatingElement } from "../../ui/FloatingElement";
import { useStatsCount } from "../../../hooks/useStatsCount";
import { useLanguage } from "../../../context/LanguageContext";
import { getTranslation } from "../../../i18n";

export default function CTAV2() {
  const [isVisible, setIsVisible] = useState(false);
  const [mousePosition, setMousePosition] = useState({ x: 0, y: 0 });
  const sectionRef = useRef<HTMLElement>(null);
  const navigate = useNavigate();
  const { users } = useStatsCount();
  const { language } = useLanguage();

  // Format user count for display
  const formatUserCount = (count: number): string => {
    if (count >= 1000) {
      return `${Math.floor(count / 1000)}K`;
    }
    return count.toString();
  };

  // Get translated user count with dynamic number
  const getUserCountText = (): string => {
    const template = getTranslation("ctaV2.stats.userCount", language);
    const formattedNumber = formatUserCount(users || 50); // Fallback to 50K if no data
    return template.replace("{numbers}", formattedNumber);
  };

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
    const handleMouseMove = (e: MouseEvent) => {
      if (sectionRef.current) {
        const rect = sectionRef.current.getBoundingClientRect();
        setMousePosition({
          x: e.clientX - rect.left,
          y: e.clientY - rect.top,
        });
      }
    };

    window.addEventListener("mousemove", handleMouseMove);
    return () => window.removeEventListener("mousemove", handleMouseMove);
  }, []);

  const handleStartEarning = () => navigate("/answer");
  const handleCreateSurvey = () => navigate("/register");

  return (
    <section
      ref={sectionRef}
      className="py-20 bg-gradient-to-br from-slate-900 via-blue-900 to-indigo-900 relative overflow-hidden"
    >
      {/* Interactive Background */}
      <div className="absolute inset-0">
        {/* Sparkles Effect */}
        <SparklesEffect className="opacity-40" density={20} />

        {/* Mouse-following gradient */}
        <motion.div
          className="absolute w-96 h-96 bg-gradient-to-r from-blue-500/20 to-purple-500/20 rounded-full blur-3xl"
          animate={{
            x: mousePosition.x - 192,
            y: mousePosition.y - 192,
          }}
          transition={{ duration: 0.7, ease: "easeOut" }}
        />

        {/* Floating elements */}
        <FloatingElement delay={0} duration={4} yOffset={20}>
          <div className="absolute top-1/4 left-1/6 w-4 h-4 bg-cyan-400/30 rounded-full" />
        </FloatingElement>
        <FloatingElement delay={1} duration={3} yOffset={15}>
          <div className="absolute top-3/4 right-1/4 w-6 h-6 bg-purple-400/30 rounded-full" />
        </FloatingElement>
        <FloatingElement delay={2} duration={5} yOffset={25}>
          <div className="absolute bottom-1/3 left-1/3 w-3 h-3 bg-pink-400/30 rounded-full" />
        </FloatingElement>
      </div>

      <div className="relative z-10 max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
        {/* Badge */}
        <motion.div
          initial={{ opacity: 0, y: 20, scale: 0.8 }}
          animate={{
            opacity: isVisible ? 1 : 0,
            y: isVisible ? 0 : 20,
            scale: isVisible ? 1 : 0.8,
          }}
          transition={{ duration: 0.6, ease: "easeOut" }}
          className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-white/10 backdrop-blur-sm border border-white/20 text-white/90 text-sm font-medium mb-8"
        >
          <motion.div
            animate={{ rotate: [0, 360] }}
            transition={{ duration: 3, repeat: Infinity, ease: "linear" }}
          >
            <Sparkles className="w-4 h-4 text-yellow-400" />
          </motion.div>
          <span>
            <Text tid="ctaV2.badge" />
          </span>
        </motion.div>

        {/* Main Title */}
        <motion.h2
          initial={{ opacity: 0, y: 30 }}
          animate={{
            opacity: isVisible ? 1 : 0,
            y: isVisible ? 0 : 30,
          }}
          transition={{ duration: 0.8, delay: 0.2, ease: "easeOut" }}
          className="text-4xl md:text-6xl font-bold text-white mb-6"
        >
          <Text tid="ctaV2.title" />
        </motion.h2>

        {/* Subtitle */}
        <motion.p
          initial={{ opacity: 0, y: 20 }}
          animate={{
            opacity: isVisible ? 1 : 0,
            y: isVisible ? 0 : 20,
          }}
          transition={{ duration: 0.8, delay: 0.4, ease: "easeOut" }}
          className="text-xl text-white/80 max-w-2xl mx-auto mb-12 leading-relaxed"
        >
          <Text tid="ctaV2.subtitle" />
        </motion.p>

        {/* Action Buttons */}
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          animate={{
            opacity: isVisible ? 1 : 0,
            y: isVisible ? 0 : 30,
          }}
          transition={{ duration: 0.8, delay: 0.6, ease: "easeOut" }}
          className="flex flex-col sm:flex-row gap-4 justify-center items-center mb-16"
        >
          <motion.button
            onClick={handleStartEarning}
            whileHover={{
              scale: 1.05,
              boxShadow: "0 25px 50px -12px rgba(6, 182, 212, 0.5)",
            }}
            whileTap={{ scale: 0.95 }}
            className="group relative px-8 py-4 bg-gradient-to-r from-cyan-500 to-blue-600 text-white font-semibold rounded-xl transition-all duration-300 flex items-center gap-3 min-w-[200px] overflow-hidden"
          >
            <motion.div
              className="absolute inset-0 bg-gradient-to-r from-cyan-600 to-blue-700"
              initial={{ x: "-100%" }}
              whileHover={{ x: "0%" }}
              transition={{ duration: 0.3 }}
            />
            <Users className="w-6 h-6 relative z-10" />
            <span className="relative z-10">
              <Text tid="ctaV2.respondentButton" />
            </span>
            <motion.div
              className="relative z-10"
              animate={{ x: [0, 5, 0] }}
              transition={{ duration: 1.5, repeat: Infinity }}
            >
              <ArrowRight className="w-5 h-5" />
            </motion.div>
          </motion.button>

          <motion.button
            onClick={handleCreateSurvey}
            whileHover={{
              scale: 1.05,
              boxShadow: "0 25px 50px -12px rgba(168, 85, 247, 0.5)",
            }}
            whileTap={{ scale: 0.95 }}
            className="group relative px-8 py-4 bg-gradient-to-r from-purple-500 to-pink-600 text-white font-semibold rounded-xl transition-all duration-300 flex items-center gap-3 min-w-[200px] overflow-hidden"
          >
            <motion.div
              className="absolute inset-0 bg-gradient-to-r from-purple-600 to-pink-700"
              initial={{ x: "-100%" }}
              whileHover={{ x: "0%" }}
              transition={{ duration: 0.3 }}
            />
            <Trophy className="w-6 h-6 relative z-10" />
            <span className="relative z-10">
              <Text tid="ctaV2.creatorButton" />
            </span>
            <motion.div
              className="relative z-10"
              animate={{ x: [0, 5, 0] }}
              transition={{ duration: 1.5, repeat: Infinity, delay: 0.5 }}
            >
              <ArrowRight className="w-5 h-5" />
            </motion.div>
          </motion.button>
        </motion.div>

        {/* Trust Indicators */}
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          animate={{
            opacity: isVisible ? 1 : 0,
            y: isVisible ? 0 : 30,
          }}
          transition={{ duration: 0.8, delay: 0.8, ease: "easeOut" }}
          className="grid grid-cols-1 md:grid-cols-3 gap-8"
        >
          {[
            {
              numberKey: "ctaV2.stats.userCount",
              labelKey: "ctaV2.stats.users",
              useCustomValue: true,
            },
            {
              numberKey: "ctaV2.stats.rewardAmount",
              labelKey: "ctaV2.stats.rewards",
              useCustomValue: false,
            },
            {
              numberKey: "ctaV2.stats.uptimePercent",
              labelKey: "ctaV2.stats.uptime",
              useCustomValue: false,
            },
          ].map((stat, index) => (
            <motion.div
              key={index}
              initial={{ opacity: 0, scale: 0.8 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{
                duration: 0.5,
                delay: 1.0 + index * 0.1,
                type: "spring",
                stiffness: 150,
              }}
              className="text-center"
            >
              <div className="text-2xl md:text-3xl font-bold text-white mb-1">
                {stat.useCustomValue ? (
                  <span>{getUserCountText()}</span>
                ) : (
                  <Text tid={stat.numberKey as any} />
                )}
              </div>
              <div className="text-white/60 text-sm">
                <Text tid={stat.labelKey as any} />
              </div>
            </motion.div>
          ))}
        </motion.div>

        {/* Bottom Message */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{
            opacity: isVisible ? 1 : 0,
            y: isVisible ? 0 : 20,
          }}
          transition={{ duration: 0.8, delay: 1.4, ease: "easeOut" }}
          className="mt-12"
        >
          <p className="text-white/60 text-sm">
            <Text tid="ctaV2.bottomMessage" />
          </p>
        </motion.div>
      </div>
    </section>
  );
}
