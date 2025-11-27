'use client';

import { useState } from 'react';

interface ContactSectionProps {
  currentLanguage: string;
}

const translations = {
  en: {
    title: "Get In Touch",
    subtitle: "Have questions? We're here to help you with your tax filing needs",
    form: {
      name: "Full Name",
      email: "Email Address",
      subject: "Subject",
      message: "Message",
      send: "Send Message",
      sending: "Sending...",
      success: "Message sent successfully!",
      error: "Failed to send message. Please try again."
    },
    contact: {
      phone: "+1 (555) 123-4567",
      email: "support@taxhelp-ai.com",
      address: "123 Tax Street, Finance District, NY 10001",
      hours: "Monday - Friday: 9:00 AM - 6:00 PM EST"
    },
    whatsapp: "Chat on WhatsApp"
  },
  es: {
    title: "Ponte en Contacto",
    subtitle: "¿Tienes preguntas? Estamos aquí para ayudarte con tus necesidades de declaración de impuestos",
    form: {
      name: "Nombre Completo",
      email: "Dirección de Email",
      subject: "Asunto",
      message: "Mensaje",
      send: "Enviar Mensaje",
      sending: "Enviando...",
      success: "¡Mensaje enviado exitosamente!",
      error: "Error al enviar mensaje. Por favor intenta de nuevo."
    },
    contact: {
      phone: "+1 (555) 123-4567",
      email: "support@taxhelp-ai.com",
      address: "123 Tax Street, Finance District, NY 10001",
      hours: "Lunes - Viernes: 9:00 AM - 6:00 PM EST"
    },
    whatsapp: "Chatear en WhatsApp"
  },
  fr: {
    title: "Contactez-Nous",
    subtitle: "Vous avez des questions ? Nous sommes là pour vous aider avec vos besoins de déclaration fiscale",
    form: {
      name: "Nom Complet",
      email: "Adresse Email",
      subject: "Sujet",
      message: "Message",
      send: "Envoyer Message",
      sending: "Envoi...",
      success: "Message envoyé avec succès !",
      error: "Échec de l'envoi du message. Veuillez réessayer."
    },
    contact: {
      phone: "+1 (555) 123-4567",
      email: "support@taxhelp-ai.com",
      address: "123 Tax Street, Finance District, NY 10001",
      hours: "Lundi - Vendredi : 9h00 - 18h00 EST"
    },
    whatsapp: "Chatter sur WhatsApp"
  },
  ar: {
    title: "تواصل معنا",
    subtitle: "لديك أسئلة؟ نحن هنا لمساعدتك في احتياجات تقديم الضرائب الخاصة بك",
    form: {
      name: "الاسم الكامل",
      email: "عنوان البريد الإلكتروني",
      subject: "الموضوع",
      message: "الرسالة",
      send: "إرسال الرسالة",
      sending: "جاري الإرسال...",
      success: "تم إرسال الرسالة بنجاح!",
      error: "فشل في إرسال الرسالة. يرجى المحاولة مرة أخرى."
    },
    contact: {
      phone: "+1 (555) 123-4567",
      email: "support@taxhelp-ai.com",
      address: "123 Tax Street, Finance District, NY 10001",
      hours: "الاثنين - الجمعة: 9:00 صباحاً - 6:00 مساءً EST"
    },
    whatsapp: "الدردشة على واتساب"
  },
  ru: {
    title: "Свяжитесь с Нами",
    subtitle: "Есть вопросы? Мы здесь, чтобы помочь вам с вашими потребностями в подаче налогов",
    form: {
      name: "Полное Имя",
      email: "Адрес Электронной Почты",
      subject: "Тема",
      message: "Сообщение",
      send: "Отправить Сообщение",
      sending: "Отправка...",
      success: "Сообщение успешно отправлено!",
      error: "Не удалось отправить сообщение. Пожалуйста, попробуйте еще раз."
    },
    contact: {
      phone: "+1 (555) 123-4567",
      email: "support@taxhelp-ai.com",
      address: "123 Tax Street, Finance District, NY 10001",
      hours: "Понедельник - Пятница: 9:00 - 18:00 EST"
    },
    whatsapp: "Чат в WhatsApp"
  },
  zh: {
    title: "联系我们",
    subtitle: "有问题吗？我们在这里帮助您满足税务申报需求",
    form: {
      name: "全名",
      email: "电子邮件地址",
      subject: "主题",
      message: "消息",
      send: "发送消息",
      sending: "发送中...",
      success: "消息发送成功！",
      error: "发送消息失败。请重试。"
    },
    contact: {
      phone: "+1 (555) 123-4567",
      email: "support@taxhelp-ai.com",
      address: "123 Tax Street, Finance District, NY 10001",
      hours: "周一 - 周五：上午9:00 - 下午6:00 EST"
    },
    whatsapp: "在WhatsApp上聊天"
  },
  hi: {
    title: "संपर्क में रहें",
    subtitle: "प्रश्न हैं? हम आपकी कर फाइलिंग आवश्यकताओं में मदद के लिए यहाँ हैं",
    form: {
      name: "पूरा नाम",
      email: "ईमेल पता",
      subject: "विषय",
      message: "संदेश",
      send: "संदेश भेजें",
      sending: "भेजा जा रहा है...",
      success: "संदेश सफलतापूर्वक भेजा गया!",
      error: "संदेश भेजने में विफल। कृपया पुनः प्रयास करें।"
    },
    contact: {
      phone: "+1 (555) 123-4567",
      email: "support@taxhelp-ai.com",
      address: "123 Tax Street, Finance District, NY 10001",
      hours: "सोमवार - शुक्रवार: सुबह 9:00 - शाम 6:00 EST"
    },
    whatsapp: "WhatsApp पर चैट करें"
  }
};

