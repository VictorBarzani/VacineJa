import { useCallback, useEffect, useState } from 'react';
import { Link, NavLink, Navigate, Outlet, useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { api } from '../services/api';
import { iniciais } from '../utils';
import { Carregando, Logo } from './Comuns';

function Rodape() {
  return (
    <footer className="rodape">
      <div className="container">
        UBS Jardim Novo Horizonte · Rua das Palmeiras, 120 · Sala de vacina de segunda a sexta, das 07h30 às 16h30
      </div>
    </footer>
  );
}

export function LayoutAcesso() {
  return (
    <div className="d-flex flex-column min-vh-100">
      <header className="cabecalho">
        <div className="container d-flex align-items-center">
          <Logo />
        </div>
      </header>
      <main className="flex-grow-1">
        <Outlet />
      </main>
      <Rodape />
    </div>
  );
}

export function RotaProtegida({ perfil, children }) {
  const { usuario, carregando } = useAuth();
  if (carregando) return <Carregando />;
  if (!usuario) return <Navigate to="/" replace />;
  if (usuario.perfil !== perfil) return <Navigate to={usuario.perfil === 'equipe' ? '/equipe' : '/home'} replace />;
  return children;
}

const MENU_MORADOR = [
  ['/home', 'Home'],
  ['/carteirinha', 'Carteirinha'],
  ['/mitos', 'Mitos e verdades'],
  ['/informativos', 'Informativos'],
];

export function LayoutMorador() {
  const { usuario } = useAuth();
  const local = useLocation();
  const [menuAberto, setMenuAberto] = useState(false);
  const [naoLidas, setNaoLidas] = useState(0);

  const atualizarContador = useCallback(() => {
    api('/me/notificacoes').then((dados) => setNaoLidas(dados.naoLidas)).catch(() => {});
  }, []);

  useEffect(() => {
    setMenuAberto(false);
    atualizarContador();
  }, [local.pathname, atualizarContador]);

  return (
    <div className="d-flex flex-column min-vh-100">
      <header className="cabecalho">
        <div className="container">
          <nav className="navbar navbar-expand-lg p-0 w-100" aria-label="Principal">
            <Logo destino="/home" />
            <button
              className="navbar-toggler"
              type="button"
              aria-expanded={menuAberto}
              aria-controls="menuMorador"
              onClick={() => setMenuAberto(!menuAberto)}
            >
              Menu
            </button>
            <div id="menuMorador" className={`collapse navbar-collapse ${menuAberto ? 'show' : ''}`}>
              <ul className="navbar-nav menu me-auto">
                {MENU_MORADOR.map(([caminho, nome]) => (
                  <li className="nav-item" key={caminho}>
                    <NavLink to={caminho} className="nav-link">{nome}</NavLink>
                  </li>
                ))}
              </ul>
              <div className="d-flex align-items-center gap-2 py-2 py-lg-0">
                <Link to="/notificacoes" className="btn btn-outline-secondary btn-sm fw-semibold">
                  Notificações {naoLidas > 0 && <span className="badge rounded-pill text-bg-danger ms-1">{naoLidas}</span>}
                </Link>
                <Link to="/perfil" className="usuario">
                  <span className="avatar">{iniciais(usuario?.nome)}</span>
                  <span>{usuario?.nome?.split(' ')[0]}</span>
                </Link>
              </div>
            </div>
          </nav>
        </div>
      </header>
      <main className="flex-grow-1 pb-5">
        <Outlet context={{ atualizarContador }} />
      </main>
      <Rodape />
    </div>
  );
}

const MENU_EQUIPE = [
  ['/equipe', 'Painel'],
  ['/equipe/importar', 'Importar dados'],
  ['/equipe/conteudo', 'Conteúdo'],
  ['/equipe/usuarios', 'Usuários'],
];

export function LayoutEquipe() {
  const { usuario, sair } = useAuth();
  const local = useLocation();
  const navegar = useNavigate();
  const [menuAberto, setMenuAberto] = useState(false);

  useEffect(() => setMenuAberto(false), [local.pathname]);

  async function sairDaConta() {
    await sair();
    navegar('/');
  }

  return (
    <div className="area-equipe">
      <aside className="lateral">
        <div className="d-flex align-items-center justify-content-between gap-2">
          <Logo destino="/equipe" subtitulo="Área da equipe" claro />
          <button
            type="button"
            className="btn btn-sm btn-outline-light d-lg-none"
            aria-expanded={menuAberto}
            onClick={() => setMenuAberto(!menuAberto)}
          >
            Menu
          </button>
        </div>
        <nav className={`lateral-menu ${menuAberto ? 'aberto' : ''}`} aria-label="Equipe">
          <div className="d-flex flex-column gap-1">
            {MENU_EQUIPE.map(([caminho, nome]) => (
              <NavLink key={caminho} to={caminho} end className="opcao">{nome}</NavLink>
            ))}
          </div>
          <button type="button" className="opcao text-start" onClick={sairDaConta}>Sair</button>
        </nav>
      </aside>
      <div className="equipe-conteudo">
        <div className="equipe-topo">
          <span className="text-body-secondary small">UBS Jardim Novo Horizonte</span>
          <div className="usuario">
            <span className="avatar">{iniciais(usuario?.nome)}</span>
            <span>{usuario?.nome}</span>
          </div>
        </div>
        <main className="equipe-corpo">
          <Outlet />
        </main>
      </div>
    </div>
  );
}
