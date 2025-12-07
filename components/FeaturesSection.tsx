'use client';

interface FeaturesSectionProps {
  currentLanguage: string;
}

const translations = {
  en: {
    title: "Advanced AI Features Made for Fast and Accurate Filing",
    subtitle: "Advanced AI technology to simplify your tax filing experience",
    features: [
      {
        title: "OCR & Smart Document Classifier",
        description: "Extracts and classifies information from tax documents with 99.9% accuracy.",
        icon: "ri-scan-line"
      },
      {
        title: "Multilingual Adaptive Q&A",
        description: "Our AI adapts to your situation and asks only the relevant questions — in your preferred language.",
        icon: "ri-question-answer-line"
      },
      {
        title: "Tax Law Guidance",
        description: "Real-time explanations of deductions, credits, and IRS/state rules updated daily.",
        icon: "ri-calculator-line"
      },
      {
        title: "Draft Return Builder",
        description: "Instantly generates a complete draft of your tax return based on your uploaded documents.",
        icon: "ri-file-text-line"
      },
      {
        title: "Compliance & Security",
        description: "Bank-level encryption, secure storage, and IRS-aligned privacy requirements.",
        icon: "ri-shield-check-line"
      },
      {
        title: "State & Federal Filing Addresses",
        description: "Automatically provides correct IRS and state mailing addresses for your location.",
        icon: "ri-mail-send-line"
      }
    ]
  },
  es: {
    title: "Advanced AI Features Made for Fast and Accurate Filing",
    subtitle: "Tecnología de IA avanzada para simplificar tu experiencia de declaración de impuestos",
    features: [
      {
        title: "OCR y Clasificador Inteligente de Documentos",
        description: "Extrae y clasifica información de documentos fiscales con 99.9% de precisión.",
        icon: "ri-scan-line"
      },
      {
        title: "Q&A Multilingüe Adaptativo",
        description: "Nuestra IA se adapta a tu situación y hace solo las preguntas relevantes en tu idioma preferido.",
        icon: "ri-question-answer-line"
      },
      {
        title: "Guía de Leyes Fiscales",
        description: "Explicaciones en tiempo real de deducciones, créditos y reglas del IRS/estados actualizadas a diario.",
        icon: "ri-calculator-line"
      },
      {
        title: "Constructor de Borrador de Declaración",
        description: "Genera al instante un borrador completo de tu declaración según tus documentos cargados.",
        icon: "ri-file-text-line"
      },
      {
        title: "Cumplimiento y Seguridad",
        description: "Cifrado de nivel bancario, almacenamiento seguro y requisitos de privacidad alineados al IRS.",
        icon: "ri-shield-check-line"
      },
      {
        title: "Cobertura Global",
        description: "Proporciona automáticamente las direcciones postales correctas del IRS y estatales según tu ubicación.",
        icon: "ri-mail-send-line"
      }
    ]
  },
  fr: {
    title: "Advanced AI Features Made for Fast and Accurate Filing",
    subtitle: "Technologie IA avancée pour simplifier votre expérience de déclaration fiscale",
    features: [
      {
        title: "OCR et Classificateur Intelligent",
        description: "Extrait et classe les informations des documents fiscaux avec 99,9% de précision.",
        icon: "ri-scan-line"
      },
      {
        title: "Q&R Multilingue Adaptatif",
        description: "Notre IA s'adapte à votre situation et ne pose que les questions pertinentes dans votre langue préférée.",
        icon: "ri-question-answer-line"
      },
      {
        title: "Guidance Fiscale",
        description: "Explications en temps réel des déductions, crédits et règles IRS/états mises à jour quotidiennement.",
        icon: "ri-calculator-line"
      },
      {
        title: "Constructeur de Brouillon de Déclaration",
        description: "Génère instantanément un brouillon complet de votre déclaration à partir de vos documents téléversés.",
        icon: "ri-file-text-line"
      },
      {
        title: "Conformité et Sécurité",
        description: "Chiffrement de niveau bancaire, stockage sécurisé et exigences de confidentialité alignées sur l'IRS.",
        icon: "ri-shield-check-line"
      },
      {
        title: "Adresses d'Envoi Fédérales et d'État",
        description: "Fournit automatiquement les bonnes adresses postales IRS et des États selon votre localisation.",
        icon: "ri-mail-send-line"
      }
    ]
  },
  ar: {
    title: "ميزات الذكاء الاصطناعي المتقدمة لإعداد الإقرار بسرعة ودقة",
    subtitle: "تقنية الذكاء الاصطناعي المتقدمة لتبسيط تجربة تقديم الضرائب الخاصة بك",
    features: [
      {
        title: "التعرف الضوئي ومصنف المستندات الذكي",
        description: "يستخرج ويصنف المعلومات من المستندات الضريبية بدقة 99.9%.",
        icon: "ri-scan-line"
      },
      {
        title: "أسئلة وأجوبة متعددة اللغات تكيفية",
        description: "ذكاءنا الاصطناعي يتكيف مع وضعك ويطرح الأسئلة ذات الصلة فقط بلغتك المفضلة.",
        icon: "ri-question-answer-line"
      },
      {
        title: "إرشاد القوانين الضريبية",
        description: "شروح فورية للخصومات والاعتمادات وقواعد IRS/الولايات محدثة يومياً.",
        icon: "ri-calculator-line"
      },
      {
        title: "منشئ مسودة الإقرار",
        description: "ينشئ فوراً مسودة كاملة لإقرارك الضريبي بناءً على المستندات التي حمّلتها.",
        icon: "ri-file-text-line"
      },
      {
        title: "الامتثال والأمان",
        description: "تشفير بمستوى مصرفي، تخزين آمن، ومتطلبات خصوصية متوافقة مع IRS.",
        icon: "ri-shield-check-line"
      },
      {
        title: "عناوين الإرسال الفيدرالية والولائية",
        description: "يوفر تلقائياً عناوين البريد الصحيحة لـ IRS والولايات حسب موقعك.",
        icon: "ri-mail-send-line"
      }
    ]
  },
  ru: {
    title: "Расширенные функции ИИ для быстрой и точной подачи",
    subtitle: "Передовая технология ИИ для упрощения вашего опыта подачи налогов",
    features: [
      {
        title: "OCR и Умный Классификатор Документов",
        description: "Извлекает и классифицирует информацию из налоговых документов с точностью 99,9%.",
        icon: "ri-scan-line"
      },
      {
        title: "Многоязычные Адаптивные Вопросы-Ответы",
        description: "Наш ИИ адаптируется к вашей ситуации и задает только релевантные вопросы на предпочитаемом языке.",
        icon: "ri-question-answer-line"
      },
      {
        title: "Налоговые Разъяснения",
        description: "Разъяснения в реальном времени по вычетам, кредитам и правилам IRS/штатов с ежедневными обновлениями.",
        icon: "ri-calculator-line"
      },
      {
        title: "Конструктор Черновика Декларации",
        description: "Мгновенно генерирует полный черновик налоговой декларации на основе загруженных документов.",
        icon: "ri-file-text-line"
      },
      {
        title: "Соответствие и Безопасность",
        description: "Шифрование банковского уровня, безопасное хранение и требования конфиденциальности, согласованные с IRS.",
        icon: "ri-shield-check-line"
      },
      {
        title: "Почтовые адреса для IRS и штатов",
        description: "Автоматически предоставляет корректные почтовые адреса IRS и штатов в зависимости от вашего местоположения.",
        icon: "ri-mail-send-line"
      }
    ]
  },
  zh: {
    title: "高速精准报税的先进AI功能",
    subtitle: "先进的AI技术简化您的税务申报体验",
    features: [
      {
        title: "OCR和智能文档分类器",
        description: "以99.9%的准确率提取并分类税务文档信息。",
        icon: "ri-scan-line"
      },
      {
        title: "多语言自适应问答",
        description: "AI适应您的情况，只用您偏好的语言提出相关问题。",
        icon: "ri-question-answer-line"
      },
      {
        title: "税法指南",
        description: "实时解释扣除、抵免以及IRS/各州规则，每日更新。",
        icon: "ri-calculator-line"
      },
      {
        title: "申报草稿构建器",
        description: "基于上传的文件即时生成完整的报税草稿。",
        icon: "ri-file-text-line"
      },
      {
        title: "合规与安全",
        description: "银行级加密、可靠存储以及符合IRS要求的隐私保护。",
        icon: "ri-shield-check-line"
      },
      {
        title: "联邦和州邮寄地址",
        description: "根据您的位置自动提供正确的IRS和州邮寄地址。",
        icon: "ri-mail-send-line"
      }
    ]
  },
  hi: {
    title: "तेज़ और सटीक फाइलिंग के लिए उन्नत AI फीचर्स",
    subtitle: "आपके कर फाइलिंग अनुभव को सरल बनाने के लिए उन्नत AI तकनीक",
    features: [
      {
        title: "OCR और स्मार्ट दस्तावेज़ वर्गीकारक",
        description: "कर दस्तावेज़ों से 99.9% सटीकता के साथ जानकारी निकालता और वर्गीकृत करता है।",
        icon: "ri-scan-line"
      },
      {
        title: "बहुभाषी अनुकूली प्रश्नोत्तर",
        description: "हमारा AI आपकी स्थिति के अनुसार केवल प्रासंगिक प्रश्न आपकी पसंदीदा भाषा में पूछता है।",
        icon: "ri-question-answer-line"
      },
      {
        title: "कर कानून मार्गदर्शन",
        description: "कटौती, क्रेडिट और IRS/राज्य नियमों के वास्तविक समय स्पष्टीकरण, दैनिक अद्यतन।",
        icon: "ri-calculator-line"
      },
      {
        title: "ड्राफ्ट रिटर्न बिल्डर",
        description: "अपलोड किए गए दस्तावेज़ों के आधार पर तुरंत पूर्ण कर रिटर्न ड्राफ्ट तैयार करता है।",
        icon: "ri-file-text-line"
      },
      {
        title: "अनुपालन और सुरक्षा",
        description: "बैंक-स्तरीय एन्क्रिप्शन, सुरक्षित संग्रहण और IRS-संरेखित गोपनीयता आवश्यकताएँ।",
        icon: "ri-shield-check-line"
      },
      {
        title: "राज्य और संघीय फाइलिंग पते",
        description: "आपके स्थान के अनुसार स्वचालित रूप से सही IRS और राज्य मेलिंग पते प्रदान करता है।",
        icon: "ri-mail-send-line"
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