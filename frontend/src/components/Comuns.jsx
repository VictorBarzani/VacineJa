import { useState } from 'react';
import { Link } from 'react-router-dom';
import { ROTULO_STATUS } from '../utils';

export function Logo({ destino = '/', subtitulo = 'UBS Jardim Novo Horizonte', claro = false }) {
  return (
    <Link to={destino} className={`logo text-decoration-none ${claro ? 'logo-claro' : ''}`}>
      <span className="logo-marca" aria-hidden="true">+</span>
      <span className="logo-nome">
        VacineJá
        <small>{subtitulo}</small>
      </span>
    </Link>
  );
}

export function CampoSenha({ id, rotulo, valor, aoMudar, dica }) {
  const [visivel, setVisivel] = useState(false);
  return (
    <div>
      <label htmlFor={id} className="form-label">{rotulo}</label>
      <div className="input-group">
        <input
          id={id}
          type={visivel ? 'text' : 'password'}
          className="form-control"
          value={valor}
          onChange={(e) => aoMudar(e.target.value)}
          autoComplete="current-password"
        />
        <button type="button" className="btn btn-outline-secondary" onClick={() => setVisivel(!visivel)}>
          {visivel ? 'Ocultar' : 'Mostrar'}
        </button>
      </div>
      {dica && <div className="form-text">{dica}</div>}
    </div>
  );
}

export function Carregando({ texto = 'Carregando...' }) {
  return (
    <div className="d-flex align-items-center gap-2 text-body-secondary py-5 justify-content-center">
      <div className="spinner-border spinner-border-sm" role="status" />
      <span>{texto}</span>
    </div>
  );
}

export function Mensagem({ tipo = 'success', texto, aoFechar }) {
  if (!texto) return null;
  return (
    <div className={`alert alert-${tipo} d-flex justify-content-between align-items-start gap-3 mb-0`} role="alert">
      <span>{texto}</span>
      {aoFechar && <button type="button" className="btn-close" aria-label="Fechar" onClick={aoFechar} />}
    </div>
  );
}

export function EtiquetaStatus({ status }) {
  const cores = { aplicada: 'ok', atrasada: 'atraso', proxima: 'aviso' };
  return <span className={`pilula ${cores[status]}`}>{ROTULO_STATUS[status]}</span>;
}

export function Filtros({ opcoes, valor, aoMudar, rotulo }) {
  return (
    <div className="d-flex flex-wrap gap-2" role="group" aria-label={rotulo}>
      {opcoes.map(([chave, texto]) => (
        <button
          key={chave}
          type="button"
          className={`chip ${valor === chave ? 'ativo' : ''}`}
          aria-pressed={valor === chave}
          onClick={() => aoMudar(chave)}
        >
          {texto}
        </button>
      ))}
    </div>
  );
}

export function TituloPagina({ titulo, descricao, caminho, acao }) {
  return (
    <div className="titulo-pagina">
      {caminho}
      <div className="d-flex flex-wrap justify-content-between align-items-center gap-3">
        <h1 className="mb-0">{titulo}</h1>
        {acao}
      </div>
      {descricao && <p className="text-body-secondary mt-2 mb-0">{descricao}</p>}
    </div>
  );
}

export function BarraGrafico({ nome, valor, meta }) {
  const cor = valor < 50 ? 'baixo' : valor < 80 ? 'medio' : '';
  return (
    <div className="barra-grafico">
      <span>{nome}</span>
      <div className="trilho">
        <i className={cor} style={{ width: `${valor}%` }} />
        {meta && <span className="linha-meta" style={{ left: `${meta}%` }} />}
      </div>
      <b>{valor}%</b>
    </div>
  );
}

export function LegendaGrafico() {
  return (
    <div className="legenda-grafico">
      <span><i className="baixo" />abaixo de 50%</span>
      <span><i className="medio" />de 50% a 80%</span>
      <span><i />acima de 80%</span>
    </div>
  );
}
