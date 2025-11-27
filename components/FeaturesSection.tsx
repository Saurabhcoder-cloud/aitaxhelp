'use client';

interface FeaturesSectionProps {
  currentLanguage: string;
}

const translations = {
  en: {
    title: "Key Features",
    subtitle: "Advanced AI technology to simplify your tax filing experience",
    features: [
      {
        title: "OCR & Document Classifier",
        description: "Advanced optical character recognition automatically extracts and classifies data from your tax documents with 99.9% accuracy.",
        icon: "ri-scan-line"
      },
      {
        title: "Multilingual Adaptive Q&A",
        description: "Smart questionnaire system that adapts to your situation and asks relevant questions in your preferred language.",
        icon: "ri-question-answer-line"
      },
      {
        title: "Tax Law Guidance",
        description: "Comprehensive guidance on federal and state tax laws, helping you understand deductions, credits, and filing requirements based on your state.",
        icon: "ri-calculator-line"
      },
      {
        title: "Draft Return Builder",
        description: "Automatically generates complete tax return drafts based on your information, ready for review and submission.",
        icon: "ri-file-text-line"
      },
      {
        title: "Compliance & Privacy",
        description: "Bank-level security with end-to-end encryption ensures your sensitive tax information remains completely secure.",
        icon: "ri-shield-check-line"
      },
      {
        title: "State & Federal Filing Addresses",
        description: "Provides accurate mailing addresses for both your state tax office and IRS based on your location for paper filing.",
        icon: "ri-mail-send-line"
      }
    ]
  },
  es: {
    title: "Características Clave",
    subtitle: "Tecnología de IA avanzada para simplificar tu experiencia de declaración de impuestos",
    features: [
      {
        title: "OCR y Clasificador de Documentos",
        description: "Reconocimiento óptico de caracteres avanzado extrae y clasifica automáticamente datos de tus documentos fiscales con 99.9% de precisión.",
        icon: "ri-scan-line"
      },
      {
        title: "Q&A Multilingüe Adaptativo",
        description: "Sistema de cuestionario inteligente que se adapta a tu situación y hace preguntas relevantes en tu idioma preferido.",
        icon: "ri-question-answer-line"
      },
      {
        title: "Motor de Impuestos y Beneficios",
        description: "Motor integral de cálculo de impuestos que identifica todas las deducciones y créditos elegibles para maximizar tu reembolso.",
        icon: "ri-calculator-line"
      },
      {
        title: "Constructor de Borrador de Declaración",
        description: "Genera automáticamente borradores completos de declaración de impuestos basados en tu información, listos para revisión y envío.",
        icon: "ri-file-text-line"
      },
      {
        title: "Cumplimiento y Privacidad",
        description: "Seguridad de nivel bancario con cifrado de extremo a extremo asegura que tu información fiscal sensible permanezca completamente segura.",
        icon: "ri-shield-check-line"
      },
      {
        title: "Cobertura Global",
        description: "Soporte para declaración de impuestos en múltiples países con reglas y regulaciones fiscales localizadas para cumplimiento preciso.",
        icon: "ri-global-line"
      }
    ]
  },
  fr: {
    title: "Fonctionnalités Clés",
    subtitle: "Technologie IA avancée pour simplifier votre expérience de déclaration fiscale",
    features: [
      {
        title: "OCR et Classificateur de Documents",
        description: "Reconnaissance optique de caractères avancée extrait et classifie automatiquement les données de vos documents fiscaux avec 99,9% de précision.",
        icon: "ri-scan-line"
      },
      {
        title: "Q&R Multilingue Adaptatif",
        description: "Système de questionnaire intelligent qui s'adapte à votre situation et pose des questions pertinentes dans votre langue préférée.",
        icon: "ri-question-answer-line"
      },
      {
        title: "Moteur Fiscal et Avantages",
        description: "Moteur de calcul fiscal complet qui identifie toutes les déductions et crédits éligibles pour maximiser votre remboursement.",
        icon: "ri-calculator-line"
      },
      {
        title: "Constructeur de Brouillon de Déclaration",
        description: "Génère automatiquement des brouillons complets de déclaration fiscale basés sur vos informations, prêts pour révision et soumission.",
        icon: "ri-file-text-line"
      },
      {
        title: "Conformité et Confidentialité",
        description: "Sécurité de niveau bancaire avec chiffrement de bout en bout assure que vos informations fiscales sensibles restent complètement sécurisées.",
        icon: "ri-shield-check-line"
      },
      {
        title: "Couverture Mondiale",
        description: "Support pour la déclaration fiscale dans plusieurs pays avec des règles et réglementations fiscales localisées pour une conformité précise.",
        icon: "ri-global-line"
      }
    ]
  },
  ar: {
    title: "الميزات الرئيسية",
    subtitle: "تقنية الذكاء الاصطناعي المتقدمة لتبسيط تجربة تقديم الضرائب الخاصة بك",
    features: [
      {
        title: "OCR ومصنف المستندات",
        description: "التعرف البصري المتقدم على الأحرف يستخرج ويصنف تلقائياً البيانات من مستنداتك الضريبية بدقة 99.9%.",
        icon: "ri-scan-line"
      },
      {
        title: "أسئلة وأجوبة متعددة اللغات تكيفية",
        description: "نظام استبيان ذكي يتكيف مع وضعك ويطرح أسئلة ذات صلة بلغتك المفضلة.",
        icon: "ri-question-answer-line"
      },
      {
        title: "محرك الضرائب والمزايا",
        description: "محرك حساب ضرائب شامل يحدد جميع الخصومات والائتمانات المؤهلة لتعظيم استردادك.",
        icon: "ri-calculator-line"
      },
      {
        title: "منشئ مسودة الإقرار",
        description: "ينشئ تلقائياً مسودات إقرار ضريبي كاملة بناءً على معلوماتك، جاهزة للمراجعة والتقديم.",
        icon: "ri-file-text-line"
      },
      {
        title: "الامتثال والخصوصية",
        description: "أمان مستوى مصرفي مع تشفير من طرف إلى طرف يضمن بقاء معلوماتك الضريبية الحساسة آمنة تماماً.",
        icon: "ri-shield-check-line"
      },
      {
        title: "التغطية العالمية",
        description: "دعم لتقديم الضرائب في بلدان متعددة مع قواعد ولوائح ضريبية محلية للامتثال الدقيق.",
        icon: "ri-global-line"
      }
    ]
  },
  ru: {
    title: "Ключевые Особенности",
    subtitle: "Передовая технология ИИ для упрощения вашего опыта подачи налогов",
    features: [
      {
        title: "OCR и Классификатор Документов",
        description: "Продвинутое оптическое распознавание символов автоматически извлекает и классифицирует данные из ваших налоговых документов с точностью 99,9%.",
        icon: "ri-scan-line"
      },
      {
        title: "Многоязычные Адаптивные Вопросы-Ответы",
        description: "Умная система опросов, которая адаптируется к вашей ситуации и задает релевантные вопросы на вашем предпочитаемом языке.",
        icon: "ri-question-answer-line"
      },
      {
        title: "Налоговый Движок и Льготы",
        description: "Комплексный движок расчета налогов, который определяет все доступные вычеты и кредиты для максимизации вашего возврата.",
        icon: "ri-calculator-line"
      },
      {
        title: "Конструктор Черновика Декларации",
        description: "Автоматически генерирует полные черновики налоговых деклараций на основе вашей информации, готовые для проверки и подачи.",
        icon: "ri-file-text-line"
      },
      {
        title: "Соответствие и Конфиденциальность",
        description: "Безопасность банковского уровня с сквозным шифрованием обеспечивает полную безопасность вашей конфиденциальной налоговой информации.",
        icon: "ri-shield-check-line"
      },
      {
        title: "Глобальное Покрытие",
        description: "Поддержка подачи налогов в нескольких странах с локализованными налоговыми правилами и регулированиями для точного соответствия.",
        icon: "ri-global-line"
      }
    ]
  },
  zh: {
    title: "关键特性",
    subtitle: "先进的AI技术简化您的税务申报体验",
    features: [
      {
        title: "OCR和文档分类器",
        description: "先进的光学字符识别自动从您的税务文档中提取和分类数据，准确率达99.9%。",
        icon: "ri-scan-line"
      },
      {
        title: "多语言自适应问答",
        description: "智能问卷系统，适应您的情况并用您的首选语言提出相关问题。",
        icon: "ri-question-answer-line"
      },
      {
        title: "税务和福利引擎",
        description: "全面的税务计算引擎，识别所有符合条件的扣除和抵免，以最大化您的退税。",
        icon: "ri-calculator-line"
      },
      {
        title: "申报草稿构建器",
        description: "根据您的信息自动生成完整的税务申报草稿，准备好供审查和提交。",
        icon: "ri-file-text-line"
      },
      {
        title: "合规性和隐私",
        description: "银行级安全性，端到端加密确保您的敏感税务信息保持完全安全。",
        icon: "ri-shield-check-line"
      },
      {
        title: "全球覆盖",
        description: "支持多个国家的税务申报，具有本地化的税务规则和法规，确保准确合规。",
        icon: "ri-global-line"
      }
    ]
  },
  hi: {
    title: "मुख्य विशेषताएं",
    subtitle: "आपके कर फाइलिंग अनुभव को सरल बनाने के लिए उन्नत AI तकनीक",
    features: [
      {
        title: "OCR और दस्तावेज़ वर्गीकारक",
        description: "उन्नत ऑप्टिकल कैरेक्टर रिकग्निशन आपके कर दस्तावेज़ों से 99.9% सटीकता के साथ स्वचालित रूप से डेटा निकालता और वर्गीकृत करता है।",
        icon: "ri-scan-line"
      },
      {
        title: "बहुभाषी अनुकूली प्रश्नोत्तर",
        description: "स्मार्ट प्रश्नावली प्रणाली जो आपकी स्थिति के अनुकूल होती है और आपकी पसंदीदा भाषा में प्रासंगिक प्रश्न पूछती है।",
        icon: "ri-question-answer-line"
      },
      {
        title: "कर और लाभ इंजन",
        description: "व्यापक कर गणना इंजन जो आपकी वापसी को अधिकतम करने के लिए सभी योग्य कटौती और क्रेडिट की पहचान करता है।",
        icon: "ri-calculator-line"
      },
      {
        title: "ड्राफ्ट रिटर्न बिल्डर",
        description: "आपकी जानकारी के आधार पर स्वचालित रूप से पूर्ण कर रिटर्न ड्राफ्ट तैयार करता है, समीक्षा और सबमिशन के लिए तैयार।",
        icon: "ri-file-text-line"
      },
      {
        title: "अनुपालन और गोपनीयता",
        description: "एंड-टू-एंड एन्क्रिप्शन के साथ बैंक-स्तरीय सुरक्षा सुनिश्चित करती है कि आपकी संवेदनशील कर जानकारी पूरी तरह सुरक्षित रहे।",
        icon: "ri-shield-check-line"
      },
      {
        title: "वैश्विक कवरेज",
        description: "सटीक अनुपालन के लिए स्थानीयकृत कर नियमों और विनियमों के साथ कई देशों में कर फाइलिंग के लिए समर्थन।",
        icon: "ri-global-line"
      }
    ]
  }
};

export default function FeaturesSection({ currentLanguage }: FeaturesSectionProps) {
  const t = translations[currentLanguage as keyof typeof translations] || translations.en;

  return (
    <section className="py-20 bg-gradient-to-br from-blue-50 to-white">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="text-center mb-16">
          <h2 className="text-4xl font-bold text-gray-900 mb-4">{t.title}</h2>
          <p className="text-xl text-gray-600 max-w-3xl mx-auto">{t.subtitle}</p>
        </div>

        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-8">
          {t.features.map((feature, index) => (
            <div key={index} className="bg-white rounded-xl shadow-lg p-8 hover:shadow-xl transition-all duration-300 transform hover:-translate-y-2 border border-gray-100">
              <div className="w-16 h-16 bg-blue-100 rounded-full flex items-center justify-center mb-6 mx-auto">
                <i className={`${feature.icon} text-2xl text-blue-600`}></i>
              </div>
              <h3 className="text-xl font-semibold text-gray-900 mb-4 text-center">{feature.title}</h3>
              <p className="text-gray-600 text-center leading-relaxed">{feature.description}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}