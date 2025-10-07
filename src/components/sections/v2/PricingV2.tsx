import { useState, useEffect, useRef } from "react";
import { Check, DollarSign, Trophy, Zap, Gift } from "lucide-react";
import { motion } from "framer-motion";
import { Text } from "../../language/Text";
import { WobbleCard } from "../../ui/WobbleCard";
import { FloatingElement } from "../../ui/FloatingElement";

export default function PricingV2() {
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

  const rewardModels = [
    {
      nameKey: "pricingV2.perResponse.name",
      icon: DollarSign,
      badgeKey: "pricingV2.perResponse.badge",
      descriptionKey: "pricingV2.perResponse.componentDescription",
      forCreatorsKeys: [
        "pricingV2.perResponse.creator1Component",
        "pricingV2.perResponse.creator2Component",
        "pricingV2.perResponse.creator3Component",
        "pricingV2.perResponse.creator4Component",
        "pricingV2.perResponse.creator5Component",
      ],
      forRespondentsKeys: [
        "pricingV2.perResponse.respondent1Component",
        "pricingV2.perResponse.respondent2Component",
        "pricingV2.perResponse.respondent3Component",
        "pricingV2.perResponse.respondent4Component",
      ],
      popular: false,
      color: "from-green-500 to-emerald-500",
    },
    {
      nameKey: "pricingV2.lotteryBased.name",
      icon: Trophy,
      badgeKey: "pricingV2.lotteryBased.badge",
      descriptionKey: "pricingV2.lotteryBased.componentDescription",
      forCreatorsKeys: [
        "pricingV2.lotteryBased.creator1Component",
        "pricingV2.lotteryBased.creator2Component",
        "pricingV2.lotteryBased.creator3Component",
        "pricingV2.lotteryBased.creator4Component",
        "pricingV2.lotteryBased.creator5Component",
      ],
      forRespondentsKeys: [
        "pricingV2.lotteryBased.respondent1Component",
        "pricingV2.lotteryBased.respondent2Component",
        "pricingV2.lotteryBased.respondent3Component",
        "pricingV2.lotteryBased.respondent4Component",
      ],
      popular: true,
      color: "from-blue-500 to-purple-500",
    },
    {
      nameKey: "pricingV2.hybrid.name",
      icon: Gift,
      badgeKey: "pricingV2.hybrid.badge",
      descriptionKey: "pricingV2.hybrid.componentDescription",
      forCreatorsKeys: [
        "pricingV2.hybrid.creator1Component",
        "pricingV2.hybrid.creator2Component",
        "pricingV2.hybrid.creator3Component",
        "pricingV2.hybrid.creator4Component",
      ],
      forRespondentsKeys: [
        "pricingV2.hybrid.respondent1Component",
        "pricingV2.hybrid.respondent2Component",
        "pricingV2.hybrid.respondent3Component",
        "pricingV2.hybrid.respondent4Component",
      ],
      popular: false,
      color: "from-purple-500 to-pink-500",
    },
  ];

  return (
    <section
      id="pricing"
      ref={sectionRef}
      className="py-20 bg-white relative overflow-hidden"
    >
      {/* Background Pattern */}
      <div className="absolute inset-0 bg-gradient-to-br from-slate-50/50 to-blue-50/50" />

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
            <Text tid="pricingV2.title" />
          </motion.h2>
          <motion.p
            initial={{ opacity: 0, y: 20 }}
            animate={{
              opacity: isVisible ? 1 : 0,
              y: isVisible ? 0 : 20,
            }}
            transition={{ duration: 0.8, delay: 0.2, ease: "easeOut" }}
            className="text-lg text-gray-600 max-w-3xl mx-auto mb-8"
          >
            <Text tid="pricingV2.subtitle" />
          </motion.p>
        </div>

        {/* Reward Model Cards */}
        <div className="grid lg:grid-cols-3 gap-8 max-w-6xl mx-auto mb-16">
          {rewardModels.map((model, index) => (
            <motion.div
              key={index}
              initial={{ opacity: 0, y: 50, scale: 0.9 }}
              animate={{
                opacity: isVisible ? 1 : 0,
                y: isVisible ? 0 : 50,
                scale: isVisible ? (model.popular ? 1.05 : 1) : 0.9,
              }}
              transition={{
                duration: 0.6,
                delay: index * 0.2 + 0.4,
                type: "spring",
                stiffness: 100,
              }}
              whileHover={{
                y: -8,
                scale: model.popular ? 1.08 : 1.03,
              }}
            >
              <WobbleCard
                containerClassName="h-full"
                className={`relative p-8 rounded-2xl transition-all duration-700 h-full ${
                  model.popular
                    ? "bg-gradient-to-br from-blue-50 to-purple-50 border-2 border-blue-200 shadow-xl"
                    : "bg-white border border-gray-200 shadow-lg hover:shadow-xl"
                }`}
              >
                {/* Popular Badge */}
                {model.popular && (
                  <FloatingElement delay={0} duration={3} yOffset={5}>
                    <div className="absolute -top-4 left-1/2 transform -translate-x-1/2 z-10">
                      <motion.div
                        initial={{ scale: 0 }}
                        animate={{ scale: 1 }}
                        transition={{
                          duration: 0.5,
                          delay: 1,
                          type: "spring",
                          stiffness: 200,
                        }}
                        className="bg-gradient-to-r from-blue-500 to-purple-600 text-white px-4 py-2 rounded-full text-sm font-semibold text-center leading-tight min-w-max max-w-32 flex items-center justify-center"
                      >
                        <Text tid={model.badgeKey as any} />
                      </motion.div>
                    </div>
                  </FloatingElement>
                )}

                {/* Icon */}
                <motion.div
                  className={`inline-flex p-3 rounded-xl mb-4 bg-gradient-to-r ${model.color}`}
                  whileHover={{
                    scale: 1.1,
                    rotate: [0, -10, 10, 0],
                  }}
                  transition={{ duration: 0.3 }}
                >
                  <model.icon className="w-8 h-8 text-white" />
                </motion.div>

                {/* Model Name */}
                <h3 className="text-2xl font-bold text-gray-900 mb-2">
                  <Text tid={model.nameKey as any} />
                </h3>

                {/* Description */}
                <p className="text-gray-600 mb-6 font-medium">
                  <Text tid={model.descriptionKey as any} />
                </p>

                {/* For Survey Creators */}
                <div className="mb-6">
                  <h4 className="text-sm font-semibold text-gray-800 mb-3 flex items-center gap-2">
                    <motion.span
                      animate={{ rotate: [0, 15, -15, 0] }}
                      transition={{ duration: 2, repeat: Infinity }}
                    >
                      📊
                    </motion.span>
                    <Text tid="pricingV2.forCreators" />
                  </h4>
                  <ul className="space-y-2">
                    {model.forCreatorsKeys.map((featureKey, featureIndex) => (
                      <motion.li
                        key={featureIndex}
                        className="flex items-start gap-2"
                        initial={{ opacity: 0, x: -20 }}
                        animate={{
                          opacity: isVisible ? 1 : 0,
                          x: isVisible ? 0 : -20,
                        }}
                        transition={{
                          duration: 0.3,
                          delay: index * 0.2 + featureIndex * 0.1 + 0.8,
                        }}
                      >
                        <motion.div
                          whileHover={{ scale: 1.2 }}
                          transition={{ duration: 0.2 }}
                        >
                          <Check className="w-4 h-4 text-green-500 mt-0.5 flex-shrink-0" />
                        </motion.div>
                        <span className="text-sm text-gray-700">
                          <Text tid={featureKey as any} />
                        </span>
                      </motion.li>
                    ))}
                  </ul>
                </div>

                {/* For Respondents */}
                <div className="mb-6">
                  <h4 className="text-sm font-semibold text-gray-800 mb-3 flex items-center gap-2">
                    <motion.span
                      animate={{ scale: [1, 1.2, 1] }}
                      transition={{ duration: 2, repeat: Infinity }}
                    >
                      💰
                    </motion.span>
                    <Text tid="pricingV2.forRespondents" />
                  </h4>
                  <ul className="space-y-2">
                    {model.forRespondentsKeys.map(
                      (featureKey, featureIndex) => (
                        <motion.li
                          key={featureIndex}
                          className="flex items-start gap-2"
                          initial={{ opacity: 0, x: -20 }}
                          animate={{
                            opacity: isVisible ? 1 : 0,
                            x: isVisible ? 0 : -20,
                          }}
                          transition={{
                            duration: 0.3,
                            delay: index * 0.2 + featureIndex * 0.1 + 1.2,
                          }}
                        >
                          <motion.div
                            whileHover={{ scale: 1.2 }}
                            transition={{ duration: 0.2 }}
                          >
                            <Check className="w-4 h-4 text-green-500 mt-0.5 flex-shrink-0" />
                          </motion.div>
                          <span className="text-sm text-gray-700">
                            <Text tid={featureKey as any} />
                          </span>
                        </motion.li>
                      )
                    )}
                  </ul>
                </div>
              </WobbleCard>
            </motion.div>
          ))}
        </div>

        {/* Credit System Explanation */}
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          animate={{
            opacity: isVisible ? 1 : 0,
            y: isVisible ? 0 : 30,
          }}
          transition={{ duration: 0.8, delay: 1.2 }}
          className="bg-gradient-to-r from-blue-50 to-purple-50 rounded-2xl p-8 border border-blue-100"
        >
          <div className="text-center">
            <div className="inline-flex items-center gap-2 mb-4">
              <motion.div
                animate={{
                  rotate: [0, 360],
                  scale: [1, 1.2, 1],
                }}
                transition={{
                  duration: 3,
                  repeat: Infinity,
                  ease: "easeInOut",
                }}
              >
                <Zap className="w-6 h-6 text-blue-600" />
              </motion.div>
              <h3 className="text-2xl font-bold text-gray-900">
                <Text tid="pricingV2.creditSystem.title" />
              </h3>
            </div>
            <motion.p
              initial={{ opacity: 0 }}
              animate={{ opacity: isVisible ? 1 : 0 }}
              transition={{ duration: 0.8, delay: 1.4 }}
              className="text-gray-700 max-w-4xl mx-auto leading-relaxed"
            >
              <Text tid="pricingV2.creditSystem.description" />
            </motion.p>
            <motion.p
              initial={{ opacity: 0 }}
              animate={{ opacity: isVisible ? 1 : 0 }}
              transition={{ duration: 0.8, delay: 1.6 }}
              className="text-sm text-gray-600 mt-4"
            >
              <Text tid="pricingV2.creditSystem.commission" />
            </motion.p>
          </div>
        </motion.div>
      </div>
    </section>
  );
}
