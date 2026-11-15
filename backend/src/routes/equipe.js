const express = require('express');
const multer = require('multer');
const XLSX = require('xlsx');
const { auth, db } = require('../firebase');
const { autenticar, somenteEquipe, exigirPermissao } = require('../middlewares/autenticacao');
const { lista, listarMoradores, listarPessoas, registrosAgrupados, notificar } = require('../utils/dados');
const {
  VACINAS_PAINEL, FAIXAS, hoje, agora, somarDias, apenasNumeros, cpfValido, mascararCpf, faixaEtaria, converterData, statusVacina,
} = require('../utils/regras');

const router = express.Router();
router.use(autenticar, somenteEquipe);

const planilha = multer({ storage: multer.memoryStorage(), limits: { fileSize: 5 * 1024 * 1024 } });

function porcentagem(parte, total) {
  return total ? Math.round((parte / total) * 100) : 0;
}

router.get('/painel', async (req, res) => {
  const [pessoas, porCpf, ultimaImportacao, visitas] = await Promise.all([
    listarPessoas(),
    registrosAgrupados(),
    db.collection('importacoes').orderBy('data', 'desc').limit(1).get(),
    db.collection('visitas').where('data', '>=', somarDias(hoje(), -6)).get(),
  ]);

  const emDia = pessoas.filter((p) => !(porCpf[p.cpf] || []).some((r) => r.status === 'atrasada'));

  const coberturaVacinas = VACINAS_PAINEL.map((vacina) => {
    let total = 0;
    let aplicadas = 0;
    pessoas.forEach((p) => {
      const registros = (porCpf[p.cpf] || []).filter((r) => r.vacina === vacina);
      if (!registros.length) return;
      total++;
      if (registros.every((r) => r.status !== 'atrasada')) aplicadas++;
    });
    return { nome: vacina, valor: porcentagem(aplicadas, total) };
  });

  const coberturaFaixas = FAIXAS.map((faixa) => {
    const grupo = pessoas.filter((p) => faixaEtaria(p.nascimento) === faixa.nome);
    const grupoEmDia = grupo.filter((p) => emDia.includes(p));
    return { nome: faixa.nome, valor: porcentagem(grupoEmDia.length, grupo.length) };
  });

  res.json({
    atualizadoEm: ultimaImportacao.empty ? null : ultimaImportacao.docs[0].data().data,
    moradores: pessoas.length,
    emDia: porcentagem(emDia.length, pessoas.length),
    atrasados: pessoas.length ? 100 - porcentagem(emDia.length, pessoas.length) : 0,
    visitasSemana: visitas.size,
    meta: 90,
    coberturaVacinas,
    coberturaFaixas,
  });
});

router.get('/importacoes', async (req, res) => {
  const historico = lista(await db.collection('importacoes').orderBy('data', 'desc').limit(10).get());
  res.json(historico);
});

router.get('/importacoes/modelo', (req, res) => {
  const csv = 'cpf;vacina;dose;data;lote\n529.982.247-25;Influenza;Anual;10/10/2026;IF2210\n';
  res.setHeader('Content-Type', 'text/csv; charset=utf-8');
  res.setHeader('Content-Disposition', 'attachment; filename="modelo-importacao-vacineja.csv"');
  res.send('﻿' + csv);
});

function textoDaCelula(valor) {
  if (valor instanceof Date) {
    const mes = String(valor.getMonth() + 1).padStart(2, '0');
    const dia = String(valor.getDate()).padStart(2, '0');
    return `${valor.getFullYear()}-${mes}-${dia}`;
  }
  return String(valor).trim();
}

function normalizarCabecalho(texto) {
  return String(texto).toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '').trim();
}

