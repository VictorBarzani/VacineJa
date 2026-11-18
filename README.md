# VacineJá

Aplicação web para acompanhar e incentivar as metas de vacinação dos moradores da área de uma Unidade Básica de Saúde (UBS). O morador acompanha a própria carteira de vacinação e a dos dependentes, lê informativos oficiais e tira dúvidas em Mitos e Verdades. A equipe da UBS acompanha os indicadores em um painel, importa os dados de vacinação, publica conteúdos e gerencia as contas.

Projeto da Atividade de Extensão da Universidade de Fortaleza (UNIFOR).

## Contexto do projeto

O VacineJá nasceu na Atividade de Extensão da UNIFOR, planejada na plataforma DreamShaper, e é entregue também como trabalho final da disciplina de Desenvolvimento para Plataformas Web. A equipe tem dois alunos e o prazo de entrega é **04/12/2026**.

**Problema:** a adesão às campanhas de vacinação no bairro é baixa por causa de boatos e do medo de efeitos colaterais. Além disso, a equipe da UBS perde muito tempo juntando dados de vacinação no papel ou em planilhas, o que dificulta saber onde a cobertura está baixa.

**Objetivos do projeto:**

- **Combater boatos sobre vacinas:** fazer com que pelo menos 500 moradores leiam os informativos oficiais e marquem "isso esclareceu minha dúvida" em Mitos e Verdades, em dois meses.
- **Agilizar o trabalho da UBS:** reduzir pela metade o tempo que a enfermagem gasta juntando dados, com um painel atualizado uma vez por semana a partir da importação de uma planilha.

**Perfis de usuário:**

- **Morador:** acompanha a própria carteirinha e a dos dependentes, lê informativos e Mitos e Verdades e recebe notificações.
- **Equipe da UBS:** enfermagem e agentes comunitários de saúde usam as mesmas telas. O que cada conta pode fazer é definido por permissões.

