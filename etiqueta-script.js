/* =========================================================
   EXPEDIÇÃO — Gerador de etiquetas de transportadora
   ---------------------------------------------------------
   1. Configuração
   2. Utilidades
   3. Máscara e consulta de CEP (ViaCEP)
   4. Identificação do pedido (TBS-/TRAN-)
   4b. Chave de acesso da NF-e (44 dígitos)
   5. Autocomplete de transportadora
   6. Ícones das etiquetas
   6b. Código de barras Code 128C (sem bibliotecas)
   7. Geração das etiquetas
   8. Impressão
   9. Atalhos de teclado
   ========================================================= */

'use strict';

/* ---------- 1. Configuração ---------- */

/** Lista base de transportadoras. Para incluir novas, basta acrescentar aqui.
 *  Nomes digitados pelo operador também são memorizados no navegador. */
const TRANSPORTADORAS = [
  'JAMEF',
  'AZUL',
  'GOLLOG',
  'BRASPRESS',
  'TNT',
  'RODONAVES',
  'TOTAL EXPRESS',
  'CORREIOS',
  'JADLOG',
  'PATRUS'
];

/** Dados fixos do remetente — nunca mudam. */
const REMETENTE = {
  nome: 'TB COMERCIO DE PRESENTES S.A',
  cnpj: '08.613.254/0054-07',
  endereco: 'Rua Colômbia, 270',
  bairro: 'Jardim America',
  cidade: 'São Paulo - SP',
  cep: '01438-001'
};

/** Zeros à esquerda no número do pedido. 0 = desligado (mantém o que foi digitado). */
const DIGITOS_PEDIDO = 0;

const STORAGE_KEY = 'expedicao:transportadoras';

/* ---------- 2. Utilidades ---------- */

const $ = (sel, ctx = document) => ctx.querySelector(sel);
const $$ = (sel, ctx = document) => Array.from(ctx.querySelectorAll(sel));

const form = $('#form-etiqueta');
const campos = {
  nome: $('#nome'),
  cep: $('#cep'),
  endereco: $('#endereco'),
  numero: $('#numero'),
  complemento: $('#complemento'),
  bairro: $('#bairro'),
  cidade: $('#cidade'),
  uf: $('#uf'),
  danfe: $('#danfe'),
  nf: $('#nf'),
  serie: $('#serie'),
  pedido: $('#pedido'),
  transportadora: $('#transportadora'),
  volumes: $('#volumes')
};

const elLabels = $('#labels');
const elVazio = $('#empty-state');
const elContador = $('#contador');
const elCepStatus = $('#cep-status');
const elDanfeStatus = $('#danfe-status');
const elCodigo = $('#codigo-valor');
const btnImprimir = $('#btn-imprimir');
const elToast = $('#toast');

/** Força maiúsculas enquanto a pessoa digita, sem perder a posição do cursor —
 *  assim a etiqueta sai em maiúsculo não importa como foi preenchida. */
function ligarMaiusculas(input) {
  input.addEventListener('input', () => {
    const inicio = input.selectionStart;
    const fim = input.selectionEnd;
    const maiusculo = input.value.toUpperCase();
    if (maiusculo === input.value) return;
    input.value = maiusculo;
    if (inicio !== null) input.setSelectionRange(inicio, fim);
  });
}
['nome', 'endereco', 'numero', 'complemento', 'bairro', 'cidade', 'transportadora'].forEach((k) => ligarMaiusculas(campos[k]));

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

/** Lista completa: base + personalizadas, sem duplicatas, em ordem alfabética. */
function listaTransportadoras() {
  const todas = [...TRANSPORTADORAS, ...store.ler()]
    .map((t) => t.trim().toUpperCase())
    .filter(Boolean);
  return [...new Set(todas)].sort();
}

/* ---------- 3. Máscara e consulta de CEP ---------- */

function formatarCep(valor) {
  const d = somenteDigitos(valor).slice(0, 8);
  return d.length > 5 ? `${d.slice(0, 5)}-${d.slice(5)}` : d;
}

function statusCep(msg, tipo = '') {
  elCepStatus.textContent = msg;
  elCepStatus.className = 'hint' + (tipo ? ' is-' + tipo : '');
}

