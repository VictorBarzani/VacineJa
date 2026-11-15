# VacineJá

Aplicação web para acompanhar e incentivar as metas de vacinação dos moradores da área de uma Unidade Básica de Saúde (UBS). O morador acompanha a própria carteira de vacinação e a dos dependentes, lê informativos oficiais e tira dúvidas em Mitos e Verdades. A equipe da UBS acompanha os indicadores em um painel, importa os dados de vacinação, publica conteúdos e gerencia as contas.

Projeto da Atividade de Extensão da Universidade de Fortaleza (UNIFOR).

## Tecnologias

| Parte | Tecnologias |
|---|---|
| Front-end | React 19, React Router, Bootstrap 5, Vite, jsPDF |
| Back-end | Node.js, Express, Multer, SheetJS (leitura de planilhas) |
| Banco de dados | Cloud Firestore (Firebase) |
| Autenticação | Firebase Authentication (e-mail e senha) |

## Como o sistema funciona

```
Navegador (React + Bootstrap)
   │  login com Firebase Authentication → recebe um token
   │  fetch com "Authorization: Bearer <token>"
   ▼
API REST (Node.js + Express)
   │  confere o token com o Firebase Admin
   │  confere o perfil (morador ou equipe) e as permissões
   ▼
Cloud Firestore (banco NoSQL)
```

O front-end nunca acessa o banco diretamente. Toda leitura e gravação passa pela API, que valida os dados e as permissões. Por isso as regras do Firestore (`firestore.rules`) bloqueiam qualquer acesso direto.

## Estrutura de pastas

```
VacineJa/
├── backend/
│   ├── src/
│   │   ├── server.js              ponto de entrada da API
│   │   ├── firebase.js            conexão com o Firebase Admin
│   │   ├── seed.js                cria os dados de exemplo
│   │   ├── middlewares/
│   │   │   └── autenticacao.js    token, perfil e permissões
│   │   ├── routes/
│   │   │   ├── auth.js            cadastro e login
│   │   │   ├── morador.js         carteirinha, perfil, dependentes, notificações
│   │   │   ├── conteudos.js       mitos, verdades e informativos
│   │   │   └── equipe.js          painel, importação, conteúdo, usuários
│   │   └── utils/
│   │       ├── regras.js          CPF, datas, faixas etárias, status da vacina
│   │       └── dados.js           consultas usadas por várias rotas
│   └── uploads/                   comprovantes enviados pelos moradores
├── frontend/
│   ├── index.html
│   └── src/
│       ├── App.jsx                rotas da aplicação
│       ├── firebase.js            conexão com o Firebase Authentication
│       ├── services/api.js        chamadas à API com o token
│       ├── contexts/AuthContext.jsx
│       ├── components/            layouts, menu, campos e gráficos reutilizáveis
│       └── pages/                 uma página por tela (morador e equipe)
├── firestore.rules
└── firebase.json
```

## Como rodar

