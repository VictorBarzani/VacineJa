import { useEffect, useState } from 'react';
import { jsPDF } from 'jspdf';
import { api } from '../../services/api';
import { BarraGrafico, Carregando, LegendaGrafico, Mensagem, TituloPagina } from '../../components/Comuns';
import { formatarDataHora } from '../../utils';

function gerarRelatorio(dados) {
  const pdf = new jsPDF();
  let y = 20;
  const linha = (texto, negrito = false, tamanho = 11) => {
    pdf.setFont('helvetica', negrito ? 'bold' : 'normal');
    pdf.setFontSize(tamanho);
    pdf.text(texto, 14, y);
    y += tamanho === 11 ? 7 : 10;
  };
  linha('VacineJá - Relatório de vacinação', true, 16);
  linha('UBS Jardim Novo Horizonte');
  linha(`Dados atualizados em ${formatarDataHora(dados.atualizadoEm)} · gerado em ${new Date().toLocaleString('pt-BR')}`);
  y += 4;
  linha('Indicadores', true, 13);
  linha(`Moradores cadastrados: ${dados.moradores}`);
  linha(`Em dia: ${dados.emDia}%`);
  linha(`Com dose atrasada: ${dados.atrasados}%`);
  linha(`Visitas na semana: ${dados.visitasSemana}`);
  y += 4;
  linha(`Cobertura por vacina (meta de ${dados.meta}%)`, true, 13);
  dados.coberturaVacinas.forEach((v) => linha(`${v.nome}: ${v.valor}%${v.valor < dados.meta ? ' (abaixo da meta)' : ''}`));
  y += 4;
  linha('Cobertura por faixa etária', true, 13);
  dados.coberturaFaixas.forEach((f) => linha(`${f.nome}: ${f.valor}%`));
  pdf.save(`relatorio-vacineja-${new Date().toISOString().slice(0, 10)}.pdf`);
}

export default function Painel() {
  const [dados, setDados] = useState(null);
  const [erro, setErro] = useState('');

  useEffect(() => {
    api('/equipe/painel').then(setDados).catch((falha) => setErro(falha.message));
  }, []);

  if (erro) return <Mensagem tipo="danger" texto={erro} />;
  if (!dados) return <Carregando />;

  return (
    <div className="d-flex flex-column gap-4">
      <TituloPagina
        titulo="Painel da UBS"
        descricao={dados.atualizadoEm
          ? `Dados atualizados em ${formatarDataHora(dados.atualizadoEm)} · atualização semanal`
          : 'Ainda não houve importação de dados · atualização semanal'}
        acao={<button type="button" className="btn btn-primary" onClick={() => gerarRelatorio(dados)}>Gerar relatório</button>}
      />

      <div className="row g-3">
        {[
          [dados.moradores.toLocaleString('pt-BR'), 'moradores cadastrados', ''],
          [`${dados.emDia}%`, 'em dia', 'texto-verde'],
          [`${dados.atrasados}%`, 'com dose atrasada', 'texto-vermelho'],
          [dados.visitasSemana, 'visitas na semana', ''],
        ].map(([valor, rotulo, cor]) => (
          <div key={rotulo} className="col-6 col-xl-3">
            <div className="cartao indicador">
              <b className={cor}>{valor}</b>
              <span>{rotulo}</span>
            </div>
          </div>
        ))}
      </div>

      <div className="row g-4">
        <div className="col-lg-6">
          <div className="cartao h-100">
            <h2 className="h5">Cobertura por vacina</h2>
            <p className="small text-body-secondary">A linha escura marca a meta de {dados.meta}%</p>
            <div className="d-flex flex-column gap-3 mt-3">
              {dados.coberturaVacinas.map((v) => <BarraGrafico key={v.nome} nome={v.nome} valor={v.valor} meta={dados.meta} />)}
            </div>
            <LegendaGrafico />
          </div>
        </div>
        <div className="col-lg-6">
          <div className="cartao h-100">
            <h2 className="h5">Cobertura por faixa etária</h2>
            <p className="small text-body-secondary">Moradores e dependentes com a carteirinha em dia</p>
            <div className="d-flex flex-column gap-3 mt-3">
              {dados.coberturaFaixas.map((f) => <BarraGrafico key={f.nome} nome={f.nome} valor={f.valor} />)}
            </div>
            <LegendaGrafico />
          </div>
        </div>
      </div>
    </div>
  );
}
