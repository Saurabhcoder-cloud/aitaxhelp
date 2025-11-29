'use client';

import Link from 'next/link';

interface PricingSectionProps {
  currentLanguage: string;
}

const translations = {
  en: {
    title: "Simple One-Time Pricing",
    subtitle: "Pay only when you need our services - no subscriptions or hidden fees",
    getStarted: "Get Started",
    oneTimePayment: "One-Time Payment",
    perFiling: "Per Filing",
    bottomNote: "You only pay when filing your tax return — no monthly or annual charges.",
    paymentMethods: "We accept",
    plans: [
      {
        name: "Registration Fee",
        price: 9.99,
        priceLabel: "One-Time Registration Fee",
        description: "This is a one-time registration fee that gives the client lifetime access to the website and its features. After paying this fee once, the client can use the website every year to prepare their tax return without any renewal or subscription charges.",
        icon: "ri-user-add-line",
        popular: false
      },
      {
        name: "Individual Tax Return",
        price: 19.99,
        priceLabel: "Individual Tax Return",
        description: "Fee for preparing a tax return for a single individual (one client filing only for themselves). The client pays this fee only once per year, when they prepare their tax return. There are no monthly or annual subscription payments.",
        icon: "ri-user-line",
        popular: true
      },
      {
        name: "Family Tax Return",
        price: 24.99,
        priceLabel: "Family Tax Return",
        description: "Fee for preparing a tax return for a married couple (husband and wife filing together). This is referred to as a 'family return.' The client pays this fee once per year, when they prepare a joint tax return.",
        icon: "ri-team-line",
        popular: false
      }
    ]
  },
  es: {
    title: "Precios Simples de Pago Único",
    subtitle: "Paga solo cuando necesites nuestros servicios - sin suscripciones o tarifas ocultas",
    getStarted: "Comenzar",
    oneTimePayment: "Pago Único",
    perFiling: "Por Declaración",
    bottomNote: "Solo pagas al presentar tu declaración de impuestos — sin cargos mensuales o anuales.",
    plans: [
      {
        name: "Tarifa de Registro",
        price: 9.99,
        priceLabel: "Pago Único",
        description: "Esta es una tarifa de registro única que da a los clientes acceso de por vida al sitio web y sus características. Después de pagar esta pequeña tarifa una vez, los clientes pueden usar el sitio web cada año para presentar sus declaraciones de impuestos sin cargos de renovación o suscripción.",
        icon: "ri-user-add-line",
        popular: false
      },
      {
        name: "Declaración Individual",
        price: 19.99,
        priceLabel: "Por Declaración",
        description: "Tarifa para preparar una declaración de impuestos para un solo individuo (un cliente que presenta solo para sí mismo). El cliente paga solo una vez al año, al presentar su declaración. No se aplica suscripción mensual o anual.",
        icon: "ri-user-line",
        popular: true
      },
      {
        name: "Declaración Familiar",
        price: 24.99,
        priceLabel: "Por Declaración",
        description: "Tarifa para preparar una declaración de impuestos para una pareja casada (esposo y esposa presentando conjuntamente). Esto se refiere como una 'declaración familiar'. Es una tarifa anual única que incluye ambos individuos en una sola declaración.",
        icon: "ri-team-line",
        popular: false
      }
    ]
  },
  fr: {
    title: "Tarification Simple à Paiement Unique",
    subtitle: "Payez seulement quand vous avez besoin de nos services - pas d'abonnements ou de frais cachés",
    getStarted: "Commencer",
    oneTimePayment: "Paiement Unique",
    perFiling: "Par Déclaration",
    bottomNote: "Vous ne payez que lors du dépôt de votre déclaration d'impôts — aucun frais mensuel ou annuel.",
    plans: [
      {
        name: "Frais d'Inscription",
        price: 9.99,
        priceLabel: "Paiement Unique",
        description: "Il s'agit de frais d'inscription uniques qui donnent aux clients un accès à vie au site web et à ses fonctionnalités. Après avoir payé ces petits frais une fois, les clients peuvent utiliser le site web chaque année pour déposer leurs déclarations d'impôts sans frais de renouvellement ou d'abonnement.",
        icon: "ri-user-add-line",
        popular: false
      },
      {
        name: "Déclaration Individuelle",
        price: 19.99,
        priceLabel: "Par Déclaration",
        description: "Frais pour préparer une déclaration d'impôts pour un seul individu (un client qui dépose seulement pour lui-même). Le client paie seulement une fois par an, lors du dépôt de sa déclaration. Aucun abonnement mensuel ou annuel ne s'applique.",
        icon: "ri-user-line",
        popular: true
      },
      {
        name: "Déclaration Familiale",
        price: 24.99,
        priceLabel: "Par Déclaration",
        description: "Frais pour préparer une déclaration d'impôts pour un couple marié (mari et femme déposant conjointement). Ceci est appelé une 'déclaration familiale'. Il s'agit de frais annuels uniques qui incluent les deux individus dans une seule déclaration.",
        icon: "ri-team-line",
        popular: false
      }
    ]
  },
  ar: {
    title: "تسعير بسيط بدفعة واحدة",
    subtitle: "ادفع فقط عندما تحتاج خدماتنا - بدون اشتراكات أو رسوم مخفية",
    getStarted: "ابدأ",
    oneTimePayment: "دفعة واحدة",
    perFiling: "لكل إقرار",
    bottomNote: "تدفع فقط عند تقديم إقرارك الضريبي — بدون رسوم شهرية أو سنوية.",
    plans: [
      {
        name: "رسوم التسجيل",
        price: 9.99,
        priceLabel: "دفعة واحدة",
        description: "هذه رسوم تسجيل لمرة واحدة تمنح العملاء وصولاً مدى الحياة إلى الموقع وميزاته. بعد دفع هذه الرسوم الصغيرة مرة واحدة، يمكن للعملاء استخدام الموقع كل عام لتقديم إقراراتهم الضريبية دون أي رسوم تجديد أو اشتراك.",
        icon: "ri-user-add-line",
        popular: false
      },
      {
        name: "إقرار ضريبي فردي",
        price: 19.99,
        priceLabel: "لكل إقرار",
        description: "رسوم لإعداد إقرار ضريبي لفرد واحد (عميل واحد يقدم لنفسه فقط). يدفع العميل مرة واحدة فقط في السنة، عند تقديم إقراره. لا ينطبق اشتراك شهري أو سنوي.",
        icon: "ri-user-line",
        popular: true
      },
      {
        name: "إقرار ضريبي عائلي",
        price: 24.99,
        priceLabel: "لكل إقرار",
        description: "رسوم لإعداد إقرار ضريبي لزوجين (زوج وزوجة يقدمان معاً). يُشار إلى هذا باسم 'إقرار عائلي'. هذه رسوم تقديم سنوية لمرة واحدة تشمل كلا الفردين في إقرار واحد.",
        icon: "ri-team-line",
        popular: false
      }
    ]
  },
  ru: {
    title: "Простая Разовая Оплата",
    subtitle: "Платите только когда нужны наши услуги - никаких подписок или скрытых платежей",
    getStarted: "Начать",
    oneTimePayment: "Разовый Платеж",
    perFiling: "За Подачу",
    bottomNote: "Вы платите только при подаче налоговой декларации — никаких ежемесячных или годовых платежей.",
    plans: [
      {
        name: "Регистрационный Взнос",
        price: 9.99,
        priceLabel: "Разовый Платеж",
        description: "Это разовый регистрационный взнос, который дает клиентам пожизненный доступ к веб-сайту и его функциям. После единоразовой оплаты этого небольшого взноса клиенты могут использовать веб-сайт каждый год для подачи налоговых деклараций без каких-либо платежей за продление или подписку.",
        icon: "ri-user-add-line",
        popular: false
      },
      {
        name: "Индивидуальная Декларация",
        price: 19.99,
        priceLabel: "За Подачу",
        description: "Плата за подготовку налоговой декларации для одного человека (один клиент подает только за себя). Клиент платит только один раз в год при подаче декларации. Никакой ежемесячной или годовой подписки не применяется.",
        icon: "ri-user-line",
        popular: true
      },
      {
        name: "Семейная Декларация",
        price: 24.99,
        priceLabel: "За Подачу",
        description: "Плата за подготовку налоговой декларации для супружеской пары (муж и жена подают совместно). Это называется 'семейной декларацией'. Это разовый годовой взнос за подачу, который включает обоих лиц в одной декларации.",
        icon: "ri-team-line",
        popular: false
      }
    ]
  },
  zh: {
    title: "简单一次性付费",
    subtitle: "只在需要我们服务时付费 - 无订阅或隐藏费用",
    getStarted: "开始使用",
    oneTimePayment: "一次性付费",
    perFiling: "每次申报",
    bottomNote: "您只在提交税务申报时付费 — 无月费或年费。",
    plans: [
      {
        name: "注册费",
        price: 9.99,
        priceLabel: "一次性付费",
        description: "这是一次性注册费，为客户提供网站及其功能的终身访问权限。一次性支付这笔小费用后，客户可以每年使用网站提交税务申报，无需任何续费或订阅费用。",
        icon: "ri-user-add-line",
        popular: false
      },
      {
        name: "个人税务申报",
        price: 19.99,
        priceLabel: "每次申报",
        description: "为单个个人准备税务申报的费用（一个客户只为自己申报）。客户每年只需在提交申报时支付一次。不适用月度或年度订阅。",
        icon: "ri-user-line",
        popular: true
      },
      {
        name: "家庭税务申报",
        price: 24.99,
        priceLabel: "每次申报",
        description: "为已婚夫妇准备税务申报的费用（夫妻联合申报）。这被称为'家庭申报'。这是一次性年度申报费，在单一申报中包括两个人。",
        icon: "ri-team-line",
        popular: false
      }
    ]
  },
  hi: {
    title: "सरल एक-बार भुगतान",
    subtitle: "केवल तभी भुगतान करें जब आपको हमारी सेवाओं की आवश्यकता हो - कोई सब्सक्रिप्शन या छुपी फीस नहीं",
    getStarted: "शुरू करें",
    oneTimePayment: "एक-बार भुगतान",
    perFiling: "प्रति फाइलिंग",
    bottomNote: "आप केवल अपना टैक्स रिटर्न फाइल करते समय भुगतान करते हैं — कोई मासिक या वार्षिक शुल्क नहीं।",
    plans: [
      {
        name: "पंजीकरण शुल्क",
        price: 9.99,
        priceLabel: "एक-बार भुगतान",
        description: "यह एक-बार पंजीकरण शुल्क है जो ग्राहकों को वेबसाइट और इसकी सुविधाओं तक जीवनभर पहुंच प्रदान करता है। इस छोटी फीस का एक बार भुगतान करने के बाद, ग्राहक हर साल बिना किसी नवीकरण या सब्सक्रिप्शन शुल्क के अपने टैक्स रिटर्न फाइल करने के लिए वेबसाइट का उपयोग कर सकते हैं।",
        icon: "ri-user-add-line",
        popular: false
      },
      {
        name: "व्यक्तिगत टैक्स रिटर्न",
        price: 19.99,
        priceLabel: "प्रति फाइलिंग",
        description: "एक व्यक्ति के लिए टैक्स रिटर्न तैयार करने का शुल्क (एक ग्राहक केवल अपने लिए फाइल करता है)। ग्राहक साल में केवल एक बार, अपना रिटर्न फाइल करते समय भुगतान करता है। कोई मासिक या वार्षिक सब्सक्रिप्शन लागू नहीं होती।",
        icon: "ri-user-line",
        popular: true
      },
      {
        name: "पारिवारिक टैक्स रिटर्न",
        price: 24.99,
        priceLabel: "प्रति फाइलिंग",
        description: "विवाहित जोड़े के लिए टैक्स रिटर्न तैयार करने का शुल्क (पति और पत्नी संयुक्त रूप से फाइल करते हैं)। इसे 'पारिवारिक रिटर्न' कहा जाता है। यह एक-बार वार्षिक फाइलिंग फीस है जिसमें एक ही रिटर्न में दोनों व्यक्ति शामिल होते हैं।",
        icon: "ri-team-line",
        popular: false
      }
    ]
  }
};

