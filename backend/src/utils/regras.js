const VACINAS_PAINEL = ['Influenza', 'dT', 'COVID-19', 'Tríplice viral', 'Hepatite B'];

const FAIXAS = [
  { nome: '0–1 ano', min: 0, max: 1 },
  { nome: '2–5 anos', min: 2, max: 5 },
  { nome: '6–17 anos', min: 6, max: 17 },
  { nome: '18–59 anos', min: 18, max: 59 },
  { nome: '60+ anos', min: 60, max: 200 },
];

const CALENDARIO = {
  crianca: [
    { vacina: 'BCG', quando: 'Dose única ao nascer' },
    { vacina: 'Pentavalente', quando: '3 doses: 2, 4 e 6 meses' },
    { vacina: 'Tríplice viral', quando: '2 doses: 12 e 15 meses' },
    { vacina: 'DTP', quando: 'Reforços aos 15 meses e aos 4 anos' },
    { vacina: 'Influenza', quando: 'Todo ano, de 6 meses a 5 anos' },
  ],
  adolescente: [
    { vacina: 'HPV', quando: 'Dose única de 9 a 14 anos' },
    { vacina: 'Meningocócica ACWY', quando: 'Dose única de 11 a 14 anos' },
    { vacina: 'dT', quando: 'Reforço a cada 10 anos' },
    { vacina: 'Hepatite B', quando: '3 doses, se não vacinado' },
  ],
  adulto: [
    { vacina: 'Hepatite B', quando: '3 doses' },
    { vacina: 'dT', quando: 'Reforço a cada 10 anos' },
    { vacina: 'Influenza', quando: 'Todo ano' },
    { vacina: 'Tríplice viral', quando: '2 doses até 29 anos, 1 dose de 30 a 59 anos' },
  ],
  idoso: [
    { vacina: 'Influenza', quando: 'Todo ano' },
    { vacina: 'COVID-19', quando: 'Reforço a cada 6 meses' },
    { vacina: 'dT', quando: 'Reforço a cada 10 anos' },
    { vacina: 'Pneumocócica 23', quando: 'Conforme indicação da UBS' },
  ],
};

function hoje() {
  return new Date().toISOString().slice(0, 10);
}

function agora() {
  return new Date().toISOString();
}

function somarDias(dataIso, dias) {
  const d = new Date(dataIso + 'T12:00:00Z');
  d.setUTCDate(d.getUTCDate() + dias);
  return d.toISOString().slice(0, 10);
}

function diasEntre(inicioIso, fimIso) {
  const inicio = new Date(inicioIso + 'T12:00:00Z');
  const fim = new Date(fimIso + 'T12:00:00Z');
  return Math.round((fim - inicio) / 86400000);
}

function apenasNumeros(texto) {
  return String(texto || '').replace(/\D/g, '');
}

function cpfValido(cpf) {
  const n = apenasNumeros(cpf);
  if (n.length !== 11 || /^(\d)\1{10}$/.test(n)) return false;
  for (let t = 9; t < 11; t++) {
    let soma = 0;
    for (let i = 0; i < t; i++) soma += Number(n[i]) * (t + 1 - i);
    const digito = ((soma * 10) % 11) % 10;
    if (digito !== Number(n[t])) return false;
  }
  return true;
}

function formatarCpf(cpf) {
  const n = apenasNumeros(cpf);
  return n.replace(/(\d{3})(\d{3})(\d{3})(\d{2})/, '$1.$2.$3-$4');
}

function mascararCpf(cpf) {
  const n = apenasNumeros(cpf);
  if (n.length !== 11) return '***';
  return `***.${n.slice(3, 6)}.***-**`;
}

function idade(nascimento) {
  if (!nascimento) return null;
  const [a, m, d] = nascimento.split('-').map(Number);
  const [ha, hm, hd] = hoje().split('-').map(Number);
  let anos = ha - a;
  if (hm < m || (hm === m && hd < d)) anos--;
  return anos;
}

function faixaEtaria(nascimento) {
  const anos = idade(nascimento);
  if (anos === null) return null;
  return FAIXAS.find((f) => anos >= f.min && anos <= f.max).nome;
}

function calendarioPorIdade(nascimento) {
  const anos = idade(nascimento);
  if (anos === null || anos >= 18 && anos < 60) return { grupo: 'adultos', itens: CALENDARIO.adulto };
  if (anos < 10) return { grupo: 'crianças', itens: CALENDARIO.crianca };
  if (anos < 18) return { grupo: 'adolescentes', itens: CALENDARIO.adolescente };
  return { grupo: 'idosos', itens: CALENDARIO.idoso };
}

function statusVacina(registro) {
  if (registro.data) return 'aplicada';
  if (registro.dataPrevista && registro.dataPrevista < hoje()) return 'atrasada';
  return 'proxima';
}

function converterData(valor) {
  const texto = String(valor || '').trim();
  let m = texto.match(/^(\d{4})-(\d{2})-(\d{2})$/);
  if (m) return validarPartes(m[1], m[2], m[3]);
  m = texto.match(/^(\d{1,2})\/(\d{1,2})\/(\d{2,4})$/);
  if (m) {
    const ano = m[3].length === 2 ? '20' + m[3] : m[3];
    return validarPartes(ano, m[2].padStart(2, '0'), m[1].padStart(2, '0'));
  }
  return null;
}

function validarPartes(ano, mes, dia) {
  const iso = `${ano}-${mes}-${dia}`;
  const d = new Date(iso + 'T12:00:00Z');
  if (Number.isNaN(d.getTime()) || d.toISOString().slice(0, 10) !== iso) return null;
  return iso;
}

module.exports = {
  VACINAS_PAINEL,
  FAIXAS,
  hoje,
  agora,
  somarDias,
  diasEntre,
  apenasNumeros,
  cpfValido,
  formatarCpf,
  mascararCpf,
  idade,
  faixaEtaria,
  calendarioPorIdade,
  statusVacina,
  converterData,
};
