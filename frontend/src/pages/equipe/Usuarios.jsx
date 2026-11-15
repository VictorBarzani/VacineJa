import { useEffect, useState } from 'react';
import { api } from '../../services/api';
import { useAuth } from '../../contexts/AuthContext';
import { Carregando, Filtros, Mensagem, TituloPagina } from '../../components/Comuns';
import { iniciais } from '../../utils';

const PERMISSOES = [
  ['importar', 'Importar dados'],
  ['publicar', 'Publicar conteúdo'],
  ['usuarios', 'Gerenciar usuários'],
];

const NOVA_CONTA = { nome: '', email: '', cargo: 'Agente comunitário de saúde', senha: '' };

export default function Usuarios() {
  const { usuario, pode } = useAuth();
  const [aba, setAba] = useState('equipe');
  const [equipe, setEquipe] = useState(null);
  const [moradores, setMoradores] = useState(null);
  const [selecionado, setSelecionado] = useState(null);
  const [busca, setBusca] = useState('');
  const [novaConta, setNovaConta] = useState(null);
  const [mensagem, setMensagem] = useState(null);

  async function carregarEquipe(manterId) {
    const lista = await api('/equipe/usuarios?tipo=equipe');
    setEquipe(lista);
    setSelecionado(lista.find((u) => u.id === manterId) || lista.find((u) => u.id !== usuario.id) || lista[0]);
  }

  useEffect(() => {
    carregarEquipe().catch((falha) => setMensagem({ tipo: 'danger', texto: falha.message }));
  }, []);

  useEffect(() => {
    if (aba !== 'moradores') return undefined;
    const espera = setTimeout(() => {
      api(`/equipe/usuarios?tipo=moradores&busca=${encodeURIComponent(busca)}`)
        .then(setMoradores)
        .catch((falha) => setMensagem({ tipo: 'danger', texto: falha.message }));
    }, 300);
    return () => clearTimeout(espera);
  }, [aba, busca]);

  async function executar(acao) {
    try {
      const resposta = await acao();
      setMensagem({ tipo: 'success', texto: resposta.mensagem });
      await carregarEquipe(selecionado?.id);
    } catch (falha) {
      setMensagem({ tipo: 'danger', texto: falha.message });
    }
  }

  function alternarPermissao(chave) {
    const valor = !selecionado.permissoes[chave];
    setSelecionado({ ...selecionado, permissoes: { ...selecionado.permissoes, [chave]: valor } });
    executar(() => api(`/equipe/usuarios/${selecionado.id}/permissoes`, {
      metodo: 'PATCH',
      corpo: { [chave]: valor },
    }));
  }

  function alternarAtivo() {
    executar(() => api(`/equipe/usuarios/${selecionado.id}/ativo`, { metodo: 'PATCH', corpo: { ativo: !selecionado.ativo } }));
  }

  async function criarConta(evento) {
    evento.preventDefault();
    try {
      const resposta = await api('/equipe/usuarios', { metodo: 'POST', corpo: novaConta });
      setMensagem({ tipo: 'success', texto: resposta.mensagem });
      setNovaConta(null);
      await carregarEquipe();
    } catch (falha) {
      setMensagem({ tipo: 'danger', texto: falha.message });
    }
  }

  const podeGerenciar = pode('usuarios');
  const moradoresVisiveis = moradores ? moradores.moradores : [];

  function papel(u) {
    if (!u.ativo) return ['neutra', 'Inativo'];
    if (u.papel === 'admin') return ['azul', 'Administrador(a)'];
    return ['neutra', 'Equipe'];
  }

  return (
    <div className="d-flex flex-column gap-4">
      <TituloPagina
        titulo="Gerenciar usuários"
        acao={podeGerenciar && aba === 'equipe' && (
          <button type="button" className="btn btn-primary" onClick={() => setNovaConta(NOVA_CONTA)}>Criar conta da equipe</button>
        )}
      />
      <Filtros rotulo="Tipo de usuário" opcoes={[['equipe', 'Equipe'], ['moradores', 'Moradores']]} valor={aba} aoMudar={setAba} />
      {!podeGerenciar && aba === 'equipe' && <Mensagem tipo="warning" texto="Sua conta pode ver a equipe, mas não alterar contas e permissões." />}
      {mensagem && <Mensagem tipo={mensagem.tipo} texto={mensagem.texto} aoFechar={() => setMensagem(null)} />}

      {aba === 'equipe' && (
        !equipe ? <Carregando /> : (
          <div className="row g-4">
            <div className="col-lg-7 d-flex flex-column gap-3">
              {novaConta && (
                <form className="cartao d-flex flex-column gap-3" onSubmit={criarConta} noValidate>
                  <h2 className="h5 mb-0">Nova conta da equipe</h2>
                  <div className="row g-3">
                    <div className="col-sm-6">
                      <label htmlFor="contaNome" className="form-label">Nome</label>
                      <input id="contaNome" className="form-control" value={novaConta.nome} onChange={(e) => setNovaConta({ ...novaConta, nome: e.target.value })} />
                    </div>
                    <div className="col-sm-6">
                      <label htmlFor="contaEmail" className="form-label">E-mail</label>
                      <input id="contaEmail" type="email" className="form-control" value={novaConta.email} onChange={(e) => setNovaConta({ ...novaConta, email: e.target.value })} />
                    </div>
                    <div className="col-sm-6">
                      <label htmlFor="contaCargo" className="form-label">Cargo</label>
                      <select id="contaCargo" className="form-select" value={novaConta.cargo} onChange={(e) => setNovaConta({ ...novaConta, cargo: e.target.value })}>
                        {['Agente comunitário de saúde', 'Enfermeiro(a)', 'Técnico(a) de enfermagem', 'Médico(a) de família'].map((c) => <option key={c}>{c}</option>)}
                      </select>
                    </div>
                    <div className="col-sm-6">
                      <label htmlFor="contaSenha" className="form-label">Senha inicial</label>
                      <input id="contaSenha" className="form-control" value={novaConta.senha} onChange={(e) => setNovaConta({ ...novaConta, senha: e.target.value })} />
                    </div>
                  </div>
                  <div className="d-flex gap-2">
                    <button type="submit" className="btn btn-success">Salvar conta</button>
                    <button type="button" className="btn btn-outline-secondary" onClick={() => setNovaConta(null)}>Cancelar</button>
                  </div>
                </form>
              )}
              <div className="lista">
                {equipe.map((u) => {
                  const [cor, rotulo] = papel(u);
                  return (
                    <button
                      key={u.id}
                      type="button"
                      className={`item item-botao ${selecionado?.id === u.id ? 'selecionado' : ''} ${u.ativo ? '' : 'inativo'}`}
                      onClick={() => setSelecionado(u)}
                    >
                      <span className="avatar">{iniciais(u.nome)}</span>
                      <div className="flex-grow-1 text-start">
                        <b className="d-block">{u.nome}{u.id === usuario.id ? ' (você)' : ''}</b>
                        <small className="text-body-secondary">{u.cargo}</small>
                      </div>
                      <span className={`pilula ${cor}`}>{rotulo}</span>
                    </button>
                  );
                })}
              </div>
            </div>

            {selecionado && (
              <div className="col-lg-5">
                <div className="cartao">
                  <h2 className="h5">Permissões de {selecionado.nome}</h2>
                  <p className="small text-body-secondary">{selecionado.email}</p>
                  {selecionado.papel === 'admin' ? (
                    <p className="mb-0">Administradores têm todas as permissões.</p>
                  ) : (
                    <div className="d-flex flex-column">
                      {PERMISSOES.map(([chave, nome]) => (
                        <div key={chave} className="form-check form-switch linha-opcao ps-5">
                          <input
                            id={`perm-${chave}`}
                            className="form-check-input"
                            type="checkbox"
                            role="switch"
                            checked={!!selecionado.permissoes[chave]}
                            disabled={!podeGerenciar || !selecionado.ativo}
                            onChange={() => alternarPermissao(chave)}
                          />
                          <label className="form-check-label" htmlFor={`perm-${chave}`}>{nome}</label>
                        </div>
                      ))}
                    </div>
                  )}
                  {podeGerenciar && selecionado.id !== usuario.id && (
                    <button type="button" className={`btn btn-sm mt-3 ${selecionado.ativo ? 'btn-perigo' : 'btn-success'}`} onClick={alternarAtivo}>
                      {selecionado.ativo ? 'Desativar conta' : 'Reativar conta'}
                    </button>
                  )}
                </div>
              </div>
            )}
          </div>
        )
      )}

      {aba === 'moradores' && (
        <div className="d-flex flex-column gap-3">
          <div>
            <label htmlFor="buscaMorador" className="form-label">Buscar por nome ou CPF</label>
            <input id="buscaMorador" type="search" className="form-control" placeholder="Ex.: Marina ou 529.982" value={busca} onChange={(e) => setBusca(e.target.value)} />
          </div>
          {!moradores ? <Carregando /> : (
            <div className="lista">
              {moradoresVisiveis.map((m) => (
                <div key={m.id} className="item">
                  <span className="avatar">{iniciais(m.nome)}</span>
                  <div className="flex-grow-1">
                    <b className="d-block">{m.nome}</b>
                    <small className="text-body-secondary">CPF {m.cpf}</small>
                  </div>
                  {m.atrasadas
                    ? <span className="pilula atraso">{m.atrasadas} atrasada{m.atrasadas > 1 ? 's' : ''}</span>
                    : <span className="pilula ok">Em dia</span>}
                </div>
              ))}
              {!moradoresVisiveis.length && <div className="item text-body-secondary">Nenhum morador encontrado.</div>}
            </div>
          )}
          <p className="small text-body-secondary mb-0">{moradoresVisiveis.length} de {moradores?.total || 0} moradores</p>
        </div>
      )}
    </div>
  );
}