let cepEmBusca = '';

async function buscarCep(cep) {
  const digitos = somenteDigitos(cep);
  if (digitos.length !== 8 || digitos === cepEmBusca) return;
  cepEmBusca = digitos;

  statusCep('Buscando endereço…', 'loading');

  try {
    const resp = await fetch(`https://viacep.com.br/ws/${digitos}/json/`);
    if (!resp.ok) throw new Error('http');
    const dados = await resp.json();

    if (dados.erro) {
      statusCep('CEP não encontrado. Confira o número ou preencha o endereço à mão.', 'error');
      toast('CEP não encontrado', 'error');
      campos.endereco.focus();
      return;
    }

    campos.endereco.value = (dados.logradouro || '').toUpperCase();
    campos.bairro.value = (dados.bairro || '').toUpperCase();
    campos.cidade.value = (dados.localidade || '').toUpperCase();
    campos.uf.value = dados.uf || '';
    [campos.endereco, campos.bairro, campos.cidade, campos.uf].forEach(limparErro);

    statusCep(`${dados.localidade} · ${dados.uf}`, 'ok');
    campos.numero.focus();
  } catch {
    statusCep('Não foi possível consultar o ViaCEP. Preencha o endereço manualmente.', 'error');
  } finally {
    cepEmBusca = '';
  }
}

campos.cep.addEventListener('input', (e) => {
  e.target.value = formatarCep(e.target.value);
  if (somenteDigitos(e.target.value).length === 8) buscarCep(e.target.value);
});

campos.cep.addEventListener('blur', (e) => {
  const d = somenteDigitos(e.target.value);
  if (d.length && d.length !== 8) statusCep('CEP incompleto: use 8 dígitos.', 'error');
});

/* ---------- 4. Identificação do pedido ---------- */

function tipoSelecionado() {
  return $('input[name="tipo"]:checked').value;
}

function codigoPedido() {
  let num = somenteDigitos(campos.pedido.value);
  if (DIGITOS_PEDIDO > 0 && num) num = num.padStart(DIGITOS_PEDIDO, '0');
  return `${tipoSelecionado()}-${num}`;
}

function atualizarPreviaCodigo() {
  const num = somenteDigitos(campos.pedido.value);
  elCodigo.textContent = `${tipoSelecionado()}-${num || '—'}`;
}

campos.pedido.addEventListener('input', (e) => {
  e.target.value = somenteDigitos(e.target.value);
  atualizarPreviaCodigo();
});

$$('input[name="tipo"]').forEach((r) => r.addEventListener('change', atualizarPreviaCodigo));

campos.nf.addEventListener('input', (e) => { e.target.value = somenteDigitos(e.target.value); });
campos.serie.addEventListener('input', (e) => { e.target.value = somenteDigitos(e.target.value).slice(0, 3); });

/* ---------- 4b. Chave de acesso da NF-e ----------
   Os 44 dígitos têm posições fixas. Quando a chave é colada inteira e válida,
   série e nota fiscal sobem sozinhas e o código de barras vai para a etiqueta. */

/** Reparte a chave nos campos definidos pela SEFAZ. Devolve null se não tiver 44 dígitos. */
function lerChave(valor) {
  const d = somenteDigitos(valor);
  if (d.length !== 44) return null;
  return {
    chave:   d,
    uf:      d.slice(0, 2),
    emissao: d.slice(2, 6),     // AAMM
    cnpj:    d.slice(6, 20),
    modelo:  d.slice(20, 22),   // 55 = NF-e, 65 = NFC-e
    serie:   d.slice(22, 25),
    nf:      d.slice(25, 34),
    tpEmis:  d.slice(34, 35),
    codigo:  d.slice(35, 43),
    dv:      d.slice(43)
  };
}

/** Dígito verificador da chave: módulo 11, pesos 2 a 9 da direita para a esquerda. */
function dvChave(chave) {
  let peso = 2;
  let soma = 0;
  for (let i = 42; i >= 0; i--) {
    soma += Number(chave[i]) * peso;
    peso = peso === 9 ? 2 : peso + 1;
  }
  const resto = soma % 11;
  return String(resto < 2 ? 0 : 11 - resto);
}