router.post('/importacoes/previa', exigirPermissao('importar'), planilha.single('arquivo'), async (req, res) => {
  if (!req.file) {
    return res.status(400).json({ erro: 'Envie uma planilha CSV ou Excel.' });
  }

  let linhas;
  try {
    const csv = /\.csv$/i.test(req.file.originalname) || req.file.mimetype === 'text/csv';
    const livro = csv
      ? XLSX.read(req.file.buffer.toString('utf8').replace(/^\uFEFF/, ''), { type: 'string', raw: true })
      : XLSX.read(req.file.buffer, { type: 'buffer', raw: true, cellDates: true });
    const aba = livro.Sheets[livro.SheetNames[0]];
    linhas = XLSX.utils.sheet_to_json(aba, { raw: true, defval: '' });
  } catch (erro) {
    return res.status(400).json({ erro: 'Não foi possível ler a planilha. Use o modelo disponível.' });
  }
  if (!linhas.length) {
    return res.status(400).json({ erro: 'A planilha está vazia.' });
  }

  const cadastrados = new Set((await listarPessoas()).map((p) => p.cpf));

  const resultado = linhas.map((original, indice) => {
    const linha = {};
    Object.keys(original).forEach((chave) => { linha[normalizarCabecalho(chave)] = textoDaCelula(original[chave]); });
    const digitos = apenasNumeros(linha.cpf);
    const cpf = digitos && digitos.length < 11 ? digitos.padStart(11, '0') : digitos;
    const data = converterData(linha.data);
    let erro = null;
    if (!cpfValido(cpf)) erro = 'CPF inválido';
    else if (!linha.vacina) erro = 'Vacina não informada';
    else if (!data) erro = 'Data inválida';
    else if (data > hoje()) erro = 'Data futura';
    else if (!cadastrados.has(cpf)) erro = 'Morador não cadastrado';
    return {
      linha: indice + 2,
      cpf,
      cpfMascarado: cpfValido(cpf) ? mascararCpf(cpf) : linha.cpf,
      vacina: linha.vacina,
      dose: linha.dose || '',
      data,
      dataOriginal: linha.data,
      lote: linha.lote || '',
      erro,
    };
  });

  res.json({
    arquivo: req.file.originalname,
    linhas: resultado.map(({ cpf, ...resto }) => resto),
    validas: resultado.filter((l) => !l.erro).map(({ cpf, vacina, dose, data, lote }) => ({ cpf, vacina, dose, data, lote })),
  });
});

router.post('/importacoes', exigirPermissao('importar'), async (req, res) => {
  const { validas = [], ignoradas = 0, arquivo = '' } = req.body;
  const pessoas = await listarPessoas();
  const responsaveis = {};
  pessoas.forEach((p) => { responsaveis[p.cpf] = p.usuarioId; });

  const aceitas = validas.filter((l) => cpfValido(l.cpf) && responsaveis[l.cpf] && converterData(l.data) && l.vacina);
  if (!aceitas.length) {
    return res.status(400).json({ erro: 'Nenhuma linha válida para importar.' });
  }

  const porCpf = await registrosAgrupados();
  const lote = db.batch();
  aceitas.forEach((l) => {
    const pendente = (porCpf[l.cpf] || []).find((r) => !r.data && r.vacina.toLowerCase() === l.vacina.toLowerCase());
    const dados = { cpf: l.cpf, vacina: l.vacina, dose: l.dose, data: converterData(l.data), dataPrevista: null, lote: l.lote };
    if (pendente) lote.update(db.collection('vacinacoes').doc(pendente.id), dados);
    else lote.set(db.collection('vacinacoes').doc(), dados);
  });
  await lote.commit();

  await db.collection('importacoes').add({
    data: agora(),
    responsavel: req.usuario.nome,
    arquivo,
    registros: aceitas.length,
    ignorados: Number(ignoradas) || 0,
  });

  await notificar(aceitas.map((l) => responsaveis[l.cpf]), {
    titulo: 'A UBS registrou uma nova vacina na sua carteirinha.',
    link: '/carteirinha',
  });

  res.status(201).json({ mensagem: `Importação confirmada: ${aceitas.length} registros importados.`, importados: aceitas.length });
});

const CAMPOS_CONTEUDO = ['tipo', 'titulo', 'resumo', 'texto', 'fonte', 'tema', 'categoria', 'imagem'];

