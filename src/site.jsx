import React, { useMemo, useState } from "react";

// Sitio institucional de la Escola Mãos Unidas

const COPY = {
  es: {
    nav: { 
      school: "La Escuela", 
      education: "Sistema Educativo", 
      students: "Los Estudiantes", 
      scholarships: "Becas", 
      contact: "Contacto" 
    },
    hero: {
      title: "Escola Mãos Unidas",
      subtitle: "Educación primaria cristiana en Lichinga, Mozambique",
      ctaPrimary: "Quiero apadrinar",
    },
    school: {
      heading: "Nuestra Historia",
      body: "Escola Mãos Unidas nació del corazón de la Iglesia Corazón de Fuego en Ramos Mejía, Buenos Aires, Argentina, con la visión de transformar vidas en Lichinga, provincia de Niassa, Mozambique. Hace más de 10 años que caminamos junto a niños y familias en situación de vulnerabilidad, brindando educación integral, formación espiritual y esperanza.",
      mission: {
        title: "Nuestra Misión",
        text: "Proporcionar educación académica de calidad, formación en valores bíblicos y alimentación diaria a niños que de otra manera no tendrían acceso a la educación. Creemos que cada niño merece una oportunidad de desarrollar su potencial y construir un futuro mejor.",
      },
      values: [
        { title: "Excelencia académica", text: "Compromiso con una educación de calidad que prepare a los estudiantes para el futuro." },
        { title: "Formación integral", text: "Desarrollo de valores espirituales, emocionales y sociales." },
        { title: "Servicio a la comunidad", text: "Compromiso con el bienestar de familias en situación de vulnerabilidad." },
      ],
    },
    education: {
      heading: "Sistema Educativo",
      subtitle: "Una propuesta integral que combina excelencia académica con valores cristianos",
      levels: {
        title: "Niveles Educativos",
        description: "Ofrecemos educación completa desde preescolar hasta primaria completa",
        grades: [
          "Pré-primária (Pre-primaria)",
          "1ª Classe (1º Grado)",
          "2ª Classe (2º Grado)",
          "3ª Classe (3º Grado)",
          "4ª Classe (4º Grado)",
          "5ª Classe (5º Grado)",
          "6ª Classe (6º Grado)",
        ],
      },
      subjectsTitle: "Materias que ofrecemos",
      subjects: [
        { title: "Portugués", text: "Desarrollo de competencias comunicativas escritas y orales como lengua materna." },
        { title: "Matemáticas", text: "Pensamiento lógico y resolución de problemas prácticos." },
        { title: "Ciencias", text: "Exploración del mundo natural y científico." },
        { title: "Lectura y Arte", text: "Expresión creativa y fomento de la lectura." },
      ],
      approach: {
        title: "Nuestro Enfoque",
        text: "Integramos valores bíblicos en todas las áreas del conocimiento, creando un ambiente de respeto, amor y servicio. Nuestros docentes están comprometidos con la formación integral de cada estudiante.",
      },
      support: {
        title: "Apoyo Continuo",
        items: [
          "Refuerzo pedagógico personalizado",
          "Fomento de hábitos de estudio",
          "Acompañamiento familiar",
          "Desarrollo de habilidades socioemocionales",
          "Alimentación diaria nutritiva",
        ],
      },
    },
    students: {
      heading: "Nuestros Estudiantes",
      subtitle: "Más de 40 niños y niñas encuentran esperanza y futuro en nuestra escuela",
      stats: [
        { label: "Estudiantes activos", value: "40+" },
        { label: "Edades", value: "5-13 años" },
        { label: "Matrícula disponible", value: "200" },
        { label: "Años de servicio", value: "+10" },
      ],
      profile: {
        title: "Perfil de nuestros estudiantes",
        text: "Atendemos niños y niñas de Lichinga y comunidades aledañas que se encuentran en situación de vulnerabilidad socioeconómica. Muchos provienen de familias que no pueden costear la educación de sus hijos.",
      },
      impact: {
        title: "El Impacto en sus vidas",
        items: [
          "Acceso a educación de calidad",
          "Alimentación diaria nutritiva",
          "Desarrollo de autoestima y confianza",
          "Formación en valores cristianos",
          "Acompañamiento personalizado",
          "Preparación para futuros desafíos",
        ],
      },
    },
    scholarships: {
      heading: "Programa de Becas",
      subtitle: "Apadrina un niño y transforma su vida",
      description: "Tu aporte mensual cubre todos los gastos necesarios para que un niño reciba una educación completa:",
      bullets: [
        "Cuota escolar y materiales didácticos completos",
        "Comidas diarias (almuerzo y, cuando sea necesario, desayuno)",
        "Atención médica básica y seguimiento de salud",
        "Acompañamiento espiritual y socioemocional",
      ],
      benefits: {
        title: "Como padrino, recibirás:",
        items: [
          "Fotos y actualizaciones regulares",
          "Informes de progreso académico",
          "Dibujos y cartas de los niños",
          "Conocerás el impacto real de tu aporte",
        ],
      },
      cta: "Apadrinar ahora",
    },
    contact: {
      heading: "Contacto",
      church: "Iglesia Corazón de Fuego",
      city: "Ramos Mejía, Buenos Aires, Argentina",
      channels: "Canales de comunicación",
      instagram: "Instagram oficial",
      email: "Correo electrónico",
      mapTitle: "Ubicación",
      formTitle: "Escribinos",
      formName: "Nombre",
      formEmail: "Email",
      formMsg: "Mensaje",
      formSubmit: "Enviar consulta",
      disclaimer: "Este formulario usa un servicio externo. Te responderemos a la brevedad.",
    },
  },
  pt: {
    nav: { 
      school: "A Escola", 
      education: "Sistema Educacional", 
      students: "Os Estudantes", 
      scholarships: "Bolsas", 
      contact: "Contato" 
    },
    hero: {
      title: "Escola Mãos Unidas",
      subtitle: "Educação primária cristã em Lichinga, Moçambique",
      ctaPrimary: "Quero apadrinhar",
    },
    school: {
      heading: "Nossa História",
      body: "A Escola Mãos Unidas nasceu do coração da Igreja Corazón de Fuego em Ramos Mejía, Buenos Aires, Argentina, com a visão de transformar vidas em Lichinga, província de Niassa, Moçambique. Há mais de 10 anos caminhamos junto a crianças e famílias em situação de vulnerabilidade, oferecendo educação integral, formação espiritual e esperança.",
      mission: {
        title: "Nossa Missão",
        text: "Fornecer educação acadêmica de qualidade, formação em valores bíblicos e alimentação diária a crianças que, de outra forma, não teriam acesso à educação. Acreditamos que cada criança merece uma oportunidade de desenvolver seu potencial e construir um futuro melhor.",
      },
      values: [
        { title: "Excelência acadêmica", text: "Compromisso com educação de qualidade que prepare os estudantes para o futuro." },
        { title: "Formação integral", text: "Desenvolvimento de valores espirituais, emocionais e sociais." },
        { title: "Serviço à comunidade", text: "Compromisso com o bem-estar de famílias em situação de vulnerabilidade." },
      ],
    },
    education: {
      heading: "Sistema Educacional",
      subtitle: "Uma proposta integral que combina excelência acadêmica com valores cristãos",
      levels: {
        title: "Níveis Educacionais",
        description: "Oferecemos educação completa desde pré-escolar até primária completa",
        grades: [
          "Pré-primária",
          "1ª Classe",
          "2ª Classe",
          "3ª Classe",
          "4ª Classe",
          "5ª Classe",
          "6ª Classe",
        ],
      },
      subjectsTitle: "Matérias que oferecemos",
      subjects: [
        { title: "Português", text: "Desenvolvimento de competências comunicativas escritas e orais como língua materna." },
        { title: "Matemática", text: "Pensamento lógico e resolução de problemas práticos." },
        { title: "Ciências", text: "Exploração do mundo natural e científico." },
        { title: "Leitura e Arte", text: "Expressão criativa e promoção da leitura." },
      ],
      approach: {
        title: "Nossa Abordagem",
        text: "Integramos valores bíblicos em todas as áreas do conhecimento, criando um ambiente de respeito, amor e serviço. Nossos professores estão comprometidos com a formação integral de cada estudante.",
      },
      support: {
        title: "Apoio Contínuo",
        items: [
          "Reforço pedagógico personalizado",
          "Promoção de hábitos de estudo",
          "Acompanhamento familiar",
          "Desenvolvimento de habilidades socioemocionais",
          "Alimentação diária nutritiva",
        ],
      },
    },
    students: {
      heading: "Nossos Estudantes",
      subtitle: "Mais de 40 crianças encontram esperança e futuro em nossa escola",
      stats: [
        { label: "Estudantes ativos", value: "40+" },
        { label: "Idades", value: "5-13 anos" },
        { label: "Matrícula disponível", value: "200" },
        { label: "Anos de serviço", value: "+10" },
      ],
      profile: {
        title: "Perfil de nossos estudantes",
        text: "Atendemos crianças de Lichinga e comunidades vizinhas que se encontram em situação de vulnerabilidade socioeconômica. Muitas provêm de famílias que não podem custear a educação de seus filhos.",
      },
      impact: {
        title: "O Impacto em suas vidas",
        items: [
          "Acesso à educação de qualidade",
          "Alimentação diária nutritiva",
          "Desenvolvimento de autoestima e confiança",
          "Formação em valores cristãos",
          "Acompanhamento personalizado",
          "Preparação para desafios futuros",
        ],
      },
    },
    scholarships: {
      heading: "Programa de Bolsas",
      subtitle: "Apadrinhe uma criança e transforme sua vida",
      description: "Sua contribuição mensal cobre todas as despesas necessárias para que uma criança receba educação completa:",
      bullets: [
        "Mensalidade e materiais didáticos completos",
        "Refeições diárias (almoço e, quando necessário, café da manhã)",
        "Atenção médica básica e acompanhamento de saúde",
        "Acompanhamento espiritual e socioemocional",
      ],
      benefits: {
        title: "Como padrinho, você receberá:",
        items: [
          "Fotos e atualizações regulares",
          "Relatórios de progresso acadêmico",
          "Desenhos e cartas das crianças",
          "Conhecerá o impacto real da sua contribuição",
        ],
      },
      cta: "Apadrinhar agora",
    },
    contact: {
      heading: "Contato",
      church: "Igreja Corazón de Fuego",
      city: "Ramos Mejía, Buenos Aires, Argentina",
      channels: "Canais de comunicação",
      instagram: "Instagram oficial",
      email: "E-mail",
      mapTitle: "Localização",
      formTitle: "Escreva para nós",
      formName: "Nome",
      formEmail: "Email",
      formMsg: "Mensagem",
      formSubmit: "Enviar",
      disclaimer: "Este formulário usa um serviço externo. Responderemos o mais breve possível.",
    },
  },
  en: {
    nav: { 
      school: "The School", 
      education: "Educational System", 
      students: "The Students", 
      scholarships: "Scholarships", 
      contact: "Contact" 
    },
    hero: {
      title: "Escola Mãos Unidas",
      subtitle: "Christian primary education in Lichinga, Mozambique",
      ctaPrimary: "I want to sponsor",
    },
    school: {
      heading: "Our History",
      body: "Escola Mãos Unidas was born from the heart of Corazón de Fuego Church in Ramos Mejía, Buenos Aires, Argentina, with the vision of transforming lives in Lichinga, Niassa province, Mozambique. For more than 10 years we have walked alongside children and families in vulnerable situations, providing integral education, spiritual formation, and hope.",
      mission: {
        title: "Our Mission",
        text: "To provide quality academic education, biblical values formation, and daily nutrition to children who would otherwise not have access to education. We believe that every child deserves an opportunity to develop their potential and build a better future.",
      },
      values: [
        { title: "Academic excellence", text: "Commitment to quality education that prepares students for the future." },
        { title: "Integral formation", text: "Development of spiritual, emotional, and social values." },
        { title: "Community service", text: "Commitment to the wellbeing of families in vulnerable situations." },
      ],
    },
    education: {
      heading: "Educational System",
      subtitle: "An integral proposal that combines academic excellence with Christian values",
      levels: {
        title: "Educational Levels",
        description: "We offer complete education from pre-school to complete primary",
        grades: [
          "Pre-primary",
          "1st Grade",
          "2nd Grade",
          "3rd Grade",
          "4th Grade",
          "5th Grade",
          "6th Grade",
        ],
      },
      subjectsTitle: "Subjects we offer",
      subjects: [
        { title: "Portuguese", text: "Development of written and oral communication skills as mother tongue." },
        { title: "Mathematics", text: "Logical thinking and practical problem solving." },
        { title: "Sciences", text: "Exploration of the natural and scientific world." },
        { title: "Reading and Arts", text: "Creative expression and reading promotion." },
      ],
      approach: {
        title: "Our Approach",
        text: "We integrate biblical values into all areas of knowledge, creating an environment of respect, love, and service. Our teachers are committed to the integral formation of each student.",
      },
      support: {
        title: "Continuous Support",
        items: [
          "Personalized pedagogical reinforcement",
          "Promotion of study habits",
          "Family accompaniment",
          "Development of socio-emotional skills",
          "Daily nutritious meals",
        ],
      },
    },
    students: {
      heading: "Our Students",
      subtitle: "More than 40 children find hope and future at our school",
      stats: [
        { label: "Active students", value: "40+" },
        { label: "Ages", value: "5-13 years" },
        { label: "Available enrollment", value: "200" },
        { label: "Years of service", value: "+10" },
      ],
      profile: {
        title: "Profile of our students",
        text: "We serve children from Lichinga and nearby communities who are in socioeconomically vulnerable situations. Many come from families who cannot afford their children's education.",
      },
      impact: {
        title: "The Impact on their lives",
        items: [
          "Access to quality education",
          "Daily nutritious meals",
          "Development of self-esteem and confidence",
          "Formation in Christian values",
          "Personalized accompaniment",
          "Preparation for future challenges",
        ],
      },
    },
    scholarships: {
      heading: "Scholarship Program",
      subtitle: "Sponsor a child and transform their life",
      description: "Your monthly contribution covers all necessary expenses for a child to receive complete education:",
      bullets: [
        "School fees and complete educational materials",
        "Daily meals (lunch and, when necessary, breakfast)",
        "Basic medical care and health monitoring",
        "Spiritual and socio-emotional accompaniment",
      ],
      benefits: {
        title: "As a sponsor, you will receive:",
        items: [
          "Photos and regular updates",
          "Academic progress reports",
          "Drawings and letters from the children",
          "You will know the real impact of your contribution",
        ],
      },
      cta: "Sponsor now",
    },
    contact: {
      heading: "Contact",
      church: "Corazón de Fuego Church",
      city: "Ramos Mejía, Buenos Aires, Argentina",
      channels: "Communication channels",
      instagram: "Official Instagram",
      email: "Email",
      mapTitle: "Location",
      formTitle: "Write to us",
      formName: "Name",
      formEmail: "Email",
      formMsg: "Message",
      formSubmit: "Send",
      disclaimer: "This form uses an external service. We will respond as soon as possible.",
    },
  },
};