Você precisa do [Node.js](https://nodejs.org) 20 ou mais recente.

### 1. Criar o projeto no Firebase

1. Acesse o [console do Firebase](https://console.firebase.google.com) e clique em **Criar um projeto**. O Google Analytics pode ficar desativado.
2. No menu **Criação > Authentication**, clique em **Vamos começar** e ative o provedor **E-mail/senha**.
3. No menu **Criação > Firestore Database**, clique em **Criar banco de dados**, escolha a região `southamerica-east1 (São Paulo)` e o **modo de produção**.
4. Ainda no Firestore, abra a aba **Regras**, cole o conteúdo do arquivo `firestore.rules` e publique.
5. Na engrenagem **Configurações do projeto > Contas de serviço**, clique em **Gerar nova chave privada**. Salve o arquivo baixado como `backend/serviceAccountKey.json`.
6. Em **Configurações do projeto > Geral**, na parte **Seus apps**, clique no ícone `</>` para registrar um app da Web. Copie os valores de `apiKey`, `authDomain`, `projectId` e `appId`.

> O arquivo `serviceAccountKey.json` dá acesso total ao banco. Ele já está no `.gitignore` e **nunca** deve ir para o GitHub.

### 2. Configurar as variáveis de ambiente

Copie os arquivos de exemplo:

```bash
cp backend/.env.example backend/.env
cp frontend/.env.example frontend/.env
```

No `backend/.env`, preencha o `FIREBASE_PROJECT_ID` com o ID do projeto. No `frontend/.env`, preencha as variáveis `VITE_FIREBASE_*` com os valores copiados no passo 1.6.

### 3. Instalar, popular o banco e rodar

Na pasta raiz do projeto:

```bash
npm run instalar
npm run seed
npm run dev
```

- `npm run instalar` instala as dependências da raiz, do back-end e do front-end.
- `npm run seed` cria as contas de teste e os dados de exemplo no Firestore. Rode só uma vez.
- `npm run dev` sobe a API em `http://localhost:3001` e o site em `http://localhost:5173`.

Se preferir, rode cada parte em um terminal: `npm run dev` dentro de `backend/` e `npm run dev` dentro de `frontend/`.

### Contas de teste

Todas usam a senha `123456`.

| Perfil | Login | Observação |
|---|---|---|
| Morador | `marina@email.com` ou CPF `529.982.247-25` | Tem 2 dependentes e uma vacina atrasada |
| Equipe | `carla@ubs.com` | Administradora, com todas as permissões |
| Equipe | `paulo@ubs.com` | Pode importar dados e publicar conteúdo |
| Equipe | `francisca@ubs.com` | Só pode publicar conteúdo |
| Equipe | `lucas@ubs.com` | Conta desativada, não consegue entrar |

Para testar a importação, use o botão **Baixar modelo de planilha** na tela de importação e troque o CPF por um dos moradores cadastrados.

### Recuperação de senha

O Firebase envia um e-mail com um link de redefinição. Para o link abrir direto a tela do VacineJá com o código preenchido, vá em **Authentication > Templates > Redefinição de senha**, clique no lápis, depois em **Personalizar URL de ação** e informe `http://localhost:5173/recuperar-senha`.

## Telas

| Requisito | Tela | Rota |
|---|---|---|
| RF01 | Login (morador e equipe) | `/` |
| RF02 | Cadastro do morador | `/cadastro` |
| RF03 | Recuperar senha | `/recuperar-senha` |
| RF04 | Cabeçalho e menu do morador | todas as telas do morador |
| RF05 | Home do morador | `/home` |
| RF06 | Carteira de vacinação | `/carteirinha` |
| RF07 | Mitos e verdades | `/mitos` |
| RF08 | Detalhe do mito ou verdade | `/mitos/:id` |
| RF09 | Informativos | `/informativos` |
| RF10 | Detalhe do informativo | `/informativos/:id` |
| RF11 | Perfil e dependentes | `/perfil` |
| RF12 | Notificações | `/notificacoes` |
| RF13 | Menu lateral da equipe | todas as telas da equipe |
| RF14 | Painel da UBS | `/equipe` |
| RF15 | Importar dados de vacinação | `/equipe/importar` |
| RF16 | Gerenciar conteúdo | `/equipe/conteudo` |
| RF17 | Gerenciar usuários | `/equipe/usuarios` |

## API

Todas as rotas, menos cadastro e identificação, exigem o cabeçalho `Authorization: Bearer <token do Firebase>`.

| Método | Rota | Quem usa | O que faz |
|---|---|---|---|
| POST | `/api/auth/cadastro` | público | Cria a conta do morador |
| POST | `/api/auth/identificar` | público | Converte CPF em e-mail para o login |
| GET | `/api/auth/eu` | todos | Dados e perfil do usuário logado |
| GET | `/api/me/resumo` | morador | Dados da Home |
| GET | `/api/me/carteirinha?pessoa=` | morador | Vacinas do morador ou de um dependente |
| POST | `/api/me/comprovantes` | morador | Envio da foto do comprovante |
| GET, PUT | `/api/me/perfil` | morador | Consulta e edição dos dados pessoais |
| POST, PUT, DELETE | `/api/me/dependentes` | morador | Cadastro, edição e remoção de dependentes |
| POST | `/api/me/exclusao` | morador | Pedido de exclusão da conta (LGPD) |
| GET | `/api/me/notificacoes` | morador | Lista de notificações |
| POST | `/api/me/notificacoes/lidas` | morador | Marca todas como lidas |
| GET | `/api/conteudos?grupo=mitos\|informativos` | todos | Conteúdos publicados |
| GET | `/api/conteudos/:id` | todos | Detalhe de um conteúdo |
| POST | `/api/conteudos/:id/leitura` | todos | Marca como lido |
| POST | `/api/conteudos/:id/esclareceu` | todos | Registra "isso esclareceu minha dúvida" |
| GET | `/api/equipe/painel` | equipe | Indicadores e gráficos |
| POST | `/api/equipe/importacoes/previa` | equipe (importar) | Lê a planilha e aponta os erros |
| POST | `/api/equipe/importacoes` | equipe (importar) | Grava as linhas válidas |
| GET, POST, PUT | `/api/equipe/conteudos` | equipe (publicar) | Lista, cria e edita conteúdos |
| PATCH | `/api/equipe/conteudos/:id/status` | equipe (publicar) | Publica ou despublica |
| GET, POST | `/api/equipe/usuarios` | equipe (usuários) | Lista e cria contas da equipe |
| PATCH | `/api/equipe/usuarios/:id/permissoes` | equipe (usuários) | Altera permissões |
| PATCH | `/api/equipe/usuarios/:id/ativo` | equipe (usuários) | Desativa ou reativa uma conta |

## Banco de dados (Firestore)

| Coleção | Conteúdo |
|---|---|
| `usuarios` | Moradores e equipe. Campo `perfil` diferencia os dois; a equipe tem `papel` e `permissoes` |
| `usuarios/{id}/dependentes` | Dependentes do morador |
| `usuarios/{id}/notificacoes` | Notificações do morador |
| `vacinacoes` | Um documento por dose, ligado à pessoa pelo CPF. Dose aplicada tem `data`; dose pendente tem `dataPrevista` |
| `conteudos` | Mitos, verdades e informativos, com `status` publicado, rascunho ou arquivado |
| `conteudos/{id}/leituras` e `esclarecimentos` | Quem leu e quem marcou que esclareceu, um documento por usuário |
| `importacoes` | Histórico das importações de planilha |
| `comprovantes` | Comprovantes enviados pelos moradores, aguardando validação |
| `visitas` | Visitas domiciliares dos agentes de saúde |
| `solicitacoesExclusao` | Pedidos de exclusão de conta |
| `estatisticas/geral` | Contador da meta de 500 moradores esclarecidos |

O status de cada vacina é calculado na hora: aplicada quando tem `data`, atrasada quando a `dataPrevista` já passou e próxima quando a `dataPrevista` ainda vai chegar.

## Conceitos da disciplina aplicados

- **Componentes React** reutilizáveis com props (`Logo`, `CampoSenha`, `Filtros`, `BarraGrafico`).
- **Estado e efeitos** com `useState` e `useEffect` para carregar dados da API.
- **Context API** para compartilhar o usuário logado entre as telas (`AuthContext`).
- **Rotas no front-end** com React Router, incluindo rotas protegidas por perfil e layouts com `Outlet`.
- **Bootstrap** para grid responsivo, formulários, tabelas, alertas, switches e modal, com tema claro e escuro.
- **Formulários controlados** com validação no front-end e no back-end.
- **API REST** com Express: rotas por recurso, verbos HTTP, códigos de status e mensagens de erro em JSON.
- **Middlewares** de autenticação e autorização por permissão.
- **Consumo de API** com `fetch`, `async/await` e token no cabeçalho.
- **Banco NoSQL** com coleções, subcoleções, consultas, gravação em lote e transações.
- **Upload de arquivos** (comprovantes e planilhas) com Multer.
- **Variáveis de ambiente** com `.env` e CORS liberado só para o endereço do front-end.

## Observações

- Os comprovantes enviados ficam na pasta `backend/uploads`. A validação deles pela equipe não faz parte dos requisitos desta versão.
- O número de visitas da semana no painel vem da coleção `visitas`, preenchida pelo script de dados de exemplo. O registro de visitas pelos agentes fica para uma próxima versão.
- Todos os nomes, CPFs e números dos dados de exemplo são fictícios.