export default function ContactSection({ currentLanguage }: ContactSectionProps) {
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    subject: '',
    message: ''
  });
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitStatus, setSubmitStatus] = useState<'idle' | 'success' | 'error'>('idle');

  const t = translations[currentLanguage as keyof typeof translations] || translations.en;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    
    // Simulate form submission
    setTimeout(() => {
      setIsSubmitting(false);
      setSubmitStatus('success');
      setFormData({ name: '', email: '', subject: '', message: '' });
      
      setTimeout(() => {
        setSubmitStatus('idle');
      }, 3000);
    }, 1000);
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    setFormData({
      ...formData,
      [e.target.name]: e.target.value
    });
  };

  return (
    <section className="py-20 bg-white">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="text-center mb-16">
          <h2 className="text-4xl font-bold text-gray-900 mb-4">{t.title}</h2>
          <p className="text-xl text-gray-600 max-w-3xl mx-auto">{t.subtitle}</p>
        </div>

        <div className="grid lg:grid-cols-2 gap-12">
          <div>
            <form onSubmit={handleSubmit} className="space-y-6">
              <div className="grid md:grid-cols-2 gap-6">
                <div>
                  <label htmlFor="name" className="block text-sm font-medium text-gray-700 mb-2">
                    {t.form.name}
                  </label>
                  <input
                    type="text"
                    id="name"
                    name="name"
                    value={formData.name}
                    onChange={handleChange}
                    required
                    className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-colors duration-300"
                  />
                </div>
                <div>
                  <label htmlFor="email" className="block text-sm font-medium text-gray-700 mb-2">
                    {t.form.email}
                  </label>
                  <input
                    type="email"
                    id="email"
                    name="email"
                    value={formData.email}
                    onChange={handleChange}
                    required
                    className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-colors duration-300"
                  />
                </div>
              </div>
              
              <div>
                <label htmlFor="subject" className="block text-sm font-medium text-gray-700 mb-2">
                  {t.form.subject}
                </label>
                <input
                  type="text"
                  id="subject"
                  name="subject"
                  value={formData.subject}
                  onChange={handleChange}
                  required
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-colors duration-300"
                />
              </div>
              
              <div>
                <label htmlFor="message" className="block text-sm font-medium text-gray-700 mb-2">
                  {t.form.message}
                </label>
                <textarea
                  id="message"
                  name="message"
                  value={formData.message}
                  onChange={handleChange}
                  required
                  rows={6}
                  maxLength={500}
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-colors duration-300 resize-none"
                />
                <p className="text-sm text-gray-500 mt-1">
                  {formData.message.length}/500 characters
                </p>
              </div>

              <button
                type="submit"
                disabled={isSubmitting}
                className="w-full bg-blue-600 hover:bg-blue-700 disabled:bg-blue-400 text-white py-3 px-6 rounded-lg font-semibold transition-colors duration-300 whitespace-nowrap"
              >
                {isSubmitting ? t.form.sending : t.form.send}
              </button>

              {submitStatus === 'success' && (
                <div className="bg-green-50 border border-green-200 rounded-lg p-4">
                  <div className="flex items-center">
                    <i className="ri-check-circle-line text-green-500 mr-2"></i>
                    <span className="text-green-800">{t.form.success}</span>
                  </div>
                </div>
              )}

              {submitStatus === 'error' && (
                <div className="bg-red-50 border border-red-200 rounded-lg p-4">
                  <div className="flex items-center">
                    <i className="ri-error-warning-line text-red-500 mr-2"></i>
                    <span className="text-red-800">{t.form.error}</span>
                  </div>
                </div>
              )}
            </form>
          </div>

          <div className="space-y-8">
            <div className="bg-gradient-to-br from-blue-50 to-white rounded-xl p-8 border border-blue-100">
              <h3 className="text-2xl font-semibold text-gray-900 mb-6">Contact Information</h3>
              
              <div className="space-y-6">
                <div className="flex items-start">
                  <div className="w-12 h-12 bg-blue-100 rounded-full flex items-center justify-center mr-4 flex-shrink-0">
                    <i className="ri-phone-line text-blue-600 text-xl"></i>
                  </div>
                  <div>
                    <h4 className="font-medium text-gray-900 mb-1">Phone</h4>
                    <p className="text-gray-600">{t.contact.phone}</p>
                  </div>
                </div>

                <div className="flex items-start">
                  <div className="w-12 h-12 bg-blue-100 rounded-full flex items-center justify-center mr-4 flex-shrink-0">
                    <i className="ri-mail-line text-blue-600 text-xl"></i>
                  </div>
                  <div>
                    <h4 className="font-medium text-gray-900 mb-1">Email</h4>
                    <p className="text-gray-600">{t.contact.email}</p>
                  </div>
                </div>

                <div className="flex items-start">
                  <div className="w-12 h-12 bg-blue-100 rounded-full flex items-center justify-center mr-4 flex-shrink-0">
                    <i className="ri-map-pin-line text-blue-600 text-xl"></i>
                  </div>
                  <div>
                    <h4 className="font-medium text-gray-900 mb-1">Address</h4>
                    <p className="text-gray-600">{t.contact.address}</p>
                  </div>
                </div>

                <div className="flex items-start">
                  <div className="w-12 h-12 bg-blue-100 rounded-full flex items-center justify-center mr-4 flex-shrink-0">
                    <i className="ri-time-line text-blue-600 text-xl"></i>
                  </div>
                  <div>
                    <h4 className="font-medium text-gray-900 mb-1">Business Hours</h4>
                    <p className="text-gray-600">{t.contact.hours}</p>
                  </div>
                </div>
              </div>

              <div className="mt-8 pt-6 border-t border-blue-200">
                <a
                  href="https://wa.me/15551234567"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center bg-green-500 hover:bg-green-600 text-white px-6 py-3 rounded-lg font-semibold transition-colors duration-300 whitespace-nowrap"
                >
                  <i className="ri-whatsapp-line mr-2 text-xl"></i>
                  {t.whatsapp}
                </a>
              </div>
            </div>

            <div className="bg-white rounded-xl shadow-lg overflow-hidden border border-gray-200">
              <iframe
                src="https://www.google.com/maps/embed?pb=!1m18!1m12!1m3!1d3022.9663095343008!2d-74.00425878459418!3d40.74844097932681!2m3!1f0!2f0!3f0!3m2!1i1024!2i768!4f13.1!3m3!1m2!1s0x89c259bf5c1654f3%3A0xc80f9cfce5383d5d!2sNew%20York%2C%20NY%2010001%2C%20USA!5e0!3m2!1sen!2s!4v1635959542207!5m2!1sen!2s"
                width="100%"
                height="300"
                style={{ border: 0 }}
                allowFullScreen
                loading="lazy"
                referrerPolicy="no-referrer-when-downgrade"
                title="Office Location"
              ></iframe>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}