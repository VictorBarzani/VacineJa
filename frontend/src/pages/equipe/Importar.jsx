import { useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { api } from '../../services/api';
import { useAuth } from '../../contexts/AuthContext';
import { Mensagem, TituloPagina } from '../../components/Comuns';
import { formatarData, formatarDataHora } from '../../utils';

export default function Importar() {
  const { pode } = useAuth();
  const navegar = useNavigate();
  const campoArquivo = useRef(null);
  const [previa, setPrevia] = useState(null);
  const [historico, setHistorico] = useState([]);
  const [mensagem, setMensagem] = useState(null);
  const [processando, setProcessando] = useState(false);

  useEffect(() => {
    api('/equipe/importacoes').then(setHistorico).catch(() => {});
  }, []);

  async function enviarPlanilha(evento) {
    const arquivo = evento.target.files[0];
    evento.target.value = '';
    if (!arquivo) return;
    const formulario = new FormData();
    formulario.append('arquivo', arquivo);
    setProcessando(true);
    setMensagem(null);
    try {
      setPrevia(await api('/equipe/importacoes/previa', { metodo: 'POST', formulario }));
    } catch (falha) {
      setMensagem({ tipo: 'danger', texto: falha.message });
    }
    setProcessando(false);
  }

  async function baixarModelo() {
    try {
      const arquivo = await api('/equipe/importacoes/modelo');
      const link = document.createElement('a');
      link.href = URL.createObjectURL(arquivo);
      link.download = 'modelo-importacao-vacineja.csv';
      link.click();
      URL.revokeObjectURL(link.href);
    } catch (falha) {
      setMensagem({ tipo: 'danger', texto: falha.message });
    }
  }

  async function confirmar() {
    setProcessando(true);
    try {
      const erros = previa.linhas.filter((l) => l.erro).length;
      const resposta = await api('/equipe/importacoes', {
        metodo: 'POST',
        corpo: { validas: previa.validas, ignoradas: erros, arquivo: previa.arquivo },
      });
      setMensagem({ tipo: 'success', texto: `${resposta.mensagem} Voltando para o painel...` });
      setPrevia(null);
      setTimeout(() => navegar('/equipe'), 1500);
    } catch (falha) {
      setMensagem({ tipo: 'danger', texto: falha.message });
      setProcessando(false);
    }
  }

  const erros = previa ? previa.linhas.filter((l) => l.erro) : [];
  const semPermissao = !pode('importar');

  return (
    <div className="d-flex flex-column gap-4">
      <TituloPagina titulo="Importar dados de vacinação" descricao="Atualização semanal do painel com a planilha exportada do sistema da UBS." />

      {semPermissao && <Mensagem tipo="warning" texto="Sua conta não tem permissão para importar dados. Peça à coordenação." />}
      {mensagem && <Mensagem tipo={mensagem.tipo} texto={mensagem.texto} aoFechar={() => setMensagem(null)} />}

      <div className="row g-4">
        <div className="col-xl-7 d-flex flex-column gap-3">
          <input ref={campoArquivo} type="file" accept=".csv,.xlsx,.xls" className="d-none" onChange={enviarPlanilha} aria-label="Planilha" />
          <button type="button" className="area-envio" disabled={semPermissao || processando} onClick={() => campoArquivo.current.click()}>
            <b>{processando ? 'Lendo a planilha...' : 'Enviar planilha (CSV ou Excel)'}</b>
            <small>Colunas: cpf, vacina, dose, data e lote</small>
          </button>
          <div>
            <button type="button" className="btn btn-sm btn-outline-secondary" onClick={baixarModelo}>Baixar modelo de planilha</button>
          </div>

          {previa && (
            <div className="cartao">
              <div className="d-flex justify-content-between align-items-end mb-3">
                <h2 className="h5 mb-0">Pré-visualização</h2>
                <span className="small text-body-secondary">{previa.arquivo} · {previa.linhas.length} linhas</span>
              </div>
              <div className="table-responsive">
                <table className="table table-sm align-middle mb-0">
                  <thead>
                    <tr><th>Linha</th><th>CPF</th><th>Vacina</th><th>Dose</th><th>Data</th><th>Lote</th></tr>
                  </thead>
                  <tbody>
                    {previa.linhas.map((l) => (
                      <tr key={l.linha} className={l.erro ? 'table-danger' : ''}>
                        <td>{l.linha}</td>
                        <td>{l.cpfMascarado}</td>
                        <td>{l.vacina}</td>
                        <td>{l.dose}</td>
                        <td>{l.data ? formatarData(l.data) : l.dataOriginal}</td>
                        <td>{l.lote}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </div>

        <div className="col-xl-5 d-flex flex-column gap-4">
          {previa && (
            <div className="cartao">
              <h2 className={`h5 ${erros.length ? 'texto-vermelho' : 'texto-verde'}`}>
                {erros.length ? `${erros.length} ${erros.length > 1 ? 'linhas' : 'linha'} com problema` : 'Nenhum erro encontrado'}
              </h2>
              {erros.map((l) => (
                <div key={l.linha} className="linha-opcao d-flex justify-content-between gap-2">
                  <span>Linha {l.linha}<small className="d-block text-body-secondary">{l.erro}</small></span>
                  <span className="pilula atraso align-self-center">Erro</span>
                </div>
              ))}
              <button type="button" className="btn btn-success w-100 mt-3" disabled={!previa.validas.length || processando} onClick={confirmar}>
                Confirmar importação de {previa.validas.length} {previa.validas.length === 1 ? 'linha válida' : 'linhas válidas'}
              </button>
            </div>
          )}

          <div>
            <h2 className="h5">Histórico de importações</h2>
            <div className="lista">
              {historico.map((h) => (
                <div key={h.id} className="item">
                  <div className="flex-grow-1">
                    <b className="d-block">{formatarDataHora(h.data)}</b>
                    <small className="text-body-secondary">{h.responsavel} · {h.registros} registros{h.ignorados ? ` · ${h.ignorados} ignorados` : ''}</small>
                  </div>
                </div>
              ))}
              {!historico.length && <div className="item text-body-secondary">Nenhuma importação feita.</div>}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
