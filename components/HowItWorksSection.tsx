'use client';

interface HowItWorksSectionProps {
  currentLanguage: string;
}

const translations = {
  en: {
    title: "How It Works — File Your Taxes in 3 Simple Steps",
    subtitle: "File your taxes with guided AI support in minutes.",
    steps: [
      {
        title: "1. Upload Documents",
        description: "Upload your W-2, 1099s, receipts, or statements using our encrypted platform.",
        icon: "ri-upload-cloud-2-line"
      },
      {
        title: "2. AI Processing",
        description: "Our AI reads your documents, validates information, applies deductions, and calculates your tax return automatically.",
        icon: "ri-robot-line"
      },
      {
        title: "3. Review & File",
        description: "Preview your completed tax return, make adjustments if needed, and file with federal and state authorities.",
        icon: "ri-file-check-line"
      }
    ],
    ctaLabel: "Start Filing Now"
  },
  es: {
    title: "Cómo Funciona",
    subtitle: "Presenta tus impuestos con ayuda de IA en minutos.",
    steps: [
      {
        title: "1. Subir Documentos",
        description: "Sube tu W-2, 1099s, recibos o estados de cuenta usando nuestra plataforma encriptada.",
        icon: "ri-upload-cloud-2-line"
      },
      {
        title: "2. Procesamiento IA",
        description: "Nuestra IA lee tus documentos, valida la información, aplica deducciones y calcula tu declaración automáticamente.",
        icon: "ri-robot-line"
      },
      {
        title: "3. Revisar y Presentar",
        description: "Previsualiza tu declaración de impuestos, haz ajustes si es necesario y presenta a las autoridades federales y estatales.",
        icon: "ri-file-check-line"
      }
    ],
    ctaLabel: "Comenzar a Declarar"
  },
  fr: {
    title: "Comment Ça Marche",
    subtitle: "Déclarez vos impôts avec l'aide de l'IA en quelques minutes.",
    steps: [
      {
        title: "1. Télécharger les Documents",
        description: "Téléchargez vos W-2, 1099, reçus ou relevés sur notre plateforme chiffrée.",
        icon: "ri-upload-cloud-2-line"
      },
      {
        title: "2. Traitement par l'IA",
        description: "Notre IA lit vos documents, valide les informations, applique les déductions et calcule automatiquement votre déclaration fiscale.",
        icon: "ri-robot-line"
      },
      {
        title: "3. Vérifier et Déposer",
        description: "Prévisualisez votre déclaration, apportez des ajustements si besoin et déposez auprès des autorités fédérales et étatiques.",
        icon: "ri-file-check-line"
      }
    ],
    ctaLabel: "Commencer la déclaration"
  },
  ar: {
    title: "كيف يعمل",
    subtitle: "قدّم ضرائبك بدعم من الذكاء الاصطناعي في دقائق.",
    steps: [
      {
        title: "1. رفع المستندات",
        description: "ارفع نموذج W-2 أو 1099 أو الإيصالات أو الكشوف باستخدام منصتنا المشفرة.",
        icon: "ri-upload-cloud-2-line"
      },
      {
        title: "2. معالجة الذكاء الاصطناعي",
        description: "يقرأ الذكاء الاصطناعي المستندات، يتحقق من المعلومات، يطبق الخصومات ويحسب إقرارك الضريبي تلقائياً.",
        icon: "ri-robot-line"
      },
      {
        title: "3. المراجعة والتقديم",
        description: "عاين إقرارك الضريبي المكتمل، أجرِ التعديلات عند الحاجة، وقدّم إلى السلطات الفيدرالية والولائية.",
        icon: "ri-file-check-line"
      }
    ],
    ctaLabel: "ابدأ التقديم الآن"
  },
  ru: {
    title: "Как Это Работает",
    subtitle: "Подавайте налоги с помощью ИИ за считанные минуты.",
    steps: [
      {
        title: "1. Загрузите документы",
        description: "Загрузите W-2, 1099, квитанции или выписки на нашей зашифрованной платформе.",
        icon: "ri-upload-cloud-2-line"
      },
      {
        title: "2. Обработка ИИ",
        description: "ИИ считывает документы, проверяет данные, применяет вычеты и автоматически рассчитывает налоговую декларацию.",
        icon: "ri-robot-line"
      },
      {
        title: "3. Проверка и подача",
        description: "Просмотрите готовую декларацию, внесите правки при необходимости и подайте в федеральные и региональные органы.",
        icon: "ri-file-check-line"
      }
    ],
    ctaLabel: "Начать подачу сейчас"
  },
  zh: {
    title: "工作原理",
    subtitle: "在几分钟内完成 AI 引导的报税。",
    steps: [
      {
        title: "1. 上传文档",
        description: "在我们的加密平台上传您的 W-2、1099、收据或对账单。",
        icon: "ri-upload-cloud-2-line"
      },
      {
        title: "2. AI 处理",
        description: "我们的 AI 读取文档，验证信息，应用扣除并自动计算您的报税表。",
        icon: "ri-robot-line"
      },
      {
        title: "3. 审核和申报",
        description: "预览完成的报税表，按需调整，并提交给联邦和州税务机构。",
        icon: "ri-file-check-line"
      }
    ],
    ctaLabel: "立即开始报税"
  },
  hi: {
    title: "यह कैसे काम करता है",
    subtitle: "कुछ ही मिनटों में AI सहायता के साथ टैक्स भरें।",
    steps: [
      {
        title: "1. दस्तावेज़ अपलोड करें",
        description: "हमारे एन्क्रिप्टेड प्लेटफ़ॉर्म पर अपना W-2, 1099s, रसीदें या स्टेटमेंट अपलोड करें।",
        icon: "ri-upload-cloud-2-line"
      },
      {
        title: "2. AI प्रोसेसिंग",
        description: "हमारा AI आपके दस्तावेज़ पढ़ता है, जानकारी को सत्यापित करता है, कटौतियाँ लागू करता है और स्वतः कर रिटर्न गणना करता है।",
        icon: "ri-robot-line"
      },
      {
        title: "3. समीक्षा और फाइल करें",
        description: "अपना तैयार कर रिटर्न देखें, ज़रूरत हो तो बदलाव करें, और संघीय व राज्य अधिकारियों के साथ फाइल करें।",
        icon: "ri-file-check-line"
      }
    ],
    ctaLabel: "अभी फाइलिंग शुरू करें"
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

        <div className="mt-12 text-center">
          <button className="px-8 py-3 bg-blue-600 text-white font-semibold rounded-full shadow hover:bg-blue-700 transition">
            {t.ctaLabel}
          </button>
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