export default function EscolaMaosUnidasSite() {
  const [lang, setLang] = useState("pt");
  const t = useMemo(() => COPY[lang], [lang]);

  return (
    <div className="min-h-screen bg-stone-50 text-neutral-900">
      {/* NAVBAR */}
      <header className="sticky top-0 z-40 bg-white/95 backdrop-blur border-b border-olive-100">
        <div className="max-w-6xl mx-auto px-4 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <img src="/assets/logo-escola-maos-unidas.png" alt="Logo Escola Mãos Unidas" className="h-10 w-10 rounded-full object-cover" />
            <span className="font-extrabold tracking-tight text-lg bg-gradient-to-r from-olive-700 to-olive-600 bg-clip-text text-transparent">Escola Mãos Unidas</span>
          </div>
          <nav className="hidden md:flex items-center gap-6 text-sm">
            <a href="#school" className="hover:text-olive-600 transition-colors">{t.nav.school}</a>
            <a href="#education" className="hover:text-olive-600 transition-colors">{t.nav.education}</a>
            <a href="#students" className="hover:text-olive-600 transition-colors">{t.nav.students}</a>
            <a href="#scholarships" className="hover:text-olive-600 transition-colors">{t.nav.scholarships}</a>
            <a href="#contact" className="hover:text-olive-600 transition-colors">{t.nav.contact}</a>
          </nav>
          <div className="flex items-center gap-2">
            <button 
              onClick={() => setLang('pt')} 
              className={`px-3 py-2 rounded-lg border text-xl transition-colors ${
                lang === 'pt' 
                  ? 'border-olive-400 bg-olive-50' 
                  : 'border-olive-200 hover:bg-olive-50'
              }`}
              title="Português"
            >
              🇵🇹
            </button>
            <button 
              onClick={() => setLang('es')} 
              className={`px-3 py-2 rounded-lg border text-xl transition-colors ${
                lang === 'es' 
                  ? 'border-olive-400 bg-olive-50' 
                  : 'border-olive-200 hover:bg-olive-50'
              }`}
              title="Español"
            >
              🇦🇷
            </button>
            <button 
              onClick={() => setLang('en')} 
              className={`px-3 py-2 rounded-lg border text-xl transition-colors ${
                lang === 'en' 
                  ? 'border-olive-400 bg-olive-50' 
                  : 'border-olive-200 hover:bg-olive-50'
              }`}
              title="English"
            >
              🇺🇸
            </button>
            <a href="#scholarships" className="px-4 py-2 rounded-lg bg-gradient-to-r from-olive-600 to-olive-700 text-white text-sm hover:from-olive-700 hover:to-olive-800 transition-colors">🤝 {t.hero.ctaPrimary}</a>
          </div>
        </div>
      </header>

      {/* HERO */}
      <section className="relative overflow-hidden bg-gradient-to-br from-olive-50 via-stone-50 to-olive-50/30">
        <div className="absolute inset-0 opacity-30">
          <div className="absolute top-10 left-10 w-64 h-64 border border-olive-200 rounded-full"></div>
          <div className="absolute bottom-20 right-20 w-96 h-96 border border-olive-200/50 rounded-full"></div>
        </div>
        <div className="max-w-6xl mx-auto px-4 py-20 md:py-28 grid md:grid-cols-2 gap-12 items-center relative">
          <div>
            <h1 className="text-5xl md:text-6xl font-extrabold leading-tight mb-4 bg-gradient-to-r from-olive-700 to-neutral-800 bg-clip-text text-transparent">{t.hero.title}</h1>
            <p className="text-xl text-neutral-700 mb-8">{t.hero.subtitle}</p>
            <div className="flex gap-3">
              <a href="#scholarships" className="px-6 py-3 rounded-lg bg-gradient-to-r from-olive-600 to-olive-700 text-white text-base hover:from-olive-700 hover:to-olive-800 transition-colors shadow-lg">🤝 {t.hero.ctaPrimary}</a>
            </div>
          </div>
          <div className="aspect-video rounded-2xl shadow-2xl border-4 border-olive-300/80 relative overflow-hidden ring-2 ring-olive-200/50">
            <div className="absolute inset-0 bg-gradient-to-br from-olive-50/20 to-transparent pointer-events-none z-10"></div>
            <img src="/assets/fachada_1.png" alt="Escola Mãos Unidas - Fachada da escola" className="w-full h-full object-cover" />
          </div>
        </div>
      </section>

      {/* SCHOOL */}
      <section id="school" className="py-20 bg-white relative">
        <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-olive-200 via-olive-300/50 to-olive-200"></div>
        <div className="max-w-6xl mx-auto px-4">
          <div className="mb-12">
            <h2 className="text-4xl font-bold mb-4 text-olive-800">{t.school.heading}</h2>
            <p className="text-lg text-neutral-700 leading-relaxed max-w-3xl">{t.school.body}</p>
          </div>
          
          <div className="grid md:grid-cols-2 gap-8 mb-12">
            <div className="bg-gradient-to-br from-olive-50 to-stone-50 rounded-2xl p-8 border border-olive-100 shadow-sm">
              <h3 className="text-2xl font-bold mb-4 text-olive-700">{t.school.mission.title}</h3>
              <p className="text-neutral-700 leading-relaxed">{t.school.mission.text}</p>
            </div>
            <div className="space-y-4">
              {t.school.values.map((value, i) => (
                <div key={i} className="bg-white rounded-xl p-6 border-l-4 border-olive-400 shadow-sm hover:shadow-md transition-shadow">
                  <h4 className="font-bold text-olive-800 mb-2">{value.title}</h4>
                  <p className="text-neutral-700 text-sm">{value.text}</p>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* EDUCATION */}
      <section id="education" className="py-20 bg-gradient-to-br from-olive-50/30 to-stone-100/50 relative">
        <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-transparent via-olive-300/50 to-transparent"></div>
        <div className="max-w-6xl mx-auto px-4">
          <div className="mb-12 text-center">
            <h2 className="text-4xl font-bold mb-4 text-olive-800">{t.education.heading}</h2>
            <p className="text-lg text-neutral-600 max-w-2xl mx-auto">{t.education.subtitle}</p>
          </div>

          <div className="mb-12">
            <div className="bg-white rounded-2xl p-8 border border-olive-100 shadow-sm">
              <h3 className="text-2xl font-bold mb-3 text-olive-700">{t.education.levels.title}</h3>
              <p className="text-neutral-600 mb-6">{t.education.levels.description}</p>
              <div className="grid sm:grid-cols-2 md:grid-cols-4 gap-3">
                {t.education.levels.grades.map((grade, i) => (
                  <div key={i} className="bg-olive-50 rounded-lg px-4 py-3 text-center border border-olive-200">
                    <span className="text-sm font-medium text-olive-800">{grade}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>

          <div className="mb-8 text-center">
            <h3 className="text-2xl font-bold text-olive-700 mb-6">{t.education.subjectsTitle}</h3>
          </div>

          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-6 mb-12">
            {t.education.subjects.map((subject, i) => (
              <div key={i} className="bg-white rounded-xl p-6 border border-olive-100 shadow-sm hover:shadow-md hover:border-olive-300 transition-all">
                <h4 className="font-bold text-olive-700 mb-3">{subject.title}</h4>
                <p className="text-neutral-700 text-sm leading-relaxed">{subject.text}</p>
              </div>
            ))}
          </div>

          <div className="grid md:grid-cols-2 gap-8">
            <div className="bg-white rounded-2xl p-8 border border-olive-100 shadow-sm">
              <h3 className="text-2xl font-bold mb-4 text-olive-700">{t.education.approach.title}</h3>
              <p className="text-neutral-700 leading-relaxed">{t.education.approach.text}</p>
            </div>
            <div className="bg-white rounded-2xl p-8 border border-olive-100 shadow-sm">
              <h3 className="text-2xl font-bold mb-4 text-olive-700">{t.education.support.title}</h3>
              <ul className="space-y-3">
                {t.education.support.items.map((item, i) => (
                  <li key={i} className="flex items-start gap-3">
                    <span className="text-olive-600 mt-1">✓</span>
                    <span className="text-neutral-700">{item}</span>
                  </li>
                ))}
              </ul>
            </div>
          </div>
        </div>
      </section>

      {/* STUDENTS */}
      <section id="students" className="py-20 bg-white relative">
        <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-olive-200 via-olive-300/50 to-olive-200"></div>
        <div className="max-w-6xl mx-auto px-4">
          <div className="mb-12 text-center">
            <h2 className="text-4xl font-bold mb-4 text-olive-800">{t.students.heading}</h2>
            <p className="text-lg text-neutral-600 max-w-2xl mx-auto">{t.students.subtitle}</p>
          </div>

          <div className="grid md:grid-cols-3 gap-6 mb-12">
            {t.students.stats.map((stat, i) => (
              <div key={i} className="bg-gradient-to-br from-olive-50 to-stone-50 rounded-2xl p-8 text-center border border-olive-100 shadow-sm">
                <div className="text-4xl font-extrabold text-olive-700 mb-2">{stat.value}</div>
                <div className="text-sm text-neutral-600">{stat.label}</div>
              </div>
            ))}
          </div>

          <div className="grid md:grid-cols-2 gap-8">
            <div className="bg-white rounded-2xl p-8 border border-olive-100 shadow-sm">
              <h3 className="text-2xl font-bold mb-4 text-olive-700">{t.students.profile.title}</h3>
              <p className="text-neutral-700 leading-relaxed">{t.students.profile.text}</p>
            </div>
            <div className="bg-white rounded-2xl p-8 border border-olive-100 shadow-sm">
              <h3 className="text-2xl font-bold mb-4 text-olive-700">{t.students.impact.title}</h3>
              <div className="grid sm:grid-cols-2 gap-3">
                {t.students.impact.items.map((item, i) => (
                  <div key={i} className="flex items-start gap-2">
                    <span className="text-olive-600 mt-0.5">•</span>
                    <span className="text-neutral-700 text-sm">{item}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* SCHOLARSHIPS */}
      <section id="scholarships" className="py-20 bg-gradient-to-br from-olive-600/10 via-olive-50/50 to-stone-100/30 relative">
        <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-transparent via-olive-400/50 to-transparent"></div>
        <div className="max-w-6xl mx-auto px-4">
          <div className="mb-12 text-center">
            <h2 className="text-4xl font-bold mb-4 text-olive-800">{t.scholarships.heading}</h2>
            <p className="text-lg text-neutral-600 max-w-2xl mx-auto">{t.scholarships.subtitle}</p>
          </div>

          <div className="grid md:grid-cols-2 gap-8 mb-8">
            <div className="bg-white rounded-2xl p-8 border border-olive-100 shadow-sm">
              <p className="text-neutral-700 mb-6 leading-relaxed">{t.scholarships.description}</p>
              <ul className="space-y-3">
                {t.scholarships.bullets.map((bullet, i) => (
                  <li key={i} className="flex items-start gap-3">
                    <span className="text-olive-600 mt-1 text-xl">✓</span>
                    <span className="text-neutral-700">{bullet}</span>
                  </li>
                ))}
              </ul>
            </div>
            <div className="bg-white rounded-2xl p-8 border border-olive-100 shadow-sm">
              <h3 className="text-xl font-bold mb-4 text-olive-700">{t.scholarships.benefits.title}</h3>
              <ul className="space-y-3">
                {t.scholarships.benefits.items.map((item, i) => (
                  <li key={i} className="flex items-start gap-3">
                    <span className="text-olive-600 mt-1">•</span>
                    <span className="text-neutral-700">{item}</span>
                  </li>
                ))}
              </ul>
            </div>
          </div>

          <div className="text-center">
            <a 
              href="mailto:contacto@corazondefuego.org?subject=Apadrinamiento%20Escola%20M%C3%A3os%20Unidas" 
              className="inline-block px-8 py-4 rounded-lg bg-gradient-to-r from-olive-600 to-olive-700 text-white text-lg font-semibold hover:from-olive-700 hover:to-olive-800 transition-colors shadow-lg"
            >
              🤝 {t.scholarships.cta}
            </a>
          </div>
        </div>
      </section>

      {/* CONTACT */}
      <section id="contact" className="py-20 bg-white relative">
        <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-olive-200 via-olive-300/50 to-olive-200"></div>
        <div className="max-w-6xl mx-auto px-4 grid md:grid-cols-2 gap-12">
          <div>
            <h2 className="text-4xl font-bold mb-6 text-olive-800">{t.contact.heading}</h2>
            <div className="space-y-4 text-neutral-700">
              <div>
                <p className="font-semibold text-olive-700 mb-1">{t.contact.church}</p>
                <p>{t.contact.city}</p>
              </div>
              <div className="mt-6">
                <p className="font-semibold text-olive-700 mb-3">{t.contact.channels}</p>
                <p>📸 <a className="underline hover:text-olive-600" href="https://www.instagram.com/corazondefuegoiglesia/" target="_blank" rel="noreferrer">{t.contact.instagram}</a></p>
                <p>✉️ <a className="underline hover:text-olive-600" href="mailto:contacto@corazondefuego.org">{t.contact.email}</a></p>
              </div>
              <div className="mt-6">
                <h3 className="font-semibold text-olive-700 mb-3">{t.contact.mapTitle}</h3>
                <div className="rounded-xl overflow-hidden border border-olive-100 shadow-sm">
                  <iframe
                    title="Mapa Escola Mãos Unidas"
                    src="https://www.google.com/maps/embed?pb=!1m18!1m12!1m3!1d3882.3397039003003!2d35.257344776890065!3d-13.329132387020199!2m3!1f0!2f0!3f0!3m2!1i1024!2i768!4f13.1!3m3!1m2!1s0x18e08bac6c042ff7%3A0x5992466f88994692!2sescola%20primaria%20maos%20unidas!5e0!3m2!1sen!2sar!4v1761923352549!5m2!1sen!2sar"
                    width="100%"
                    height="250"
                    style={{ border: 0 }}
                    allowFullScreen
                    loading="lazy"
                    referrerPolicy="no-referrer-when-downgrade"
                  />
                </div>
              </div>
            </div>
          </div>
          <div className="bg-gradient-to-br from-olive-50/50 to-stone-50/50 rounded-2xl border border-olive-100 shadow-sm">
            <div className="px-8 py-6 border-b border-olive-100">
              <h3 className="font-bold text-xl text-olive-800">{t.contact.formTitle}</h3>
            </div>
            <div className="p-8">
              <form action="https://formspree.io/f/xyzzzzzz" method="POST" className="space-y-4">
                <div>
                  <label className="text-sm font-medium text-neutral-700" htmlFor="name">{t.contact.formName}</label>
                  <input id="name" name="name" required className="mt-1 w-full rounded-lg border border-olive-200 px-4 py-2 focus:border-olive-400 focus:ring-2 focus:ring-olive-100" />
                </div>
                <div>
                  <label className="text-sm font-medium text-neutral-700" htmlFor="email">{t.contact.formEmail}</label>
                  <input id="email" name="email" type="email" required className="mt-1 w-full rounded-lg border border-olive-200 px-4 py-2 focus:border-olive-400 focus:ring-2 focus:ring-olive-100" />
                </div>
                <div>
                  <label className="text-sm font-medium text-neutral-700" htmlFor="message">{t.contact.formMsg}</label>
                  <textarea id="message" name="message" rows={4} className="mt-1 w-full rounded-lg border border-olive-200 px-4 py-2 focus:border-olive-400 focus:ring-2 focus:ring-olive-100" />
                </div>
                <button type="submit" className="w-full px-6 py-3 rounded-lg bg-gradient-to-r from-olive-600 to-olive-700 text-white font-semibold hover:from-olive-700 hover:to-olive-800 transition-colors shadow-md">
                  ✉️ {t.contact.formSubmit}
                </button>
                <p className="text-xs text-neutral-500 mt-2">{t.contact.disclaimer}</p>
              </form>
            </div>
          </div>
        </div>
      </section>

      {/* FOOTER */}
      <footer className="border-t border-olive-100 bg-gradient-to-b from-olive-50/30 to-white">
        <div className="max-w-6xl mx-auto px-4 py-8 flex flex-col md:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <img src="/assets/logo-escola-maos-unidas.png" alt="Logo Escola Mãos Unidas" className="h-10 w-10 rounded-full object-cover" />
            <p className="text-sm text-neutral-600">© {new Date().getFullYear()} Escola Mãos Unidas — Lichinga, Mozambique</p>
          </div>
          <a href="https://www.instagram.com/corazondefuegoiglesia/" target="_blank" rel="noreferrer" className="inline-flex items-center gap-2 text-sm underline hover:text-olive-600 transition-colors">
            📸 Instagram
          </a>
        </div>
      </footer>
    </div>
  );
}

