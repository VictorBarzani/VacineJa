import { useEffect, useState } from 'react';
import { Link, Navigate, useLocation, useNavigate, useSearchParams } from 'react-router-dom';
import { sendPasswordResetEmail, confirmPasswordReset } from 'firebase/auth';
import { auth } from '../firebase';
import { api } from '../services/api';
import { useAuth } from '../contexts/AuthContext';
import { CampoSenha, Filtros, Mensagem } from '../components/Comuns';
import { mascaraCpf } from '../utils';

export function Login() {
  const { usuario, entrar } = useAuth();
  const navegar = useNavigate();
  const local = useLocation();
  const [perfil, setPerfil] = useState('morador');
  const [identificador, setIdentificador] = useState('');
  const [senha, setSenha] = useState('');
  const [manter, setManter] = useState(true);
  const [erro, setErro] = useState('');
  const [enviando, setEnviando] = useState(false);

  if (usuario && !enviando) {
    return <Navigate to={usuario.perfil === 'equipe' ? '/equipe' : '/home'} replace />;
  }

  async function enviar(evento) {
    evento.preventDefault();
    setErro('');
    if (!identificador.trim() || !senha) {
      setErro('E-mail ou senha incorretos.');
      return;
    }
    setEnviando(true);
    try {
      const conta = await entrar(identificador, senha, perfil, manter);
      navegar(conta.perfil === 'equipe' ? '/equipe' : '/home', { replace: true });
    } catch (falha) {
      setErro(falha.message);
      setEnviando(false);
    }
  }

  return (
    <div className="container py-5">
      <div className="row g-5 align-items-center">
        <div className="col-lg-6">
          <p className="sobretitulo">UBS Jardim Novo Horizonte</p>
          <h1 className="display-6 fw-semibold mb-3">A vacinação da sua família em um só lugar</h1>
          <p className="text-body-secondary fs-5">
            Veja as vacinas em dia e as atrasadas, tire dúvidas com a equipe do posto e leia os informativos oficiais.
          </p>
        </div>
        <div className="col-lg-6">
          <form className="cartao d-flex flex-column gap-3" onSubmit={enviar} noValidate>
            {local.state?.mensagem && <Mensagem texto={local.state.mensagem} />}
            <div>
              <span className="form-label d-block">Entrar como</span>
              <Filtros
                rotulo="Perfil de acesso"
                opcoes={[['morador', 'Morador'], ['equipe', 'Equipe da UBS']]}
                valor={perfil}
                aoMudar={setPerfil}
              />
            </div>
            <div>
              <label htmlFor="loginUsuario" className="form-label">E-mail ou CPF</label>
              <input
                id="loginUsuario"
                className="form-control"
                value={identificador}
                onChange={(e) => setIdentificador(e.target.value)}
                autoComplete="username"
              />
            </div>
            <CampoSenha id="loginSenha" rotulo="Senha" valor={senha} aoMudar={setSenha} />
            <Link to="/recuperar-senha" className="link-mais">Esqueceu a senha?</Link>
            <div className="form-check">
              <input id="loginManter" type="checkbox" className="form-check-input" checked={manter} onChange={(e) => setManter(e.target.checked)} />
              <label htmlFor="loginManter" className="form-check-label">Manter-me conectado</label>
            </div>
            {erro && <Mensagem tipo="danger" texto={erro} />}
            <button type="submit" className="btn btn-primary btn-lg" disabled={enviando}>
              {enviando ? 'Entrando...' : 'Entrar'}
            </button>
            {perfil === 'morador' && (
              <p className="text-center small text-body-secondary mb-0">
                Não tem conta? <Link to="/cadastro">Cadastre-se</Link>
              </p>
            )}
          </form>
        </div>
      </div>
    </div>
  );
}

export function Cadastro() {
  const navegar = useNavigate();
  const [dados, setDados] = useState({ nome: '', cpf: '', nascimento: '', email: '', senha: '', confirmarSenha: '' });
  const [erro, setErro] = useState('');
  const [enviando, setEnviando] = useState(false);

  function mudar(campo, valor) {
    setDados({ ...dados, [campo]: campo === 'cpf' ? mascaraCpf(valor) : valor });
  }

  async function enviar(evento) {
    evento.preventDefault();
    setErro('');
    if (Object.values(dados).some((v) => !v.trim())) {
      setErro('Preencha todos os campos.');
      return;
    }
    if (dados.senha !== dados.confirmarSenha) {
      setErro('A senha e a confirmação não são iguais.');
      return;
    }
    setEnviando(true);
    try {
      const resposta = await api('/auth/cadastro', { metodo: 'POST', corpo: dados });
      navegar('/', { state: { mensagem: resposta.mensagem } });
    } catch (falha) {
      setErro(falha.message);
      setEnviando(false);
    }
  }

  return (
    <div className="container container-estreito py-5">
      <h1 className="mb-2">Criar conta</h1>
      <p className="text-body-secondary mb-4">O cadastro é para moradores da área de abrangência da UBS Jardim Novo Horizonte.</p>
      <form className="cartao d-flex flex-column gap-3" onSubmit={enviar} noValidate>
        <div>
          <label htmlFor="cadNome" className="form-label">Nome completo</label>
          <input id="cadNome" className="form-control" placeholder="Como está no seu documento" value={dados.nome} onChange={(e) => mudar('nome', e.target.value)} />
        </div>
        <div className="row g-3">
          <div className="col-md-6">
            <label htmlFor="cadCpf" className="form-label">CPF</label>
            <input id="cadCpf" className="form-control" inputMode="numeric" placeholder="000.000.000-00" value={dados.cpf} onChange={(e) => mudar('cpf', e.target.value)} />
          </div>
          <div className="col-md-6">
            <label htmlFor="cadNascimento" className="form-label">Data de nascimento</label>
            <input id="cadNascimento" type="date" className="form-control" value={dados.nascimento} onChange={(e) => mudar('nascimento', e.target.value)} />
          </div>
        </div>
        <div>
          <label htmlFor="cadEmail" className="form-label">E-mail</label>
          <input id="cadEmail" type="email" className="form-control" placeholder="voce@email.com" value={dados.email} onChange={(e) => mudar('email', e.target.value)} />
        </div>
        <div className="row g-3">
          <div className="col-md-6">
            <CampoSenha id="cadSenha" rotulo="Senha" valor={dados.senha} aoMudar={(v) => mudar('senha', v)} dica="Pelo menos 6 caracteres." />
          </div>
          <div className="col-md-6">
            <CampoSenha id="cadSenha2" rotulo="Confirmar senha" valor={dados.confirmarSenha} aoMudar={(v) => mudar('confirmarSenha', v)} />
          </div>
        </div>
        {erro && <Mensagem tipo="danger" texto={erro} />}
        <button type="submit" className="btn btn-primary btn-lg" disabled={enviando}>
          {enviando ? 'Cadastrando...' : 'Cadastrar'}
        </button>
        <Link to="/" className="link-mais text-center">Já tenho conta, fazer login</Link>
      </form>
    </div>
  );
}

