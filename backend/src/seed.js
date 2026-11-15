require('dotenv').config({ quiet: true });

const { auth, db } = require('./firebase');
const { hoje, agora, somarDias } = require('./utils/regras');

let semente = 20261204;
function aleatorio() {
  semente = (semente * 1103515245 + 12345) % 2147483648;
  return semente / 2147483648;
}
function inteiro(min, max) {
  return Math.floor(aleatorio() * (max - min + 1)) + min;
}
function escolher(itens) {
  return itens[Math.floor(aleatorio() * itens.length)];
}

function gerarCpf() {
  const n = Array.from({ length: 9 }, () => inteiro(0, 9));
  for (let t = 9; t < 11; t++) {
    let soma = 0;
    for (let i = 0; i < t; i++) soma += n[i] * (t + 1 - i);
    n.push(((soma * 10) % 11) % 10);
  }
  return n.join('');
}

const NOMES = ['Ana', 'Bruno', 'Carlos', 'Daniela', 'Eduardo', 'Fernanda', 'Gabriel', 'Helena', 'Igor', 'Juliana', 'Lucas', 'Mariana', 'Natália', 'Otávio', 'Patrícia', 'Rafael', 'Sandra', 'Tiago', 'Vanessa', 'Wagner', 'Raimundo', 'Francisca', 'José', 'Antônia', 'Severino', 'Luzia', 'Cícero', 'Rosa'];
const SOBRENOMES = ['Silva', 'Souza', 'Oliveira', 'Lima', 'Pereira', 'Costa', 'Nascimento', 'Rodrigues', 'Almeida', 'Barros', 'Freitas', 'Araújo', 'Melo', 'Castro', 'Rocha', 'Vieira'];

function nascimentoPorIdade(anos) {
  return somarDias(hoje(), -(anos * 365 + inteiro(0, 360)));
}

function vacinasDaIdade(anos) {
  if (anos < 2) return [['Hepatite B', '3ª dose'], ['Pentavalente', '3ª dose'], ['Influenza', 'Anual']];
  if (anos < 18) return [['Tríplice viral', '2ª dose'], ['Hepatite B', '3ª dose'], ['dT', 'Reforço'], ['Influenza', 'Anual']];
  if (anos < 60) return [['Hepatite B', '3ª dose'], ['dT', 'Reforço'], ['COVID-19', 'Reforço'], ['Influenza', 'Anual'], ['Tríplice viral', 'Dose única']];
  return [['Influenza', 'Anual'], ['COVID-19', 'Reforço'], ['dT', 'Reforço'], ['Hepatite B', '3ª dose']];
}

const PESO_ATRASO = { Influenza: 5, dT: 3, 'COVID-19': 2, 'Tríplice viral': 1, 'Hepatite B': 0.5, Pentavalente: 1 };

function registrosAleatorios(cpf, anos) {
  const vacinas = vacinasDaIdade(anos);
  const atrasadas = new Set();
  if (aleatorio() < 0.26) {
    const quantidade = aleatorio() < 0.7 ? 1 : 2;
    while (atrasadas.size < Math.min(quantidade, vacinas.length)) {
      const total = vacinas.reduce((s, [v]) => s + (PESO_ATRASO[v] || 1), 0);
      let sorteio = aleatorio() * total;
      for (const [v] of vacinas) {
        sorteio -= PESO_ATRASO[v] || 1;
        if (sorteio <= 0) { atrasadas.add(v); break; }
      }
    }
  }
  return vacinas.map(([vacina, dose]) => {
    if (atrasadas.has(vacina)) {
      return { cpf, vacina, dose, data: null, dataPrevista: somarDias(hoje(), -inteiro(20, 200)), lote: '' };
    }
    if (vacina === 'Influenza' && aleatorio() < 0.15) {
      return { cpf, vacina, dose, data: null, dataPrevista: somarDias(hoje(), inteiro(3, 40)), lote: '' };
    }
    return {
      cpf,
      vacina,
      dose,
      data: somarDias(hoje(), -inteiro(30, 900)),
      dataPrevista: null,
      lote: vacina.slice(0, 2).toUpperCase().replace(/[^A-Z]/g, 'X') + inteiro(1000, 9999),
    };
  });
}

async function criarConta(email, senha, nome, desativada) {
  try {
    const usuario = await auth.createUser({ email, password: senha, displayName: nome, disabled: !!desativada });
    return usuario.uid;
  } catch (erro) {
    if (erro.code !== 'auth/email-already-exists') throw erro;
    const usuario = await auth.getUserByEmail(email);
    await auth.updateUser(usuario.uid, { password: senha, disabled: !!desativada });
    return usuario.uid;
  }
}