/** Chave em blocos de 4, como sai impressa na DANFE. */
function formatarChave(valor) {
  return somenteDigitos(valor).slice(0, 44).replace(/(\d{4})(?=\d)/g, '$1 ');
}

/** Remove os zeros à esquerda de série e número da nota. */
const semZeros = (n) => String(Number(n));

const DANFE_PADRAO = 'Preenche série e nota fiscal e imprime o código de barras.';

function statusDanfe(msg, tipo = '') {
  elDanfeStatus.textContent = msg;
  elDanfeStatus.className = 'hint' + (tipo ? ' is-' + tipo : '');
}

/** Lê o campo, valida e distribui os dados. Roda a cada digitação ou colagem. */
function aplicarChave() {
  const d = somenteDigitos(campos.danfe.value);
  campos.danfe.classList.remove('is-ok', 'is-invalid');

  if (!d.length) { statusDanfe(DANFE_PADRAO); return; }
  if (d.length < 44) { statusDanfe(`${d.length} de 44 dígitos.`); return; }

  const k = lerChave(d);

  if (k.modelo !== '55' && k.modelo !== '65') {
    statusDanfe(`Modelo ${k.modelo}: não é NF-e (55) nem NFC-e (65). Confira a chave.`, 'error');
    return;
  }
  if (dvChave(d) !== k.dv) {
    statusDanfe('O dígito verificador não fecha. Confira a chave.', 'error');
    return;
  }

  campos.nf.value = semZeros(k.nf);
  campos.serie.value = semZeros(k.serie);
  limparErro(campos.nf);

  campos.danfe.classList.add('is-ok');
  statusDanfe(
    `Série ${semZeros(k.serie)} · NF ${semZeros(k.nf)} · emitida em ${k.emissao.slice(2)}/20${k.emissao.slice(0, 2)}`,
    'ok'
  );
}

campos.danfe.addEventListener('input', (e) => {
  e.target.value = formatarChave(e.target.value);
  aplicarChave();
});

/* ---------- 5. Autocomplete de transportadora ---------- */

const inputTp = campos.transportadora;
const listaTp = $('#sugestoes');
let sugestoes = [];
let indiceAtivo = -1;

function abrirSugestoes(itens) {
  sugestoes = itens;
  indiceAtivo = itens.length ? 0 : -1;

  if (!itens.length) return fecharSugestoes();

  const termo = inputTp.value.trim().toUpperCase();
  listaTp.innerHTML = itens.map((nome, i) => {
    const pos = nome.indexOf(termo);
    const destaque = (termo && pos >= 0)
      ? esc(nome.slice(0, pos)) + '<mark>' + esc(nome.slice(pos, pos + termo.length)) + '</mark>' + esc(nome.slice(pos + termo.length))
      : esc(nome);
    return `<li role="option" id="sug-${i}" aria-selected="${i === 0}" data-valor="${esc(nome)}">
              <span>${destaque}</span>${i === 0 ? '<span class="tag">Enter</span>' : ''}
            </li>`;
  }).join('');

  listaTp.hidden = false;
  inputTp.setAttribute('aria-expanded', 'true');
}

function fecharSugestoes() {
  listaTp.hidden = true;
  listaTp.innerHTML = '';
  indiceAtivo = -1;
  sugestoes = [];
  inputTp.setAttribute('aria-expanded', 'false');
}

function marcarAtivo(novo) {
  const itens = $$('li', listaTp);
  if (!itens.length) return;
  indiceAtivo = (novo + itens.length) % itens.length;
  itens.forEach((li, i) => li.setAttribute('aria-selected', i === indiceAtivo));
  itens[indiceAtivo].scrollIntoView({ block: 'nearest' });
}

function filtrar(termo) {
  const t = termo.trim().toUpperCase();
  const todas = listaTransportadoras();
  if (!t) return todas.slice(0, 8);
  const comeca = todas.filter((n) => n.startsWith(t));
  const contem = todas.filter((n) => !n.startsWith(t) && n.includes(t));
  return [...comeca, ...contem].slice(0, 8);
}

