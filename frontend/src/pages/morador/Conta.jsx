import { useEffect, useState } from 'react';
import { Link, useNavigate, useOutletContext } from 'react-router-dom';
import { api } from '../../services/api';
import { useAuth } from '../../contexts/AuthContext';
import { CampoSenha, Carregando, Mensagem, TituloPagina } from '../../components/Comuns';
import { iniciais, mascaraCpf, quandoFoi } from '../../utils';

const DEPENDENTE_VAZIO = { nome: '', parentesco: 'Filho(a)', nascimento: '', cpf: '' };

function JanelaDependente({ inicial, aoSalvar, aoFechar }) {
  const [dados, setDados] = useState(inicial);
  const [erro, setErro] = useState('');
  const [salvando, setSalvando] = useState(false);

  async function salvar(evento) {
    evento.preventDefault();
    setSalvando(true);
    try {
      await aoSalvar(dados);
    } catch (falha) {
      setErro(falha.message);
      setSalvando(false);
    }
  }

  return (
    <>
      <div className="modal d-block" role="dialog" aria-modal="true" aria-labelledby="tituloDependente">
        <div className="modal-dialog modal-dialog-centered">
          <form className="modal-content" onSubmit={salvar} noValidate>
            <div className="modal-header">
              <h2 id="tituloDependente" className="modal-title h5">{inicial.id ? 'Editar dependente' : 'Adicionar dependente'}</h2>
              <button type="button" className="btn-close" aria-label="Fechar" onClick={aoFechar} />
            </div>
            <div className="modal-body d-flex flex-column gap-3">
              <div>
                <label htmlFor="depNome" className="form-label">Nome completo</label>
                <input id="depNome" className="form-control" value={dados.nome} onChange={(e) => setDados({ ...dados, nome: e.target.value })} />
              </div>
              <div className="row g-3">
                <div className="col-sm-6">
                  <label htmlFor="depParentesco" className="form-label">Parentesco</label>
                  <select id="depParentesco" className="form-select" value={dados.parentesco} onChange={(e) => setDados({ ...dados, parentesco: e.target.value })}>
                    {['Filho(a)', 'Filho', 'Filha', 'Mãe', 'Pai', 'Avó', 'Avô', 'Outro'].map((p) => <option key={p}>{p}</option>)}
                  </select>
                </div>
                <div className="col-sm-6">
                  <label htmlFor="depNascimento" className="form-label">Data de nascimento</label>
                  <input id="depNascimento" type="date" className="form-control" value={dados.nascimento} onChange={(e) => setDados({ ...dados, nascimento: e.target.value })} />
                </div>
              </div>
              <div>
                <label htmlFor="depCpf" className="form-label">CPF (opcional)</label>
                <input id="depCpf" className="form-control" inputMode="numeric" value={dados.cpf} onChange={(e) => setDados({ ...dados, cpf: mascaraCpf(e.target.value) })} />
                <div className="form-text">Com o CPF, as vacinas registradas pela UBS aparecem na carteirinha do dependente.</div>
              </div>
              {erro && <Mensagem tipo="danger" texto={erro} />}
            </div>
            <div className="modal-footer">
              <button type="button" className="btn btn-outline-secondary" onClick={aoFechar}>Cancelar</button>
              <button type="submit" className="btn btn-primary" disabled={salvando}>Salvar</button>
            </div>
          </form>
        </div>
      </div>
      <div className="modal-backdrop show" />
    </>
  );
}

