const express = require('express');
const { db, FieldValue } = require('../firebase');
const { autenticar } = require('../middlewares/autenticacao');
const { lista } = require('../utils/dados');
const { agora } = require('../utils/regras');

const router = express.Router();
router.use(autenticar);

const GRUPOS = {
  mitos: ['mito', 'verdade'],
  informativos: ['informativo'],
};

function resumo(c) {
  const { id, tipo, titulo, resumo: texto, tema, categoria, imagem, publicadoEm, atualizadoEm, tempoLeitura, esclarecidos } = c;
  return { id, tipo, titulo, resumo: texto, tema, categoria, imagem, publicadoEm, atualizadoEm, tempoLeitura, esclarecidos };
}

router.get('/', async (req, res) => {
  const tipos = GRUPOS[req.query.grupo];
  if (!tipos) {
    return res.status(400).json({ erro: 'Informe o grupo: mitos ou informativos.' });
  }
  const conteudos = lista(await db.collection('conteudos').where('status', '==', 'publicado').get())
    .filter((c) => tipos.includes(c.tipo))
    .sort((a, b) => b.publicadoEm.localeCompare(a.publicadoEm));

  const comLeitura = await Promise.all(conteudos.map(async (c) => {
    const leitura = await db.collection('conteudos').doc(c.id).collection('leituras').doc(req.usuario.id).get();
    return { ...resumo(c), lido: leitura.exists };
  }));
  res.json(comLeitura);
});

router.get('/:id', async (req, res) => {
  const ref = db.collection('conteudos').doc(req.params.id);
  const doc = await ref.get();
  if (!doc.exists || doc.data().status !== 'publicado') {
    return res.status(404).json({ erro: 'Conteúdo não encontrado.' });
  }
  const [esclareceu, leitura] = await Promise.all([
    ref.collection('esclarecimentos').doc(req.usuario.id).get(),
    ref.collection('leituras').doc(req.usuario.id).get(),
  ]);
  res.json({ id: doc.id, ...doc.data(), esclareceu: esclareceu.exists, lido: leitura.exists });
});

router.post('/:id/leitura', async (req, res) => {
  const ref = db.collection('conteudos').doc(req.params.id);
  const leituraRef = ref.collection('leituras').doc(req.usuario.id);
  await db.runTransaction(async (t) => {
    const [conteudo, leitura] = await Promise.all([t.get(ref), t.get(leituraRef)]);
    if (!conteudo.exists || leitura.exists) return;
    t.set(leituraRef, { lidaEm: agora() });
    t.update(ref, { leituras: FieldValue.increment(1) });
  });
  res.json({ lido: true });
});

router.post('/:id/esclareceu', async (req, res) => {
  const ref = db.collection('conteudos').doc(req.params.id);
  const marcaRef = ref.collection('esclarecimentos').doc(req.usuario.id);
  const usuarioRef = db.collection('usuarios').doc(req.usuario.id);
  const metaRef = db.collection('estatisticas').doc('geral');

  const total = await db.runTransaction(async (t) => {
    const [conteudo, marca, usuario] = await Promise.all([t.get(ref), t.get(marcaRef), t.get(usuarioRef)]);
    if (!conteudo.exists) return null;
    const atual = conteudo.data().esclarecidos || 0;
    if (marca.exists) return atual;
    t.set(marcaRef, { em: agora() });
    t.update(ref, { esclarecidos: FieldValue.increment(1) });
    if (!usuario.data().esclarecido) {
      t.update(usuarioRef, { esclarecido: true });
      t.set(metaRef, { moradoresEsclarecidos: FieldValue.increment(1) }, { merge: true });
    }
    return atual + 1;
  });

  if (total === null) {
    return res.status(404).json({ erro: 'Conteúdo não encontrado.' });
  }
  res.json({ esclareceu: true, esclarecidos: total });
});

module.exports = router;
