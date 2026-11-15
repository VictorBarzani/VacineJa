const fs = require('fs');
const path = require('path');
const { initializeApp, cert } = require('firebase-admin/app');
const { getAuth } = require('firebase-admin/auth');
const { getFirestore, FieldValue } = require('firebase-admin/firestore');

const opcoes = { projectId: process.env.FIREBASE_PROJECT_ID };
const arquivoChave = process.env.GOOGLE_APPLICATION_CREDENTIALS;

if (arquivoChave && fs.existsSync(path.resolve(arquivoChave))) {
  const chave = JSON.parse(fs.readFileSync(path.resolve(arquivoChave), 'utf8'));
  opcoes.credential = cert(chave);
  opcoes.projectId = opcoes.projectId || chave.project_id;
}

initializeApp(opcoes);

const auth = getAuth();
const db = getFirestore();

module.exports = { auth, db, FieldValue };
