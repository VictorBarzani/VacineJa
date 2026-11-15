const express = require('express');
const path = require('path');
const multer = require('multer');
const { auth, db } = require('../firebase');
const { autenticar, somenteMorador } = require('../middlewares/autenticacao');
const { lista, registrosDoCpf, notificar } = require('../utils/dados');
const {
  hoje, agora, diasEntre, idade, apenasNumeros, cpfValido, converterData, calendarioPorIdade,
} = require('../utils/regras');

const router = express.Router();
router.use(autenticar, somenteMorador);

const envio = multer({
  storage: multer.diskStorage({
    destination: path.join(__dirname, '..', '..', 'uploads'),
    filename: (req, arquivo, cb) => cb(null, `${Date.now()}-${req.usuario.id}${path.extname(arquivo.originalname)}`),
  }),
  limits: { fileSize: 5 * 1024 * 1024 },
  fileFilter: (req, arquivo, cb) => cb(null, /^image\/|application\/pdf/.test(arquivo.mimetype)),
});

function dependentesRef(usuarioId) {
  return db.collection('usuarios').doc(usuarioId).collection('dependentes');
}

function situacao(registros) {
  const relevantes = registros.filter((r) => r.status !== 'proxima' || r.dataPrevista);
  const atrasadas = registros.filter((r) => r.status === 'atrasada');
  const proximas = registros
    .filter((r) => r.status === 'proxima' && r.dataPrevista)
    .sort((a, b) => a.dataPrevista.localeCompare(b.dataPrevista));
  const vacinas = new Set(relevantes.map((r) => r.vacina));
  const vacinasAtrasadas = new Set(atrasadas.map((r) => r.vacina));
  return {
    totalVacinas: vacinas.size,
    emDia: vacinas.size - vacinasAtrasadas.size,
    status: atrasadas.length ? 'atrasada' : 'em dia',
    atrasadas: atrasadas.map((r) => ({
      vacina: r.vacina,
      dose: r.dose,
      dataPrevista: r.dataPrevista,
      diasAtraso: diasEntre(r.dataPrevista, hoje()),
    })),
    proximaDose: proximas.length
      ? { vacina: proximas[0].vacina, dataPrevista: proximas[0].dataPrevista, emDias: diasEntre(hoje(), proximas[0].dataPrevista) }
      : null,
  };
}

async function marcarLidos(usuarioId, conteudos) {
  return Promise.all(conteudos.map(async (c) => {
    const leitura = await db.collection('conteudos').doc(c.id).collection('leituras').doc(usuarioId).get();
    return { ...c, lido: leitura.exists };
  }));
}

router.get('/resumo', async (req, res) => {
  const registros = await registrosDoCpf(req.usuario.cpf);
  const [dependentes, informativosSnap] = await Promise.all([
    dependentesRef(req.usuario.id).get(),
    db.collection('conteudos').where('tipo', '==', 'informativo').get(),
  ]);
  const informativos = lista(informativosSnap)
    .filter((c) => c.status === 'publicado')
    .sort((a, b) => b.publicadoEm.localeCompare(a.publicadoEm))
    .slice(0, 3)
    .map(({ id, titulo, publicadoEm, tempoLeitura }) => ({ id, titulo, publicadoEm, tempoLeitura }));

  res.json({
    nome: req.usuario.nome,
    situacao: situacao(registros),
    quantidadeDependentes: dependentes.size,
    informativos: await marcarLidos(req.usuario.id, informativos),
  });
});

router.get('/carteirinha', async (req, res) => {
  const dependentes = lista(await dependentesRef(req.usuario.id).get());
  const pessoas = [
    { id: 'eu', nome: 'Eu', cpf: req.usuario.cpf, nascimento: req.usuario.nascimento },
    ...dependentes.map((d) => ({ id: d.id, nome: d.nome, cpf: d.cpf, nascimento: d.nascimento, parentesco: d.parentesco })),
  ].map((p) => ({ ...p, idade: idade(p.nascimento) }));

  const escolhida = pessoas.find((p) => p.id === (req.query.pessoa || 'eu')) || pessoas[0];
  const registros = await registrosDoCpf(escolhida.cpf);

  res.json({
    pessoas: pessoas.map(({ id, nome, idade: anos, parentesco }) => ({ id, nome, idade: anos, parentesco })),
    pessoa: { id: escolhida.id, nome: escolhida.id === 'eu' ? req.usuario.nome : escolhida.nome, idade: escolhida.idade },
    vacinas: registros.map(({ id, vacina, dose, data, dataPrevista, lote, status }) => ({ id, vacina, dose, data, dataPrevista, lote, status })),
    calendario: calendarioPorIdade(escolhida.nascimento),
  });
});

router.post('/comprovantes', envio.single('arquivo'), async (req, res) => {
  if (!req.file) {
    return res.status(400).json({ erro: 'Escolha uma foto ou PDF de até 5 MB.' });
  }
  await db.collection('comprovantes').add({
    usuarioId: req.usuario.id,
    nome: req.usuario.nome,
    pessoa: req.body.pessoa || 'eu',
    arquivo: req.file.filename,
    status: 'pendente',
    enviadoEm: agora(),
  });
  await notificar([req.usuario.id], {
    titulo: 'Seu comprovante foi enviado para validação da equipe da UBS.',
    link: '/carteirinha',
  });
  res.status(201).json({ mensagem: 'Comprovante enviado. A equipe da UBS vai validar.' });
});

