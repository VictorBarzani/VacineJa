import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { api } from '../../services/api';
import { Carregando, Mensagem } from '../../components/Comuns';
import { formatarData } from '../../utils';

function textoAtraso(dias) {
  if (dias >= 60) return `há ${Math.round(dias / 30)} meses`;
  if (dias >= 30) return 'há 1 mês';
  return `há ${dias} dias`;
}

export default function Inicio() {
  const [dados, setDados] = useState(null);
  const [erro, setErro] = useState('');

  useEffect(() => {
    api('/me/resumo').then(setDados).catch((falha) => setErro(falha.message));
  }, []);

  if (erro) return <div className="container py-5"><Mensagem tipo="danger" texto={erro} /></div>;
  if (!dados) return <Carregando />;

  const { situacao } = dados;
  const porcentagem = situacao.totalVacinas ? Math.round((situacao.emDia / situacao.totalVacinas) * 100) : 100;
  const primeiroNome = dados.nome.split(' ')[0];

  return (
    <div className="container">
      <div className="titulo-pagina">
        <h1>Olá, {primeiroNome}</h1>
      </div>

      <div className="row g-4">
        <div className="col-lg-8 d-flex flex-column gap-4">
          <Link to="/carteirinha" className="cartao cartao-link d-flex align-items-center gap-4 flex-wrap">
            <div className="anel" style={{ '--p': porcentagem }}>
              <span>
                {situacao.emDia}/{situacao.totalVacinas}
                <small>EM DIA</small>
              </span>
            </div>
            <div className="flex-grow-1">
              {situacao.status === 'atrasada'
                ? <span className="pilula atraso">{situacao.atrasadas.length} vacina{situacao.atrasadas.length > 1 ? 's' : ''} atrasada{situacao.atrasadas.length > 1 ? 's' : ''}</span>
                : <span className="pilula ok">Vacinação em dia</span>}
              <h2 className="h4 mt-2 mb-1">
                {situacao.status === 'atrasada' ? 'Sua carteirinha está quase em dia' : 'Sua carteirinha está em dia'}
              </h2>
              <p className="text-body-secondary mb-0">
                {situacao.proximaDose
                  ? `Próxima dose: ${situacao.proximaDose.vacina} em ${situacao.proximaDose.emDias} dias (${formatarData(situacao.proximaDose.dataPrevista)}).`
                  : 'Nenhuma dose prevista no momento.'}
              </p>
            </div>
          </Link>

          {situacao.atrasadas.map((atrasada) => (
            <div key={atrasada.vacina} className="alert alert-danger mb-0">
              <strong className="d-block">A sua {atrasada.vacina} está atrasada {textoAtraso(atrasada.diasAtraso)}</strong>
              A dose ({atrasada.dose}) estava prevista para {formatarData(atrasada.dataPrevista)}. Você pode tomar na UBS sem agendamento.
              <div className="mt-2">
                <Link to="/carteirinha" className="btn btn-sm btn-light border">Ver o que está faltando</Link>
              </div>
            </div>
          ))}

          <div>
            <div className="d-flex justify-content-between align-items-end mb-3">
              <h2 className="h4 mb-0">Notícias sobre vacinas</h2>
              <Link to="/informativos" className="link-mais">Ver todas</Link>
            </div>
            <div className="lista">
              {dados.informativos.map((info) => (
                <Link key={info.id} to={`/informativos/${info.id}`} className="item">
                  <div className="flex-grow-1">
                    <b className="d-block">{info.titulo}</b>
                    <small className="text-body-secondary">{formatarData(info.publicadoEm)} · {info.tempoLeitura} min de leitura</small>
                  </div>
                  {!info.lido && <span className="pilula azul">Novo</span>}
                </Link>
              ))}
              {!dados.informativos.length && <div className="item text-body-secondary">Nenhuma notícia publicada.</div>}
            </div>
          </div>
        </div>

        <aside className="col-lg-4 d-flex flex-column gap-3">
          <Link to="/carteirinha" className="cartao cartao-link">
            <h3 className="h5">Minha carteirinha</h3>
            <p className="text-body-secondary small mb-0">
              Suas vacinas{dados.quantidadeDependentes ? ` e as de ${dados.quantidadeDependentes} dependente${dados.quantidadeDependentes > 1 ? 's' : ''}` : ''}
            </p>
          </Link>
          <Link to="/mitos" className="cartao cartao-link">
            <h3 className="h5">Mitos e verdades</h3>
            <p className="text-body-secondary small mb-0">Boatos sobre vacina respondidos pela equipe da UBS</p>
          </Link>
        </aside>
      </div>
    </div>
  );
}