export function RecuperarSenha() {
  const [parametros] = useSearchParams();
  const codigoDoLink = parametros.get('oobCode') || '';
  const [etapa, setEtapa] = useState(codigoDoLink ? 2 : 1);
  const [email, setEmail] = useState('');
  const [codigo, setCodigo] = useState(codigoDoLink);
  const [senha, setSenha] = useState('');
  const [confirmar, setConfirmar] = useState('');
  const [erro, setErro] = useState('');
  const [enviando, setEnviando] = useState(false);

  useEffect(() => setErro(''), [etapa]);

  async function enviarCodigo(evento) {
    evento.preventDefault();
    if (!email.trim()) {
      setErro('Informe o e-mail da sua conta.');
      return;
    }
    setEnviando(true);
    try {
      await sendPasswordResetEmail(auth, email.trim());
      setEtapa(2);
    } catch (falha) {
      setErro(falha.code === 'auth/invalid-email' ? 'E-mail inválido.' : 'Não foi possível enviar o código. Confira o e-mail e tente de novo.');
    }
    setEnviando(false);
  }

  async function salvarSenha(evento) {
    evento.preventDefault();
    if (!codigo.trim() || !senha) {
      setErro('Preencha o código e a nova senha.');
      return;
    }
    if (senha.length < 6) {
      setErro('A nova senha precisa ter pelo menos 6 caracteres.');
      return;
    }
    if (senha !== confirmar) {
      setErro('A nova senha e a confirmação não são iguais.');
      return;
    }
    setEnviando(true);
    try {
      await confirmPasswordReset(auth, codigo.trim(), senha);
      setEtapa(3);
    } catch (falha) {
      setErro('Código inválido ou expirado. Peça um novo código.');
    }
    setEnviando(false);
  }

  return (
    <div className="container container-estreito py-5">
      <h1 className="mb-4">Recuperar senha</h1>
      <div className="cartao d-flex flex-column gap-3">
        <div className="passos" aria-label={`Etapa ${etapa} de 3`}>
          {[1, 2, 3].map((n) => <i key={n} className={n === etapa ? 'atual' : n < etapa ? 'feito' : ''} />)}
        </div>

        {etapa === 1 && (
          <form className="d-flex flex-column gap-3" onSubmit={enviarCodigo} noValidate>
            <p className="text-body-secondary mb-0">
              Digite o e-mail da sua conta. Vamos enviar um código de verificação para você criar uma nova senha.
            </p>
            <div>
              <label htmlFor="recEmail" className="form-label">E-mail</label>
              <input id="recEmail" type="email" className="form-control" value={email} onChange={(e) => setEmail(e.target.value)} />
            </div>
            {erro && <Mensagem tipo="danger" texto={erro} />}
            <button type="submit" className="btn btn-primary" disabled={enviando}>Enviar código de verificação</button>
          </form>
        )}

        {etapa === 2 && (
          <form className="d-flex flex-column gap-3" onSubmit={salvarSenha} noValidate>
            {!codigoDoLink && <Mensagem tipo="info" texto="Enviamos um e-mail com o link de redefinição. O código é o valor de oobCode no link." />}
            <div>
              <label htmlFor="recCodigo" className="form-label">Código recebido</label>
              <input id="recCodigo" className="form-control" value={codigo} onChange={(e) => setCodigo(e.target.value)} />
            </div>
            <CampoSenha id="recSenha" rotulo="Nova senha" valor={senha} aoMudar={setSenha} />
            <CampoSenha id="recSenha2" rotulo="Confirmar nova senha" valor={confirmar} aoMudar={setConfirmar} />
            {erro && <Mensagem tipo="danger" texto={erro} />}
            <button type="submit" className="btn btn-primary" disabled={enviando}>Salvar nova senha</button>
          </form>
        )}

        {etapa === 3 && <Mensagem texto="Senha alterada com sucesso. Você já pode entrar com a nova senha." />}

        <Link to="/" className="link-mais text-center">Voltar para o login</Link>
      </div>
    </div>
  );
}
