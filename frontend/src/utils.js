export function formatarData(iso) {
  if (!iso) return '';
  const [ano, mes, dia] = iso.slice(0, 10).split('-');
  return `${dia}/${mes}/${ano}`;
}

export function formatarDataHora(iso) {
  if (!iso) return '';
  const data = new Date(iso);
  return data.toLocaleString('pt-BR', { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' });
}

export function quandoFoi(iso) {
  const data = new Date(iso);
  const hoje = new Date();
  const ontem = new Date();
  ontem.setDate(hoje.getDate() - 1);
  const hora = data.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });
  if (data.toDateString() === hoje.toDateString()) return `Hoje, ${hora}`;
  if (data.toDateString() === ontem.toDateString()) return `Ontem, ${hora}`;
  return data.toLocaleDateString('pt-BR');
}

export function mascaraCpf(valor) {
  return valor
    .replace(/\D/g, '')
    .slice(0, 11)
    .replace(/(\d{3})(\d)/, '$1.$2')
    .replace(/(\d{3})(\d)/, '$1.$2')
    .replace(/(\d{3})(\d{1,2})$/, '$1-$2');
}

export function iniciais(nome) {
  return (nome || '')
    .split(' ')
    .filter(Boolean)
    .map((parte) => parte[0])
    .slice(0, 2)
    .join('')
    .toUpperCase();
}

export const TEMAS = {
  efeitos: 'Efeitos colaterais',
  gravidez: 'Gravidez',
  criancas: 'Crianças',
  idosos: 'Idosos',
};

export const CATEGORIAS = {
  campanhas: 'Campanhas',
  efeitos: 'Efeitos colaterais',
  criancas: 'Crianças',
};

export const ROTULO_STATUS = {
  aplicada: 'Aplicada',
  atrasada: 'Atrasada',
  proxima: 'Próxima',
};