router.get('/perfil', async (req, res) => {
  const dependentes = lista(await dependentesRef(req.usuario.id).get())
    .map((d) => ({ ...d, idade: idade(d.nascimento) }))
    .sort((a, b) => a.nome.localeCompare(b.nome));
  const { nome, email, telefone, cpf, nascimento } = req.usuario;
  res.json({ nome, email, telefone, cpf, nascimento, dependentes });
});

router.put('/perfil', async (req, res) => {
  const email = String(req.body.email || '').trim().toLowerCase();
  const telefone = String(req.body.telefone || '').trim();
  const senha = req.body.senha || '';

  if (!email) {
    return res.status(400).json({ erro: 'Informe o e-mail.' });
  }
  if (senha && senha.length < 6) {
    return res.status(400).json({ erro: 'A senha precisa ter pelo menos 6 caracteres.' });
  }

  const alteracoes = {};
  if (email !== req.usuario.email) alteracoes.email = email;
  if (senha) alteracoes.password = senha;

  if (Object.keys(alteracoes).length) {
    try {
      await auth.updateUser(req.usuario.id, alteracoes);
    } catch (erro) {
      if (erro.code === 'auth/email-already-exists') {
        return res.status(409).json({ erro: 'Este e-mail já está em uso.' });
      }
      if (erro.code === 'auth/invalid-email') {
        return res.status(400).json({ erro: 'E-mail inválido.' });
      }
      throw erro;
    }
  }

  await db.collection('usuarios').doc(req.usuario.id).update({ email, telefone });
  res.json({ mensagem: 'Dados salvos.' });
});

function validarDependente(corpo) {
  const nome = String(corpo.nome || '').trim();
  const parentesco = String(corpo.parentesco || '').trim();
  const nascimento = converterData(corpo.nascimento);
  const cpf = apenasNumeros(corpo.cpf);
  if (!nome || !parentesco || !nascimento) return { erro: 'Preencha nome, parentesco e data de nascimento.' };
  if (nascimento > hoje()) return { erro: 'Data de nascimento inválida.' };
  if (cpf && !cpfValido(cpf)) return { erro: 'CPF inválido.' };
  return { dados: { nome, parentesco, nascimento, cpf } };
}

router.post('/dependentes', async (req, res) => {
  const { erro, dados } = validarDependente(req.body);
  if (erro) return res.status(400).json({ erro });
  const ref = await dependentesRef(req.usuario.id).add({ ...dados, criadoEm: agora() });
  res.status(201).json({ id: ref.id, mensagem: 'Dependente adicionado.' });
});

router.put('/dependentes/:id', async (req, res) => {
  const { erro, dados } = validarDependente(req.body);
  if (erro) return res.status(400).json({ erro });
  const ref = dependentesRef(req.usuario.id).doc(req.params.id);
  if (!(await ref.get()).exists) return res.status(404).json({ erro: 'Dependente não encontrado.' });
  await ref.update(dados);
  res.json({ mensagem: 'Dependente atualizado.' });
});

router.delete('/dependentes/:id', async (req, res) => {
  await dependentesRef(req.usuario.id).doc(req.params.id).delete();
  res.json({ mensagem: 'Dependente removido.' });
});

router.post('/exclusao', async (req, res) => {
  await db.collection('solicitacoesExclusao').add({
    usuarioId: req.usuario.id,
    nome: req.usuario.nome,
    email: req.usuario.email,
    solicitadaEm: agora(),
    status: 'pendente',
  });
  res.status(201).json({ mensagem: 'Pedido registrado. Você vai receber um e-mail para confirmar a exclusão.' });
});

function notificacoesRef(usuarioId) {
  return db.collection('usuarios').doc(usuarioId).collection('notificacoes');
}

router.get('/notificacoes', async (req, res) => {
  const notificacoes = lista(await notificacoesRef(req.usuario.id).get())
    .sort((a, b) => b.criadaEm.localeCompare(a.criadaEm));
  res.json({ notificacoes, naoLidas: notificacoes.filter((n) => !n.lida).length });
});

router.post('/notificacoes/lidas', async (req, res) => {
  const naoLidas = await notificacoesRef(req.usuario.id).where('lida', '==', false).get();
  const lote = db.batch();
  naoLidas.docs.forEach((doc) => lote.update(doc.ref, { lida: true }));
  await lote.commit();
  res.json({ mensagem: 'Todas marcadas como lidas.' });
});

router.post('/notificacoes/:id/lida', async (req, res) => {
  const ref = notificacoesRef(req.usuario.id).doc(req.params.id);
  if ((await ref.get()).exists) await ref.update({ lida: true });
  res.json({ mensagem: 'Notificação lida.' });
});

module.exports = router;
