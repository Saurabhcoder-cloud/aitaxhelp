'use client';

interface EnhancementsSectionProps {
  currentLanguage: string;
}

const translations = {
  en: {
    title: "Advanced Enhancement Tools",
    subtitle: "Powerful features to optimize your tax filing experience",
    enhancements: [
      {
        title: "Tax Law Explorer",
        description: "Explore federal and state tax laws, rules, and regulations to better understand your filing requirements and obligations.",
        icon: "ri-book-open-line",
        color: "bg-purple-100 text-purple-600"
      },
      {
        title: "Completeness Meter",
        description: "Real-time progress indicator showing how complete your tax return is and what information is still needed.",
        icon: "ri-progress-3-line",
        color: "bg-green-100 text-green-600"
      },
      {
        title: "Deduction & Credit Finder",
        description: "Helps identify tax deductions and credits you may be eligible for based on your situation and information provided.",
        icon: "ri-search-eye-line",
        color: "bg-blue-100 text-blue-600"
      },
      {
        title: "MFA Vault",
        description: "Secure multi-factor authentication vault to protect your sensitive tax documents and personal information.",
        icon: "ri-shield-keyhole-line",
        color: "bg-red-100 text-red-600"
      }
    ]
  },
  es: {
    title: "Herramientas de Mejora Avanzadas",
    subtitle: "Características poderosas para optimizar tu experiencia de declaración de impuestos",
    enhancements: [
      {
        title: "Simulador de Escenarios",
        description: "Prueba diferentes escenarios para ver cómo los cambios afectan tu responsabilidad fiscal y cantidad de reembolso.",
        icon: "ri-line-chart-line",
        color: "bg-purple-100 text-purple-600"
      },
      {
        title: "Medidor de Completitud",
        description: "Indicador de progreso en tiempo real que muestra qué tan completa está tu declaración de impuestos y qué falta.",
        icon: "ri-progress-3-line",
        color: "bg-green-100 text-green-600"
      },
      {
        title: "Detector de Beneficios",
        description: "Identifica automáticamente todos los créditos fiscales y deducciones para los que eres elegible.",
        icon: "ri-search-eye-line",
        color: "bg-blue-100 text-blue-600"
      },
      {
        title: "Bóveda MFA",
        description: "Bóveda de autenticación multifactor segura para proteger tus documentos fiscales sensibles.",
        icon: "ri-shield-keyhole-line",
        color: "bg-red-100 text-red-600"
      }
    ]
  },
  fr: {
    title: "Outils d'Amélioration Avancés",
    subtitle: "Fonctionnalités puissantes pour optimiser votre expérience de déclaration fiscale",
    enhancements: [
      {
        title: "Simulateur de Scénarios",
        description: "Testez différents scénarios pour voir comment les changements affectent votre obligation fiscale et le montant du remboursement.",
        icon: "ri-line-chart-line",
        color: "bg-purple-100 text-purple-600"
      },
      {
        title: "Indicateur de Complétude",
        description: "Indicateur de progression en temps réel montrant à quel point votre déclaration fiscale est complète et ce qui manque.",
        icon: "ri-progress-3-line",
        color: "bg-green-100 text-green-600"
      },
      {
        title: "Détecteur d'Avantages",
        description: "Identifie automatiquement tous les crédits d'impôt et déductions auxquels vous êtes éligible.",
        icon: "ri-search-eye-line",
        color: "bg-blue-100 text-blue-600"
      },
      {
        title: "Coffre-fort MFA",
        description: "Coffre-fort d'authentification multifacteur sécurisé pour protéger vos documents fiscaux sensibles.",
        icon: "ri-shield-keyhole-line",
        color: "bg-red-100 text-red-600"
      }
    ]
  },
  ar: {
    title: "أدوات التحسين المتقدمة",
    subtitle: "ميزات قوية لتحسين تجربة تقديم الضرائب الخاصة بك",
    enhancements: [
      {
        title: "محاكي السيناريوهات",
        description: "اختبر سيناريوهات مختلفة لترى كيف تؤثر التغييرات على التزامك الضريبي ومبلغ الاسترداد.",
        icon: "ri-line-chart-line",
        color: "bg-purple-100 text-purple-600"
      },
      {
        title: "مقياس الاكتمال",
        description: "مؤشر تقدم في الوقت الفعلي يظهر مدى اكتمال إقرارك الضريبي وما هو مفقود.",
        icon: "ri-progress-3-line",
        color: "bg-green-100 text-green-600"
      },
      {
        title: "كاشف المزايا",
        description: "يحدد تلقائياً جميع الائتمانات الضريبية والخصومات التي أنت مؤهل لها.",
        icon: "ri-search-eye-line",
        color: "bg-blue-100 text-blue-600"
      },
      {
        title: "خزنة MFA",
        description: "خزنة مصادقة متعددة العوامل آمنة لحماية مستنداتك الضريبية الحساسة.",
        icon: "ri-shield-keyhole-line",
        color: "bg-red-100 text-red-600"
      }
    ]
  },
  ru: {
    title: "Продвинутые Инструменты Улучшения",
    subtitle: "Мощные функции для оптимизации вашего опыта подачи налогов",
    enhancements: [
      {
        title: "Симулятор Сценариев",
        description: "Тестируйте различные сценарии, чтобы увидеть, как изменения влияют на ваши налоговые обязательства и сумму возврата.",
        icon: "ri-line-chart-line",
        color: "bg-purple-100 text-purple-600"
      },
      {
        title: "Индикатор Полноты",
        description: "Индикатор прогресса в реальном времени, показывающий, насколько полна ваша налоговая декларация и что отсутствует.",
        icon: "ri-progress-3-line",
        color: "bg-green-100 text-green-600"
      },
      {
        title: "Детектор Льгот",
        description: "Автоматически определяет все налоговые кредиты и вычеты, на которые вы имеете право.",
        icon: "ri-search-eye-line",
        color: "bg-blue-100 text-blue-600"
      },
      {
        title: "Хранилище MFA",
        description: "Безопасное хранилище многофакторной аутентификации для защиты ваших конфиденциальных налоговых документов.",
        icon: "ri-shield-keyhole-line",
        color: "bg-red-100 text-red-600"
      }
    ]
  },
  zh: {
    title: "高级增强工具",
    subtitle: "强大的功能来优化您的税务申报体验",
    enhancements: [
      {
        title: "假设情景模拟器",
        description: "测试不同情景，看看变化如何影响您的税务责任和退税金额。",
        icon: "ri-line-chart-line",
        color: "bg-purple-100 text-purple-600"
      },
      {
        title: "完整度计量器",
        description: "实时进度指示器，显示您的税务申报完成程度以及缺少什么。",
        icon: "ri-progress-3-line",
        color: "bg-green-100 text-green-600"
      },
      {
        title: "福利筛选器",
        description: "自动识别您有资格获得的所有税收抵免和扣除。",
        icon: "ri-search-eye-line",
        color: "bg-blue-100 text-blue-600"
      },
      {
        title: "MFA保险库",
        description: "安全的多因素认证保险库，保护您的敏感税务文档。",
        icon: "ri-shield-keyhole-line",
        color: "bg-red-100 text-red-600"
      }
    ]
  },
  hi: {
    title: "उन्नत संवर्धन उपकरण",
    subtitle: "आपके कर फाइलिंग अनुभव को अनुकूलित करने के लिए शक्तिशाली सुविधाएं",
    enhancements: [
      {
        title: "क्या-अगर सिमुलेटर",
        description: "विभिन्न परिदृश्यों का परीक्षण करें यह देखने के लिए कि परिवर्तन आपकी कर देयता और वापसी राशि को कैसे प्रभावित करते हैं।",
        icon: "ri-line-chart-line",
        color: "bg-purple-100 text-purple-600"
      },
      {
        title: "पूर्णता मीटर",
        description: "रियल-टाइम प्रगति संकेतक जो दिखाता है कि आपका कर रिटर्न कितना पूरा है और क्या गुम है।",
        icon: "ri-progress-3-line",
        color: "bg-green-100 text-green-600"
      },
      {
        title: "लाभ स्क्रीनर",
        description: "स्वचालित रूप से सभी कर क्रेडिट और कटौती की पहचान करता है जिसके लिए आप पात्र हैं।",
        icon: "ri-search-eye-line",
        color: "bg-blue-100 text-blue-600"
      },
      {
        title: "MFA वॉल्ट",
        description: "आपके संवेदनशील कर दस्तावेजों की सुरक्षा के लिए सुरक्षित मल्टी-फैक्टर प्रमाणीकरण वॉल्ट।",
        icon: "ri-shield-keyhole-line",
        color: "bg-red-100 text-red-600"
      }
    ]
  }
};

export default function EnhancementsSection({ currentLanguage }: EnhancementsSectionProps) {
  const t = translations[currentLanguage as keyof typeof translations] || translations.en;

  return (
    <section className="py-20 bg-white">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="text-center mb-16">
          <h2 className="text-4xl font-bold text-gray-900 mb-4">{t.title}</h2>
          <p className="text-xl text-gray-600 max-w-3xl mx-auto">{t.subtitle}</p>
        </div>

        <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-8">
          {t.enhancements.map((enhancement, index) => (
            <div key={index} className="group">
              <div className="bg-white rounded-xl shadow-lg p-6 hover:shadow-xl transition-all duration-300 transform hover:-translate-y-2 border border-gray-100 h-full">
                <div className={`w-16 h-16 ${enhancement.color} rounded-full flex items-center justify-center mb-6 mx-auto group-hover:scale-110 transition-transform duration-300`}>
                  <i className={`${enhancement.icon} text-2xl`}></i>
                </div>
                <h3 className="text-lg font-semibold text-gray-900 mb-3 text-center">{enhancement.title}</h3>
                <p className="text-gray-600 text-center text-sm leading-relaxed">{enhancement.description}</p>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}