function aceitarSugestao(valor) {
  inputTp.value = valor;
  limparErro(inputTp);
  fecharSugestoes();
}

inputTp.addEventListener('input', () => abrirSugestoes(filtrar(inputTp.value)));
inputTp.addEventListener('focus', () => abrirSugestoes(filtrar(inputTp.value)));
inputTp.addEventListener('blur', () => setTimeout(fecharSugestoes, 120));

inputTp.addEventListener('keydown', (e) => {
  const aberto = !listaTp.hidden;

  if (e.key === 'ArrowDown') { e.preventDefault(); aberto ? marcarAtivo(indiceAtivo + 1) : abrirSugestoes(filtrar(inputTp.value)); }
  else if (e.key === 'ArrowUp') { e.preventDefault(); if (aberto) marcarAtivo(indiceAtivo - 1); }
  else if (e.key === 'Enter' && aberto && indiceAtivo >= 0) {
    e.preventDefault();
    e.stopPropagation();
    aceitarSugestao($$('li', listaTp)[indiceAtivo].dataset.valor);
    focarProximo(inputTp);
  } else if (e.key === 'Escape' && aberto) {
    e.preventDefault();
    e.stopPropagation();
    fecharSugestoes();
  }
});

listaTp.addEventListener('mousedown', (e) => {
  const li = e.target.closest('li');
  if (!li) return;
  e.preventDefault();
  aceitarSugestao(li.dataset.valor);
  focarProximo(inputTp);
});

/** Memoriza transportadoras novas digitadas pelo operador. */
function memorizarTransportadora(nome) {
  const limpo = nome.trim().toUpperCase();
  if (!limpo || listaTransportadoras().includes(limpo)) return;
  store.salvar([...store.ler(), limpo]);
}

/* ---------- 6. Ícones das etiquetas (SVG inline, sem bibliotecas) ---------- */

const ICONES = {
  pessoa:   '<circle cx="12" cy="7.6" r="3.9"/><path d="M4.6 20.6v-1.1c0-3.5 2.8-6.3 6.3-6.3h2.2c3.5 0 6.3 2.8 6.3 6.3v1.1"/>',
  local:    '<path d="M19 10.3c0 5.4-7 11.2-7 11.2s-7-5.8-7-11.2a7 7 0 1 1 14 0z"/><circle cx="12" cy="10.1" r="2.6"/>',
  bairro:   '<path d="M3.5 20.5V8.2l5.6-3.1v15.4"/><rect x="9.1" y="9.6" width="11.4" height="10.9" rx="1.3"/><path d="M12.6 13h1.5M16.5 13h1.5M12.6 16.6h1.5M16.5 16.6h1.5"/>',
  cidade:   '<path d="M3.5 20.5V10l6.2-3.4v13.9"/><path d="M9.7 12.6h9.4c.8 0 1.4.6 1.4 1.4v6.5H9.7z"/><path d="M13.2 16h1.4M17 16h1.4M13.2 18.6h1.4M17 18.6h1.4"/>',
  cep:      '<path d="M3.5 20.5v-7a4.5 4.5 0 0 1 9 0v7z"/><path d="M12.5 13.5h4.6a3.4 3.4 0 0 1 3.4 3.4v3.6h-8"/><path d="M8 9V5.2h3.6"/><path d="M6 16.6h4"/>',
  casa:     '<path d="M3.6 10.9 12 4l8.4 6.9"/><path d="M5.7 9.6v10.9h12.6V9.6"/><path d="M9.8 20.5v-5.7h4.4v5.7"/>',
  documento:'<path d="M13.8 3.5H7.6a2.1 2.1 0 0 0-2.1 2.1v12.8a2.1 2.1 0 0 0 2.1 2.1h8.8a2.1 2.1 0 0 0 2.1-2.1V8.2z"/><path d="M13.8 3.5v4.7h4.7"/>',
  nota:     '<path d="M13.8 3.5H7.6a2.1 2.1 0 0 0-2.1 2.1v12.8a2.1 2.1 0 0 0 2.1 2.1h8.8a2.1 2.1 0 0 0 2.1-2.1V8.2z"/><path d="M13.8 3.5v4.7h4.7"/><path d="M8.8 13h6.4M8.8 16.4h4.6"/>',
  etiqueta: '<path d="M20.4 12.7 12.6 20.5a1.9 1.9 0 0 1-2.7 0l-6.4-6.4a1.9 1.9 0 0 1-.5-1.3V5c0-1 .8-1.9 1.9-1.9h7.7c.5 0 1 .2 1.3.6l6.5 6.4a1.9 1.9 0 0 1 0 2.6z"/><circle cx="7.9" cy="7.9" r="1.4"/>',
  caminhao: '<path d="M2.6 5.2h10.9v10.6H2.6z"/><path d="M13.5 8.9h3.5l3.4 3.4v3.5h-6.9z"/><circle cx="7" cy="18" r="2.1"/><circle cx="17" cy="18" r="2.1"/>',
  expresso: '<path d="M6 6.2h8.2v9.6H6z"/><path d="M14.2 9.4h3.1l3 3v3.4h-6.1z"/><circle cx="9.5" cy="18" r="1.9"/><circle cx="17.5" cy="18" r="1.9"/><path d="M1.4 8.6h3.2M.9 12.1h2.6M2 15.6h2.4"/>',
  volume:   '<path d="M20.5 7.9 12 3.5 3.5 7.9v8.2L12 20.5l8.5-4.4z"/><path d="m3.7 8 8.3 4.3L20.3 8"/><path d="M12 12.3v8.2"/>',
  empresa:  '<rect x="4.6" y="3.6" width="14.8" height="16.9" rx="1.6"/><path d="M8.4 8h2.2M13.4 8h2.2M8.4 11.8h2.2M13.4 11.8h2.2"/><path d="M10 20.5v-4.3h4v4.3"/>'
};

