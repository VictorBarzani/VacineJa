import { auth } from '../firebase';

const BASE = import.meta.env.VITE_API_URL || 'http://localhost:3001/api';

export async function api(caminho, { metodo = 'GET', corpo, formulario } = {}) {
  const cabecalhos = {};
  const usuario = auth.currentUser;
  if (usuario) {
    cabecalhos.Authorization = `Bearer ${await usuario.getIdToken()}`;
  }

  let body;
  if (formulario) {
    body = formulario;
  } else if (corpo !== undefined) {
    cabecalhos['Content-Type'] = 'application/json';
    body = JSON.stringify(corpo);
  }

  let resposta;
  try {
    resposta = await fetch(BASE + caminho, { method: metodo, headers: cabecalhos, body });
  } catch (erro) {
    throw new Error('Não foi possível conectar ao servidor. Verifique se a API está rodando.');
  }

  const tipo = resposta.headers.get('Content-Type') || '';
  const dados = tipo.includes('application/json') ? await resposta.json() : await resposta.blob();

  if (!resposta.ok) {
    throw new Error(dados.erro || 'Algo deu errado. Tente novamente.');
  }
  return dados;
}
