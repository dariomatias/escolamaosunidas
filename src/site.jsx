import React, { useMemo, useState, useEffect } from "react";
import { Link, useParams } from "react-router-dom";
import {
  BLOG_COPY,
  BLOG_POSTS,
  formatBlogDate,
  getBlogPostBySlug,
  getLocalizedBlogPost,
} from "./data/blogPosts";

// Sitio institucional de la Escola Mãos Unidas

const COPY = {
  es: {
    nav: { 
      school: "La Escuela", 
      education: "Sistema Educativo", 
      students: "Los Estudiantes", 
      socialAssistance: "Asistencia Social",
      scholarships: "Becas",
      admissions: "Admisiones",
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
      history: {
        title: "Historia de la Escola Primária Manos Unidas",
        toggleLabel: "Ver como línea de tiempo",
        timelineLabel: "Ver como tarjetas",
        timeline: [
          {
            year: "2010",
            title: "Los comienzos",
            description: "Inicio de clases particulares de refuerzo escolar para niños y jóvenes",
          },
          {
            year: "2012",
            title: "Alfabetización de adultos",
            description: "Se inician clases de alfabetización específicamente con mujeres y jóvenes. Surge la necesidad de ofrecer una alternativa cristiana ante la realidad del barrio",
          },
          {
            year: "2014",
            title: "Jardín Infantil",
            description: "Inauguración del Jardín Infantil Manos Unidas con autorización de Acción Social en el barrio Josina Machel",
          },
          {
            year: "2016",
            title: "Solicitud de autorización",
            description: "Se ingresan los documentos al Ministerio de Educación de la Provincia para dar inicio a la Escola Primária Manos Unidas",
          },
          {
            year: "2017",
            title: "Fundación oficial",
            description: "1 de febrero - Inicio de clases como ESCOLA PRIMÁRIA MANOS UNIDAS con autorización definitiva del Ministerio de Educación",
          },
          {
            year: "2018",
            title: "Expansión",
            description: "Compra del terreno trasero donde funciona el 2° ciclo",
          },
        ],
        origin: {
          title: "Los comienzos",
          text: "El proyecto comenzó en 2010 con clases particulares de refuerzo escolar para niños y jóvenes. En 2012 se iniciaron clases de alfabetización para adultos, específicamente con mujeres y jóvenes. Viendo que los niños del barrio iban a MADRASA (una casa) donde les enseñan el Corán, surgió la necesidad de ofrecer una alternativa cristiana.",
        },
        kindergarten: {
          title: "Jardín Infantil",
          text: "En 2014 se dio inicio al Jardín Infantil Manos Unidas con autorización de Acción Social en el barrio Josina Machel en la ciudad de Lichinga, Niassa, Mozambique.",
        },
        school: {
          title: "Fundación de la Escuela Primaria",
          text: "Viendo la preocupación e interés de los padres que querían que sus hijos continuaran en la escuela, decidimos en 2016 ingresar los documentos al Ministerio de Educación de la Provincia pidiendo autorización para dar inicio a la Escola Primária Manos Unidas. La autorización definitiva fue otorgada (no se tiene que renovar). Así dimos inicio a las clases el 1 de febrero de 2017 como ESCOLA PRIMÁRIA MANOS UNIDAS.",
        },
        characteristics: {
          title: "Características",
          text: "La escuela funciona con curriculum del gobierno, con maestros nacionales y alumnos sin distinción de raza, credo o color, dándoles una educación integral y de calidad con valores cristianos en período de mañana de 7h a 12h.",
        },
        staff: {
          title: "Plantel",
          text: "El plantel de la escuela está formado por: personal docente, personal no docente, padres encargados de educación y directora.",
        },
        facilities: {
          title: "Instalaciones",
          blocks: "La escuela se compone de tres bloques:",
          block1: "Bloque frente a la entrada (1° ciclo)",
          block2: "Bloque trasero (2° ciclo) - comprado en 2018",
          block3: "Gimnasio",
          roomsTitle: "Espacios y servicios:",
          room1: "7 salas de estudios",
          room2: "1 sala de profesores",
          room3: "1 sala comedor",
          room4: "Secretaría",
          room5: "5 baños",
          infrastructure: "Todas las salas cuentan con mobiliario completo. Los baños tienen sanitarios, agua canalizada y electricidad.",
        },
      },
      mission: {
        title: "Nuestra Misión",
        text: "Proporcionar educación académica de calidad y formación en valores bíblicos a niños que de otra manera no tendrían acceso a la educación. Creemos que cada niño merece una oportunidad de desarrollar su potencial y construir un futuro mejor.",
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
          "Preescolar",
          "1er Grado",
          "2do Grado",
          "3º Grado",
          "4º Grado",
          "5º Grado",
          "6º Grado",
        ],
      },
      subjectsTitle: "Materias que ofrecemos",
      subjects: [
        { title: "Portugués", text: "Desarrollo de competencias comunicativas escritas y orales." },
        { title: "Matemáticas", text: "Pensamiento lógico y resolución de problemas prácticos." },
        { title: "Ciencias", text: "Exploración del mundo natural y científico." },
        { title: "Lectura y Arte", text: "Expresión creativa y fomento de la lectura." },
        { title: "Educación física", text: "Desarrollo físico, coordinación y hábitos saludables." },
        { title: "Inglés", text: "Desarrollo de competencias comunicativas en inglés." },
        { title: "Informática", text: "Uso de computadoras y habilidades tecnológicas." },
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
          "Desarrollo de autoestima y confianza",
          "Formación en valores cristianos",
          "Acompañamiento personalizado",
          "Preparación para futuros desafíos",
        ],
      },
    },
    socialAssistance: {
      heading: "Asistencia Social",
      subtitle: "Servir a nuestra comunidad con amor y compasión",
      description: "Como parte de nuestro programa escolar, realizamos visitas regulares a hospitales para llevar esperanza y apoyo a quienes más lo necesitan.",
      visits: {
        title: "Visitas Hospitalarias",
        text: "Junto con nuestros maestros, los estudiantes de 4º, 5º y 6º grado (los más grandes) realizan visitas a pabellones de pediatría y maternidad en hospitales locales.",
      },
      donations: {
        title: "Donaciones",
        text: "En cada visita, nuestros estudiantes siempre llevan donaciones para las personas que las necesitan:",
        items: [
          "Jabón",
          "Desodorante",
          "Artículos de higiene personal",
        ],
      },
      activities: {
        title: "Actividades",
        text: "Durante las visitas, los estudiantes realizan actividades y comparten momentos especiales con los pacientes, llevando alegría y compañía como parte de su formación en valores de servicio.",
      },
    },
    scholarships: {
      heading: "Programa de Becas",
      subtitle: "Apadrina un niño y transforma su vida",
      description: "Tu aporte mensual cubre todos los gastos necesarios para que un niño reciba una educación completa:",
      bullets: [
        "Cuota escolar y materiales didácticos completos",
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
    admissions: {
      heading: "Admisiones 2026",
      subtitle: "Inscripciones abiertas para el ciclo lectivo 2026",
      description: "Estamos aceptando nuevas inscripciones para el ciclo lectivo 2026. Si estás interesado en que tu hijo o hija forme parte de nuestra comunidad educativa, completa el formulario a continuación y nos pondremos en contacto contigo.",
      scholarshipsLink: "¿Necesitas ayuda económica? Consulta nuestro",
      scholarshipsLinkText: "Programa de Becas",
      formTitle: "Formulario de Inscripción",
      studentFirstName: "Nombre del Estudiante",
      studentLastName: "Apellido del Estudiante",
      birthDate: "Fecha de Nacimiento",
      grade: "Grado/Nivel de Interés",
      parentName: "Nombre del Tutor/Responsable",
      parentEmail: "Email del Tutor/Responsable",
      parentPhone: "Teléfono del Tutor/Responsable",
      address: "Dirección (opcional)",
      notes: "Notas Adicionales (opcional)",
      submit: "Enviar Solicitud",
      disclaimer: "Al enviar este formulario, nos pondremos en contacto contigo a la brevedad posible.",
      success: "¡Solicitud enviada exitosamente! Te contactaremos pronto.",
      error: "Error al enviar la solicitud. Por favor, intenta nuevamente.",
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
      disclaimer: "Este formulario usa un servicio externo. Estén atentos a una respuesta pronta de nuestra parte y revisen las casillas de correo no deseado o spam.",
    },
    footer: {
      copyright: "Desarrollado por",
      company: "NeuroIT Solutions",
    },
  },
  pt: {
    nav: { 
      school: "A Escola", 
      education: "Sistema Educacional", 
      students: "Os Estudantes", 
      socialAssistance: "Assistência Social",
      scholarships: "Bolsas",
      admissions: "Admissões",
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
      history: {
        title: "História da Escola Primária Manos Unidas",
        toggleLabel: "Ver como linha do tempo",
        timelineLabel: "Ver como cartões",
        timeline: [
          {
            year: "2010",
            title: "Os começos",
            description: "Início de aulas particulares de reforço escolar para crianças e jovens",
          },
          {
            year: "2012",
            title: "Alfabetização de adultos",
            description: "Se iniciam aulas de alfabetização especificamente com mulheres e jovens. Surge a necessidade de oferecer uma alternativa cristã ante a realidade do bairro",
          },
          {
            year: "2014",
            title: "Jardim Infantil",
            description: "Inauguração do Jardim Infantil Manos Unidas com autorização de Ação Social no bairro Josina Machel",
          },
          {
            year: "2016",
            title: "Solicitação de autorização",
            description: "Se entram com os documentos no Ministério de Educação da Província para dar início à Escola Primária Manos Unidas",
          },
          {
            year: "2017",
            title: "Fundação oficial",
            description: "1 de fevereiro - Início das aulas como ESCOLA PRIMÁRIA MANOS UNIDAS com autorização definitiva do Ministério de Educação",
          },
          {
            year: "2018",
            title: "Expansão",
            description: "Compra do terreno de trás onde funciona o 2° ciclo",
          },
        ],
        origin: {
          title: "Os começos",
          text: "O projeto começou em 2010 com aulas particulares de reforço escolar para crianças e jovens. Em 2012 se iniciaram aulas de alfabetização para adultos, especificamente com mulheres e jovens. Vendo que as crianças do bairro iam para MADRASA (uma casa) onde lhes ensinam o Corão, surgiu a necessidade de oferecer uma alternativa cristã.",
        },
        kindergarten: {
          title: "Jardim Infantil",
          text: "Em 2014 se deu início ao Jardim Infantil Manos Unidas com autorização de Ação Social no bairro Josina Machel na cidade de Lichinga, Niassa, Moçambique.",
        },
        school: {
          title: "Fundação da Escola Primária",
          text: "Vendo a preocupação e interesse dos pais que queriam que seus filhos continuassem na escola, decidimos em 2016 entrar com os documentos no Ministério de Educação da Província pedindo autorização para dar início à Escola Primária Manos Unidas. A autorização definitiva foi concedida (não se tem que renovar). Assim demos início às aulas no dia 1 de fevereiro de 2017 como ESCOLA PRIMÁRIA MANOS UNIDAS.",
        },
        characteristics: {
          title: "Características",
          text: "A escola funciona com currículo do governo, com professores nacionais e alunos sem distinção de raça, credo ou cor, oferecendo-lhes uma educação integral e de qualidade com valores cristãos no período da manhã de 7h às 12h.",
        },
        staff: {
          title: "Equipe",
          text: "A equipe da escola está formada por: pessoal docente, pessoal não docente, pais encarregados de educação e diretora.",
        },
        facilities: {
          title: "Instalações",
          blocks: "A escola se compõe de três blocos:",
          block1: "Bloco na frente da entrada (1° ciclo)",
          block2: "Bloco de trás (2° ciclo) - comprado em 2018",
          block3: "Ginásio",
          roomsTitle: "Espaços e serviços:",
          room1: "7 salas de estudos",
          room2: "1 sala de professores",
          room3: "1 sala refeitório",
          room4: "Secretaria",
          room5: "5 banheiros",
          infrastructure: "Todas as salas contam com mobiliário completo. Os banheiros têm sanitários, água encanada e eletricidade.",
        },
      },
      mission: {
        title: "Nossa Missão",
        text: "Fornecer educação acadêmica de qualidade e formação em valores bíblicos a crianças que, de outra forma, não teriam acesso à educação. Acreditamos que cada criança merece uma oportunidade de desenvolver seu potencial e construir um futuro melhor.",
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
        { title: "Português", text: "Desenvolvimento de competências comunicativas escritas e orais." },
        { title: "Matemática", text: "Pensamento lógico e resolução de problemas práticos." },
        { title: "Ciências", text: "Exploração do mundo natural e científico." },
        { title: "Leitura e Arte", text: "Expressão criativa e promoção da leitura." },
        { title: "Ginástica", text: "Desenvolvimento físico, coordenação e hábitos saudáveis." },
        { title: "Inglês", text: "Desenvolvimento de competências comunicativas em inglês." },
        { title: "Informática", text: "Uso de computadores e habilidades tecnológicas." },
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
          "Desenvolvimento de autoestima e confiança",
          "Formação em valores cristãos",
          "Acompanhamento personalizado",
          "Preparação para desafios futuros",
        ],
      },
    },
    socialAssistance: {
      heading: "Assistência Social",
      subtitle: "Servir nossa comunidade com amor e compaixão",
      description: "Como parte do nosso programa escolar, realizamos visitas regulares a hospitais para levar esperança e apoio a quem mais precisa.",
      visits: {
        title: "Visitas Hospitalares",
        text: "Junto com nossos professores, os estudantes da 4ª, 5ª e 6ª classe (os mais velhos) realizam visitas a pavilhões de pediatria e maternidade em hospitais locais.",
      },
      donations: {
        title: "Doações",
        text: "Em cada visita, nossos estudantes sempre levam doações para as pessoas que precisam:",
        items: [
          "Sabão",
          "Desodorante",
          "Artigos de higiene pessoal",
        ],
      },
      activities: {
        title: "Atividades",
        text: "Durante as visitas, os estudantes realizam atividades e compartilham momentos especiais com os pacientes, levando alegria e companhia como parte de sua formação em valores de serviço.",
      },
    },
    scholarships: {
      heading: "Programa de Bolsas",
      subtitle: "Apadrinhe uma criança e transforme sua vida",
      description: "Sua contribuição mensal cobre todas as despesas necessárias para que uma criança receba educação completa:",
      bullets: [
        "Mensalidade e materiais didáticos completos",
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
    admissions: {
      heading: "Admissões 2026",
      subtitle: "Inscrições abertas para o ano letivo 2026",
      description: "Estamos aceitando novas inscrições para o ano letivo 2026. Se você está interessado em que seu filho ou filha faça parte da nossa comunidade educacional, preencha o formulário abaixo e entraremos em contato.",
      scholarshipsLink: "Precisa de ajuda financeira? Consulte nosso",
      scholarshipsLinkText: "Programa de Bolsas",
      formTitle: "Formulário de Inscrição",
      studentFirstName: "Nome do Estudante",
      studentLastName: "Sobrenome do Estudante",
      birthDate: "Data de Nascimento",
      grade: "Série/Nível de Interesse",
      parentName: "Nome do Tutor/Responsável",
      parentEmail: "Email do Tutor/Responsável",
      parentPhone: "Telefone do Tutor/Responsável",
      address: "Endereço (opcional)",
      notes: "Observações Adicionais (opcional)",
      submit: "Enviar Solicitação",
      disclaimer: "Ao enviar este formulário, entraremos em contato o mais breve possível.",
      success: "Solicitação enviada com sucesso! Entraremos em contato em breve.",
      error: "Erro ao enviar a solicitação. Por favor, tente novamente.",
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
      disclaimer: "Este formulário usa um serviço externo. Fiquem atentos a uma resposta rápida de nossa parte e verifiquem as caixas de correio não desejado ou spam.",
    },
    footer: {
      copyright: "Desenvolvido por",
      company: "NeuroIT Solutions",
    },
  },
  en: {
    nav: { 
      school: "The School", 
      education: "Educational System", 
      students: "The Students", 
      socialAssistance: "Social Assistance",
      scholarships: "Scholarships",
      admissions: "Admissions",
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
      history: {
        title: "History of Escola Primária Manos Unidas",
        toggleLabel: "View as timeline",
        timelineLabel: "View as cards",
        timeline: [
          {
            year: "2010",
            title: "The beginnings",
            description: "Start of private tutoring classes for school reinforcement for children and youth",
          },
          {
            year: "2012",
            title: "Adult literacy",
            description: "Adult literacy classes begin specifically with women and youth. The need arises to offer a Christian alternative to the neighborhood reality",
          },
          {
            year: "2014",
            title: "Kindergarten",
            description: "Inauguration of Manos Unidas Kindergarten with authorization from Social Action in the Josina Machel neighborhood",
          },
          {
            year: "2016",
            title: "Authorization request",
            description: "Documents are submitted to the Provincial Ministry of Education to begin Escola Primária Manos Unidas",
          },
          {
            year: "2017",
            title: "Official foundation",
            description: "February 1 - Classes begin as ESCOLA PRIMÁRIA MANOS UNIDAS with definitive authorization from the Ministry of Education",
          },
          {
            year: "2018",
            title: "Expansion",
            description: "Purchase of the back lot where the 2nd cycle operates",
          },
        ],
        origin: {
          title: "The beginnings",
          text: "The project began in 2010 with private tutoring classes for school reinforcement for children and youth. In 2012, adult literacy classes were initiated, specifically with women and youth. Seeing that children in the neighborhood were going to MADRASA (a house) where they are taught the Koran, arose the need to offer a Christian alternative.",
        },
        kindergarten: {
          title: "Kindergarten",
          text: "In 2014, Manos Unidas Kindergarten was inaugurated with authorization from Social Action in the Josina Machel neighborhood in the city of Lichinga, Niassa, Mozambique.",
        },
        school: {
          title: "Foundation of Primary School",
          text: "Seeing the concern and interest of parents who wanted their children to continue in school, in 2016 we decided to submit documents to the Provincial Ministry of Education requesting authorization to begin Escola Primária Manos Unidas. The definitive authorization was granted (does not need to be renewed). Classes began on February 1, 2017 as ESCOLA PRIMÁRIA MANOS UNIDAS.",
        },
        characteristics: {
          title: "Characteristics",
          text: "The school operates with a government curriculum, with national teachers and students without distinction of race, creed, or color, providing them with an integral and quality education with Christian values in the morning period from 7h to 12h.",
        },
        staff: {
          title: "Staff",
          text: "The school staff is formed by: teaching staff, non-teaching staff, parents in charge of education, and principal.",
        },
        facilities: {
          title: "Facilities",
          blocks: "The school consists of three blocks:",
          block1: "Block at the entrance (1st cycle)",
          block2: "Back block (2nd cycle) - purchased in 2018",
          block3: "Gymnasium",
          roomsTitle: "Spaces and services:",
          room1: "7 study rooms",
          room2: "1 teachers' room",
          room3: "1 dining room",
          room4: "Secretariat",
          room5: "5 bathrooms",
          infrastructure: "All rooms have complete furniture. Bathrooms have toilets, running water and electricity.",
        },
      },
      mission: {
        title: "Our Mission",
        text: "To provide quality academic education and biblical values formation to children who would otherwise not have access to education. We believe that every child deserves an opportunity to develop their potential and build a better future.",
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
        { title: "Portuguese", text: "Development of written and oral communication skills." },
        { title: "Mathematics", text: "Logical thinking and practical problem solving." },
        { title: "Sciences", text: "Exploration of the natural and scientific world." },
        { title: "Reading and Arts", text: "Creative expression and reading promotion." },
        { title: "Gym", text: "Physical development, coordination, and healthy habits." },
        { title: "English", text: "Development of English communication skills." },
        { title: "Informatics", text: "Computer usage and technological skills." },
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
          "Development of self-esteem and confidence",
          "Formation in Christian values",
          "Personalized accompaniment",
          "Preparation for future challenges",
        ],
      },
    },
    socialAssistance: {
      heading: "Social Assistance",
      subtitle: "Serving our community with love and compassion",
      description: "As part of our school program, we regularly visit hospitals to bring hope and support to those who need it most.",
      visits: {
        title: "Hospital Visits",
        text: "Together with our teachers, students from 4th, 5th, and 6th grade (the oldest) make visits to pediatric and maternity pavilions in local hospitals.",
      },
      donations: {
        title: "Donations",
        text: "On each visit, our students always bring donations for people in need:",
        items: [
          "Soap",
          "Deodorant",
          "Personal hygiene items",
        ],
      },
      activities: {
        title: "Activities",
        text: "During the visits, students engage in activities and share special moments with patients, bringing joy and companionship as part of their formation in service values.",
      },
    },
    scholarships: {
      heading: "Scholarship Program",
      subtitle: "Sponsor a child and transform their life",
      description: "Your monthly contribution covers all necessary expenses for a child to receive complete education:",
      bullets: [
        "School fees and complete educational materials",
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
    admissions: {
      heading: "Admissions 2026",
      subtitle: "Open enrollment for the 2026 academic year",
      description: "We are accepting new applications for the 2026 academic year. If you are interested in having your child become part of our educational community, please fill out the form below and we will contact you.",
      scholarshipsLink: "Need financial assistance? Check out our",
      scholarshipsLinkText: "Scholarship Program",
      formTitle: "Application Form",
      studentFirstName: "Student First Name",
      studentLastName: "Student Last Name",
      birthDate: "Date of Birth",
      grade: "Grade/Level of Interest",
      parentName: "Parent/Guardian Name",
      parentEmail: "Parent/Guardian Email",
      parentPhone: "Parent/Guardian Phone",
      address: "Address (optional)",
      notes: "Additional Notes (optional)",
      submit: "Submit Application",
      disclaimer: "By submitting this form, we will contact you as soon as possible.",
      success: "Application sent successfully! We will contact you soon.",
      error: "Error sending application. Please try again.",
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
      disclaimer: "This form uses an external service. Please be attentive to a prompt response from us and check your spam or junk mail folders.",
    },
    footer: {
      copyright: "Developed by",
      company: "NeuroIT Solutions",
    },
  },
};

const SHOW_BLOG_UPDATES_ON_HOME = false;

const PUBLIC_LANGUAGES = [
  { code: "pt", name: "Português", flag: "🇵🇹" },
  { code: "es", name: "Español", flag: "🇪🇸" },
  { code: "en", name: "English", flag: "🇺🇸" },
];

function BlogLanguageSelector({ lang, setLang }) {
  return (
    <div className="flex items-center gap-2">
      {PUBLIC_LANGUAGES.map((language) => (
        <button
          key={language.code}
          onClick={() => setLang(language.code)}
          className={`h-9 min-w-9 rounded-lg border px-2 text-sm transition-colors ${
            lang === language.code
              ? "border-olive-500 bg-olive-50 text-olive-800"
              : "border-olive-200 bg-white text-neutral-600 hover:bg-olive-50"
          }`}
          title={language.name}
          aria-label={language.name}
        >
          {language.flag}
        </button>
      ))}
    </div>
  );
}

function BlogShell({ children, lang, setLang, t }) {
  return (
    <div className="min-h-screen bg-stone-50 text-neutral-900">
      <header className="sticky top-0 z-40 border-b border-olive-100 bg-white/95 backdrop-blur">
        <div className="mx-auto flex max-w-6xl items-center justify-between gap-4 px-4 py-4">
          <Link to="/" className="flex items-center gap-3">
            <img
              src="/assets/logo-escola-maos-unidas.png"
              alt="Logo Escola Mãos Unidas"
              className="h-10 w-10 rounded-full object-cover"
            />
            <span className="text-lg font-extrabold tracking-tight text-olive-800">Escola Mãos Unidas</span>
          </Link>
          <div className="flex items-center gap-3">
            <Link
              to="/"
              className="hidden rounded-lg border border-olive-200 px-4 py-2 text-sm font-medium text-olive-800 transition-colors hover:bg-olive-50 sm:inline-flex"
            >
              {t.backHome}
            </Link>
            <BlogLanguageSelector lang={lang} setLang={setLang} />
          </div>
        </div>
      </header>
      <main>{children}</main>
      <footer className="border-t border-olive-100 bg-white">
        <div className="mx-auto flex max-w-6xl flex-col items-center justify-between gap-4 px-4 py-8 md:flex-row">
          <div className="flex items-center gap-3">
            <img
              src="/assets/logo-escola-maos-unidas.png"
              alt="Logo Escola Mãos Unidas"
              className="h-10 w-10 rounded-full object-cover"
            />
            <p className="text-sm text-neutral-600">© {new Date().getFullYear()} Escola Mãos Unidas</p>
          </div>
          <Link to="/" className="text-sm font-medium text-olive-700 underline hover:text-olive-800">
            {t.backHome}
          </Link>
        </div>
      </footer>
    </div>
  );
}

function BlogMeta({ post, lang, t }) {
  return (
    <div className="flex flex-wrap items-center gap-3 text-sm text-neutral-600">
      <span className="rounded-lg bg-olive-100 px-3 py-1 font-semibold text-olive-800">{post.category}</span>
      <span>{t.published} {formatBlogDate(post.publishedAt, lang)}</span>
      <span>{post.readTime}</span>
    </div>
  );
}

function BlogPostTile({ post, lang, t }) {
  const localizedPost = getLocalizedBlogPost(post, lang);

  return (
    <article className="overflow-hidden rounded-lg border border-olive-100 bg-white shadow-sm transition-shadow hover:shadow-md">
      <Link to={`/blog/${post.slug}`} className="block">
        <div className="aspect-[16/9] overflow-hidden bg-olive-50">
          <img
            src={localizedPost.heroImage}
            alt={localizedPost.imageAlt}
            className="h-full w-full object-cover transition-transform duration-300 hover:scale-105"
          />
        </div>
      </Link>
      <div className="space-y-4 p-5">
        <BlogMeta post={localizedPost} lang={lang} t={t} />
        <div>
          <h2 className="text-xl font-bold leading-snug text-olive-900">
            <Link to={`/blog/${post.slug}`} className="hover:text-olive-700">
              {localizedPost.title}
            </Link>
          </h2>
          <p className="mt-2 text-sm leading-relaxed text-neutral-700">{localizedPost.excerpt}</p>
        </div>
        <Link
          to={`/blog/${post.slug}`}
          className="inline-flex rounded-lg bg-olive-700 px-4 py-2 text-sm font-semibold text-white transition-colors hover:bg-olive-800"
        >
          {t.readPost}
        </Link>
      </div>
    </article>
  );
}

function BlogContent({ blocks }) {
  return (
    <div className="space-y-6">
      {blocks.map((block, index) => {
        if (block.type === "heading") {
          return (
            <h2 key={index} className="pt-3 text-2xl font-bold text-olive-800">
              {block.text}
            </h2>
          );
        }

        if (block.type === "list") {
          return (
            <ul key={index} className="space-y-3">
              {block.items.map((item, itemIndex) => (
                <li key={itemIndex} className="flex gap-3 text-neutral-700">
                  <span className="mt-1 h-2 w-2 flex-none rounded-full bg-olive-500" />
                  <span>{item}</span>
                </li>
              ))}
            </ul>
          );
        }

        return (
          <p key={index} className="text-lg leading-relaxed text-neutral-700">
            {block.text}
          </p>
        );
      })}
    </div>
  );
}

function BlogLandingTiles({ lang }) {
  if (!SHOW_BLOG_UPDATES_ON_HOME) {
    return null;
  }

  const t = BLOG_COPY[lang] || BLOG_COPY.pt;
  const landingPosts = BLOG_POSTS.slice(0, 3);

  return (
    <section id="updates" className="bg-white py-16">
      <div className="mx-auto max-w-6xl px-4">
        <div className="mb-8 flex flex-col justify-between gap-4 md:flex-row md:items-end">
          <div>
            <p className="mb-2 text-sm font-semibold uppercase tracking-wide text-olive-600">{t.eyebrow}</p>
            <h2 className="text-3xl font-bold text-olive-800">{t.landingTitle}</h2>
            <p className="mt-3 max-w-2xl text-neutral-600">{t.landingSubtitle}</p>
          </div>
          <Link
            to="/blog"
            className="inline-flex w-fit rounded-lg border border-olive-300 px-4 py-2 text-sm font-semibold text-olive-800 transition-colors hover:bg-olive-50"
          >
            {t.landingCta}
          </Link>
        </div>
        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
          {landingPosts.map((post) => (
            <BlogPostTile key={post.slug} post={post} lang={lang} t={t} />
          ))}
        </div>
      </div>
    </section>
  );
}

export function BlogIndexPage() {
  const [lang, setLang] = useState("pt");
  const t = BLOG_COPY[lang] || BLOG_COPY.pt;

  return (
    <BlogShell lang={lang} setLang={setLang} t={t}>
      <section className="border-b border-olive-100 bg-gradient-to-br from-olive-50 via-white to-stone-100">
        <div className="mx-auto grid max-w-6xl gap-10 px-4 py-16 md:grid-cols-[1.05fr_0.95fr] md:items-center md:py-20">
          <div>
            <p className="mb-3 text-sm font-semibold uppercase tracking-wide text-olive-600">{t.eyebrow}</p>
            <h1 className="text-4xl font-extrabold leading-tight text-olive-900 md:text-5xl">{t.title}</h1>
            <p className="mt-5 max-w-2xl text-lg leading-relaxed text-neutral-700">{t.description}</p>
          </div>
          <div className="overflow-hidden rounded-lg border border-olive-200 bg-white shadow-lg">
            <img
              src="/assets/WhatsApp Image 2025-11-01 at 16.58.02_4529292f.jpg"
              alt="Escola Mãos Unidas"
              className="aspect-[4/3] h-full w-full object-cover"
            />
          </div>
        </div>
      </section>
      <section className="py-14">
        <div className="mx-auto max-w-6xl px-4">
          <div className="mb-8">
            <h2 className="text-2xl font-bold text-olive-800">{t.allPosts}</h2>
          </div>
          <div className="grid gap-6 md:grid-cols-2">
            {BLOG_POSTS.map((post) => (
              <BlogPostTile key={post.slug} post={post} lang={lang} t={t} />
            ))}
          </div>
        </div>
      </section>
    </BlogShell>
  );
}

export function BlogPostPage() {
  const [lang, setLang] = useState("pt");
  const { slug } = useParams();
  const t = BLOG_COPY[lang] || BLOG_COPY.pt;
  const post = getBlogPostBySlug(slug);

  if (!post) {
    return (
      <BlogShell lang={lang} setLang={setLang} t={t}>
        <section className="mx-auto max-w-3xl px-4 py-20 text-center">
          <p className="mb-3 text-sm font-semibold uppercase tracking-wide text-olive-600">{t.eyebrow}</p>
          <h1 className="text-4xl font-extrabold text-olive-900">{t.notFoundTitle}</h1>
          <p className="mt-4 text-neutral-700">{t.notFoundText}</p>
          <Link
            to="/blog"
            className="mt-8 inline-flex rounded-lg bg-olive-700 px-5 py-3 text-sm font-semibold text-white transition-colors hover:bg-olive-800"
          >
            {t.backToBlog}
          </Link>
        </section>
      </BlogShell>
    );
  }

  const localizedPost = getLocalizedBlogPost(post, lang);

  return (
    <BlogShell lang={lang} setLang={setLang} t={t}>
      <article>
        <header className="border-b border-olive-100 bg-white">
          <div className="mx-auto max-w-4xl px-4 py-12 md:py-16">
            <Link to="/blog" className="mb-8 inline-flex text-sm font-semibold text-olive-700 underline hover:text-olive-900">
              {t.backToBlog}
            </Link>
            <BlogMeta post={localizedPost} lang={lang} t={t} />
            <h1 className="mt-5 text-4xl font-extrabold leading-tight text-olive-900 md:text-5xl">{localizedPost.title}</h1>
            <p className="mt-5 text-xl leading-relaxed text-neutral-700">{localizedPost.excerpt}</p>
          </div>
          <div className="mx-auto max-w-5xl px-4 pb-10">
            <div className="overflow-hidden rounded-lg border border-olive-100 shadow-lg">
              <img
                src={localizedPost.heroImage}
                alt={localizedPost.imageAlt}
                className="aspect-[16/9] h-full w-full object-cover"
              />
            </div>
          </div>
        </header>
        <section className="mx-auto max-w-3xl px-4 py-12">
          <BlogContent blocks={localizedPost.body} />
        </section>
      </article>
    </BlogShell>
  );
}

export default function EscolaMaosUnidasSite() {
  const [lang, setLang] = useState("pt");
  const [showTimeline, setShowTimeline] = useState(true);
  const [currentImage, setCurrentImage] = useState(0);
  const [formData, setFormData] = useState({ name: '', email: '', message: '' });
  const [formStatus, setFormStatus] = useState({ loading: false, success: false, error: '' });
  const [showSponsorshipModal, setShowSponsorshipModal] = useState(false);
  const [sponsorshipData, setSponsorshipData] = useState({ firstName: '', lastName: '', email: '', phone: '' });
  const [sponsorshipStatus, setSponsorshipStatus] = useState({ loading: false, success: false, error: '' });
  const [admissionsData, setAdmissionsData] = useState({ 
    studentName: '', 
    studentLastName: '', 
    birthDate: '', 
    grade: '', 
    parentName: '', 
    parentEmail: '', 
    parentPhone: '', 
    address: '', 
    notes: '' 
  });
  const [admissionsStatus, setAdmissionsStatus] = useState({ loading: false, success: false, error: '' });
  const [showLangDropdown, setShowLangDropdown] = useState(false);
  const [showEscolaDropdown, setShowEscolaDropdown] = useState(false);
  const [escolaDropdownTimeout, setEscolaDropdownTimeout] = useState(null);
  const t = useMemo(() => COPY[lang], [lang]);

  const languages = [
    { code: 'pt', name: 'Português', flag: '🇵🇹' },
    { code: 'es', name: 'Español', flag: '🇪🇸' },
    { code: 'en', name: 'English', flag: '🇺🇸' },
  ];

  const currentLang = languages.find(l => l.code === lang) || languages[0];

  const escolaMenuItems = [
    { href: '#education', label: t.nav.education },
    { href: '#students', label: t.nav.students },
    { href: '#socialAssistance', label: t.nav.socialAssistance },
  ];

  // Close language dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (showLangDropdown && !event.target.closest('.lang-dropdown-container')) {
        setShowLangDropdown(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [showLangDropdown]);

  // Cleanup timeout on unmount
  useEffect(() => {
    return () => {
      if (escolaDropdownTimeout) {
        clearTimeout(escolaDropdownTimeout);
      }
    };
  }, [escolaDropdownTimeout]);

  const heroImages = [
    "/assets/fachada_1.png",
    "/assets/WhatsApp Image 2025-11-01 at 16.58.01_5f7df531.jpg",
    "/assets/WhatsApp Image 2025-11-01 at 16.58.02_4529292f.jpg",
  ];

  useEffect(() => {
    const interval = setInterval(() => {
      setCurrentImage((prev) => (prev + 1) % heroImages.length);
    }, 5000); // Change image every 5 seconds
    return () => clearInterval(interval);
  }, [heroImages.length]);

  const handleFormSubmit = async (e) => {
    e.preventDefault();
    setFormStatus({ loading: true, success: false, error: '' });

    try {
      // Obtener la URL de la función (se actualizará después del deploy)
      const functionUrl = 'https://sendcontactemail-zogw5ohfvq-uc.a.run.app';
      
      const response = await fetch(functionUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          name: formData.name,
          email: formData.email,
          message: formData.message,
        }),
      });

      const data = await response.json();

      if (response.ok && data.success) {
        setFormStatus({ loading: false, success: true, error: '' });
        setFormData({ name: '', email: '', message: '' });
        // Resetear el mensaje de éxito después de 5 segundos
        setTimeout(() => {
          setFormStatus({ loading: false, success: false, error: '' });
        }, 5000);
      } else {
        setFormStatus({ loading: false, success: false, error: data.message || 'Error al enviar el mensaje' });
      }
    } catch (error) {
      console.error('Error sending form:', error);
      setFormStatus({ loading: false, success: false, error: 'Error de conexión. Por favor intenta nuevamente.' });
    }
  };

  const handleSponsorshipSubmit = async (e) => {
    e.preventDefault();
    setSponsorshipStatus({ loading: true, success: false, error: '' });

    try {
      const functionUrl = 'https://sendsponsorshipemail-zogw5ohfvq-uc.a.run.app';
      
      const response = await fetch(functionUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          firstName: sponsorshipData.firstName,
          lastName: sponsorshipData.lastName,
          email: sponsorshipData.email,
          phone: sponsorshipData.phone,
        }),
      });

      const data = await response.json();

      if (response.ok && data.success) {
        setSponsorshipStatus({ loading: false, success: true, error: '' });
        setSponsorshipData({ firstName: '', lastName: '', email: '', phone: '' });
        // Cerrar el modal después de 2 segundos (tiempo suficiente para ver el mensaje de éxito)
        setTimeout(() => {
          setShowSponsorshipModal(false);
          setSponsorshipStatus({ loading: false, success: false, error: '' });
        }, 2000);
      } else {
        setSponsorshipStatus({ loading: false, success: false, error: data.message || 'Error al enviar la solicitud' });
      }
    } catch (error) {
      console.error('Error sending sponsorship form:', error);
      setSponsorshipStatus({ loading: false, success: false, error: lang === 'es' ? 'Error de conexión. Por favor intenta nuevamente.' : lang === 'pt' ? 'Erro de conexão. Por favor tente novamente.' : 'Connection error. Please try again.' });
    }
  };

  const handleAdmissionsSubmit = async (e) => {
    e.preventDefault();
    setAdmissionsStatus({ loading: true, success: false, error: '' });

    try {
      // Obtener la URL de la función
      const functionUrl = 'https://us-central1-escola-maos-unidas.cloudfunctions.net/sendAdmissionsEmail';
      
      const response = await fetch(functionUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(admissionsData),
      });

      let data;
      try {
        data = await response.json();
      } catch (jsonError) {
        console.error('Error parsing response:', jsonError);
        throw new Error('Invalid response from server');
      }

      if (response.ok && data.success) {
        setAdmissionsStatus({ loading: false, success: true, error: '' });
        setAdmissionsData({ 
          studentName: '', 
          studentLastName: '', 
          birthDate: '', 
          grade: '', 
          parentName: '', 
          parentEmail: '', 
          parentPhone: '', 
          address: '', 
          notes: '' 
        });
        // Resetear el mensaje de éxito después de 5 segundos
        setTimeout(() => {
          setAdmissionsStatus({ loading: false, success: false, error: '' });
        }, 5000);
      } else {
        setAdmissionsStatus({ loading: false, success: false, error: data.message || data.error || t.admissions?.error || 'Error al enviar la solicitud' });
      }
    } catch (error) {
      console.error('Error sending admissions form:', error);
      setAdmissionsStatus({ loading: false, success: false, error: t.admissions?.error || (lang === 'es' ? 'Error de conexión. Por favor intenta nuevamente.' : lang === 'pt' ? 'Erro de conexão. Por favor tente novamente.' : 'Connection error. Please try again.') });
    }
  };

  return (
    <div className="min-h-screen bg-stone-50 text-neutral-900">
      {/* NAVBAR */}
      <header className="sticky top-0 z-40 bg-white/95 backdrop-blur border-b border-olive-100">
        <div className="max-w-6xl mx-auto px-4 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <img src="/assets/logo-escola-maos-unidas.png" alt="Logo Escola Mãos Unidas" className="h-10 w-10 rounded-full object-cover" />
            <span className="font-extrabold tracking-tight text-lg bg-gradient-to-r from-olive-700 to-olive-600 bg-clip-text text-transparent">Escola Mãos Unidas</span>
          </div>
          <nav className="hidden md:flex items-center gap-10 text-sm">
            <div 
              className="escola-dropdown-container relative"
              onMouseEnter={() => {
                if (escolaDropdownTimeout) {
                  clearTimeout(escolaDropdownTimeout);
                  setEscolaDropdownTimeout(null);
                }
                setShowEscolaDropdown(true);
              }}
              onMouseLeave={() => {
                const timeout = setTimeout(() => {
                  setShowEscolaDropdown(false);
                }, 300); // 300ms delay before closing
                setEscolaDropdownTimeout(timeout);
              }}
            >
              <a 
                href="#school"
                className="flex items-center gap-1 hover:text-olive-600 transition-colors"
              >
                {t.nav.school}
                <svg className={`w-4 h-4 transition-transform ${showEscolaDropdown ? 'rotate-180' : ''}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                </svg>
              </a>
              {showEscolaDropdown && (
                <div 
                  className="absolute left-0 mt-2 w-56 bg-white rounded-lg shadow-lg border border-olive-100 py-1 z-50"
                  onMouseEnter={() => {
                    if (escolaDropdownTimeout) {
                      clearTimeout(escolaDropdownTimeout);
                      setEscolaDropdownTimeout(null);
                    }
                  }}
                >
                  {escolaMenuItems.map((item, index) => (
                    <a
                      key={index}
                      href={item.href}
                      className="block px-4 py-2 text-sm text-neutral-700 hover:bg-olive-50 transition-colors"
                    >
                      {item.label}
                    </a>
                  ))}
                </div>
              )}
            </div>
            <a href="#scholarships" className="hover:text-olive-600 transition-colors">{t.nav.scholarships}</a>
            <a href="#admissions" className="hover:text-olive-600 transition-colors">{t.nav.admissions}</a>
            <a href="#contact" className="hover:text-olive-600 transition-colors">{t.nav.contact}</a>
          </nav>
          <div className="flex items-center gap-3">
            <button onClick={() => setShowSponsorshipModal(true)} className="px-4 py-2 rounded-lg bg-gradient-to-r from-olive-600 to-olive-700 text-white text-sm hover:from-olive-700 hover:to-olive-800 transition-colors whitespace-nowrap">🤝 {t.hero.ctaPrimary}</button>
            <div className="lang-dropdown-container relative">
              <button 
                onClick={() => setShowLangDropdown(!showLangDropdown)}
                className="flex items-center gap-2 px-3 py-2 rounded-lg border border-olive-200 hover:bg-olive-50 transition-colors"
                title={currentLang.name}
              >
                <span className="text-xl">{currentLang.flag}</span>
                <span className="text-sm text-neutral-700 hidden sm:inline">{currentLang.name}</span>
                <svg className={`w-4 h-4 text-neutral-600 transition-transform ${showLangDropdown ? 'rotate-180' : ''}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                </svg>
              </button>
              {showLangDropdown && (
                <div className="absolute right-0 mt-2 w-48 bg-white rounded-lg shadow-lg border border-olive-100 py-1 z-50">
                  {languages.map((language) => (
                    <button
                      key={language.code}
                      onClick={() => {
                        setLang(language.code);
                        setShowLangDropdown(false);
                      }}
                      className={`w-full flex items-center gap-3 px-4 py-2 text-sm hover:bg-olive-50 transition-colors ${
                        lang === language.code ? 'bg-olive-50 text-olive-700 font-medium' : 'text-neutral-700'
                      }`}
                    >
                      <span className="text-xl">{language.flag}</span>
                      <span>{language.name}</span>
                      {lang === language.code && (
                        <span className="ml-auto text-olive-600">✓</span>
                      )}
                    </button>
                  ))}
                </div>
              )}
            </div>
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
              <button onClick={() => setShowSponsorshipModal(true)} className="px-6 py-3 rounded-lg bg-gradient-to-r from-olive-600 to-olive-700 text-white text-base hover:from-olive-700 hover:to-olive-800 transition-colors shadow-lg">🤝 {t.hero.ctaPrimary}</button>
            </div>
          </div>
          <div className="aspect-video rounded-2xl shadow-2xl border-4 border-olive-300/80 relative overflow-hidden ring-2 ring-olive-200/50">
            <div className="absolute inset-0 bg-gradient-to-br from-olive-50/20 to-transparent pointer-events-none z-10"></div>
            <img 
              src={heroImages[currentImage]} 
              alt="Escola Mãos Unidas" 
              className="w-full h-full object-cover transition-opacity duration-1000"
              key={currentImage}
            />
            {/* Navigation dots */}
            <div className="absolute bottom-4 left-1/2 -translate-x-1/2 flex gap-2 z-20">
              {heroImages.map((_, index) => (
                <button
                  key={index}
                  onClick={() => setCurrentImage(index)}
                  className={`w-2 h-2 rounded-full transition-all ${
                    index === currentImage 
                      ? 'bg-olive-400 w-8' 
                      : 'bg-white/50 hover:bg-white/75'
                  }`}
                  aria-label={`Slide ${index + 1}`}
                />
              ))}
            </div>
          </div>
        </div>
      </section>

      <BlogLandingTiles lang={lang} />

      {/* SCHOOL */}
      <section id="school" className="py-20 bg-white relative">
        <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-olive-200 via-olive-300/50 to-olive-200"></div>
        <div className="max-w-6xl mx-auto px-4">
          <div className="mb-12">
            <h2 className="text-4xl font-bold mb-4 text-olive-800">{t.school.heading}</h2>
            <p className="text-lg text-neutral-700 leading-relaxed max-w-3xl">{t.school.body}</p>
          </div>
          
          {/* HISTORY SECTION */}
          <div className="mb-16">
            <div className="flex items-center justify-between mb-8">
              <h3 className="text-3xl font-bold text-olive-800">{t.school.history.title}</h3>
              <button
                onClick={() => setShowTimeline(!showTimeline)}
                className="flex items-center gap-2 px-4 py-2 rounded-lg border border-olive-300 bg-white hover:bg-olive-50 transition-colors text-sm font-medium text-olive-700"
              >
                <span>{showTimeline ? "📋" : "📅"}</span>
                <span>{showTimeline ? t.school.history.timelineLabel : t.school.history.toggleLabel}</span>
              </button>
            </div>
            
            {showTimeline ? (
              /* TIMELINE VIEW */
              <div className="relative">
                <div className="absolute left-8 top-0 bottom-0 w-0.5 bg-gradient-to-b from-olive-300 via-olive-400 to-olive-300 hidden md:block"></div>
                <div className="space-y-8 pl-0 md:pl-4">
                  {t.school.history.timeline.map((item, index) => (
                    <div key={index} className="relative flex items-start gap-6">
                      <div className="hidden md:block flex-shrink-0 w-16 text-right pt-1 relative z-10">
                        <div className="absolute right-0 top-1/2 -translate-y-1/2 translate-x-1/2 inline-flex items-center justify-center w-8 h-8 rounded-full bg-gradient-to-br from-olive-500 to-olive-600 text-white font-bold text-xs shadow-lg ring-4 ring-white">
                          {item.year}
                        </div>
                      </div>
                      <div className="flex-1 bg-gradient-to-br from-olive-50 to-stone-50 rounded-xl p-6 border border-olive-100 shadow-sm hover:shadow-md transition-shadow">
                        <div className="md:hidden mb-3">
                          <span className="inline-flex items-center justify-center px-3 py-1 rounded-full bg-gradient-to-br from-olive-500 to-olive-600 text-white font-bold text-sm">
                            {item.year}
                          </span>
                        </div>
                        <h4 className="text-xl font-bold mb-2 text-olive-700">{item.title}</h4>
                        <p className="text-neutral-700 leading-relaxed">{item.description}</p>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            ) : (
              /* CARDS VIEW */
              <div>
            <div className="grid md:grid-cols-2 gap-6 mb-8">
              <div className="bg-gradient-to-br from-olive-50 to-stone-50 rounded-2xl p-6 border border-olive-100 shadow-sm">
                <h4 className="text-xl font-bold mb-3 text-olive-700">{t.school.history.origin.title}</h4>
                <p className="text-neutral-700 leading-relaxed">{t.school.history.origin.text}</p>
              </div>
              
              <div className="bg-gradient-to-br from-olive-50 to-stone-50 rounded-2xl p-6 border border-olive-100 shadow-sm">
                <h4 className="text-xl font-bold mb-3 text-olive-700">{t.school.history.kindergarten.title}</h4>
                <p className="text-neutral-700 leading-relaxed">{t.school.history.kindergarten.text}</p>
              </div>
            </div>
            
            <div className="bg-white rounded-2xl p-8 border border-olive-100 shadow-sm mb-8">
              <h4 className="text-xl font-bold mb-3 text-olive-700">{t.school.history.school.title}</h4>
              <p className="text-neutral-700 leading-relaxed">{t.school.history.school.text}</p>
            </div>
            
            <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-6 mb-8">
              <div className="bg-white rounded-xl p-6 border border-olive-100 shadow-sm">
                <h4 className="text-lg font-bold mb-3 text-olive-700">{t.school.history.characteristics.title}</h4>
                <p className="text-neutral-700 text-sm leading-relaxed">{t.school.history.characteristics.text}</p>
              </div>
              
              <div className="bg-white rounded-xl p-6 border border-olive-100 shadow-sm">
                <h4 className="text-lg font-bold mb-3 text-olive-700">{t.school.history.staff.title}</h4>
                <p className="text-neutral-700 text-sm leading-relaxed">{t.school.history.staff.text}</p>
              </div>
              
              <div className="bg-white rounded-xl p-6 border border-olive-100 shadow-sm sm:col-span-2 lg:col-span-1">
                <h4 className="text-lg font-bold mb-3 text-olive-700">{t.school.history.facilities.title}</h4>
                <p className="text-neutral-700 text-sm leading-relaxed mb-3">{t.school.history.facilities.blocks}</p>
                <ul className="space-y-1 mb-3">
                  <li className="flex items-start gap-2">
                    <span className="text-olive-600 mt-0.5">•</span>
                    <span className="text-neutral-700 text-sm">{t.school.history.facilities.block1}</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <span className="text-olive-600 mt-0.5">•</span>
                    <span className="text-neutral-700 text-sm">{t.school.history.facilities.block2}</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <span className="text-olive-600 mt-0.5">•</span>
                    <span className="text-neutral-700 text-sm">{t.school.history.facilities.block3}</span>
                  </li>
                </ul>
                <p className="text-neutral-700 text-sm font-semibold mb-2">{t.school.history.facilities.roomsTitle}</p>
                <ul className="space-y-1">
                  <li className="flex items-start gap-2">
                    <span className="text-olive-600 mt-0.5">•</span>
                    <span className="text-neutral-700 text-sm">{t.school.history.facilities.room1}</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <span className="text-olive-600 mt-0.5">•</span>
                    <span className="text-neutral-700 text-sm">{t.school.history.facilities.room2}</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <span className="text-olive-600 mt-0.5">•</span>
                    <span className="text-neutral-700 text-sm">{t.school.history.facilities.room3}</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <span className="text-olive-600 mt-0.5">•</span>
                    <span className="text-neutral-700 text-sm">{t.school.history.facilities.room4}</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <span className="text-olive-600 mt-0.5">•</span>
                    <span className="text-neutral-700 text-sm">{t.school.history.facilities.room5}</span>
                  </li>
                </ul>
                <p className="text-neutral-700 text-sm leading-relaxed mt-3">{t.school.history.facilities.infrastructure}</p>
              </div>
            </div>
              </div>
            )}
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

      {/* SOCIAL ASSISTANCE */}
      <section id="socialAssistance" className="py-20 bg-gradient-to-br from-olive-50/30 to-stone-100/50 relative">
        <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-transparent via-olive-300/50 to-transparent"></div>
        <div className="max-w-6xl mx-auto px-4">
          <div className="mb-12 text-center">
            <h2 className="text-4xl font-bold mb-4 text-olive-800">{t.socialAssistance.heading}</h2>
            <p className="text-lg text-neutral-600 max-w-2xl mx-auto">{t.socialAssistance.subtitle}</p>
          </div>

          <div className="mb-8">
            <div className="bg-white rounded-2xl p-8 border border-olive-100 shadow-sm">
              <p className="text-neutral-700 mb-6 leading-relaxed text-center max-w-3xl mx-auto">{t.socialAssistance.description}</p>
            </div>
          </div>

          <div className="grid md:grid-cols-3 gap-6 mb-8">
            <div className="bg-white rounded-2xl p-6 border border-olive-100 shadow-sm">
              <h3 className="text-xl font-bold mb-4 text-olive-700">{t.socialAssistance.visits.title}</h3>
              <p className="text-neutral-700 text-sm leading-relaxed">{t.socialAssistance.visits.text}</p>
            </div>
            
            <div className="bg-white rounded-2xl p-6 border border-olive-100 shadow-sm">
              <h3 className="text-xl font-bold mb-4 text-olive-700">{t.socialAssistance.donations.title}</h3>
              <p className="text-neutral-700 text-sm mb-3 leading-relaxed">{t.socialAssistance.donations.text}</p>
              <ul className="space-y-2">
                {t.socialAssistance.donations.items.map((item, i) => (
                  <li key={i} className="flex items-start gap-2">
                    <span className="text-olive-600 mt-0.5">•</span>
                    <span className="text-neutral-700 text-sm">{item}</span>
                  </li>
                ))}
              </ul>
            </div>
            
            <div className="bg-white rounded-2xl p-6 border border-olive-100 shadow-sm">
              <h3 className="text-xl font-bold mb-4 text-olive-700">{t.socialAssistance.activities.title}</h3>
              <p className="text-neutral-700 text-sm leading-relaxed">{t.socialAssistance.activities.text}</p>
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
            <button 
              onClick={() => setShowSponsorshipModal(true)}
              className="inline-block px-8 py-4 rounded-lg bg-gradient-to-r from-olive-600 to-olive-700 text-white text-lg font-semibold hover:from-olive-700 hover:to-olive-800 transition-colors shadow-lg"
            >
              🤝 {t.scholarships.cta}
            </button>
          </div>
        </div>
      </section>

      {/* ADMISSIONS 2026 */}
      <section id="admissions" className="py-20 bg-white relative">
        <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-olive-200 via-olive-300/50 to-olive-200"></div>
        <div className="max-w-6xl mx-auto px-4">
          <div className="mb-12 text-center">
            <h2 className="text-4xl font-bold mb-4 text-olive-800">{t.admissions.heading}</h2>
            <p className="text-lg text-neutral-600 max-w-2xl mx-auto">{t.admissions.subtitle}</p>
          </div>

          <div className="max-w-3xl mx-auto">
            <div className="bg-gradient-to-br from-olive-50/50 to-stone-50/50 rounded-2xl border border-olive-100 shadow-sm mb-8">
              <div className="p-8">
                <p className="text-neutral-700 leading-relaxed mb-4">{t.admissions.description}</p>
                <p className="text-neutral-700 leading-relaxed">
                  {t.admissions.scholarshipsLink}{' '}
                  <a 
                    href="#scholarships" 
                    className="text-olive-600 hover:text-olive-700 font-semibold underline transition-colors"
                  >
                    {t.admissions.scholarshipsLinkText}
                  </a>
                  .
                </p>
              </div>
            </div>

            <div className="bg-gradient-to-br from-olive-50/50 to-stone-50/50 rounded-2xl border border-olive-100 shadow-sm">
              <div className="px-8 py-6 border-b border-olive-100">
                <h3 className="font-bold text-xl text-olive-800">{t.admissions.formTitle}</h3>
              </div>
              <div className="p-8">
                <form onSubmit={handleAdmissionsSubmit} className="space-y-4">
                  {admissionsStatus.success && (
                    <div className="p-4 bg-green-50 border border-green-200 rounded-lg text-green-800">
                      ✓ {t.admissions.success}
                    </div>
                  )}
                  {admissionsStatus.error && (
                    <div className="p-4 bg-red-50 border border-red-200 rounded-lg text-red-800">
                      ✗ {admissionsStatus.error}
                    </div>
                  )}
                  <div className="grid md:grid-cols-2 gap-4">
                    <div>
                      <label className="text-sm font-medium text-neutral-700" htmlFor="studentName">
                        {t.admissions.studentFirstName} <span className="text-red-500">*</span>
                      </label>
                      <input 
                        id="studentName" 
                        name="studentName" 
                        value={admissionsData.studentName}
                        onChange={(e) => setAdmissionsData({ ...admissionsData, studentName: e.target.value })}
                        required 
                        disabled={admissionsStatus.loading}
                        className="mt-1 w-full rounded-lg border border-olive-200 px-4 py-2 focus:border-olive-400 focus:ring-2 focus:ring-olive-100 disabled:opacity-50 disabled:cursor-not-allowed" 
                      />
                    </div>
                    <div>
                      <label className="text-sm font-medium text-neutral-700" htmlFor="studentLastName">
                        {t.admissions.studentLastName} <span className="text-red-500">*</span>
                      </label>
                      <input 
                        id="studentLastName" 
                        name="studentLastName" 
                        value={admissionsData.studentLastName}
                        onChange={(e) => setAdmissionsData({ ...admissionsData, studentLastName: e.target.value })}
                        required 
                        disabled={admissionsStatus.loading}
                        className="mt-1 w-full rounded-lg border border-olive-200 px-4 py-2 focus:border-olive-400 focus:ring-2 focus:ring-olive-100 disabled:opacity-50 disabled:cursor-not-allowed" 
                      />
                    </div>
                  </div>
                  <div className="grid md:grid-cols-2 gap-4">
                    <div>
                      <label className="text-sm font-medium text-neutral-700" htmlFor="birthDate">
                        {t.admissions.birthDate}
                      </label>
                      <input 
                        id="birthDate" 
                        name="birthDate" 
                        type="date"
                        value={admissionsData.birthDate}
                        onChange={(e) => setAdmissionsData({ ...admissionsData, birthDate: e.target.value })}
                        disabled={admissionsStatus.loading}
                        className="mt-1 w-full rounded-lg border border-olive-200 px-4 py-2 focus:border-olive-400 focus:ring-2 focus:ring-olive-100 disabled:opacity-50 disabled:cursor-not-allowed" 
                      />
                    </div>
                    <div>
                      <label className="text-sm font-medium text-neutral-700" htmlFor="grade">
                        {t.admissions.grade}
                      </label>
                      <input 
                        id="grade" 
                        name="grade" 
                        value={admissionsData.grade}
                        onChange={(e) => setAdmissionsData({ ...admissionsData, grade: e.target.value })}
                        disabled={admissionsStatus.loading}
                        placeholder={lang === 'es' ? 'Ej: Jardín, 1° grado, etc.' : lang === 'pt' ? 'Ex: Pré-primária, 1ª classe, etc.' : 'Ex: Kindergarten, 1st grade, etc.'}
                        className="mt-1 w-full rounded-lg border border-olive-200 px-4 py-2 focus:border-olive-400 focus:ring-2 focus:ring-olive-100 disabled:opacity-50 disabled:cursor-not-allowed" 
                      />
                    </div>
                  </div>
                  <div>
                    <label className="text-sm font-medium text-neutral-700" htmlFor="parentName">
                      {t.admissions.parentName} <span className="text-red-500">*</span>
                    </label>
                    <input 
                      id="parentName" 
                      name="parentName" 
                      value={admissionsData.parentName}
                      onChange={(e) => setAdmissionsData({ ...admissionsData, parentName: e.target.value })}
                      required 
                      disabled={admissionsStatus.loading}
                      className="mt-1 w-full rounded-lg border border-olive-200 px-4 py-2 focus:border-olive-400 focus:ring-2 focus:ring-olive-100 disabled:opacity-50 disabled:cursor-not-allowed" 
                    />
                  </div>
                  <div className="grid md:grid-cols-2 gap-4">
                    <div>
                      <label className="text-sm font-medium text-neutral-700" htmlFor="parentEmail">
                        {t.admissions.parentEmail} <span className="text-red-500">*</span>
                      </label>
                      <input 
                        id="parentEmail" 
                        name="parentEmail" 
                        type="email"
                        value={admissionsData.parentEmail}
                        onChange={(e) => setAdmissionsData({ ...admissionsData, parentEmail: e.target.value })}
                        required 
                        disabled={admissionsStatus.loading}
                        className="mt-1 w-full rounded-lg border border-olive-200 px-4 py-2 focus:border-olive-400 focus:ring-2 focus:ring-olive-100 disabled:opacity-50 disabled:cursor-not-allowed" 
                      />
                    </div>
                    <div>
                      <label className="text-sm font-medium text-neutral-700" htmlFor="parentPhone">
                        {t.admissions.parentPhone} <span className="text-red-500">*</span>
                      </label>
                      <input 
                        id="parentPhone" 
                        name="parentPhone" 
                        type="tel"
                        value={admissionsData.parentPhone}
                        onChange={(e) => setAdmissionsData({ ...admissionsData, parentPhone: e.target.value })}
                        required 
                        disabled={admissionsStatus.loading}
                        className="mt-1 w-full rounded-lg border border-olive-200 px-4 py-2 focus:border-olive-400 focus:ring-2 focus:ring-olive-100 disabled:opacity-50 disabled:cursor-not-allowed" 
                      />
                    </div>
                  </div>
                  <div>
                    <label className="text-sm font-medium text-neutral-700" htmlFor="address">
                      {t.admissions.address}
                    </label>
                    <input 
                      id="address" 
                      name="address" 
                      value={admissionsData.address}
                      onChange={(e) => setAdmissionsData({ ...admissionsData, address: e.target.value })}
                      disabled={admissionsStatus.loading}
                      className="mt-1 w-full rounded-lg border border-olive-200 px-4 py-2 focus:border-olive-400 focus:ring-2 focus:ring-olive-100 disabled:opacity-50 disabled:cursor-not-allowed" 
                    />
                  </div>
                  <div>
                    <label className="text-sm font-medium text-neutral-700" htmlFor="notes">
                      {t.admissions.notes}
                    </label>
                    <textarea 
                      id="notes" 
                      name="notes" 
                      rows={4} 
                      value={admissionsData.notes}
                      onChange={(e) => setAdmissionsData({ ...admissionsData, notes: e.target.value })}
                      disabled={admissionsStatus.loading}
                      className="mt-1 w-full rounded-lg border border-olive-200 px-4 py-2 focus:border-olive-400 focus:ring-2 focus:ring-olive-100 disabled:opacity-50 disabled:cursor-not-allowed" 
                    />
                  </div>
                  <button 
                    type="submit" 
                    disabled={admissionsStatus.loading}
                    className="w-full px-6 py-3 rounded-lg bg-gradient-to-r from-olive-600 to-olive-700 text-white font-semibold hover:from-olive-700 hover:to-olive-800 transition-colors shadow-md disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    {admissionsStatus.loading ? '⏳ ' : '📝 '}{admissionsStatus.loading ? (lang === 'es' ? 'Enviando...' : lang === 'pt' ? 'Enviando...' : 'Sending...') : t.admissions.submit}
                  </button>
                  <p className="text-xs text-neutral-500 mt-2">{t.admissions.disclaimer}</p>
                </form>
              </div>
            </div>
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
                <p>✉️ <a className="underline hover:text-olive-600" href="mailto:info@escolamaosunidas.com">{t.contact.email}</a></p>
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
              <form onSubmit={handleFormSubmit} className="space-y-4">
                {formStatus.success && (
                  <div className="p-4 bg-green-50 border border-green-200 rounded-lg text-green-800">
                    ✓ {lang === 'es' ? '¡Mensaje enviado exitosamente! Te responderemos pronto.' : lang === 'pt' ? 'Mensagem enviada com sucesso! Responderemos em breve.' : 'Message sent successfully! We will respond soon.'}
                  </div>
                )}
                {formStatus.error && (
                  <div className="p-4 bg-red-50 border border-red-200 rounded-lg text-red-800">
                    ✗ {formStatus.error}
                  </div>
                )}
                <div>
                  <label className="text-sm font-medium text-neutral-700" htmlFor="name">{t.contact.formName}</label>
                  <input 
                    id="name" 
                    name="name" 
                    value={formData.name}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                    required 
                    disabled={formStatus.loading}
                    className="mt-1 w-full rounded-lg border border-olive-200 px-4 py-2 focus:border-olive-400 focus:ring-2 focus:ring-olive-100 disabled:opacity-50 disabled:cursor-not-allowed" 
                  />
                </div>
                <div>
                  <label className="text-sm font-medium text-neutral-700" htmlFor="email">{t.contact.formEmail}</label>
                  <input 
                    id="email" 
                    name="email" 
                    type="email" 
                    value={formData.email}
                    onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                    required 
                    disabled={formStatus.loading}
                    className="mt-1 w-full rounded-lg border border-olive-200 px-4 py-2 focus:border-olive-400 focus:ring-2 focus:ring-olive-100 disabled:opacity-50 disabled:cursor-not-allowed" 
                  />
                </div>
                <div>
                  <label className="text-sm font-medium text-neutral-700" htmlFor="message">{t.contact.formMsg}</label>
                  <textarea 
                    id="message" 
                    name="message" 
                    rows={4} 
                    value={formData.message}
                    onChange={(e) => setFormData({ ...formData, message: e.target.value })}
                    required
                    disabled={formStatus.loading}
                    className="mt-1 w-full rounded-lg border border-olive-200 px-4 py-2 focus:border-olive-400 focus:ring-2 focus:ring-olive-100 disabled:opacity-50 disabled:cursor-not-allowed" 
                  />
                </div>
                <button 
                  type="submit" 
                  disabled={formStatus.loading}
                  className="w-full px-6 py-3 rounded-lg bg-gradient-to-r from-olive-600 to-olive-700 text-white font-semibold hover:from-olive-700 hover:to-olive-800 transition-colors shadow-md disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {formStatus.loading ? '⏳ ' : '✉️ '}{formStatus.loading ? (lang === 'es' ? 'Enviando...' : lang === 'pt' ? 'Enviando...' : 'Sending...') : t.contact.formSubmit}
                </button>
                <p className="text-xs text-neutral-500 mt-2">{t.contact.disclaimer}</p>
              </form>
            </div>
          </div>
        </div>
      </section>

      {/* SPONSORSHIP MODAL */}
      {showSponsorshipModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4" onClick={() => setShowSponsorshipModal(false)}>
          <div className="bg-white rounded-2xl shadow-2xl max-w-md w-full" onClick={(e) => e.stopPropagation()}>
            <div className="px-6 py-4 border-b border-olive-100 flex items-center justify-between">
              <h3 className="text-xl font-bold text-olive-800">
                {lang === 'es' ? 'Solicitar Apadrinamiento' : lang === 'pt' ? 'Solicitar Apadrinhamento' : 'Request Sponsorship'}
              </h3>
              <button 
                onClick={() => setShowSponsorshipModal(false)}
                className="text-neutral-400 hover:text-neutral-600 text-2xl"
                aria-label="Close"
              >
                ×
              </button>
            </div>
            <div className="p-6">
              <form onSubmit={handleSponsorshipSubmit} className="space-y-4">
                {sponsorshipStatus.success && (
                  <div className="p-4 bg-green-50 border border-green-200 rounded-lg text-green-800">
                    ✓ {lang === 'es' ? '¡Solicitud enviada exitosamente! Te contactaremos pronto.' : lang === 'pt' ? 'Solicitação enviada com sucesso! Entraremos em contato em breve.' : 'Request sent successfully! We will contact you soon.'}
                    <button
                      onClick={() => {
                        setShowSponsorshipModal(false);
                        setSponsorshipStatus({ loading: false, success: false, error: '' });
                      }}
                      className="mt-2 w-full px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors font-semibold"
                    >
                      {lang === 'es' ? 'Cerrar' : lang === 'pt' ? 'Fechar' : 'Close'}
                    </button>
                  </div>
                )}
                {sponsorshipStatus.error && (
                  <div className="p-4 bg-red-50 border border-red-200 rounded-lg text-red-800">
                    ✗ {sponsorshipStatus.error}
                  </div>
                )}
                <div>
                  <label className="block text-sm font-medium text-neutral-700 mb-2">
                    {lang === 'es' ? 'Nombre' : lang === 'pt' ? 'Nome' : 'First Name'}
                  </label>
                  <input 
                    type="text"
                    value={sponsorshipData.firstName}
                    onChange={(e) => setSponsorshipData({ ...sponsorshipData, firstName: e.target.value })}
                    required 
                    disabled={sponsorshipStatus.loading}
                    className="w-full rounded-lg border border-olive-200 px-4 py-2 focus:border-olive-400 focus:ring-2 focus:ring-olive-100 disabled:opacity-50 disabled:cursor-not-allowed" 
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-neutral-700 mb-2">
                    {lang === 'es' ? 'Apellido' : lang === 'pt' ? 'Sobrenome' : 'Last Name'}
                  </label>
                  <input 
                    type="text"
                    value={sponsorshipData.lastName}
                    onChange={(e) => setSponsorshipData({ ...sponsorshipData, lastName: e.target.value })}
                    required 
                    disabled={sponsorshipStatus.loading}
                    className="w-full rounded-lg border border-olive-200 px-4 py-2 focus:border-olive-400 focus:ring-2 focus:ring-olive-100 disabled:opacity-50 disabled:cursor-not-allowed" 
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-neutral-700 mb-2">
                    {lang === 'es' ? 'Email' : lang === 'pt' ? 'E-mail' : 'Email'}
                  </label>
                  <input 
                    type="email"
                    value={sponsorshipData.email}
                    onChange={(e) => setSponsorshipData({ ...sponsorshipData, email: e.target.value })}
                    required 
                    disabled={sponsorshipStatus.loading}
                    className="w-full rounded-lg border border-olive-200 px-4 py-2 focus:border-olive-400 focus:ring-2 focus:ring-olive-100 disabled:opacity-50 disabled:cursor-not-allowed" 
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-neutral-700 mb-2">
                    {lang === 'es' ? 'Teléfono' : lang === 'pt' ? 'Telefone' : 'Phone'}
                  </label>
                  <input 
                    type="tel"
                    value={sponsorshipData.phone}
                    onChange={(e) => setSponsorshipData({ ...sponsorshipData, phone: e.target.value })}
                    required 
                    disabled={sponsorshipStatus.loading}
                    className="w-full rounded-lg border border-olive-200 px-4 py-2 focus:border-olive-400 focus:ring-2 focus:ring-olive-100 disabled:opacity-50 disabled:cursor-not-allowed" 
                  />
                </div>
                <div className="flex gap-3 pt-4">
                  <button 
                    type="button"
                    onClick={() => setShowSponsorshipModal(false)}
                    disabled={sponsorshipStatus.loading}
                    className="flex-1 px-4 py-2 border border-neutral-300 rounded-lg hover:bg-neutral-100 text-neutral-700 font-semibold transition-colors disabled:opacity-50"
                  >
                    {lang === 'es' ? 'Cancelar' : lang === 'pt' ? 'Cancelar' : 'Cancel'}
                  </button>
                  <button 
                    type="submit" 
                    disabled={sponsorshipStatus.loading}
                    className="flex-1 px-4 py-2 rounded-lg bg-gradient-to-r from-olive-600 to-olive-700 text-white font-semibold hover:from-olive-700 hover:to-olive-800 transition-colors shadow-md disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    {sponsorshipStatus.loading ? '⏳ ' : '✉️ '}{sponsorshipStatus.loading ? (lang === 'es' ? 'Enviando...' : lang === 'pt' ? 'Enviando...' : 'Sending...') : (lang === 'es' ? 'Enviar Solicitud' : lang === 'pt' ? 'Enviar Solicitação' : 'Send Request')}
                  </button>
                </div>
                <p className="text-xs text-neutral-500 mt-2">
                  {lang === 'es' 
                    ? 'Este formulario usa un servicio externo. Estén atentos a una respuesta pronta de nuestra parte y revisen las casillas de correo no deseado o spam.'
                    : lang === 'pt'
                    ? 'Este formulário usa um serviço externo. Fiquem atentos a uma resposta rápida de nossa parte e verifiquem as caixas de correio não desejado ou spam.'
                    : 'This form uses an external service. Please be attentive to a prompt response from us and check your spam or junk mail folders.'}
                </p>
              </form>
            </div>
          </div>
        </div>
      )}

      {/* FOOTER */}
      <footer className="border-t border-olive-100 bg-gradient-to-b from-olive-50/30 to-white">
        <div className="max-w-6xl mx-auto px-4 py-8">
          <div className="flex flex-col md:flex-row items-center justify-between gap-4 mb-4">
            <div className="flex items-center gap-3">
              <img src="/assets/logo-escola-maos-unidas.png" alt="Logo Escola Mãos Unidas" className="h-10 w-10 rounded-full object-cover" />
              <p className="text-sm text-neutral-600">© {new Date().getFullYear()} Escola Mãos Unidas — Lichinga, Mozambique</p>
            </div>
            <a href="https://www.instagram.com/corazondefuegoiglesia/" target="_blank" rel="noreferrer" className="inline-flex items-center gap-2 text-sm underline hover:text-olive-600 transition-colors">
              📸 Instagram
            </a>
          </div>
          <div className="text-center pt-4 border-t border-olive-100">
            <div className="flex items-center justify-center gap-2 flex-wrap">
              <p className="text-xs text-neutral-500">
                {t.footer.copyright}
              </p>
              <a 
                href="mailto:piriz.dario+nit@gmail.com"
                className="inline-flex items-center hover:opacity-80 transition-opacity"
                title="Contactar NeuroIT Solutions"
              >
                <img 
                  src="/assets/nit-logo.png" 
                  alt="NeuroIT Solutions" 
                  className="h-6 object-contain"
                />
              </a>
              <span className="text-xs font-semibold text-olive-700">{t.footer.company}</span>
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
}
