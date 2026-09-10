/* =========================================================
   TRANSFERÊNCIAS — Gerador de etiquetas · Loja Conceito
   ---------------------------------------------------------
   1. Configuração
   2. Utilidades
   3. Identificação TRAN
   4. Autocomplete de destino
   5. Ícones
   6. Montagem da etiqueta
   7. Encaixe automático
   8. Geração, limpeza e impressão
   9. Atalhos de teclado
   ========================================================= */

'use strict';

/* ---------- 1. Configuração ---------- */

/** Lojas de destino. Para incluir ou corrigir, basta editar esta lista. */
const DESTINOS = [
  'CD2',
  'CD OSASCO',
  'IGUATEMI',
  'ANALIA FRANCO',
  'CIDADE JARDIM',
  'GAZEBO MORUMBI',
  'JK IGUATEMI',
  'HIGIENOPOLIS LEBLON',
  'MORUMBI',
  'OUTLET SP',
  'FORTALEZA',
  'GAZEBO VIILA LOBOS',
  'GOIANIA',
  'RIOMAR RECIFE',
  'UBERLANDIA',
  'BALNEÁRIO CAMBORIÚ',
  'BRASILIA',
  'CURITIBA',
  'GAZEBO VITORIA',
  'IBIRAPUERA',
  'OUTLET CATARINA',
  'SÃO CAETANO',
  'VILLAGEMAL'
];

/** Remetente fixo de toda transferência. */
const REMETENTE = 'LOJA CONCEITO';

/** Zeros à esquerda no número do TRAN. 0 = desligado (mantém o que foi digitado). */
const DIGITOS_TRAN = 0;   // vale para TRAN e TBS

const STORAGE_KEY = 'transferencias:destinos';

/* ---------- 2. Utilidades ---------- */

const $ = (sel, ctx = document) => ctx.querySelector(sel);
const $$ = (sel, ctx = document) => Array.from(ctx.querySelectorAll(sel));

const form = $('#form-etiqueta');
const campos = {
  destinatario: $('#destinatario'),
  tran: $('#tran'),
  nf: $('#nf'),
  volumes: $('#volumes'),
  peso: $('#peso'),
  pesoMao: $('#peso-mao'),
  log: $('#log')
};

const elLabels = $('#labels');
const elVazio = $('#empty-state');
const elContador = $('#contador');
const elCodigo = $('#codigo-valor');
const btnImprimir = $('#btn-imprimir');
const elToast = $('#toast');

const somenteDigitos = (v) => (v || '').replace(/\D+/g, '');

