# Guia de publicação — Protocolo TB Comércio de Presentes

Este guia tem 3 partes. Siga na ordem:

1. **Firebase** — o "banco de dados" que vai guardar os logins e os protocolos escaneados.
2. **GitHub Pages** — onde o site vai ficar hospedado, para todo mundo da empresa acessar por um link.
3. **App no celular (PWA)** — como instalar o "Scan de Protocolo" no Android.

Guarde este arquivo — ele tem tudo que você vai precisar colar (regras de segurança, etc.).

---

## PARTE 1 — Firebase

### 1.1. Criar o projeto

1. Acesse **https://console.firebase.google.com** e faça login com sua conta Google.
2. Clique em **"Criar projeto"** (ou "Adicionar projeto").
3. Dê um nome, por exemplo `protocolo-tb`. Clique em **Continuar**.
4. Pode desativar o Google Analytics (não é necessário). Clique em **Criar projeto** e espere carregar.

### 1.2. Criar o "app Web" dentro do projeto

1. Na tela inicial do projeto, clique no ícone **`</>`** (Web) para adicionar um app.
2. Dê um apelido, ex: `protocolo-tb-web`. **Não** marque "Firebase Hosting".
3. Clique em **Registrar app**.
4. Vai aparecer um bloco de código chamado `firebaseConfig` parecido com isto:

   ```js
   const firebaseConfig = {
     apiKey: "AIzaSy...",
     authDomain: "protocolo-tb.firebaseapp.com",
     projectId: "protocolo-tb",
     storageBucket: "protocolo-tb.appspot.com",
     messagingSenderId: "123456789",
     appId: "1:123456789:web:abcde12345"
   };
   ```

   **Copie esses 6 valores** — você vai colar no arquivo `firebase-config.js` no passo 1.6. Pode fechar essa tela clicando em "Continuar no console" (o código já foi copiado por você).

### 1.3. Ativar login por e-mail e senha

1. No menu à esquerda, clique em **Build > Authentication**.
2. Clique em **Vamos começar** (Get started).
3. Na lista de métodos de login, clique em **E-mail/senha**.
4. Ative a primeira opção (**Ativar**) e clique em **Salvar**.

### 1.4. Cadastrar os dois e-mails da equipe

1. Ainda em **Authentication**, clique na aba **Users** (Usuários).
2. Clique em **Add user** (Adicionar usuário).
3. Cadastre o primeiro:
   - E-mail: `davi.freire@taniabulhoes.com.br`
   - Senha: `Tania@2026`
   - Clique em **Add user**.
4. Clique em **Add user** de novo e cadastre o segundo:
   - E-mail: `emerson.mendes@taniabulhoes.com.br`
   - Senha: `Tania@2026`
   - Clique em **Add user**.

Pronto — só quem estiver logado com um desses dois e-mails (ou outro que você cadastrar aqui do mesmo jeito) consegue abrir o site, escanear protocolos ou ver a Consulta. Sempre que alguém novo entrar na equipe, é só voltar aqui e repetir o passo 4.

### 1.5. Ativar o banco de dados (Firestore) e o armazenamento de fotos (Storage)

**Firestore:**
1. No menu à esquerda, **Build > Firestore Database**.
2. Clique em **Criar banco de dados**.
3. Escolha a localização mais próxima (ex: `southamerica-east1` — São Paulo) e clique em **Próxima**.
4. Escolha **Iniciar no modo de produção** e clique em **Criar**.
5. Depois de criado, vá na aba **Regras** (Rules) e substitua todo o conteúdo por isto:

   ```
   rules_version = '2';
   service cloud.firestore {
     match /databases/{database}/documents {
       match /scans/{docId} {
         allow read, write: if request.auth != null;
       }
     }
   }
   ```
6. Clique em **Publicar**.

**Storage (fotos dos protocolos):**
1. No menu à esquerda, **Build > Storage**.
2. Clique em **Vamos começar** (Get started) e siga o assistente (pode aceitar as opções padrão de localização).
3. Vá na aba **Rules** e substitua por isto:

   ```
   rules_version = '2';
   service firebase.storage {
     match /b/{bucket}/o {
       match /scans/{fileName} {
         allow read, write: if request.auth != null;
       }
     }
   }
   ```