/** Devolve o SVG do ícone pedido. */
function icone(nome) {
  return `<svg class="lb-ic" viewBox="0 0 24 24" fill="none" stroke="currentColor"
               stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${ICONES[nome]}</svg>`;
}

/* ---------- 6b. Código de barras Code 128C ----------
   O padrão da DANFE. Cada símbolo tem 6 elementos (barra, espaço, barra…)
   e cada dígito da tabela abaixo é a largura de um elemento em módulos. */

const CODE128 = [
  '212222','222122','222221','121223','121322','131222','122213','122312','132212','221213',
  '221312','231212','112232','122132','122231','113222','123122','123221','223211','221132',
  '221231','213212','223112','312131','311222','321122','321221','312212','322112','322211',
  '212123','212321','232121','111323','131123','131321','112313','132113','132311','211313',
  '231113','231311','112133','112331','132131','113123','113321','133121','313121','211331',
  '231131','213113','213311','213131','311123','311321','331121','312113','312311','332111',
  '314111','221411','431111','111224','111422','121124','121421','141122','141221','112214',
  '112412','122114','122411','142112','142211','241211','221114','413111','241112','134111',
  '111242','121142','121241','114212','124112','124211','411212','421112','421211','212141',
  '214121','412121','111143','111341','131141','114113','114311','411113','411311','113141',
  '114131','311141','411131','211412','211214','211232','2331112'
];

/** Sequência de larguras para uma cadeia de dígitos em Code C (dois dígitos por símbolo). */
function padraoCode128C(digitos) {
  const codigos = [105];                                        // Start C
  for (let i = 0; i < digitos.length; i += 2) codigos.push(Number(digitos.slice(i, i + 2)));

  let soma = 105;                                               // o Start entra com peso 1
  for (let i = 1; i < codigos.length; i++) soma += codigos[i] * i;

  codigos.push(soma % 103);                                     // dígito de verificação
  codigos.push(106);                                            // Stop
  return codigos.map((c) => CODE128[c]).join('');
}