/** Escapa texto vindo do usuário antes de injetar no HTML da etiqueta. */
function esc(txt) {
  return String(txt ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

let toastTimer;
function toast(msg, tipo = '') {
  clearTimeout(toastTimer);
  elToast.textContent = msg;
  elToast.className = 'toast' + (tipo ? ' is-' + tipo : '');
  elToast.hidden = false;
  toastTimer = setTimeout(() => { elToast.hidden = true; }, 2800);
}

/** Armazenamento tolerante a falhas (modo privado, file:// restrito etc.). */
const store = {
  ler() {
    try { return JSON.parse(localStorage.getItem(STORAGE_KEY)) || []; }
    catch { return []; }
  },
  salvar(lista) {
    try { localStorage.setItem(STORAGE_KEY, JSON.stringify(lista)); }
    catch { /* segue sem persistir */ }
  }
};

/** Lista completa: fixa + destinos novos digitados pelo operador. */
function listaDestinos() {
  const todos = [...DESTINOS, ...store.ler()].map((d) => d.trim().toUpperCase()).filter(Boolean);
  return [...new Set(todos)];
}

/* ---------- 3. Identificação TRAN ---------- */

function tipoSelecionado() {
  return $('input[name="tipo"]:checked').value;
}

function codigoDocumento() {
  let num = somenteDigitos(campos.tran.value);
  if (DIGITOS_TRAN > 0 && num) num = num.padStart(DIGITOS_TRAN, '0');
  return `${tipoSelecionado()}-${num}`;
}

function atualizarPreviaCodigo() {
  const num = somenteDigitos(campos.tran.value);
  elCodigo.textContent = `${tipoSelecionado()}-${num || '\u2014'}`;
}

$$('input[name="tipo"]').forEach((r) => r.addEventListener('change', atualizarPreviaCodigo));

campos.tran.addEventListener('input', (e) => {
  e.target.value = somenteDigitos(e.target.value);
  atualizarPreviaCodigo();
});

campos.nf.addEventListener('input', (e) => { e.target.value = somenteDigitos(e.target.value); });

// Peso aceita apenas números e uma vírgula decimal.
campos.peso.addEventListener('input', (e) => {
  e.target.value = e.target.value.replace(/[^\d.,]/g, '').replace('.', ',').replace(/,(?=.*,)/g, '');
});

campos.log.addEventListener('input', (e) => { e.target.value = e.target.value.toUpperCase(); });

/* ---------- 4. Autocomplete de destino ---------- */

const inputDest = campos.destinatario;
const listaEl = $('#sugestoes');
let indiceAtivo = -1;

function abrirSugestoes(itens) {
  if (!itens.length) return fecharSugestoes();
  indiceAtivo = 0;

  const termo = inputDest.value.trim().toUpperCase();
  listaEl.innerHTML = itens.map((nome, i) => {
    const pos = nome.indexOf(termo);
    const destaque = (termo && pos >= 0)
      ? esc(nome.slice(0, pos)) + '<mark>' + esc(nome.slice(pos, pos + termo.length)) + '</mark>' + esc(nome.slice(pos + termo.length))
      : esc(nome);
    return `<li role="option" aria-selected="${i === 0}" data-valor="${esc(nome)}">
              <span>${destaque}</span>${i === 0 ? '<span class="tag">Enter</span>' : ''}
            </li>`;
  }).join('');

  listaEl.hidden = false;
  inputDest.setAttribute('aria-expanded', 'true');
}

function fecharSugestoes() {
  listaEl.hidden = true;
  listaEl.innerHTML = '';
  indiceAtivo = -1;
  inputDest.setAttribute('aria-expanded', 'false');
}

function marcarAtivo(novo) {
  const itens = $$('li', listaEl);
  if (!itens.length) return;
  indiceAtivo = (novo + itens.length) % itens.length;
  itens.forEach((li, i) => li.setAttribute('aria-selected', i === indiceAtivo));
  itens[indiceAtivo].scrollIntoView({ block: 'nearest' });
}

function filtrar(termo) {
  const t = termo.trim().toUpperCase();
  const todos = listaDestinos();
  if (!t) return todos;
  const comeca = todos.filter((n) => n.startsWith(t));
  const contem = todos.filter((n) => !n.startsWith(t) && n.includes(t));
  return [...comeca, ...contem];
}

function aceitarSugestao(valor) {
  inputDest.value = valor;
  inputDest.classList.remove('is-invalid');
  fecharSugestoes();
}

inputDest.addEventListener('input', () => abrirSugestoes(filtrar(inputDest.value)));
inputDest.addEventListener('focus', () => abrirSugestoes(filtrar(inputDest.value)));
inputDest.addEventListener('blur', () => setTimeout(fecharSugestoes, 120));

inputDest.addEventListener('keydown', (e) => {
  const aberto = !listaEl.hidden;

  if (e.key === 'ArrowDown') {
    e.preventDefault();
    aberto ? marcarAtivo(indiceAtivo + 1) : abrirSugestoes(filtrar(inputDest.value));
  } else if (e.key === 'ArrowUp') {
    e.preventDefault();
    if (aberto) marcarAtivo(indiceAtivo - 1);
  } else if (e.key === 'Enter' && aberto && indiceAtivo >= 0) {
    e.preventDefault();
    e.stopPropagation();
    aceitarSugestao($$('li', listaEl)[indiceAtivo].dataset.valor);
    focarProximo(inputDest);
  } else if (e.key === 'Escape' && aberto) {
    e.preventDefault();
    e.stopPropagation();
    fecharSugestoes();
  }
});

listaEl.addEventListener('mousedown', (e) => {
  const li = e.target.closest('li');
  if (!li) return;
  e.preventDefault();
  aceitarSugestao(li.dataset.valor);
  focarProximo(inputDest);
});

/** Memoriza destinos novos digitados pelo operador. */
function memorizarDestino(nome) {
  const limpo = nome.trim().toUpperCase();
  if (!limpo || listaDestinos().includes(limpo)) return;
  store.salvar([...store.ler(), limpo]);
}

/* ---------- 5. Ícones (SVG inline, sem bibliotecas) ---------- */

const ICONES = {
  loja:     '<path d="M4 9.6h16v10.9H4z"/><path d="M3 9.6 4.9 4.2h14.2L21 9.6"/><path d="M9.6 20.5v-6h4.8v6"/>',
  nota:     '<path d="M13.8 3.5H7.6a2.1 2.1 0 0 0-2.1 2.1v12.8a2.1 2.1 0 0 0 2.1 2.1h8.8a2.1 2.1 0 0 0 2.1-2.1V8.2z"/><path d="M13.8 3.5v4.7h4.7"/><path d="M8.8 13h6.4M8.8 16.4h4.6"/>',
  etiqueta: '<path d="M20.4 12.7 12.6 20.5a1.9 1.9 0 0 1-2.7 0l-6.4-6.4a1.9 1.9 0 0 1-.5-1.3V5c0-1 .8-1.9 1.9-1.9h7.7c.5 0 1 .2 1.3.6l6.5 6.4a1.9 1.9 0 0 1 0 2.6z"/><circle cx="7.9" cy="7.9" r="1.4"/>',
  peso:     '<path d="M6.6 8.6h10.8l2.1 11.9H4.5z"/><path d="M9.7 8.6V6.9a2.3 2.3 0 0 1 4.6 0v1.7"/>',
  log:      '<circle cx="5.9" cy="18.1" r="2.5"/><circle cx="18.1" cy="5.9" r="2.5"/><path d="M8.4 18.1h6.2a3.5 3.5 0 0 0 3.5-3.5V8.4"/>'
};

/** Logo do remetente, vetorizada a partir do arquivo original.
 *  Usa currentColor, então herda o branco da faixa preta do rodapé. */
const LOGO_REMETENTE = `<svg viewBox="0 0 100 100" xmlns="http://www.w3.org/2000/svg" aria-hidden="true"><path d="M50.9,100.0 L49.0,99.9 L27.8,78.7 L27.6,77.4 L26.4,77.2 L20.0,70.9 L19.8,69.7 L17.7,67.8 L17.6,66.7 L16.1,65.4 L16.0,64.4 L15.3,63.8 L15.2,62.0 L14.5,61.4 L14.4,59.7 L13.7,59.1 L13.6,57.3 L12.9,56.5 L12.9,52.8 L12.1,51.7 L12.1,48.7 L13.4,46.9 L45.8,79.6 L46.5,79.6 L44.9,77.0 L44.9,76.1 L44.2,75.5 L44.1,73.7 L42.7,72.5 L42.5,71.3 L41.1,70.1 L40.1,67.4 L38.0,65.4 L37.8,64.2 L35.6,62.3 L35.4,61.1 L33.2,59.1 L33.1,58.0 L29.4,54.5 L29.2,53.3 L23.9,48.3 L23.7,47.1 L15.3,38.9 L15.2,37.4 L16.0,36.4 L16.0,34.7 L17.5,33.4 L17.7,32.2 L21.0,28.9 L22.8,28.9 L26.1,32.2 L26.3,33.4 L27.6,33.8 L27.8,35.0 L34.7,41.6 L34.9,42.8 L38.6,46.3 L38.8,47.5 L40.9,49.4 L41.1,50.6 L43.3,52.5 L43.5,53.7 L44.8,54.9 L45.0,56.0 L46.4,57.2 L46.5,58.3 L47.2,58.5 L47.4,57.5 L46.6,56.8 L46.4,55.0 L45.7,54.4 L45.7,52.6 L44.2,50.5 L44.1,48.7 L42.6,46.6 L42.6,45.6 L41.0,44.2 L41.0,43.3 L40.3,42.7 L40.1,41.6 L38.7,40.3 L37.8,37.7 L35.6,35.8 L35.4,34.6 L33.2,32.5 L33.1,31.4 L26.3,24.8 L26.1,23.3 L26.5,22.7 L27.6,22.5 L27.8,21.3 L33.4,15.7 L34.5,15.7 L38.6,19.7 L38.8,20.9 L42.5,24.4 L42.7,25.6 L44.0,26.0 L44.9,28.6 L46.5,30.0 L47.4,32.7 L47.9,32.7 L48.0,30.2 L47.3,29.4 L47.3,27.8 L46.5,27.1 L46.5,25.3 L45.7,24.7 L45.7,23.7 L44.9,23.1 L44.9,22.2 L44.2,21.6 L43.3,18.9 L41.1,17.0 L40.9,15.8 L38.0,13.1 L37.9,11.6 L49.3,0.0 L51.0,0.1 L62.1,11.4 L62.1,13.0 L59.1,15.8 L58.9,17.0 L56.7,18.9 L55.8,21.6 L55.1,22.2 L55.1,23.1 L54.3,23.7 L54.3,24.7 L53.5,25.3 L53.5,27.1 L52.7,27.8 L52.7,30.0 L51.9,31.0 L52.1,32.7 L52.8,32.5 L52.8,31.5 L53.7,29.8 L55.1,28.6 L55.2,27.5 L57.3,25.6 L57.5,24.4 L59.7,22.5 L59.9,21.3 L65.5,15.7 L66.6,15.7 L73.8,23.1 L73.7,24.8 L67.7,30.6 L67.5,31.9 L64.6,34.6 L64.4,35.8 L62.2,37.7 L61.3,40.3 L59.8,41.7 L58.9,44.4 L57.4,45.6 L57.4,46.6 L55.9,48.7 L55.8,50.5 L54.3,52.6 L54.3,54.4 L53.6,55.0 L53.4,56.8 L52.6,57.5 L52.8,58.5 L53.4,58.5 L53.6,57.2 L55.0,56.0 L56.0,53.3 L58.9,50.6 L59.9,47.8 L61.2,47.5 L61.4,46.3 L65.1,42.8 L65.3,41.6 L71.4,35.8 L71.7,34.5 L72.9,34.2 L73.1,33.0 L75.6,30.6 L76.9,30.3 L77.0,29.2 L78.0,28.2 L79.1,28.2 L79.4,29.5 L82.3,32.2 L82.5,33.4 L84.0,34.7 L84.0,36.4 L84.8,37.2 L84.7,38.9 L77.0,46.3 L76.9,47.5 L71.6,52.5 L71.4,53.7 L66.9,58.0 L66.7,59.2 L64.6,61.1 L64.4,62.3 L62.2,64.2 L62.0,65.4 L60.6,66.6 L60.4,67.8 L59.1,68.9 L58.9,70.1 L57.4,71.4 L57.4,72.4 L56.7,72.9 L56.6,73.9 L55.9,74.5 L55.8,75.5 L54.3,77.8 L54.4,78.8 L55.0,78.8 L86.4,47.0 L87.0,47.0 L87.9,48.3 L87.9,51.9 L87.1,52.8 L87.1,56.5 L86.3,57.5 L86.3,59.9 L84.0,63.6 L84.0,65.3 L81.7,67.4 L81.5,68.6 L80.1,69.8 L80.0,70.9 L78.7,71.2 L78.4,72.5 L50.9,100.0Z" fill="currentColor" fill-rule="evenodd"/></svg>`;

function icone(nome) {
  return `<svg class="lb-ic" viewBox="0 0 24 24" fill="none" stroke="currentColor"
               stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${ICONES[nome]}</svg>`;
}

/* ---------- 6. Montagem da etiqueta ---------- */

/** Célula de dado: ícone + rótulo + valor. */
function celula(nomeIcone, chave, valor, classe = '', bruto = false) {
  const v = String(valor || '').trim();
  // Só quebra linha quem tem espaço: TRAN-0049974 e números nunca se partem.
  const quebra = !bruto && /\s/.test(v) ? ' lb-v--wrap' : '';
  return `
    <span class="lb-cell ${classe}">
      ${icone(nomeIcone)}
      <span class="lb-txt">
        <span class="lb-k" data-fit="0.68,0.46">${esc(chave)}</span>
        <span class="lb-v${quebra}" data-fit="1.62,0.66">${bruto ? v : esc(v)}</span>
      </span>
    </span>`;
}

function montarEtiqueta(d, volume) {
  const casas = Math.max(2, String(d.total).length);
  const atual = String(volume).padStart(casas, '0');
  const total = String(d.total).padStart(casas, '0');

  // Peso e LOG são opcionais: a linha só existe se ao menos um for preenchido.
  const opcionais = [];
  if (d.pesoMao) {
    // Sai o rótulo com uma linha vazia e o KG, para anotar a lápis ou caneta.
    opcionais.push(celula('peso', 'Peso', '<span class="lb-mao"></span>KG', 'lb-cell--mao', true));
  } else if (d.peso) {
    opcionais.push(celula('peso', 'Peso', d.peso + ' KG'));
  }
  if (d.log) opcionais.push(celula('log', 'LOG', d.log));
  const linhaOpcional = opcionais.length
    ? `<div class="lb-row lb-row--line">${opcionais.join('')}</div>`
    : '';

  return `
  <article class="label">
    <div class="lb-card">

      <header class="lb-head">
        <div class="lb-band"><span class="lb-band-title" data-fit="1.35,0.8">Transferência</span></div>
        <div class="lb-vol">
          <span class="lb-vol-key">Volume</span>
          <span class="lb-vol-num" data-fit="2,1.05">${atual}/${total}</span>
        </div>
      </header>

      <div class="lb-body">

        <div class="lb-dest">
          ${icone('loja')}
          <span class="lb-txt">
            <span class="lb-k">Destinatário</span>
            <span class="lb-dest-name" data-fit="3.9,1.2">${esc(d.destinatario)}</span>
          </span>
        </div>

        <div class="lb-row lb-row--line">
          ${celula('etiqueta', 'TRAN / TBS', d.codigo, 'lb-cell--grow')}
          ${celula('nota', 'Nota fiscal', d.nf)}
        </div>

        ${linhaOpcional}

      </div>

      <footer class="lb-foot">
        <span class="lb-logo">${LOGO_REMETENTE}</span>
        <span class="lb-txt">
          <span class="lb-k">Remetente</span>
          <span class="lb-foot-name" data-fit="1.95,1.05">${REMETENTE}</span>
        </span>
      </footer>

    </div>
  </article>`;
}

/* ---------- 7. Encaixe automático ----------
   Cada texto marcado com data-fit="base,mínimo" (em ems) é reduzido até caber
   na própria caixa. Se a etiqueta ainda transbordar, o cartão inteiro encolhe
   pela variável --fit. Nada ultrapassa os 100 x 122 mm. */

function ajustarTexto(el) {
  const [base, minimo] = el.dataset.fit.split(',').map(Number);
  let em = base;
  let voltas = 0;

  el.style.fontSize = em + 'em';

  // Tolerância de 1,5 px: o arredondamento de subpixel do navegador não pode
  // ser confundido com transbordo, senão o texto encolhe até o piso à toa.
  while (voltas++ < 60 && em > minimo &&
        (el.scrollWidth > el.clientWidth + 1.5 || el.scrollHeight > el.clientHeight + 1.5)) {
    em -= 0.03;
    el.style.fontSize = em.toFixed(3) + 'em';
  }
}

function ajustarEtiqueta(etiqueta) {
  const cartao = etiqueta.querySelector('.lb-card');
  const corpo = etiqueta.querySelector('.lb-body');
  const textos = $$('[data-fit]', etiqueta);

  let fit = 1;
  cartao.style.setProperty('--fit', fit);
  textos.forEach(ajustarTexto);

  let voltas = 0;
  while (voltas++ < 12 && fit > 0.72 && corpo.scrollHeight > corpo.clientHeight + 1) {
    fit -= 0.03;
    cartao.style.setProperty('--fit', fit.toFixed(2));
    textos.forEach(ajustarTexto);
  }
}

function ajustarTodas() {
  $$('.label', elLabels).forEach(ajustarEtiqueta);
}

/* ---------- Peso escrito à mão ----------
   Marcado o campo, o peso digitado deixa de valer: a etiqueta sai com o
   rótulo Peso, uma linha em branco e o KG, para preencher depois de imprimir. */

function aplicarPesoMao() {
  const mao = campos.pesoMao.checked;
  campos.peso.disabled = mao;
  campos.peso.classList.toggle('is-off', mao);
  if (mao) campos.peso.value = '';
}

campos.pesoMao.addEventListener('change', aplicarPesoMao);
aplicarPesoMao();

/* ---------- 8. Geração, limpeza e impressão ---------- */

function limparErro(el) { el.classList.remove('is-invalid'); }

function validar() {
  let primeiroErro = null;

  $$('[data-required]', form).forEach((el) => {
    const vazio = !el.value.trim();
    el.classList.toggle('is-invalid', vazio);
    if (vazio && !primeiroErro) primeiroErro = el;
  });

  if (primeiroErro) {
    primeiroErro.focus();
    toast('Preencha os campos destacados', 'error');
    return false;
  }
  return true;
}

function coletarDados() {
  const total = Math.min(999, Math.max(1, parseInt(campos.volumes.value, 10) || 1));
  campos.volumes.value = total;

  return {
    destinatario: campos.destinatario.value.trim().toUpperCase(),
    codigo: codigoDocumento(),
    nf: campos.nf.value.trim(),
    peso: campos.peso.value.trim().replace(/,$/, ''),
    pesoMao: campos.pesoMao.checked,
    log: campos.log.value.trim().toUpperCase(),
    total
  };
}

function gerarEtiquetas() {
  if (!validar()) return;

  const d = coletarDados();
  memorizarDestino(d.destinatario);

  let html = '';
  for (let v = 1; v <= d.total; v++) html += montarEtiqueta(d, v);

  elLabels.innerHTML = html;
  ajustarTodas();
  // As fontes podem chegar depois da primeira medição: recalcula quando carregarem.
  if (document.fonts && document.fonts.ready) document.fonts.ready.then(ajustarTodas);

  elContador.textContent = d.total === 1 ? '1 etiqueta' : `${d.total} etiquetas`;
  btnImprimir.disabled = false;

  toast(`${d.total} etiqueta${d.total > 1 ? 's' : ''} · ${d.destinatario}`, 'ok');
  elLabels.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
}

function limparFormulario() {
  form.reset();
  aplicarPesoMao();
  $$('.is-invalid', form).forEach(limparErro);
  elLabels.innerHTML = '';
  elLabels.appendChild(elVazio);
  elContador.textContent = 'Nenhuma etiqueta';
  btnImprimir.disabled = true;
  atualizarPreviaCodigo();
  fecharSugestoes();
  campos.destinatario.focus();
  toast('Formulário limpo');
}

function imprimir() {
  if (!elLabels.querySelector('.label')) {
    toast('Gere as etiquetas antes de imprimir', 'error');
    return;
  }
  ajustarTodas();
  window.print();
}

/* ---------- 9. Atalhos e eventos ---------- */

/** Campos navegáveis com Enter, na ordem do documento. */
function camposNavegaveis() {
  return $$('input, select', form).filter((el) => {
    if (el.type === 'radio') return el.checked;   // apenas a opção marcada do grupo
    return !el.disabled && el.type !== 'hidden';
  });
}

function focarProximo(atual) {
  const lista = camposNavegaveis();
  const proximo = lista[lista.indexOf(atual) + 1];
  if (proximo) { proximo.focus(); if (proximo.select) proximo.select(); }
  else gerarEtiquetas();
}

form.addEventListener('keydown', (e) => {
  if (e.key !== 'Enter') return;
  if (e.target.tagName === 'BUTTON' || e.target.type === 'submit') return;
  e.preventDefault();
  focarProximo(e.target.type === 'radio' ? $('input[name="tipo"]:checked') : e.target);
});

form.addEventListener('submit', (e) => { e.preventDefault(); gerarEtiquetas(); });

$('#btn-limpar').addEventListener('click', limparFormulario);
btnImprimir.addEventListener('click', imprimir);

$$('.stepper-btn').forEach((btn) => {
  btn.addEventListener('click', () => {
    const atual = parseInt(campos.volumes.value, 10) || 1;
    campos.volumes.value = Math.min(999, Math.max(1, atual + Number(btn.dataset.step)));
  });
});

$$('[data-required]', form).forEach((el) => {
  el.addEventListener('input', () => limparErro(el));
  el.addEventListener('change', () => limparErro(el));
});

document.addEventListener('keydown', (e) => {
  if (e.key === 'F2') { e.preventDefault(); gerarEtiquetas(); }
  else if (e.key === 'F4') { e.preventDefault(); imprimir(); }
  else if (e.key === 'Escape') {
    if (!listaEl.hidden) return;   // Esc fecha as sugestões primeiro
    e.preventDefault();
    limparFormulario();
  }
});

/* ---------- Inicialização ---------- */
atualizarPreviaCodigo();
campos.destinatario.focus();