export function Perfil() {
  const { sair } = useAuth();
  const navegar = useNavigate();
  const [perfil, setPerfil] = useState(null);
  const [dados, setDados] = useState({ email: '', telefone: '', senha: '' });
  const [mensagem, setMensagem] = useState(null);
  const [janela, setJanela] = useState(null);
  const [confirmarExclusao, setConfirmarExclusao] = useState(false);

  function carregar() {
    return api('/me/perfil').then((resposta) => {
      setPerfil(resposta);
      setDados({ email: resposta.email, telefone: resposta.telefone || '', senha: '' });
    });
  }

  useEffect(() => {
    carregar().catch((falha) => setMensagem({ tipo: 'danger', texto: falha.message }));
  }, []);

  async function salvarDados(evento) {
    evento.preventDefault();
    try {
      const resposta = await api('/me/perfil', { metodo: 'PUT', corpo: dados });
      setDados({ ...dados, senha: '' });
      setMensagem({ tipo: 'success', texto: resposta.mensagem });
    } catch (falha) {
      setMensagem({ tipo: 'danger', texto: falha.message });
    }
  }

  async function salvarDependente(dependente) {
    const caminho = dependente.id ? `/me/dependentes/${dependente.id}` : '/me/dependentes';
    const resposta = await api(caminho, { metodo: dependente.id ? 'PUT' : 'POST', corpo: dependente });
    setJanela(null);
    setMensagem({ tipo: 'success', texto: resposta.mensagem });
    await carregar();
  }

  async function removerDependente(dependente) {
    try {
      const resposta = await api(`/me/dependentes/${dependente.id}`, { metodo: 'DELETE' });
      setMensagem({ tipo: 'success', texto: resposta.mensagem });
      await carregar();
    } catch (falha) {
      setMensagem({ tipo: 'danger', texto: falha.message });
    }
  }

  async function excluirConta() {
    try {
      const resposta = await api('/me/exclusao', { metodo: 'POST' });
      setMensagem({ tipo: 'success', texto: resposta.mensagem });
      setConfirmarExclusao(false);
    } catch (falha) {
      setMensagem({ tipo: 'danger', texto: falha.message });
    }
  }

  async function sairDaConta() {
    await sair();
    navegar('/');
  }

  if (!perfil) return mensagem ? <div className="container py-5"><Mensagem tipo="danger" texto={mensagem.texto} /></div> : <Carregando />;

  return (
    <div className="container">
      <div className="titulo-pagina d-flex align-items-center gap-3">
        <span className="avatar grande">{iniciais(perfil.nome)}</span>
        <h1 className="mb-0">{perfil.nome}</h1>
      </div>

      {mensagem && <div className="mb-3"><Mensagem tipo={mensagem.tipo} texto={mensagem.texto} aoFechar={() => setMensagem(null)} /></div>}

      <div className="row g-4">
        <div className="col-lg-6">
          <form className="cartao d-flex flex-column gap-3" onSubmit={salvarDados} noValidate>
            <h2 className="h4 mb-0">Dados pessoais</h2>
            <div>
              <label htmlFor="perfilEmail" className="form-label">E-mail</label>
              <input id="perfilEmail" type="email" className="form-control" value={dados.email} onChange={(e) => setDados({ ...dados, email: e.target.value })} />
            </div>
            <div>
              <label htmlFor="perfilTelefone" className="form-label">Telefone</label>
              <input id="perfilTelefone" type="tel" className="form-control" placeholder="(85) 9 0000-0000" value={dados.telefone} onChange={(e) => setDados({ ...dados, telefone: e.target.value })} />
            </div>
            <CampoSenha id="perfilSenha" rotulo="Nova senha" valor={dados.senha} aoMudar={(v) => setDados({ ...dados, senha: v })} dica="Deixe em branco para manter a senha atual." />
            <div className="d-flex flex-wrap gap-2">
              <button type="submit" className="btn btn-primary">Salvar alterações</button>
              <Link to="/recuperar-senha" className="btn btn-outline-secondary">Alterar senha</Link>
            </div>
          </form>
        </div>

        <div className="col-lg-6 d-flex flex-column gap-4">
          <div>
            <div className="d-flex justify-content-between align-items-center mb-3">
              <h2 className="h4 mb-0">Dependentes</h2>
              <button type="button" className="btn btn-sm btn-secundario" onClick={() => setJanela(DEPENDENTE_VAZIO)}>Adicionar</button>
            </div>
            <div className="lista">
              {perfil.dependentes.map((d) => (
                <div key={d.id} className="item flex-wrap">
                  <div className="flex-grow-1">
                    <b className="d-block">{d.nome}</b>
                    <small className="text-body-secondary">{d.parentesco} · {d.idade} {d.idade === 1 ? 'ano' : 'anos'}</small>
                  </div>
                  <div className="d-flex gap-2">
                    <button type="button" className="btn btn-sm btn-outline-secondary" onClick={() => setJanela({ ...d, cpf: mascaraCpf(d.cpf || '') })}>Editar</button>
                    <button type="button" className="btn btn-sm btn-perigo" onClick={() => removerDependente(d)}>Remover</button>
                  </div>
                </div>
              ))}
              {!perfil.dependentes.length && <div className="item text-body-secondary">Nenhum dependente cadastrado.</div>}
            </div>
          </div>

          <div className="cartao d-flex flex-column gap-3">
            <h2 className="h4 mb-0">Conta</h2>
            <div className="d-flex flex-wrap gap-2">
              <button type="button" className="btn btn-outline-secondary" onClick={sairDaConta}>Sair</button>
              {!confirmarExclusao
                ? <button type="button" className="btn btn-perigo" onClick={() => setConfirmarExclusao(true)}>Excluir minha conta</button>
                : (
                  <>
                    <button type="button" className="btn btn-danger" onClick={excluirConta}>Confirmar exclusão</button>
                    <button type="button" className="btn btn-outline-secondary" onClick={() => setConfirmarExclusao(false)}>Cancelar</button>
                  </>
                )}
            </div>
            <p className="small text-body-secondary mb-0">A exclusão da conta e dos dados é um direito garantido pela LGPD.</p>
          </div>
        </div>
      </div>

      {janela && <JanelaDependente inicial={janela} aoSalvar={salvarDependente} aoFechar={() => setJanela(null)} />}
    </div>
  );
}

export function Notificacoes() {
  const navegar = useNavigate();
  const { atualizarContador } = useOutletContext();
  const [dados, setDados] = useState(null);
  const [erro, setErro] = useState('');

  function carregar() {
    api('/me/notificacoes').then(setDados).catch((falha) => setErro(falha.message));
  }

  useEffect(carregar, []);

  async function marcarTodas() {
    await api('/me/notificacoes/lidas', { metodo: 'POST' });
    carregar();
    atualizarContador();
  }

  async function abrir(notificacao) {
    if (!notificacao.lida) await api(`/me/notificacoes/${notificacao.id}/lida`, { metodo: 'POST' });
    navegar(notificacao.link || '/home');
  }

  return (
    <div className="container container-estreito">
      <TituloPagina
        titulo="Notificações"
        acao={<button type="button" className="btn btn-outline-secondary" disabled={!dados?.naoLidas} onClick={marcarTodas}>Marcar todas como lidas</button>}
      />
      {erro && <Mensagem tipo="danger" texto={erro} />}
      {!dados && !erro ? <Carregando /> : dados && (
        <div className="lista">
          {dados.notificacoes.map((n) => (
            <button key={n.id} type="button" className={`item item-botao ${n.lida ? '' : 'nova'}`} onClick={() => abrir(n)}>
              {!n.lida && <span className="ponto-novo" aria-label="Não lida" />}
              <div className="flex-grow-1 text-start">
                <b className="d-block">{n.titulo}</b>
                <small className="text-body-secondary">{quandoFoi(n.criadaEm)}</small>
              </div>
            </button>
          ))}
          {!dados.notificacoes.length && <div className="item text-body-secondary">Você não tem notificações.</div>}
        </div>
      )}
    </div>
  );
}
