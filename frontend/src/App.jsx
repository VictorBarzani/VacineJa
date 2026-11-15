import { Link, Route, Routes } from 'react-router-dom';
import { LayoutAcesso, LayoutEquipe, LayoutMorador, RotaProtegida } from './components/Layouts';
import { Cadastro, Login, RecuperarSenha } from './pages/Acesso';
import Inicio from './pages/morador/Inicio';
import Carteirinha from './pages/morador/Carteirinha';
import { InformativoDetalhe, Informativos, MitoDetalhe, Mitos } from './pages/morador/Conteudos';
import { Notificacoes, Perfil } from './pages/morador/Conta';
import Painel from './pages/equipe/Painel';
import Importar from './pages/equipe/Importar';
import Conteudo from './pages/equipe/Conteudo';
import Usuarios from './pages/equipe/Usuarios';

function NaoEncontrada() {
  return (
    <div className="container py-5 text-center">
      <p className="display-4 fw-bold text-primary mb-2">404</p>
      <h1 className="h3">Página não encontrada</h1>
      <p className="text-body-secondary">O endereço que você abriu não existe.</p>
      <Link to="/" className="btn btn-primary">Ir para o início</Link>
    </div>
  );
}

export default function App() {
  return (
    <Routes>
      <Route element={<LayoutAcesso />}>
        <Route path="/" element={<Login />} />
        <Route path="/cadastro" element={<Cadastro />} />
        <Route path="/recuperar-senha" element={<RecuperarSenha />} />
        <Route path="*" element={<NaoEncontrada />} />
      </Route>

      <Route element={<RotaProtegida perfil="morador"><LayoutMorador /></RotaProtegida>}>
        <Route path="/home" element={<Inicio />} />
        <Route path="/carteirinha" element={<Carteirinha />} />
        <Route path="/mitos" element={<Mitos />} />
        <Route path="/mitos/:id" element={<MitoDetalhe />} />
        <Route path="/informativos" element={<Informativos />} />
        <Route path="/informativos/:id" element={<InformativoDetalhe />} />
        <Route path="/perfil" element={<Perfil />} />
        <Route path="/notificacoes" element={<Notificacoes />} />
      </Route>

      <Route path="/equipe" element={<RotaProtegida perfil="equipe"><LayoutEquipe /></RotaProtegida>}>
        <Route index element={<Painel />} />
        <Route path="importar" element={<Importar />} />
        <Route path="conteudo" element={<Conteudo />} />
        <Route path="usuarios" element={<Usuarios />} />
      </Route>

    </Routes>
  );
}
