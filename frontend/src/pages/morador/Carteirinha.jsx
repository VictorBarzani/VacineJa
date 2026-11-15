import { useEffect, useRef, useState } from 'react';
import { jsPDF } from 'jspdf';
import { api } from '../../services/api';
import { Carregando, EtiquetaStatus, Filtros, Mensagem, TituloPagina } from '../../components/Comuns';
import { ROTULO_STATUS, formatarData } from '../../utils';

const ICONES = { aplicada: ['verde', '✓'], atrasada: ['vermelha', '!'], proxima: ['amarela', '→'] };

function gerarPdf(dados) {
  const pdf = new jsPDF();
  let y = 20;
  pdf.setFont('helvetica', 'bold');
  pdf.setFontSize(16);
  pdf.text('VacineJá - Comprovante de vacinação', 14, y);
  pdf.setFont('helvetica', 'normal');
  pdf.setFontSize(11);
  y += 10;
  pdf.text(`Nome: ${dados.pessoa.nome}`, 14, y);
  y += 6;
  pdf.text(`Emitido em: ${new Date().toLocaleDateString('pt-BR')} · UBS Jardim Novo Horizonte`, 14, y);
  y += 12;
  pdf.setFont('helvetica', 'bold');
  ['Vacina', 'Dose', 'Data', 'Lote', 'Situação'].forEach((t, i) => pdf.text(t, [14, 70, 105, 135, 165][i], y));
  pdf.setFont('helvetica', 'normal');
  dados.vacinas.forEach((v) => {
    y += 8;
    if (y > 280) { pdf.addPage(); y = 20; }
    const data = v.data ? formatarData(v.data) : `Prevista ${formatarData(v.dataPrevista)}`;
    [v.vacina, v.dose, data, v.lote || '-', ROTULO_STATUS[v.status]].forEach((t, i) => pdf.text(String(t), [14, 70, 105, 135, 165][i], y));
  });
  pdf.save(`comprovante-vacinacao-${dados.pessoa.nome.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase().replace(/\s+/g, '-')}.pdf`);
}

export default function Carteirinha() {
  const [pessoa, setPessoa] = useState('eu');
  const [filtro, setFiltro] = useState('todas');
  const [dados, setDados] = useState(null);
  const [mensagem, setMensagem] = useState(null);
  const [enviando, setEnviando] = useState(false);
  const campoArquivo = useRef(null);

  useEffect(() => {
    setDados(null);
    api(`/me/carteirinha?pessoa=${pessoa}`)
      .then(setDados)
      .catch((falha) => setMensagem({ tipo: 'danger', texto: falha.message }));
  }, [pessoa]);

  async function enviarComprovante(evento) {
    const arquivo = evento.target.files[0];
    evento.target.value = '';
    if (!arquivo) return;
    const formulario = new FormData();
    formulario.append('arquivo', arquivo);
    formulario.append('pessoa', pessoa);
    setEnviando(true);
    try {
      const resposta = await api('/me/comprovantes', { metodo: 'POST', formulario });
      setMensagem({ tipo: 'success', texto: resposta.mensagem });
    } catch (falha) {
      setMensagem({ tipo: 'danger', texto: falha.message });
    }
    setEnviando(false);
  }

  const vacinas = dados ? dados.vacinas.filter((v) => filtro === 'todas' || v.status === filtro) : [];

  return (
    <div className="container">
      <TituloPagina
        titulo="Carteira de vacinação"
        acao={(
          <button type="button" className="btn btn-outline-secondary" disabled={!dados} onClick={() => gerarPdf(dados)}>
            Baixar comprovante em PDF
          </button>
        )}
      />

      <div className="row g-4">
        <div className="col-lg-8 d-flex flex-column gap-3">
          {mensagem && <Mensagem tipo={mensagem.tipo} texto={mensagem.texto} aoFechar={() => setMensagem(null)} />}
          <div>
            <span className="form-label d-block">De quem é a carteirinha</span>
            <Filtros
              rotulo="Pessoa"
              opcoes={(dados?.pessoas || [{ id: 'eu', nome: 'Eu' }]).map((p) => [p.id, p.id === 'eu' ? 'Eu' : `${p.nome.split(' ')[0]} (${p.idade} anos)`])}
              valor={pessoa}
              aoMudar={setPessoa}
            />
          </div>
          <div>
            <span className="form-label d-block">Situação</span>
            <Filtros
              rotulo="Situação"
              opcoes={[['todas', 'Todas'], ['atrasada', 'Atrasadas'], ['proxima', 'Próximas'], ['aplicada', 'Aplicadas']]}
              valor={filtro}
              aoMudar={setFiltro}
            />
          </div>

          {!dados ? <Carregando /> : (
            <div className="lista">
              {vacinas.map((v) => (
                <div key={v.id} className="item">
                  <span className={`marca ${ICONES[v.status][0]}`}>{ICONES[v.status][1]}</span>
                  <div className="flex-grow-1">
                    <b className="d-block">{v.vacina}</b>
                    <small className="text-body-secondary">
                      {v.dose}
                      {v.data ? ` · aplicada em ${formatarData(v.data)}` : ` · prevista para ${formatarData(v.dataPrevista)}`}
                      {v.lote ? ` · lote ${v.lote}` : ''}
                    </small>
                  </div>
                  <EtiquetaStatus status={v.status} />
                </div>
              ))}
              {!vacinas.length && <div className="item text-body-secondary">Nenhuma vacina nesta situação.</div>}
            </div>
          )}

          <div>
            <input ref={campoArquivo} type="file" accept="image/*,application/pdf" className="d-none" onChange={enviarComprovante} aria-label="Foto do comprovante" />
            <button type="button" className="btn btn-secundario" disabled={enviando} onClick={() => campoArquivo.current.click()}>
              {enviando ? 'Enviando...' : 'Enviar comprovante'}
            </button>
            <p className="small text-body-secondary mt-2 mb-0">Envie a foto da carteirinha de papel. A equipe da UBS valida antes de aparecer como aplicada.</p>
          </div>
        </div>

        <aside className="col-lg-4">
          {dados && (
            <div className="cartao">
              <h3 className="h5">Calendário recomendado</h3>
              <p className="small text-body-secondary">Para {dados.calendario.grupo}</p>
              <div className="d-flex flex-column">
                {dados.calendario.itens.map((item) => (
                  <div key={item.vacina} className="linha-opcao">
                    <b className="d-block">{item.vacina}</b>
                    <small className="text-body-secondary">{item.quando}</small>
                  </div>
                ))}
              </div>
            </div>
          )}
        </aside>
      </div>
    </div>
  );
}
