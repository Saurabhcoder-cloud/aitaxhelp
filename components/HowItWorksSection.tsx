'use client';

interface HowItWorksSectionProps {
  currentLanguage: string;
}

const translations = {
  en: {
    title: "How It Works",
    subtitle: "Get your taxes done in 3 simple steps",
    steps: [
      {
        title: "Upload Documents",
        description: "Securely upload your tax documents (W-2, 1099, receipts) using our encrypted platform.",
        icon: "ri-upload-cloud-2-line"
      },
      {
        title: "AI Processing",
        description: "Our advanced AI extracts data, validates information, and calculates your taxes automatically.",
        icon: "ri-robot-line"
      },
      {
        title: "Review & File",
        description: "Review your completed tax return, make any adjustments, and file directly with tax authorities.",
        icon: "ri-file-check-line"
      }
    ]
  },
  es: {
    title: "Cómo Funciona",
    subtitle: "Completa tus impuestos en 3 simples pasos",
    steps: [
      {
        title: "Subir Documentos",
        description: "Sube de forma segura tus documentos fiscales (W-2, 1099, recibos) usando nuestra plataforma encriptada.",
        icon: "ri-upload-cloud-2-line"
      },
      {
        title: "Procesamiento IA",
        description: "Nuestra IA avanzada extrae datos, valida información y calcula tus impuestos automáticamente.",
        icon: "ri-robot-line"
      },
      {
        title: "Revisar y Presentar",
        description: "Revisa tu declaración de impuestos completada, haz ajustes y presenta directamente a las autoridades fiscales.",
        icon: "ri-file-check-line"
      }
    ]
  },
  fr: {
    title: "Comment Ça Marche",
    subtitle: "Faites vos impôts en 3 étapes simples",
    steps: [
      {
        title: "Télécharger Documents",
        description: "Téléchargez en toute sécurité vos documents fiscaux (W-2, 1099, reçus) en utilisant notre plateforme cryptée.",
        icon: "ri-upload-cloud-2-line"
      },
      {
        title: "Traitement IA",
        description: "Notre IA avancée extrait les données, valide les informations et calcule vos impôts automatiquement.",
        icon: "ri-robot-line"
      },
      {
        title: "Réviser et Déposer",
        description: "Révisez votre déclaration fiscale complétée, apportez des ajustements et déposez directement auprès des autorités fiscales.",
        icon: "ri-file-check-line"
      }
    ]
  },
  ar: {
    title: "كيف يعمل",
    subtitle: "أنجز ضرائبك في 3 خطوات بسيطة",
    steps: [
      {
        title: "رفع المستندات",
        description: "ارفع مستنداتك الضريبية بأمان (W-2، 1099، الإيصالات) باستخدام منصتنا المشفرة.",
        icon: "ri-upload-cloud-2-line"
      },
      {
        title: "معالجة الذكاء الاصطناعي",
        description: "يستخرج الذكاء الاصطناعي المتقدم لدينا البيانات ويتحقق من المعلومات ويحسب ضرائبك تلقائياً.",
        icon: "ri-robot-line"
      },
      {
        title: "مراجعة وتقديم",
        description: "راجع إقرارك الضريبي المكتمل، قم بأي تعديلات، وقدم مباشرة إلى السلطات الضريبية.",
        icon: "ri-file-check-line"
      }
    ]
  },
  ru: {
    title: "Как Это Работает",
    subtitle: "Сделайте свои налоги за 3 простых шага",
    steps: [
      {
        title: "Загрузить Документы",
        description: "Безопасно загрузите ваши налоговые документы (W-2, 1099, чеки) используя нашу зашифрованную платформу.",
        icon: "ri-upload-cloud-2-line"
      },
      {
        title: "Обработка ИИ",
        description: "Наш продвинутый ИИ извлекает данные, проверяет информацию и рассчитывает ваши налоги автоматически.",
        icon: "ri-robot-line"
      },
      {
        title: "Проверить и Подать",
        description: "Проверьте вашу завершенную налоговую декларацию, внесите корректировки и подайте напрямую в налоговые органы.",
        icon: "ri-file-check-line"
      }
    ]
  },
  zh: {
    title: "工作原理",
    subtitle: "通过3个简单步骤完成您的税务",
    steps: [
      {
        title: "上传文档",
        description: "使用我们的加密平台安全上传您的税务文档（W-2、1099、收据）。",
        icon: "ri-upload-cloud-2-line"
      },
      {
        title: "AI处理",
        description: "我们先进的AI提取数据、验证信息并自动计算您的税款。",
        icon: "ri-robot-line"
      },
      {
        title: "审查和申报",
        description: "审查您完成的税务申报，进行任何调整，并直接向税务机关申报。",
        icon: "ri-file-check-line"
      }
    ]
  },
  hi: {
    title: "यह कैसे काम करता है",
    subtitle: "3 सरल चरणों में अपने कर पूरे करें",
    steps: [
      {
        title: "दस्तावेज़ अपलोड करें",
        description: "हमारे एन्क्रिप्टेड प्लेटफॉर्म का उपयोग करके अपने कर दस्तावेज़ (W-2, 1099, रसीदें) सुरक्षित रूप से अपलोड करें।",
        icon: "ri-upload-cloud-2-line"
      },
      {
        title: "AI प्रसंस्करण",
        description: "हमारी उन्नत AI डेटा निकालती है, जानकारी को सत्यापित करती है, और आपके करों की स्वचालित रूप से गणना करती है।",
        icon: "ri-robot-line"
      },
      {
        title: "समीक्षा और फाइल करें",
        description: "अपने पूर्ण कर रिटर्न की समीक्षा करें, कोई भी समायोजन करें, और सीधे कर अधिकारियों के साथ फाइल करें।",
        icon: "ri-file-check-line"
      }
    ]
  }
};