/** SVG do código de barras: vetorial, imprime nítido em qualquer resolução. */
function barrasSVG(digitos) {
  const d = somenteDigitos(digitos);
  if (!d.length || d.length % 2) return '';

  const larguras = padraoCode128C(d).split('').map(Number);
  const margem = 10;                                            // zona de silêncio do padrão
  const total = larguras.reduce((a, b) => a + b, 0) + margem * 2;

  let x = margem;
  let barras = '';
  larguras.forEach((w, i) => {
    if (i % 2 === 0) barras += `<rect x="${x}" y="0" width="${w}" height="100"/>`;  // índices pares = barra
    x += w;
  });

  // Sem shape-rendering: o arredondamento para pixel inteiro distorceria a
  // proporção das barras. Em vetor puro a largura sai exata na impressora.
  return `<svg viewBox="0 0 ${total} 100" preserveAspectRatio="none" aria-hidden="true">${barras}</svg>`;
}

/* ---------- 7. Geração das etiquetas ---------- */

function limparErro(el) { el.classList.remove('is-invalid'); }

function validar() {
  const obrigatorios = $$('[data-required]', form);
  let primeiroErro = null;

  obrigatorios.forEach((el) => {
    const vazio = !el.value.trim();
    el.classList.toggle('is-invalid', vazio);
    if (vazio && !primeiroErro) primeiroErro = el;
  });

  if (primeiroErro) {
    primeiroErro.focus();
    toast('Preencha os campos destacados', 'error');
    return false;
  }

  // A chave é opcional, mas pela metade não vira código de barras.
  const chave = somenteDigitos(campos.danfe.value);
  if (chave.length && chave.length !== 44) {
    campos.danfe.classList.add('is-invalid');
    campos.danfe.focus();
    toast('A chave da NF-e precisa ter 44 dígitos', 'error');
    return false;
  }

  return true;
}

function coletarDados() {
  const total = Math.min(999, Math.max(1, parseInt(campos.volumes.value, 10) || 1));
  campos.volumes.value = total;

  return {
    nome: campos.nome.value.trim().toUpperCase(),
    endereco: campos.endereco.value.trim().toUpperCase(),
    numero: campos.numero.value.trim().toUpperCase(),
    complemento: campos.complemento.value.trim().toUpperCase(),
    bairro: campos.bairro.value.trim().toUpperCase(),
    cidade: campos.cidade.value.trim().toUpperCase(),
    uf: campos.uf.value.trim().toUpperCase(),
    cep: formatarCep(campos.cep.value),
    nf: campos.nf.value.trim(),
    serie: campos.serie.value.trim(),
    chave: somenteDigitos(campos.danfe.value),
    codigo: codigoPedido(),
    transportadora: campos.transportadora.value.trim().toUpperCase(),
    total
  };
}

function montarEtiqueta(d, volume) {
  return etiquetaDestinatario(d, volume) + etiquetaRemetente();
}

const TRACO = '\u2014';

/** Célula de dado: ícone + rótulo + valor.
 *  Valores longos passam a quebrar em duas linhas; os curtos apenas encolhem. */
function celula(nomeIcone, chave, valor, classe = '') {
  const v = String(valor || '').trim() || TRACO;
  // Só quebra linha quem tem espaço: CEP, número e TBS-0049974 nunca se partem.
  const quebra = /\s/.test(v) ? ' lb-v--wrap' : '';
  return `
    <span class="lb-cell ${classe}">
      ${icone(nomeIcone)}
      <span class="lb-txt">
        <span class="lb-k" data-fit="0.58,0.42">${esc(chave)}</span>
        <span class="lb-v${quebra}" data-fit="1.05,0.58">${esc(v)}</span>
      </span>
    </span>`;
}

