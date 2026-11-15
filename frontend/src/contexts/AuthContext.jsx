import { createContext, useContext, useEffect, useState } from 'react';
import {
  onAuthStateChanged,
  signInWithEmailAndPassword,
  signOut,
  setPersistence,
  browserLocalPersistence,
  browserSessionPersistence,
} from 'firebase/auth';
import { auth } from '../firebase';
import { api } from '../services/api';

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [usuario, setUsuario] = useState(null);
  const [carregando, setCarregando] = useState(true);

  useEffect(() => {
    return onAuthStateChanged(auth, async (contaFirebase) => {
      if (!contaFirebase) {
        setUsuario(null);
        setCarregando(false);
        return;
      }
      try {
        setUsuario(await api('/auth/eu'));
      } catch (erro) {
        await signOut(auth);
        setUsuario(null);
      }
      setCarregando(false);
    });
  }, []);

  async function entrar(identificador, senha, perfil, manterConectado) {
    await setPersistence(auth, manterConectado ? browserLocalPersistence : browserSessionPersistence);

    let email;
    try {
      ({ email } = await api('/auth/identificar', { metodo: 'POST', corpo: { identificador } }));
    } catch (erro) {
      if (erro.message.startsWith('Não foi possível conectar')) throw erro;
      throw new Error('E-mail ou senha incorretos.');
    }

    try {
      await signInWithEmailAndPassword(auth, email, senha);
    } catch (erro) {
      if (erro.code === 'auth/user-disabled') throw new Error('Esta conta está desativada. Procure a coordenação da UBS.');
      if (erro.code === 'auth/too-many-requests') throw new Error('Muitas tentativas. Aguarde alguns minutos e tente de novo.');
      throw new Error('E-mail ou senha incorretos.');
    }

    const dados = await api('/auth/eu');
    if (dados.perfil !== perfil) {
      await signOut(auth);
      throw new Error(perfil === 'equipe'
        ? 'Esta conta não é da equipe da UBS. Selecione "Morador".'
        : 'Esta conta é da equipe da UBS. Selecione "Equipe da UBS".');
    }
    setUsuario(dados);
    return dados;
  }

  async function sair() {
    await signOut(auth);
    setUsuario(null);
  }

  function pode(permissao) {
    if (!usuario) return false;
    return usuario.papel === 'admin' || !!usuario.permissoes?.[permissao];
  }

  return (
    <AuthContext.Provider value={{ usuario, carregando, entrar, sair, pode }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  return useContext(AuthContext);
}
