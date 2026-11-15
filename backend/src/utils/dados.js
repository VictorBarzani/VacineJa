const { db } = require('../firebase');
const { statusVacina, agora } = require('./regras');

function lista(snapshot) {
  return snapshot.docs.map((doc) => ({ id: doc.id, ...doc.data() }));
}

async function listarMoradores() {
  return lista(await db.collection('usuarios').where('perfil', '==', 'morador').get());
}

async function listarDependentes() {
  const snapshot = await db.collectionGroup('dependentes').get();
  return snapshot.docs.map((doc) => ({
    id: doc.id,
    responsavelId: doc.ref.parent.parent.id,
    ...doc.data(),
  }));
}

async function listarPessoas() {
  const [moradores, dependentes] = await Promise.all([listarMoradores(), listarDependentes()]);
  const pessoas = [];
  moradores.forEach((m) => pessoas.push({ cpf: m.cpf, nome: m.nome, nascimento: m.nascimento, usuarioId: m.id }));
  dependentes.forEach((d) => {
    if (d.cpf) pessoas.push({ cpf: d.cpf, nome: d.nome, nascimento: d.nascimento, usuarioId: d.responsavelId });
  });
  return pessoas;
}

async function registrosAgrupados() {
  const registros = lista(await db.collection('vacinacoes').get());
  const porCpf = {};
  registros.forEach((r) => {
    r.status = statusVacina(r);
    if (!porCpf[r.cpf]) porCpf[r.cpf] = [];
    porCpf[r.cpf].push(r);
  });
  return porCpf;
}

async function registrosDoCpf(cpf) {
  if (!cpf) return [];
  const registros = lista(await db.collection('vacinacoes').where('cpf', '==', cpf).get());
  registros.forEach((r) => { r.status = statusVacina(r); });
  const ordem = { atrasada: 0, proxima: 1, aplicada: 2 };
  return registros.sort((a, b) => {
    if (ordem[a.status] !== ordem[b.status]) return ordem[a.status] - ordem[b.status];
    return String(b.data || b.dataPrevista).localeCompare(String(a.data || a.dataPrevista));
  });
}

async function notificar(usuarioIds, notificacao) {
  const ids = [...new Set(usuarioIds)];
  for (let i = 0; i < ids.length; i += 400) {
    const lote = db.batch();
    ids.slice(i, i + 400).forEach((id) => {
      const ref = db.collection('usuarios').doc(id).collection('notificacoes').doc();
      lote.set(ref, { ...notificacao, lida: false, criadaEm: agora() });
    });
    await lote.commit();
  }
}

module.exports = {
  lista,
  listarMoradores,
  listarDependentes,
  listarPessoas,
  registrosAgrupados,
  registrosDoCpf,
  notificar,
};