export default function HowItWorksSection({ currentLanguage }: HowItWorksSectionProps) {
  const t = translations[currentLanguage as keyof typeof translations] || translations.en;

  return (
    <section className="py-20 bg-white">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="text-center mb-16">
          <h2 className="text-4xl font-bold text-gray-900 mb-4">{t.title}</h2>
          <p className="text-xl text-gray-600 max-w-3xl mx-auto">{t.subtitle}</p>
        </div>

        <div className="relative">
          <div className="absolute top-1/2 left-0 right-0 h-1 bg-gradient-to-r from-blue-200 via-blue-400 to-blue-600 transform -translate-y-1/2 hidden lg:block"></div>
          
          <div className="grid lg:grid-cols-3 gap-8 relative z-10">
            {t.steps.map((step, index) => (
              <div key={index} className="text-center">
                <div className="relative mb-8">
                  <div className="w-24 h-24 bg-gradient-to-br from-blue-500 to-blue-600 rounded-full flex items-center justify-center mx-auto shadow-lg transform hover:scale-110 transition-transform duration-300">
                    <i className={`${step.icon} text-3xl text-white`}></i>
                  </div>
                  <div className="absolute -top-2 -right-2 w-8 h-8 bg-white rounded-full flex items-center justify-center shadow-md border-2 border-blue-500">
                    <span className="text-blue-600 font-bold text-sm">{index + 1}</span>
                  </div>
                </div>
                
                <h3 className="text-2xl font-semibold text-gray-900 mb-4">{step.title}</h3>
                <p className="text-gray-600 leading-relaxed max-w-sm mx-auto">{step.description}</p>
              </div>
            ))}
          </div>
        </div>

        <div className="mt-16 text-center">
          <div className="inline-flex items-center space-x-8 bg-blue-50 rounded-full px-8 py-4 border border-blue-200">
            <div className="flex items-center text-blue-800">
              <i className="ri-time-line mr-2"></i>
              <span className="font-medium">Average completion: 15 minutes</span>
            </div>
            <div className="flex items-center text-blue-800">
              <i className="ri-shield-check-line mr-2"></i>
              <span className="font-medium">99.9% accuracy guaranteed</span>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}