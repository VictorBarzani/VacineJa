import { useEffect, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { api } from '../../services/api';
import { Carregando, Filtros, Mensagem, TituloPagina } from '../../components/Comuns';
import { CATEGORIAS, TEMAS, formatarData } from '../../utils';

function Etiqueta({ tipo }) {
  return <span className={`etiqueta ${tipo}`}>{tipo === 'mito' ? 'Mito' : 'Verdade'}</span>;
}

function Paragrafos({ texto }) {
  return texto.split(/\n+/).filter(Boolean).map((p, i) => <p key={i}>{p}</p>);
}

export function Mitos() {
  const [conteudos, setConteudos] = useState(null);
  const [busca, setBusca] = useState('');
  const [tema, setTema] = useState('todos');
  const [erro, setErro] = useState('');

  useEffect(() => {
    api('/conteudos?grupo=mitos').then(setConteudos).catch((falha) => setErro(falha.message));
  }, []);

  const termo = busca.trim().toLowerCase();
  const visiveis = (conteudos || []).filter((c) => (
    (tema === 'todos' || c.tema === tema)
    && (!termo || `${c.titulo} ${c.resumo}`.toLowerCase().includes(termo))
  ));

  return (
    <div className="container">
      <TituloPagina
        titulo="Mitos e verdades"
        descricao="Esclarecimentos escritos pela equipe de enfermagem da UBS, com base em fontes oficiais."
      />
      <div className="d-flex flex-column gap-3">
        <div>
          <label htmlFor="buscaMitos" className="form-label">Buscar por palavra-chave</label>
          <input id="buscaMitos" type="search" className="form-control" placeholder="Ex.: febre, gravidez, autismo" value={busca} onChange={(e) => setBusca(e.target.value)} />
        </div>
        <Filtros rotulo="Tema" opcoes={[['todos', 'Todos'], ...Object.entries(TEMAS)]} valor={tema} aoMudar={setTema} />
        {erro && <Mensagem tipo="danger" texto={erro} />}
        {!conteudos && !erro ? <Carregando /> : (
          <div className="row g-3">
            {visiveis.map((c) => (
              <div key={c.id} className="col-md-6 col-lg-4">
                <Link to={`/mitos/${c.id}`} className="cartao cartao-link h-100 d-block">
                  <Etiqueta tipo={c.tipo} />
                  <h3 className="h5 mt-2">{c.titulo}</h3>
                  <p className="small text-body-secondary mb-0">{c.resumo}</p>
                </Link>
              </div>
            ))}
            {!visiveis.length && <p className="text-body-secondary">Nenhum esclarecimento encontrado para esta busca.</p>}
          </div>
        )}
      </div>
    </div>
  );
}

export function MitoDetalhe() {
  const { id } = useParams();
  const [conteudo, setConteudo] = useState(null);
  const [erro, setErro] = useState('');

  useEffect(() => {
    api(`/conteudos/${id}`)
      .then((dados) => {
        setConteudo(dados);
        api(`/conteudos/${id}/leitura`, { metodo: 'POST' }).catch(() => {});
      })
      .catch((falha) => setErro(falha.message));
  }, [id]);

  async function esclareceu() {
    try {
      const resposta = await api(`/conteudos/${id}/esclareceu`, { metodo: 'POST' });
      setConteudo({ ...conteudo, esclareceu: true, esclarecidos: resposta.esclarecidos });
    } catch (falha) {
      setErro(falha.message);
    }
  }

  if (erro) return <div className="container py-5"><Mensagem tipo="danger" texto={erro} /></div>;
  if (!conteudo) return <Carregando />;

  return (
    <div className="container container-estreito">
      <TituloPagina
        caminho={<p className="caminho"><Link to="/mitos">Mitos e verdades</Link> / Esclarecimento</p>}
        titulo={conteudo.titulo}
      />
      <div className="mb-4"><Etiqueta tipo={conteudo.tipo} /></div>
      <article className="artigo">
        <Paragrafos texto={conteudo.texto} />
        <p className="small text-body-secondary">
          Fonte: {conteudo.fonte}. Atualizado em {formatarData(conteudo.atualizadoEm)}.
        </p>
      </article>
      <div className="cartao d-flex flex-column gap-2 mt-4">
        <button
          type="button"
          className={`btn ${conteudo.esclareceu ? 'btn-secundario' : 'btn-success'}`}
          disabled={conteudo.esclareceu}
          onClick={esclareceu}
        >
          {conteudo.esclareceu ? 'Obrigado! Sua resposta foi registrada' : 'Isso esclareceu minha dúvida'}
        </button>
        <p className="small text-body-secondary mb-0">
          <b>{conteudo.esclarecidos || 0}</b> moradores disseram que este conteúdo esclareceu a dúvida.
        </p>
      </div>
    </div>
  );
}

export function Informativos() {
  const [conteudos, setConteudos] = useState(null);
  const [categoria, setCategoria] = useState('todos');
  const [erro, setErro] = useState('');

  useEffect(() => {
    api('/conteudos?grupo=informativos').then(setConteudos).catch((falha) => setErro(falha.message));
  }, []);

  const visiveis = (conteudos || []).filter((c) => categoria === 'todos' || c.categoria === categoria);

  return (
    <div className="container">
      <TituloPagina titulo="Informativos" descricao="Publicações oficiais da UBS sobre campanhas, doses e cuidados." />
      <div className="d-flex flex-column gap-3">
        <Filtros rotulo="Categoria" opcoes={[['todos', 'Todos'], ...Object.entries(CATEGORIAS)]} valor={categoria} aoMudar={setCategoria} />
        {erro && <Mensagem tipo="danger" texto={erro} />}
        {!conteudos && !erro ? <Carregando /> : (
          <div className="row g-3">
            {visiveis.map((c) => (
              <div key={c.id} className="col-md-6 col-lg-4">
                <Link to={`/informativos/${c.id}`} className="cartao cartao-link h-100 d-flex flex-column">
                  {c.imagem
                    ? <img src={c.imagem} alt="" className="capa capa-pequena" />
                    : <div className={`capa capa-pequena ${c.categoria}`}>{CATEGORIAS[c.categoria] || 'Informativo'}</div>}
                  <h3 className="h5 mt-3">{c.titulo}</h3>
                  <p className="small text-body-secondary mb-2">Publicado em {formatarData(c.publicadoEm)}</p>
                  <span className={`pilula ${c.lido ? 'neutra' : 'azul'} align-self-start mt-auto`}>{c.lido ? 'Lido' : 'Novo'}</span>
                </Link>
              </div>
            ))}
            {!visiveis.length && <p className="text-body-secondary">Nenhum informativo nesta categoria.</p>}
          </div>
        )}
      </div>
    </div>
  );
}

export function InformativoDetalhe() {
  const { id } = useParams();
  const [conteudo, setConteudo] = useState(null);
  const [lido, setLido] = useState(false);
  const [erro, setErro] = useState('');

  useEffect(() => {
    api(`/conteudos/${id}`)
      .then((dados) => {
        setConteudo(dados);
        return api(`/conteudos/${id}/leitura`, { metodo: 'POST' });
      })
      .then(() => setLido(true))
      .catch((falha) => setErro(falha.message));
  }, [id]);

  if (erro) return <div className="container py-5"><Mensagem tipo="danger" texto={erro} /></div>;
  if (!conteudo) return <Carregando />;

  return (
    <div className="container container-estreito">
      <TituloPagina
        caminho={<p className="caminho"><Link to="/informativos">Informativos</Link> / {CATEGORIAS[conteudo.categoria] || 'Informativo'}</p>}
        titulo={conteudo.titulo}
        descricao={`${conteudo.autor} · publicado em ${formatarData(conteudo.publicadoEm)}`}
      />
      {conteudo.imagem
        ? <img src={conteudo.imagem} alt="" className="capa mb-4" />
        : <div className={`capa mb-4 ${conteudo.categoria}`}>{conteudo.resumo}</div>}
      <article className="artigo">
        <Paragrafos texto={conteudo.texto} />
        <p className="small text-body-secondary">Fonte: {conteudo.fonte}.</p>
      </article>
      {lido && <Mensagem texto="Marcado como lido." />}
    </div>
  );
}