/** Etiqueta 1 de 2: destinatário, com a placa de volume no cabeçalho. */
function etiquetaDestinatario(d, volume) {
  const casas = Math.max(2, String(d.total).length);
  const atual = String(volume).padStart(casas, '0');
  const total = String(d.total).padStart(casas, '0');

  // Segunda linha do endereço aparece apenas quando há complemento.
  const complLinha = d.complemento
    ? `<span class="lb-extra" data-fit="0.98,0.66">${esc(d.complemento)}</span>`
    : '';

  return `
  <article class="label">
    <div class="lb-card">

      <header class="lb-head">
        <div class="lb-band"><span class="lb-band-title" data-fit="1.35,0.85">Destinatário</span></div>
        <div class="lb-vol">
          <span class="lb-vol-key">Volume</span>
          <span class="lb-vol-num" data-fit="2,1.05">${atual}/${total}</span>
        </div>
      </header>

      <div class="lb-body">

        <div class="lb-id">
          <div class="lb-row">
            ${icone('pessoa')}
            <span class="lb-txt">
              <span class="lb-name" data-fit="1.75,0.95">${esc(d.nome)}</span>
            </span>
          </div>
          <div class="lb-row">
            ${icone('local')}
            <span class="lb-txt">
              <span class="lb-street" data-fit="1.28,0.8">${esc(d.endereco)}, ${esc(d.numero)}</span>
              ${complLinha}
            </span>
          </div>
        </div>

        <div class="lb-row lb-row--line">
          ${celula('bairro', 'Bairro', d.bairro)}
          ${celula('cidade', 'Cidade / UF', `${d.cidade} / ${d.uf}`, 'lb-cell--grow')}
        </div>

        <div class="lb-row lb-row--line">
          ${celula('cep', 'CEP', d.cep, 'lb-cell--grow')}
          ${celula('casa', 'Número', d.numero, 'lb-cell--tight')}
          ${celula('documento', 'Complemento', d.complemento, 'lb-cell--grow')}
        </div>

        <div class="lb-row lb-row--line">
          ${celula('nota', 'Nota fiscal', d.nf, 'lb-cell--nf')}
          ${celula('etiqueta', 'Tipo / Pedido', d.codigo, 'lb-cell--pedido')}
          ${celula('caminhao', 'Transportadora', d.transportadora, 'lb-cell--transportadora')}
        </div>

        ${blocoDanfe(d, atual, total)}

      </div>
    </div>
  </article>`;
}

/** Rodapé da etiqueta: chave da NF-e com código de barras.
 *  Sem chave informada, mantém a contagem de volumes que ficava aqui antes. */
function blocoDanfe(d, atual, total) {
  if (!d.chave) {
    return `
        <div class="lb-row lb-row--dash">
          ${celula('volume', 'Volumes', `${atual} de ${total}`, 'lb-cell--auto')}
        </div>`;
  }

  return `
        <div class="lb-danfe">
          <div class="lb-danfe-head">
            <span class="lb-danfe-k" data-fit="0.58,0.42">DANFE · Chave de acesso</span>
            <span class="lb-danfe-nf" data-fit="0.86,0.58">Série ${esc(d.serie || TRACO)} · NF ${esc(d.nf || TRACO)}</span>
          </div>
          <span class="lb-bc">${barrasSVG(d.chave)}</span>
          <span class="lb-danfe-chave" data-fit="0.72,0.44">${esc(formatarChave(d.chave))}</span>
        </div>`;
}

/** Etiqueta 2 de 2: remetente fixo, impressa logo depois de cada destinatário. */
function etiquetaRemetente() {
  const linha = (ico, titulo, chave, valor) => `
    <div class="lb-sender-row">
      <span class="lb-badge">${icone(ico)}</span>
      <span class="lb-txt">
        <span class="lb-sender-name" data-fit="1.08,0.78">${esc(titulo)}</span>
        <span class="lb-sender-sub" data-fit="0.95,0.7"><b>${chave}:</b> ${esc(valor)}</span>
      </span>
    </div>`;

  return `
  <article class="label">
    <div class="lb-card">

      <header class="lb-head">
        <div class="lb-band">
          <span class="lb-band-title" data-fit="1.35,0.85">Remetente</span>
          ${icone('expresso')}
        </div>
      </header>

      <div class="lb-body lb-body--sender">
        ${linha('empresa', REMETENTE.nome,     'CNPJ',   REMETENTE.cnpj)}
        ${linha('local',   REMETENTE.endereco, 'Bairro', REMETENTE.bairro)}
        ${linha('cidade',  REMETENTE.cidade,   'CEP',    REMETENTE.cep)}
      </div>
    </div>
  </article>`;
}