async function gravarEmLotes(operacoes) {
  for (let i = 0; i < operacoes.length; i += 400) {
    const lote = db.batch();
    operacoes.slice(i, i + 400).forEach(([ref, dados]) => lote.set(ref, dados));
    await lote.commit();
  }
}

const MITOS = [
  {
    tipo: 'mito', tema: 'criancas', titulo: '"Vacina causa autismo"',
    resumo: 'O estudo que originou o boato foi fraudado e retirado de circulação.',
    texto: 'Esse boato começou com um único estudo de 1998, feito com 12 crianças, que depois foi descoberto como fraude e cancelado pela revista que o publicou. Desde então, pesquisas com mais de 1 milhão de crianças em vários países não encontraram nenhuma ligação entre vacinas e autismo.\n\nO autismo costuma ser percebido na mesma idade em que as vacinas são aplicadas, entre 1 e 2 anos. É isso que confunde as pessoas, mas uma coisa não causa a outra.',
    fonte: 'Ministério da Saúde e SBIm', esclarecidos: 187, dias: 52,
  },
  {
    tipo: 'verdade', tema: 'efeitos', titulo: '"Pode dar febre baixa depois da vacina"',
    resumo: 'É uma reação esperada e passa em um ou dois dias.',
    texto: 'Algumas vacinas podem causar febre baixa, dor no local da aplicação e cansaço nas primeiras 48 horas. Essas reações mostram que o corpo está produzindo a defesa e costumam passar sozinhas.\n\nSe a febre passar de 39 °C ou durar mais de dois dias, procure a UBS.',
    fonte: 'Ministério da Saúde', esclarecidos: 151, dias: 45,
  },
  {
    tipo: 'mito', tema: 'gravidez', titulo: '"Grávida não pode tomar vacina"',
    resumo: 'Várias vacinas são recomendadas justamente na gestação.',
    texto: 'Gestantes devem tomar as vacinas dTpa, Hepatite B e Influenza, entre outras indicadas pela equipe de saúde. Elas protegem a mãe e também o bebê nos primeiros meses de vida, antes de ele poder ser vacinado.\n\nApenas algumas vacinas feitas com vírus vivo, como a tríplice viral, ficam para depois do parto.',
    fonte: 'Ministério da Saúde e SBIm', esclarecidos: 96, dias: 38,
  },
  {
    tipo: 'verdade', tema: 'criancas', titulo: '"Criança resfriada pode ser vacinada"',
    resumo: 'Resfriado leve sem febre não impede a vacinação.',
    texto: 'Coriza, tosse leve e resfriado sem febre não são motivo para adiar a vacina. Adiar sem necessidade deixa a criança desprotegida por mais tempo.\n\nSe a criança estiver com febre acima de 38 °C no dia, o ideal é esperar melhorar e voltar à UBS.',
    fonte: 'SBIm', esclarecidos: 73, dias: 30,
  },
  {
    tipo: 'mito', tema: 'idosos', titulo: '"A vacina da gripe dá gripe"',
    resumo: 'A vacina é feita de vírus inativado e não causa a doença.',
    texto: 'A vacina da gripe usada no Brasil é feita com vírus inativado, ou seja, sem capacidade de causar a doença. O que algumas pessoas sentem são reações leves, como dor no braço, que passam em até dois dias.\n\nQuem pega um resfriado logo depois da vacina já estava com outro vírus antes de se vacinar.',
    fonte: 'Ministério da Saúde', esclarecidos: 64, dias: 20,
  },
  {
    tipo: 'verdade', tema: 'idosos', titulo: '"Idoso precisa tomar a vacina da gripe todo ano"',
    resumo: 'O vírus muda a cada ano e a proteção diminui com o tempo.',
    texto: 'O vírus da gripe sofre mudanças todos os anos, e a vacina é atualizada para acompanhar essas mudanças. Além disso, a proteção da dose anterior diminui com o tempo.\n\nPor isso, pessoas com 60 anos ou mais devem tomar a vacina em todas as campanhas.',
    fonte: 'Ministério da Saúde', esclarecidos: 41, dias: 12,
  },
];