4. Clique em **Publicar**.

Essas regras garantem que **só quem estiver logado** (com um dos e-mails cadastrados) consegue ler ou gravar dados — ninguém de fora acessa, mesmo sabendo o link do site.

### 1.6. Colar a configuração no site

1. Abra o arquivo `firebase-config.js` (está na pasta do site) em qualquer editor de texto (Bloco de Notas serve).
2. Troque os 6 valores `"COLOQUE_AQUI..."` pelos valores que você copiou no passo 1.2. No final deve ficar parecido com:

   ```js
   window.FIREBASE_CONFIG = {
     apiKey: "AIzaSy...",
     authDomain: "protocolo-tb.firebaseapp.com",
     projectId: "protocolo-tb",
     storageBucket: "protocolo-tb.appspot.com",
     messagingSenderId: "123456789",
     appId: "1:123456789:web:abcde12345"
   };
   ```
3. Salve o arquivo.

Esse mesmo arquivo vale para as 3 páginas do site (Protocolo, Consulta e Scan) — não precisa repetir em nenhum outro lugar.

---

## PARTE 2 — Colocar o site no ar (GitHub Pages)

### 2.1. Criar a conta e o repositório

1. Acesse **https://github.com** e crie uma conta gratuita (se ainda não tiver).
2. Clique no **+** no canto superior direito > **New repository**.
3. Nome do repositório, ex: `protocolo-tb`. Marque como **Public**. Clique em **Create repository**.

### 2.2. Enviar os arquivos

1. Na página do repositório recém-criado, clique no link **"uploading an existing file"**.
2. Arraste **todos os arquivos e pastas** que estão dentro da pasta `protocolo` (que eu te mandei) — incluindo as pastas `logos` e `icons` e o arquivo `firebase-config.js` já editado com os seus dados.
3. Role para baixo, escreva uma mensagem tipo "primeira versão do site" e clique em **Commit changes**.

### 2.3. Ativar o GitHub Pages

1. No repositório, clique em **Settings** (aba no topo).
2. No menu à esquerda, clique em **Pages**.
3. Em **Branch**, escolha `main` e a pasta `/ (root)`. Clique em **Save**.
4. Espere 1 ou 2 minutos e atualize a página — vai aparecer um link tipo:

   `https://SEU-USUARIO.github.io/protocolo-tb/`

Esse é o link que a equipe toda vai usar para acessar o protocolo. Pode favoritar ou fixar na barra do navegador.

**Sempre que você editar algum arquivo depois**, é só entrar no repositório no GitHub, abrir o arquivo, clicar no lápis (editar), colar o conteúdo novo e clicar em **Commit changes** — o site atualiza sozinho em menos de um minuto.

---

## PARTE 3 — Instalar o app de scan no Android

O "Scan de Protocolo" não precisa ir para a Play Store — ele se instala direto do navegador.

1. No celular, abra o **Chrome** e acesse:

   `https://SEU-USUARIO.github.io/protocolo-tb/scan.html`

2. Faça login com um dos e-mails cadastrados.
3. Toque no menu do Chrome (⋮, três pontinhos no canto superior direito).
4. Toque em **"Adicionar à tela inicial"** (ou "Instalar app").
5. Confirme — vai aparecer um ícone do "Scan de Protocolo" na tela inicial do celular, como qualquer outro app.

A partir daí, é só abrir o app, escolher a transportadora, fotografar o canhoto assinado e salvar — o registro aparece na hora na aba **Consulta** do site, para quem quiser ver de qualquer computador.

---

## Resumo rápido do que cada pessoa vai fazer no dia a dia

- **No computador/balcão:** abre o link do site → faz login → preenche e imprime o protocolo normalmente (igual já faz hoje).
- **Depois que o motorista assina o papel:** abre o app "Scan de Protocolo" no celular → tira foto do canhoto assinado → salva.
- **Para consultar depois:** abre o link do site → aba **Consulta** → busca por responsável ou nota fiscal, vê a foto.

Qualquer passo que travar, me chama que eu te ajudo a resolver.