/* ---------- Encaixe automático ----------
   Cada texto marcado com data-fit="base,mínimo" (em ems) é reduzido até
   caber na própria caixa. Se ainda assim a etiqueta transbordar, o cartão
   inteiro encolhe pela variável --fit. Nada vaza para fora dos 100 x 122 mm. */

function ajustarTexto(el) {
  const [base, minimo] = el.dataset.fit.split(',').map(Number);
  let em = base;
  let voltas = 0;

  el.style.fontSize = em + 'em';

  while (voltas++ < 60 && em > minimo &&
        (el.scrollWidth > el.clientWidth + 0.5 || el.scrollHeight > el.clientHeight + 0.5)) {
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

  // Rede de segurança: encolhe o cartão inteiro se o corpo ainda transbordar.
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

function gerarEtiquetas() {
  if (!validar()) return;

  const d = coletarDados();
  memorizarTransportadora(d.transportadora);

  let html = '';
  for (let v = 1; v <= d.total; v++) html += montarEtiqueta(d, v);

  elLabels.innerHTML = html;
  ajustarTodas();
  // As fontes podem chegar depois da primeira medição: recalcula quando carregarem.
  if (document.fonts && document.fonts.ready) document.fonts.ready.then(ajustarTodas);

  const paginas = d.total * 2;
  elContador.textContent = `${d.total} volume${d.total > 1 ? 's' : ''} · ${paginas} etiquetas`;
  btnImprimir.disabled = false;

  toast(`${paginas} etiquetas geradas · ${d.codigo}`, 'ok');
  elLabels.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
}

function limparFormulario() {
  form.reset();
  $$('.is-invalid', form).forEach(limparErro);
  elLabels.innerHTML = '';
  elLabels.appendChild(elVazio);
  elContador.textContent = 'Nenhuma etiqueta';
  btnImprimir.disabled = true;
  statusCep('Busca automática de endereço');
  campos.danfe.classList.remove('is-ok');
  statusDanfe(DANFE_PADRAO);
  atualizarPreviaCodigo();
  fecharSugestoes();
  campos.nome.focus();
  toast('Formulário limpo');
}

/* ---------- 8. Impressão ---------- */

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
  let i = lista.indexOf(atual);

  // Chave válida já preencheu nota e série: o Enter segue direto para o tipo do pedido.
  if (atual === campos.danfe && campos.danfe.classList.contains('is-ok')) {
    i = lista.indexOf(campos.serie);
  }

  const proximo = lista[i + 1];
  if (proximo) { proximo.focus(); if (proximo.select) proximo.select(); }
  else gerarEtiquetas();
}

// Enter → próximo campo (o autocomplete trata o próprio Enter antes)
form.addEventListener('keydown', (e) => {
  if (e.key !== 'Enter') return;
  const alvo = e.target;
  if (alvo.tagName === 'BUTTON' || alvo.type === 'submit') return;
  e.preventDefault();
  focarProximo(alvo.type === 'radio' ? $('input[name="tipo"]:checked') : alvo);
});

form.addEventListener('submit', (e) => { e.preventDefault(); gerarEtiquetas(); });

$('#btn-limpar').addEventListener('click', limparFormulario);
btnImprimir.addEventListener('click', imprimir);

// Stepper de volumes
$$('.stepper-btn').forEach((btn) => {
  btn.addEventListener('click', () => {
    const passo = Number(btn.dataset.step);
    const atual = parseInt(campos.volumes.value, 10) || 1;
    campos.volumes.value = Math.min(999, Math.max(1, atual + passo));
  });
});

// Limpa o destaque de erro ao digitar
$$('[data-required]', form).forEach((el) => {
  el.addEventListener('input', () => limparErro(el));
  el.addEventListener('change', () => limparErro(el));
});

// Atalhos globais
document.addEventListener('keydown', (e) => {
  if (e.key === 'F2') { e.preventDefault(); gerarEtiquetas(); }
  else if (e.key === 'F4') { e.preventDefault(); imprimir(); }
  else if (e.key === 'Escape') {
    if (!listaTp.hidden) return;   // Esc fecha as sugestões primeiro
    e.preventDefault();
    limparFormulario();
  }
});

/* ---------- Inicialização ---------- */
atualizarPreviaCodigo();
campos.nome.focus();