**Escopo:** as telas seguem uma lista de requisitos reduzida (RF01 a RF17, na seção [Telas](#telas)), definida pela equipe para manter o projeto simples. Por decisão da equipe, o sistema **não tem gamificação** (pontos, medalhas ou ranking), embora isso aparecesse no planejamento inicial do DreamShaper.

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

### Rodando sem conta no Firebase (emulador)

Para testar sem criar o projeto no Firebase, dá para usar o emulador oficial, que simula o Firebase no próprio computador. Ele precisa do **Java** instalado (confira com `java -version`).

1. Crie o arquivo `backend/.env` com:

```
PORT=3001
FRONTEND_URL=http://localhost:5173
FIREBASE_PROJECT_ID=demo-vacineja
FIREBASE_AUTH_EMULATOR_HOST=127.0.0.1:9099
FIRESTORE_EMULATOR_HOST=127.0.0.1:8080
```

2. Crie o arquivo `frontend/.env` com:

```
VITE_API_URL=http://localhost:3001/api
VITE_USAR_EMULADOR=true
```

3. Em um terminal, na raiz do projeto, ligue o emulador e deixe aberto até aparecer "All emulators ready":

```bash
npx firebase-tools emulators:start --only auth,firestore --project demo-vacineja
```

4. Em outro terminal, na raiz: `npm run instalar` (só na primeira vez), `npm run seed` e `npm run dev`.

O emulador apaga tudo quando é fechado, então rode o `npm run seed` de novo sempre que religar.

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

## Regras de negócio

**Login e contas**

- O login aceita e-mail ou CPF. Com CPF, a rota `/api/auth/identificar` busca o e-mail da conta e o front faz o login no Firebase com esse e-mail.
- No login, a pessoa escolhe "Morador" ou "Equipe da UBS". Se o perfil escolhido não for o da conta, o login é recusado.
- O cadastro pela tela é só para moradores e pede nome, CPF, data de nascimento, e-mail e senha. O CPF é validado pelos dígitos verificadores e não pode repetir; a senha precisa ter pelo menos 6 caracteres.
- Contas da equipe só são criadas na tela de Gerenciar Usuários, por quem tem a permissão `usuarios`.
- Conta desativada não consegue entrar e é bloqueada também na API.

**Permissões da equipe**

- `papel: "admin"` tem todas as permissões.
- As demais contas têm três permissões independentes: `importar` (importar planilha), `publicar` (criar, publicar e despublicar conteúdo) e `usuarios` (criar contas, alterar permissões e desativar contas).
- Ninguém consegue desativar a própria conta.
- A API confere as permissões em toda rota de alteração. O front também desabilita os botões, mas a regra que vale é a da API.

**Vacinas**

- Cada documento de `vacinacoes` é uma dose de uma pessoa, ligada pelo CPF. Os dependentes também têm CPF.
- O status é calculado na hora, nunca gravado: **aplicada** quando tem `data`, **atrasada** quando a `dataPrevista` já passou e **próxima** quando a `dataPrevista` ainda vai chegar.
- Uma pessoa está **em dia** quando não tem nenhuma dose atrasada.
- Na Home, "4/5 em dia" conta vacinas diferentes: total de vacinas da pessoa e quantas não estão atrasadas.
- O calendário recomendado da carteirinha muda conforme a idade: crianças, adolescentes, adultos ou idosos.

**Painel da equipe**

- O total de "moradores cadastrados" conta moradores e dependentes que têm CPF.
- A cobertura por vacina considera só as pessoas que têm algum registro daquela vacina; dessas, conta quantas não estão atrasadas nela.
- A cobertura por faixa etária é o percentual de pessoas em dia em cada faixa (0–1, 2–5, 6–17, 18–59 e 60+ anos).
- A meta de cobertura é 90%, marcada por uma linha nos gráficos. As barras ficam vermelhas abaixo de 50%, amarelas de 50% a 80% e azuis acima de 80%.
- "Visitas na semana" conta os documentos de `visitas` dos últimos 7 dias.

**Importação de planilha**

- Colunas: `cpf`, `vacina`, `dose`, `data` e `lote`, em CSV (separado por `;` ou `,`) ou Excel. As datas podem estar em `dd/mm/aaaa`, `dd/mm/aa` ou `aaaa-mm-dd`.
- Erros apontados na prévia: CPF inválido, vacina não informada, data inválida, data futura e morador não cadastrado. Só as linhas válidas são gravadas.
- Se a pessoa tem uma dose pendente da mesma vacina, a importação completa essa dose; senão, cria um registro novo.
- Cada importação fica no histórico e avisa o morador por notificação.

**Conteúdo**

- Mitos e verdades têm um tema (efeitos colaterais, gravidez, crianças ou idosos). Informativos têm uma categoria (campanhas, efeitos colaterais ou crianças).
- Status possíveis: publicado, rascunho e arquivado. O morador só vê os publicados.
- Ao publicar, todos os moradores recebem uma notificação.
- A leitura é registrada uma vez por pessoa ao abrir o conteúdo.
- "Isso esclareceu minha dúvida" conta uma vez por pessoa em cada conteúdo. A meta dos 500 conta cada morador uma única vez, no primeiro conteúdo que ele marcar, em `estatisticas/geral`.

**Notificações** são criadas no cadastro (boas-vindas), no envio de comprovante, na importação de vacinas e na publicação de conteúdo.

## Convenções do código

- Nomes de variáveis, funções, rotas, coleções e arquivos em português.
- Código sem comentários, como pedido pela equipe.
- Datas gravadas como texto ISO: `aaaa-mm-dd` para datas e o formato completo com hora para registros de quando algo aconteceu.
- As consultas ao Firestore usam no máximo um filtro e fazem o resto do filtro e da ordenação em JavaScript. Assim o banco não exige a criação de índices compostos no console.
- Cores e fontes ficam em variáveis CSS (`--vj-*`) no `frontend/src/styles.css`, com versões para tema claro e escuro. O resto do visual usa classes do Bootstrap.
- Toda chamada à API passa pela função `api()` em `frontend/src/services/api.js`, que coloca o token e trata os erros.
- As mensagens de erro da API vêm em `{ "erro": "texto" }` e são mostradas direto na tela, então são escritas para o usuário final.

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

## Decisões e limitações

- **Cadastro com data de nascimento:** a lista de requisitos não pedia esse campo, mas ele foi incluído porque o calendário da carteirinha e o gráfico por faixa etária dependem da idade.
- **Recuperação de senha por link:** o Firebase envia um link por e-mail, não um código numérico. O código é o parâmetro `oobCode` do link; com a URL de ação configurada, a tela já abre com ele preenchido.
- **Comprovantes:** ficam salvos na pasta `backend/uploads` com status pendente. Não existe tela para a equipe validá-los, porque isso não fazia parte dos requisitos.
- **Visitas domiciliares:** não há tela para registrar visitas; o número do painel vem da coleção `visitas`, preenchida pelo script de dados de exemplo.
- **Imagem dos conteúdos:** é informada por link (URL), não por envio de arquivo.
- **Excluir conta:** registra um pedido em `solicitacoesExclusao`, sem apagar os dados na hora.
- **Relatório e comprovante em PDF:** são gerados no próprio navegador com jsPDF.
- **Sem testes automatizados e sem publicação online:** o sistema roda localmente.
- Todos os nomes, CPFs e números dos dados de exemplo são fictícios.

## Situação atual e próximos passos

**Pronto:** todas as telas e regras de RF01 a RF17, a API, o script de dados de exemplo e este README. Os fluxos de morador e equipe foram testados no navegador usando o emulador de login do Firebase e uma cópia simulada do banco; ainda não foram testados com um projeto Firebase real.

**Falta:**

1. Criar o projeto no Firebase e preencher os arquivos `.env` (seção [Como rodar](#como-rodar)).
2. Rodar `npm run seed` e testar todos os fluxos com o Firebase real.
3. Preparar a apresentação: cada integrante deve conseguir explicar o fluxo de login, uma tela do morador do início ao fim e a importação de planilha.