export default function PricingSection({ currentLanguage }: PricingSectionProps) {
  const t = translations[currentLanguage as keyof typeof translations] || translations.en;

  const plans = [
    {
      name: 'Lifetime Registration',
      price: '9.99',
      priceLabel: 'One-time account registration',
      description:
        'One-time registration fee for TaxAIHelp. Pay once, use the website for life. No monthly or annual subscription. You only pay again when you prepare a tax return.',
      features: [
        'Lifetime access after a single $9.99 payment',
        'Covers secure account setup',
        'Reusable every tax season',
        'No recurring billing of any kind'
      ],
      popular: false,
      buttonText: 'Register Now',
      buttonLink: '/register'
    },
    {
      name: 'Single Tax Return (Individual)',
      price: '19.99',
      priceLabel: 'Fee per complete return',
      description:
        'Fee for preparing ONE complete tax return for one client filing only for themselves. Includes federal and state return preparation for one individual (e.g., Form 1040 and the appropriate state forms). This fee is paid only when the client prepares a tax return (usually once per year).',
      features: [
        'Covers federal and state filing for one individual',
        'Uses TaxAIHelp tax & benefits engine for calculations',
        'Ideal for single filers with no recurring charges',
        'Pay only when you are filing that year'
      ],
      popular: true,
      buttonText: 'File Individual Return',
      buttonLink: '/file-taxes'
    },
    {
      name: 'Family Tax Return (Married Couple)',
      price: '24.99',
      priceLabel: 'Family return (husband and wife)',
      description:
        'Fee for preparing ONE complete tax return for a husband and wife / married couple filing together (joint return). Includes federal and state return preparation for the married couple. This fee is paid only when the couple prepares a tax return (usually once per year).',
      features: [
        'Joint return support for married couples',
        'Federal and state calculations included',
        'No monthly or annual subscription fees',
        'Pay only at the time of preparing the return'
      ],
      popular: false,
      buttonText: 'File Family Return',
      buttonLink: '/file-taxes'
    }
  ];

  return (
    <section className="py-20 bg-gradient-to-br from-blue-50 to-white">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="text-center mb-16">
          <h2 className="text-4xl font-bold text-gray-900 mb-4">{t.title}</h2>
          <p className="text-xl text-gray-600 max-w-3xl mx-auto mb-8">{t.subtitle}</p>
        </div>

        <div className="grid lg:grid-cols-3 gap-8">
          {plans.map((plan, index) => (
            <div key={index} className={`relative bg-white rounded-2xl shadow-lg border-2 transition-all duration-300 hover:shadow-xl hover:-translate-y-2 ${
              plan.popular ? 'border-blue-500 scale-105' : 'border-gray-200'
            }`}>
              {plan.popular && (
                <div className="absolute -top-4 left-1/2 transform -translate-x-1/2">
                  <span className="bg-blue-600 text-white px-4 py-2 rounded-full text-sm font-medium whitespace-nowrap">
                    Most Popular
                  </span>
                </div>
              )}
              
              <div className="p-8">
                <div className="text-center mb-6">
                  <div className="w-16 h-16 bg-blue-100 rounded-full flex items-center justify-center mx-auto mb-4">
                    <i className={`${plan.icon} text-2xl text-blue-600`}></i>
                  </div>
                  <h3 className="text-2xl font-bold text-gray-900 mb-2">{plan.name}</h3>
                </div>
                
                <div className="text-center mb-6">
                  <div className="flex items-baseline justify-center">
                    <span className="text-4xl font-bold text-gray-900">
                      ${plan.price}
                    </span>
                  </div>
                  <p className="text-sm text-blue-600 font-medium mt-1">{plan.priceLabel}</p>
                </div>

                <p className="text-gray-600 mb-8 text-sm leading-relaxed">{plan.description}</p>

                <Link href={plan.buttonLink}>
                  <button className={`w-full py-3 px-6 rounded-lg font-semibold transition-all duration-300 whitespace-nowrap ${
                    plan.popular
                      ? 'bg-blue-600 hover:bg-blue-700 text-white shadow-lg hover:shadow-xl'
                      : 'bg-gray-100 hover:bg-gray-200 text-gray-900'
                  }`}>
                    {plan.buttonText}
                  </button>
                </Link>
              </div>
            </div>
          ))}
        </div>

        <div className="mt-16 text-center">
          <div className="text-center mb-4">
            <p className="text-gray-700 font-medium max-w-3xl mx-auto">
              You do NOT pay monthly or annually. You pay a one-time $9.99 registration fee and then only pay when you prepare a tax return (once a year in most cases).
            </p>
          </div>

          {/* Payment Methods */}
          <div className="text-center">
            <p className="text-gray-700 mb-4 font-medium">We accept Visa, Mastercard, and Discover.</p>
            <div className="flex justify-center items-center space-x-6">
              <div className="flex items-center space-x-2">
                <div className="w-12 h-8 bg-blue-600 rounded flex items-center justify-center">
                  <span className="text-white text-xs font-bold">VISA</span>
                </div>
                <span className="text-sm text-gray-600">Visa</span>
              </div>
              <div className="flex items-center space-x-2">
                <div className="w-12 h-8 bg-gradient-to-r from-red-500 to-orange-500 rounded flex items-center justify-center">
                  <span className="text-white text-xs font-bold">MC</span>
                </div>
                <span className="text-sm text-gray-600">Mastercard</span>
              </div>
              <div className="flex items-center space-x-2">
                <div className="w-12 h-8 bg-orange-500 rounded flex items-center justify-center">
                  <span className="text-white text-xs font-bold">DISC</span>
                </div>
                <span className="text-sm text-gray-600">Discover</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