const INFORMATIVOS = [
  {
    categoria: 'campanhas', titulo: 'Campanha de Influenza 2026: quem tem prioridade',
    resumo: 'A vacinação contra a gripe segue na UBS para os grupos prioritários.',
    texto: 'A campanha de vacinação contra a gripe segue na UBS. Têm prioridade crianças de 6 meses a 5 anos, gestantes, idosos com 60 anos ou mais, pessoas com doenças crônicas e trabalhadores da saúde.\n\nDepois disso a vacina fica liberada para toda a população enquanto houver doses. Não precisa agendar: é só levar documento com foto e a carteirinha.\n\nA vacina da gripe é feita com vírus inativado e não causa gripe. Reações leves como dor no braço e febre baixa podem acontecer e passam em até dois dias.',
    fonte: 'Ministério da Saúde', dias: 1, leituras: 96,
  },
  {
    categoria: 'efeitos', titulo: 'Efeitos colaterais comuns: o que é esperado',
    resumo: 'Dor no braço e febre baixa são reações normais e passam em até dois dias.',
    texto: 'Depois de tomar uma vacina, é comum sentir dor, vermelhidão ou inchaço no local da aplicação, além de febre baixa e cansaço. Essas reações aparecem nas primeiras 48 horas e passam sozinhas.\n\nCompressas frias no local ajudam a aliviar a dor. Procure a UBS se a febre passar de 39 °C, se houver manchas pelo corpo ou falta de ar.',
    fonte: 'Equipe de enfermagem da UBS', dias: 4, leituras: 143,
  },
  {
    categoria: 'criancas', titulo: 'Calendário infantil: as doses do 1º ano de vida',
    resumo: 'Veja quais vacinas o bebê precisa tomar em cada mês.',
    texto: 'No primeiro ano de vida o bebê recebe as vacinas BCG e Hepatite B ao nascer, Pentavalente, Poliomielite, Rotavírus e Pneumocócica aos 2, 4 e 6 meses, além da Meningocócica C aos 3 e 5 meses.\n\nAos 9 meses vem a vacina da febre amarela e, aos 12 meses, a tríplice viral. Leve sempre a carteirinha da criança à UBS.',
    fonte: 'Ministério da Saúde', dias: 26, leituras: 201,
  },
];

