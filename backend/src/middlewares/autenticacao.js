const { auth, db } = require('../firebase');

async function autenticar(req, res, next) {
  const cabecalho = req.headers.authorization || '';
  const token = cabecalho.startsWith('Bearer ') ? cabecalho.slice(7) : null;

  if (!token) {
    return res.status(401).json({ erro: 'Faça login para continuar.' });
  }

  let decodificado;
  try {
    decodificado = await auth.verifyIdToken(token);
  } catch (erro) {
    return res.status(401).json({ erro: 'Sua sessão expirou. Entre novamente.' });
  }

  const documento = await db.collection('usuarios').doc(decodificado.uid).get();
  if (!documento.exists) {
    return res.status(401).json({ erro: 'Usuário não encontrado.' });
  }

  const usuario = { id: documento.id, ...documento.data() };
  if (usuario.ativo === false) {
    return res.status(403).json({ erro: 'Esta conta está desativada.' });
  }

  req.usuario = usuario;
  next();
}

function somenteMorador(req, res, next) {
  if (req.usuario.perfil !== 'morador') {
    return res.status(403).json({ erro: 'Esta área é exclusiva para moradores.' });
  }
  next();
}

function somenteEquipe(req, res, next) {
  if (req.usuario.perfil !== 'equipe') {
    return res.status(403).json({ erro: 'Esta área é exclusiva para a equipe da UBS.' });
  }
  next();
}

function exigirPermissao(permissao) {
  return (req, res, next) => {
    const usuario = req.usuario;
    if (usuario.papel === 'admin' || (usuario.permissoes && usuario.permissoes[permissao])) {
      return next();
    }
    return res.status(403).json({ erro: 'Você não tem permissão para esta ação.' });
  };
}

module.exports = { autenticar, somenteMorador, somenteEquipe, exigirPermissao };
