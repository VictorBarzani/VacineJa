import { useEffect, useState } from 'react';
import { api } from '../../services/api';
import { useAuth } from '../../contexts/AuthContext';
import { Carregando, Mensagem, TituloPagina } from '../../components/Comuns';
import { CATEGORIAS, TEMAS } from '../../utils';

const VAZIO = { id: null, tipo: 'mito', tema: 'efeitos', categoria: 'campanhas', titulo: '', resumo: '', texto: '', fonte: '', imagem: '' };
const STATUS = { publicado: ['ok', 'Publicado'], rascunho: ['aviso', 'Rascunho'], arquivado: ['neutra', 'Arquivado'] };
const TIPOS = { mito: 'Mito', verdade: 'Verdade', informativo: 'Informativo' };

export default function Conteudo() {
  const { pode } = useAuth();
  const [dados, setDados] = useState(null);
  const [formulario, setFormulario] = useState(VAZIO);
  const [mensagem, setMensagem] = useState(null);
  const [salvando, setSalvando] = useState(false);

  function carregar() {
    return api('/equipe/conteudos').then(setDados).catch((falha) => setMensagem({ tipo: 'danger', texto: falha.message }));
  }

  useEffect(() => { carregar(); }, []);

  function mudar(campo, valor) {
    setFormulario({ ...formulario, [campo]: valor });
  }

  function editar(conteudo) {
    setFormulario({ ...VAZIO, ...conteudo, tema: conteudo.tema || VAZIO.tema, categoria: conteudo.categoria || VAZIO.categoria });
    setMensagem(null);
    document.getElementById('formConteudo').scrollIntoView({ behavior: 'smooth' });
  }

  async function salvar(status) {
    setSalvando(true);
    try {
      const corpo = {
        ...formulario,
        status,
        tema: formulario.tipo === 'informativo' ? '' : formulario.tema,
        categoria: formulario.tipo === 'informativo' ? formulario.categoria : '',
      };
      const resposta = formulario.id
        ? await api(`/equipe/conteudos/${formulario.id}`, { metodo: 'PUT', corpo })
        : await api('/equipe/conteudos', { metodo: 'POST', corpo });
      setMensagem({ tipo: 'success', texto: resposta.mensagem });
      setFormulario(VAZIO);
      await carregar();
    } catch (falha) {
      setMensagem({ tipo: 'danger', texto: falha.message });
    }
    setSalvando(false);
  }

  async function alterarStatus(conteudo, status) {
    try {
      const resposta = await api(`/equipe/conteudos/${conteudo.id}/status`, { metodo: 'PATCH', corpo: { status } });
      setMensagem({ tipo: 'success', texto: resposta.mensagem });
      await carregar();
    } catch (falha) {
      setMensagem({ tipo: 'danger', texto: falha.message });
    }
  }

  if (!dados) return mensagem ? <Mensagem tipo="danger" texto={mensagem.texto} /> : <Carregando />;

  const podePublicar = pode('publicar');
  const progresso = Math.min(100, Math.round((dados.meta.atingido / dados.meta.alvo) * 100));

  return (
    <div className="d-flex flex-column gap-4">
      <TituloPagina titulo="Gerenciar conteúdo" descricao="Mitos e verdades e informativos publicados para os moradores." />

      <div className="cartao">
        <p className="sobretitulo mb-1">Meta</p>
        <h2 className="h5">{dados.meta.alvo} moradores esclarecidos</h2>
        <div className="progress mt-3" role="progressbar" aria-valuenow={progresso} aria-valuemin="0" aria-valuemax="100" aria-label="Progresso da meta">
          <div className="progress-bar bg-success" style={{ width: `${progresso}%` }} />
        </div>
        <p className="small text-body-secondary mt-2 mb-0">
          {dados.meta.atingido} de {dados.meta.alvo} moradores marcaram "isso esclareceu minha dúvida"
        </p>
      </div>

      {!podePublicar && <Mensagem tipo="warning" texto="Sua conta não tem permissão para publicar conteúdo. Peça à coordenação." />}
      {mensagem && <Mensagem tipo={mensagem.tipo} texto={mensagem.texto} aoFechar={() => setMensagem(null)} />}

      <div className="row g-4">
        <div className="col-xl-6">
          <h2 className="h5">Conteúdos</h2>
          <div className="lista">
            {dados.conteudos.map((c) => (
              <div key={c.id} className="item flex-wrap">
                <div className="flex-grow-1 min-w-0">
                  <b className="d-block">{c.titulo}</b>
                  <small className="text-body-secondary">
                    {TIPOS[c.tipo]} · {c.tipo === 'informativo' ? `${c.leituras || 0} leituras` : `${c.esclarecidos || 0} esclarecidos`}
                  </small>
                </div>
                <span className={`pilula ${STATUS[c.status][0]}`}>{STATUS[c.status][1]}</span>
                {podePublicar && (
                  <div className="d-flex gap-2">
                    <button type="button" className="btn btn-sm btn-outline-secondary" onClick={() => editar(c)}>Editar</button>
                    {c.status === 'publicado' && <button type="button" className="btn btn-sm btn-outline-secondary" onClick={() => alterarStatus(c, 'rascunho')}>Despublicar</button>}
                    {c.status === 'rascunho' && <button type="button" className="btn btn-sm btn-outline-secondary" onClick={() => alterarStatus(c, 'publicado')}>Publicar</button>}
                    {c.status === 'arquivado' && <button type="button" className="btn btn-sm btn-outline-secondary" onClick={() => alterarStatus(c, 'rascunho')}>Restaurar</button>}
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>

        <div className="col-xl-6">
          <form id="formConteudo" className="cartao d-flex flex-column gap-3" onSubmit={(e) => e.preventDefault()} noValidate>
            <div className="d-flex justify-content-between align-items-center">
              <h2 className="h5 mb-0">{formulario.id ? 'Editar conteúdo' : 'Criar conteúdo'}</h2>
              {formulario.id && <button type="button" className="btn btn-sm btn-link" onClick={() => setFormulario(VAZIO)}>Novo conteúdo</button>}
            </div>
            <div>
              <label htmlFor="contTitulo" className="form-label">Título</label>
              <input id="contTitulo" className="form-control" placeholder='Ex.: "Vacina tem chip"' value={formulario.titulo} onChange={(e) => mudar('titulo', e.target.value)} />
            </div>
            <div className="row g-3">
              <div className="col-sm-6">
                <label htmlFor="contTipo" className="form-label">Classificação</label>
                <select id="contTipo" className="form-select" value={formulario.tipo} onChange={(e) => mudar('tipo', e.target.value)}>
                  {Object.entries(TIPOS).map(([valor, nome]) => <option key={valor} value={valor}>{nome}</option>)}
                </select>
              </div>
              <div className="col-sm-6">
                {formulario.tipo === 'informativo' ? (
                  <>
                    <label htmlFor="contCategoria" className="form-label">Categoria</label>
                    <select id="contCategoria" className="form-select" value={formulario.categoria} onChange={(e) => mudar('categoria', e.target.value)}>
                      {Object.entries(CATEGORIAS).map(([valor, nome]) => <option key={valor} value={valor}>{nome}</option>)}
                    </select>
                  </>
                ) : (
                  <>
                    <label htmlFor="contTema" className="form-label">Tema</label>
                    <select id="contTema" className="form-select" value={formulario.tema} onChange={(e) => mudar('tema', e.target.value)}>
                      {Object.entries(TEMAS).map(([valor, nome]) => <option key={valor} value={valor}>{nome}</option>)}
                    </select>
                  </>
                )}
              </div>
            </div>
            <div>
              <label htmlFor="contResumo" className="form-label">Resumo de uma linha</label>
              <input id="contResumo" className="form-control" value={formulario.resumo} onChange={(e) => mudar('resumo', e.target.value)} />
            </div>
            <div>
              <label htmlFor="contTexto" className="form-label">Texto</label>
              <textarea id="contTexto" className="form-control" rows="6" value={formulario.texto} onChange={(e) => mudar('texto', e.target.value)} />
            </div>
            <div>
              <label htmlFor="contFonte" className="form-label">Fonte oficial</label>
              <input id="contFonte" className="form-control" placeholder="Ex.: Ministério da Saúde" value={formulario.fonte} onChange={(e) => mudar('fonte', e.target.value)} />
            </div>
            <div>
              <label htmlFor="contImagem" className="form-label">Imagem (opcional)</label>
              <input id="contImagem" type="url" className="form-control" placeholder="Link da imagem, começando com https://" value={formulario.imagem} onChange={(e) => mudar('imagem', e.target.value)} />
            </div>
            <div className="d-flex flex-wrap gap-2">
              <button type="button" className="btn btn-success" disabled={!podePublicar || salvando} onClick={() => salvar('publicado')}>Publicar</button>
              <button type="button" className="btn btn-outline-secondary" disabled={!podePublicar || salvando} onClick={() => salvar('rascunho')}>Salvar rascunho</button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}
