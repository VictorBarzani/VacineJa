const express = require('express');
const { auth, db } = require('../firebase');
const { autenticar } = require('../middlewares/autenticacao');
const { notificar } = require('../utils/dados');
const { apenasNumeros, cpfValido, converterData, hoje, agora } = require('../utils/regras');

const router = express.Router();

router.post('/cadastro', async (req, res) => {
  const { nome, cpf, nascimento, email, senha, confirmarSenha } = req.body;
  const cpfLimpo = apenasNumeros(cpf);
  const emailLimpo = String(email || '').trim().toLowerCase();

  if (!nome || !cpf || !nascimento || !email || !senha || !confirmarSenha) {
    return res.status(400).json({ erro: 'Preencha todos os campos.' });
  }
  if (!cpfValido(cpfLimpo)) {
    return res.status(400).json({ erro: 'CPF inválido.' });
  }
  const dataNascimento = converterData(nascimento);
  if (!dataNascimento || dataNascimento > hoje()) {
    return res.status(400).json({ erro: 'Data de nascimento inválida.' });
  }
  if (senha.length < 6) {
    return res.status(400).json({ erro: 'A senha precisa ter pelo menos 6 caracteres.' });
  }
  if (senha !== confirmarSenha) {
    return res.status(400).json({ erro: 'A senha e a confirmação não são iguais.' });
  }

  const mesmoCpf = await db.collection('usuarios').where('cpf', '==', cpfLimpo).get();
  if (!mesmoCpf.empty) {
    return res.status(409).json({ erro: 'Já existe uma conta com este CPF.' });
  }

  let usuario;
  try {
    usuario = await auth.createUser({ email: emailLimpo, password: senha, displayName: nome.trim() });
  } catch (erro) {
    if (erro.code === 'auth/email-already-exists') {
      return res.status(409).json({ erro: 'Já existe uma conta com este e-mail.' });
    }
    if (erro.code === 'auth/invalid-email') {
      return res.status(400).json({ erro: 'E-mail inválido.' });
    }
    throw erro;
  }

  await db.collection('usuarios').doc(usuario.uid).set({
    nome: nome.trim(),
    cpf: cpfLimpo,
    nascimento: dataNascimento,
    email: emailLimpo,
    telefone: '',
    perfil: 'morador',
    ativo: true,
    criadoEm: agora(),
  });

  await notificar([usuario.uid], {
    titulo: 'Boas-vindas ao VacineJá! Confira a sua carteirinha.',
    link: '/carteirinha',
  });

  res.status(201).json({ mensagem: 'Conta criada. Agora é só entrar.' });
});

router.post('/identificar', async (req, res) => {
  const identificador = String(req.body.identificador || '').trim().toLowerCase();
  if (!identificador) {
    return res.status(400).json({ erro: 'E-mail ou senha incorretos.' });
  }
  if (identificador.includes('@')) {
    return res.json({ email: identificador });
  }
  const encontrados = await db.collection('usuarios').where('cpf', '==', apenasNumeros(identificador)).get();
  if (encontrados.empty) {
    return res.status(404).json({ erro: 'E-mail ou senha incorretos.' });
  }
  res.json({ email: encontrados.docs[0].data().email });
});

router.get('/eu', autenticar, (req, res) => {
  const { id, nome, email, perfil, papel, permissoes, cargo } = req.usuario;
  res.json({ id, nome, email, perfil, papel: papel || null, permissoes: permissoes || {}, cargo: cargo || null });
});

module.exports = router;