async function popular() {
  const jaPopulado = await db.collection('estatisticas').doc('geral').get();
  if (jaPopulado.exists && !process.argv.includes('--forcar')) {
    console.log('O banco já tem os dados de exemplo. Use "npm run seed -- --forcar" para gravar de novo.');
    return;
  }

  console.log('Criando contas de acesso...');
  const marinaId = await criarConta('marina@email.com', '123456', 'Marina Souza');
  const carlaId = await criarConta('carla@ubs.com', '123456', 'Carla Mendes');
  const pauloId = await criarConta('paulo@ubs.com', '123456', 'Paulo Rocha');
  const franciscaId = await criarConta('francisca@ubs.com', '123456', 'Francisca Alves');
  const lucasId = await criarConta('lucas@ubs.com', '123456', 'Lucas Silva', true);

  const operacoes = [];
  const usuarios = db.collection('usuarios');
  const vacinacoes = db.collection('vacinacoes');

  const equipe = [
    [carlaId, 'Carla Mendes', 'carla@ubs.com', 'Enfermeira', 'admin', { importar: true, publicar: true, usuarios: true }, true],
    [pauloId, 'Paulo Rocha', 'paulo@ubs.com', 'Enfermeiro', 'equipe', { importar: true, publicar: true, usuarios: false }, true],
    [franciscaId, 'Francisca Alves', 'francisca@ubs.com', 'Agente comunitária de saúde', 'equipe', { importar: false, publicar: true, usuarios: false }, true],
    [lucasId, 'Lucas Silva', 'lucas@ubs.com', 'Agente comunitário de saúde', 'equipe', { importar: false, publicar: false, usuarios: false }, false],
  ];
  equipe.forEach(([id, nome, email, cargo, papel, permissoes, ativo]) => {
    operacoes.push([usuarios.doc(id), { nome, email, cargo, perfil: 'equipe', papel, permissoes, ativo, criadoEm: agora() }]);
  });

  const marinaCpf = '52998224725';
  operacoes.push([usuarios.doc(marinaId), {
    nome: 'Marina Souza', cpf: marinaCpf, nascimento: '1994-08-15', email: 'marina@email.com',
    telefone: '(85) 9 0000-0000', perfil: 'morador', ativo: true, criadoEm: agora(), esclarecido: true,
  }]);

  const juliaCpf = gerarCpf();
  const ritaCpf = gerarCpf();
  const dependentesMarina = usuarios.doc(marinaId).collection('dependentes');
  operacoes.push([dependentesMarina.doc('julia'), { nome: 'Júlia Souza', parentesco: 'Filha', nascimento: somarDias(hoje(), -(4 * 365 + 120)), cpf: juliaCpf, criadoEm: agora() }]);
  operacoes.push([dependentesMarina.doc('rita'), { nome: 'Rita Carvalho', parentesco: 'Mãe', nascimento: '1955-03-02', cpf: ritaCpf, criadoEm: agora() }]);

  [
    { cpf: marinaCpf, vacina: 'dT', dose: 'Reforço', data: null, dataPrevista: somarDias(hoje(), -95), lote: '' },
    { cpf: marinaCpf, vacina: 'Influenza', dose: 'Anual', data: null, dataPrevista: somarDias(hoje(), 12), lote: '' },
    { cpf: marinaCpf, vacina: 'COVID-19', dose: 'Reforço', data: '2026-03-14', dataPrevista: null, lote: 'FK2231' },
    { cpf: marinaCpf, vacina: 'Hepatite B', dose: '3ª dose', data: '2025-11-02', dataPrevista: null, lote: 'HB0917' },
    { cpf: marinaCpf, vacina: 'Febre amarela', dose: 'Dose única', data: '2024-05-18', dataPrevista: null, lote: 'FA5520' },
    { cpf: juliaCpf, vacina: 'Influenza', dose: 'Anual', data: null, dataPrevista: somarDias(hoje(), 5), lote: '' },
    { cpf: juliaCpf, vacina: 'Tríplice viral', dose: '2ª dose', data: '2024-01-20', dataPrevista: null, lote: 'TV3310' },
    { cpf: juliaCpf, vacina: 'Pentavalente', dose: '3ª dose', data: '2023-01-12', dataPrevista: null, lote: 'PT5521' },
    { cpf: ritaCpf, vacina: 'Influenza', dose: 'Anual', data: '2026-04-22', dataPrevista: null, lote: 'IF1180' },
    { cpf: ritaCpf, vacina: 'COVID-19', dose: 'Reforço', data: '2026-03-10', dataPrevista: null, lote: 'FK2198' },
    { cpf: ritaCpf, vacina: 'dT', dose: 'Reforço', data: '2021-08-05', dataPrevista: null, lote: 'DT0871' },
  ].forEach((registro) => operacoes.push([vacinacoes.doc(), registro]));

  const IDADES_DEPENDENTES = [0, 0, 1, 1, 2, 3, 4, 5, 7, 9, 11, 13, 15, 17, 62, 66, 70, 75, 81];
  const idades = [0, 1, 3, 4, 6, 9, 12, 15, 16, 19, 22, 25, 27, 29, 31, 33, 34, 36, 38, 40, 41, 43, 45, 47, 49, 52, 54, 56, 58, 61, 63, 65, 67, 69, 72, 74, 77, 80];
  for (let i = 0; i < 44; i++) {
    const nome = `${escolher(NOMES)} ${escolher(SOBRENOMES)}`;
    const anos = Math.max(18, escolher(idades));
    const cpf = gerarCpf();
    const ref = usuarios.doc();
    operacoes.push([ref, {
      nome, cpf, nascimento: nascimentoPorIdade(anos), email: `morador${i + 1}@exemplo.com`,
      telefone: '', perfil: 'morador', ativo: true, criadoEm: agora(),
    }]);
    registrosAleatorios(cpf, anos).forEach((r) => operacoes.push([vacinacoes.doc(), r]));

    const quantidadeDependentes = aleatorio() < 0.45 ? inteiro(1, 2) : 0;
    for (let d = 0; d < quantidadeDependentes; d++) {
      const idadeDependente = escolher(IDADES_DEPENDENTES);
      const cpfDependente = gerarCpf();
      operacoes.push([ref.collection('dependentes').doc(), {
        nome: `${escolher(NOMES)} ${nome.split(' ')[1]}`,
        parentesco: idadeDependente < 18 ? escolher(['Filho', 'Filha']) : escolher(['Mãe', 'Pai', 'Avó']),
        nascimento: nascimentoPorIdade(idadeDependente),
        cpf: cpfDependente,
        criadoEm: agora(),
      }]);
      registrosAleatorios(cpfDependente, idadeDependente).forEach((r) => operacoes.push([vacinacoes.doc(), r]));
    }
  }

  const conteudos = db.collection('conteudos');
  MITOS.forEach(({ dias, ...m }) => {
    operacoes.push([conteudos.doc(), {
      ...m, imagem: '', categoria: '', status: 'publicado', autor: 'Carla Mendes', leituras: m.esclarecidos + inteiro(10, 40),
      tempoLeitura: 1, publicadoEm: somarDias(hoje(), -dias), atualizadoEm: somarDias(hoje(), -dias),
    }]);
  });
  INFORMATIVOS.forEach(({ dias, ...inf }) => {
    operacoes.push([conteudos.doc(), {
      ...inf, tipo: 'informativo', tema: '', imagem: '', status: 'publicado', autor: 'Equipe da UBS', esclarecidos: 0,
      tempoLeitura: Math.max(1, Math.round(inf.texto.split(/\s+/).length / 180)),
      publicadoEm: somarDias(hoje(), -dias), atualizadoEm: somarDias(hoje(), -dias),
    }]);
  });
  operacoes.push([conteudos.doc(), {
    tipo: 'mito', tema: 'efeitos', titulo: '"Vacina tem chip"', resumo: 'Não existe chip em vacina.',
    texto: 'Não existe nenhum chip em vacina. A agulha usada é fina demais para passar qualquer dispositivo eletrônico, e o conteúdo da vacina é líquido.',
    fonte: 'Ministério da Saúde', categoria: '', imagem: '', status: 'rascunho', autor: 'Paulo Rocha', esclarecidos: 0, leituras: 0,
    tempoLeitura: 1, publicadoEm: null, atualizadoEm: somarDias(hoje(), -2),
  }]);
  operacoes.push([conteudos.doc(), {
    tipo: 'informativo', categoria: 'criancas', titulo: 'Calendário infantil de 2025', resumo: 'Versão anterior do calendário infantil.',
    texto: 'Calendário infantil válido até dezembro de 2025.', fonte: 'Ministério da Saúde', tema: '', imagem: '',
    status: 'arquivado', autor: 'Equipe da UBS', esclarecidos: 0, leituras: 318, tempoLeitura: 1,
    publicadoEm: '2025-02-10', atualizadoEm: somarDias(hoje(), -40),
  }]);

  const notificacoes = usuarios.doc(marinaId).collection('notificacoes');
  [
    ['A sua dT está atrasada há 3 meses. Você pode tomar na UBS sem agendamento.', '/carteirinha', false, 0],
    ['Novo informativo: Campanha de Influenza 2026', '/informativos', false, 1],
    ['Novo esclarecimento em Mitos e Verdades', '/mitos', false, 12],
    ['Seu comprovante foi enviado para validação da equipe da UBS.', '/carteirinha', true, 20],
  ].forEach(([titulo, link, lida, dias]) => {
    operacoes.push([notificacoes.doc(), { titulo, link, lida, criadaEm: `${somarDias(hoje(), -dias)}T${dias ? '14:20' : '08:00'}:00.000Z` }]);
  });

  [[3, 'Carla Mendes', 387], [10, 'Carla Mendes', 402], [17, 'Paulo Rocha', 355]].forEach(([dias, responsavel, registros]) => {
    operacoes.push([db.collection('importacoes').doc(), {
      data: `${somarDias(hoje(), -dias)}T14:10:00.000Z`, responsavel, arquivo: 'vacinacao-semanal.xlsx', registros, ignorados: inteiro(0, 5),
    }]);
  });

  for (let i = 0; i < 96; i++) {
    operacoes.push([db.collection('visitas').doc(), {
      data: somarDias(hoje(), -inteiro(0, 6)),
      agente: escolher(['Francisca Alves', 'Lucas Silva', 'Rita Andrade', 'João Freitas']),
      resultado: escolher(['Vacinado', 'Aceitou ir à UBS', 'Não encontrado']),
    }]);
  }

  operacoes.push([db.collection('estatisticas').doc('geral'), { moradoresEsclarecidos: 312, atualizadoEm: agora() }]);

  console.log(`Gravando ${operacoes.length} documentos no Firestore...`);
  await gravarEmLotes(operacoes);

  console.log('Pronto! Contas de teste (senha 123456):');
  console.log('  Morador: marina@email.com ou CPF 529.982.247-25');
  console.log('  Equipe:  carla@ubs.com (administradora), paulo@ubs.com, francisca@ubs.com');
}

popular()
  .then(() => process.exit(0))
  .catch((erro) => {
    console.error('Erro ao popular o banco:', erro.message);
    process.exit(1);
  });