function validarConteudo(corpo) {
  const dados = {};
  CAMPOS_CONTEUDO.forEach((campo) => { dados[campo] = String(corpo[campo] || '').trim(); });
  if (!['mito', 'verdade', 'informativo'].includes(dados.tipo)) return { erro: 'Escolha a classificação.' };
  if (!dados.titulo || !dados.texto || !dados.fonte) return { erro: 'Preencha título, texto e fonte oficial.' };
  if (!dados.resumo) dados.resumo = dados.texto.split('. ')[0].slice(0, 140);
  dados.tempoLeitura = Math.max(1, Math.round(dados.texto.split(/\s+/).length / 180));
  return { dados };
}

router.get('/conteudos', async (req, res) => {
  const [conteudos, meta] = await Promise.all([
    db.collection('conteudos').get(),
    db.collection('estatisticas').doc('geral').get(),
  ]);
  const ordem = { publicado: 0, rascunho: 1, arquivado: 2 };
  res.json({
    meta: { alvo: 500, atingido: meta.exists ? meta.data().moradoresEsclarecidos || 0 : 0 },
    conteudos: lista(conteudos).sort((a, b) => ordem[a.status] - ordem[b.status] || String(b.atualizadoEm).localeCompare(String(a.atualizadoEm))),
  });
});

async function avisarPublicacao(conteudo) {
  const moradores = await listarMoradores();
  const informativo = conteudo.tipo === 'informativo';
  await notificar(moradores.map((m) => m.id), {
    titulo: informativo ? `Novo informativo: ${conteudo.titulo}` : 'Novo esclarecimento em Mitos e Verdades',
    link: informativo ? `/informativos/${conteudo.id}` : `/mitos/${conteudo.id}`,
  });
}

router.post('/conteudos', exigirPermissao('publicar'), async (req, res) => {
  const { erro, dados } = validarConteudo(req.body);
  if (erro) return res.status(400).json({ erro });
  const status = req.body.status === 'publicado' ? 'publicado' : 'rascunho';
  const ref = await db.collection('conteudos').add({
    ...dados,
    status,
    autor: req.usuario.nome,
    esclarecidos: 0,
    leituras: 0,
    atualizadoEm: hoje(),
    publicadoEm: status === 'publicado' ? hoje() : null,
  });
  if (status === 'publicado') await avisarPublicacao({ id: ref.id, ...dados });
  res.status(201).json({ id: ref.id, mensagem: status === 'publicado' ? 'Conteúdo publicado.' : 'Rascunho salvo.' });
});

router.put('/conteudos/:id', exigirPermissao('publicar'), async (req, res) => {
  const ref = db.collection('conteudos').doc(req.params.id);
  const atual = await ref.get();
  if (!atual.exists) return res.status(404).json({ erro: 'Conteúdo não encontrado.' });
  const { erro, dados } = validarConteudo(req.body);
  if (erro) return res.status(400).json({ erro });
  const status = req.body.status === 'publicado' ? 'publicado' : 'rascunho';
  const publicandoAgora = status === 'publicado' && atual.data().status !== 'publicado';
  await ref.update({
    ...dados,
    status,
    atualizadoEm: hoje(),
    publicadoEm: status === 'publicado' ? atual.data().publicadoEm || hoje() : atual.data().publicadoEm || null,
  });
  if (publicandoAgora) await avisarPublicacao({ id: ref.id, ...dados });
  res.json({ mensagem: status === 'publicado' ? 'Conteúdo publicado.' : 'Rascunho salvo.' });
});

router.patch('/conteudos/:id/status', exigirPermissao('publicar'), async (req, res) => {
  const { status } = req.body;
  if (!['publicado', 'rascunho', 'arquivado'].includes(status)) {
    return res.status(400).json({ erro: 'Status inválido.' });
  }
  const ref = db.collection('conteudos').doc(req.params.id);
  const atual = await ref.get();
  if (!atual.exists) return res.status(404).json({ erro: 'Conteúdo não encontrado.' });
  const publicandoAgora = status === 'publicado' && atual.data().status !== 'publicado';
  await ref.update({
    status,
    atualizadoEm: hoje(),
    publicadoEm: publicandoAgora ? atual.data().publicadoEm || hoje() : atual.data().publicadoEm || null,
  });
  if (publicandoAgora) await avisarPublicacao({ id: ref.id, ...atual.data() });
  res.json({ mensagem: status === 'publicado' ? 'Conteúdo publicado.' : 'Conteúdo despublicado.' });
});

