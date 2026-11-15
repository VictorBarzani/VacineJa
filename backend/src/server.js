require('dotenv').config({ quiet: true });

const express = require('express');
const cors = require('cors');
const path = require('path');

const rotasAuth = require('./routes/auth');
const rotasMorador = require('./routes/morador');
const rotasConteudos = require('./routes/conteudos');
const rotasEquipe = require('./routes/equipe');

const app = express();

app.use(cors({ origin: process.env.FRONTEND_URL || 'http://localhost:5173' }));
app.use(express.json({ limit: '2mb' }));
app.use('/uploads', express.static(path.join(__dirname, '..', 'uploads')));

app.get('/api/status', (req, res) => {
  res.json({ status: 'ok', servico: 'VacineJá API' });
});

app.use('/api/auth', rotasAuth);
app.use('/api/me', rotasMorador);
app.use('/api/conteudos', rotasConteudos);
app.use('/api/equipe', rotasEquipe);

app.use((req, res) => {
  res.status(404).json({ erro: 'Rota não encontrada.' });
});

app.use((erro, req, res, next) => {
  console.error(erro);
  res.status(500).json({ erro: 'Erro interno no servidor. Tente novamente.' });
});

const porta = process.env.PORT || 3001;
app.listen(porta, () => {
  console.log(`API do VacineJá rodando em http://localhost:${porta}`);
});