function usuarioEquipe(u) {
  const { id, nome, email, cargo, papel, permissoes, ativo } = u;
  return { id, nome, email, cargo, papel, permissoes: permissoes || {}, ativo: ativo !== false };
}

router.get('/usuarios', async (req, res) => {
  if (req.query.tipo === 'moradores') {
    const [moradores, porCpf] = await Promise.all([listarMoradores(), registrosAgrupados()]);
    const termo = String(req.query.busca || '').trim().toLowerCase();
    const numeros = apenasNumeros(termo);
    const resultado = moradores
      .filter((m) => !termo || m.nome.toLowerCase().includes(termo) || (numeros && m.cpf.includes(numeros)))
      .map((m) => {
        const atrasadas = (porCpf[m.cpf] || []).filter((r) => statusVacina(r) === 'atrasada').length;
        return { id: m.id, nome: m.nome, cpf: mascararCpf(m.cpf), atrasadas };
      })
      .sort((a, b) => a.nome.localeCompare(b.nome));
    return res.json({ total: moradores.length, moradores: resultado });
  }
  const equipe = lista(await db.collection('usuarios').where('perfil', '==', 'equipe').get())
    .map(usuarioEquipe)
    .sort((a, b) => Number(b.ativo) - Number(a.ativo) || a.nome.localeCompare(b.nome));
  res.json(equipe);
});

router.post('/usuarios', exigirPermissao('usuarios'), async (req, res) => {
  const nome = String(req.body.nome || '').trim();
  const email = String(req.body.email || '').trim().toLowerCase();
  const cargo = String(req.body.cargo || '').trim();
  const senha = String(req.body.senha || '');
  if (!nome || !email || !cargo || !senha) {
    return res.status(400).json({ erro: 'Preencha nome, e-mail, cargo e senha inicial.' });
  }
  if (senha.length < 6) {
    return res.status(400).json({ erro: 'A senha inicial precisa ter pelo menos 6 caracteres.' });
  }
  let criado;
  try {
    criado = await auth.createUser({ email, password: senha, displayName: nome });
  } catch (erro) {
    if (erro.code === 'auth/email-already-exists') return res.status(409).json({ erro: 'Já existe uma conta com este e-mail.' });
    if (erro.code === 'auth/invalid-email') return res.status(400).json({ erro: 'E-mail inválido.' });
    throw erro;
  }
  await db.collection('usuarios').doc(criado.uid).set({
    nome,
    email,
    cargo,
    perfil: 'equipe',
    papel: 'equipe',
    permissoes: { importar: false, publicar: false, usuarios: false },
    ativo: true,
    criadoEm: agora(),
  });
  res.status(201).json({ mensagem: `Conta de ${nome} criada. Passe a senha inicial para o profissional.` });
});

router.patch('/usuarios/:id/permissoes', exigirPermissao('usuarios'), async (req, res) => {
  const ref = db.collection('usuarios').doc(req.params.id);
  const doc = await ref.get();
  if (!doc.exists || doc.data().perfil !== 'equipe') return res.status(404).json({ erro: 'Usuário não encontrado.' });
  const atuais = doc.data().permissoes || {};
  const permissoes = {};
  ['importar', 'publicar', 'usuarios'].forEach((p) => {
    permissoes[p] = typeof req.body[p] === 'boolean' ? req.body[p] : !!atuais[p];
  });
  await ref.update({ permissoes });
  res.json({ mensagem: 'Permissões atualizadas.', permissoes });
});

router.patch('/usuarios/:id/ativo', exigirPermissao('usuarios'), async (req, res) => {
  if (req.params.id === req.usuario.id) {
    return res.status(400).json({ erro: 'Você não pode desativar a sua própria conta.' });
  }
  const ref = db.collection('usuarios').doc(req.params.id);
  const doc = await ref.get();
  if (!doc.exists || doc.data().perfil !== 'equipe') return res.status(404).json({ erro: 'Usuário não encontrado.' });
  const ativo = !!req.body.ativo;
  await auth.updateUser(req.params.id, { disabled: !ativo });
  await ref.update({ ativo });
  res.json({ mensagem: ativo ? 'Conta reativada.' : 'Conta desativada.' });
});

module.exports = router;
