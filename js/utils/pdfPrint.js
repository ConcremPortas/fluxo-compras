/* ============================================================
   FLUXOCOMPRAS — PDF via HTML + window.print()
   Padrão visual Concrem
============================================================ */

var PdfPrint = {};

/* ----------------------------------------------------------
   1. Logo → base64
---------------------------------------------------------- */
PdfPrint.fetchLogoBase64 = async function() {
  const caminhos = [
    'Logos/logo-cores.png',
    'img/logo-cores.png',
    'assets/logo-cores.png',
    'logo-cores.png',
  ];

  for (const caminho of caminhos) {
    try {
      const resp = await fetch(caminho);
      if (!resp.ok) continue;
      const blob = await resp.blob();
      const b64  = await new Promise((res, rej) => {
        const reader = new FileReader();
        reader.onloadend = () => res(reader.result);
        reader.onerror  = rej;
        reader.readAsDataURL(blob);
      });
      return b64;
    } catch { continue; }
  }

  if (typeof LOGO_CONCREM_B64 !== 'undefined' && LOGO_CONCREM_B64) {
    return LOGO_CONCREM_B64;
  }

  return '';
};

/* ----------------------------------------------------------
   2. CSS de impressão padrão Concrem
---------------------------------------------------------- */
PdfPrint.getEstilo = function() {
  return `
    @page {
      size: A4 portrait;
      margin: 0;
    }

    * { box-sizing: border-box; margin: 0; padding: 0; }

    body {
      font-family: Arial, Helvetica, sans-serif;
      font-size: 9.5pt;
      color: #1a1a1a;
      background: #fff;
      padding: 10mm 12mm 12mm 12mm;
      -webkit-print-color-adjust: exact;
      print-color-adjust: exact;
    }

    .pdf-pagina {
      width: 100%;
      min-height: 277mm;
      display: flex;
      flex-direction: column;
      background: #fff;
    }

    @media print {
      body { -webkit-print-color-adjust: exact; print-color-adjust: exact; }
      .pdf-pagina { page-break-after: always; min-height: 277mm; }
      .pdf-pagina:last-child { page-break-after: auto; }
    }

    /* ---- HEADER ---- */
    .pdf-header {
      display: flex;
      justify-content: space-between;
      align-items: flex-start;
      padding-bottom: 6pt;
      margin-bottom: 8pt;
      border-bottom: 1.5pt solid #1a2e1a;
    }

    .pdf-logo { height: 28pt; width: auto; }

    .pdf-titulo-wrap { text-align: right; }

    .pdf-titulo {
      font-size: 15pt;
      font-weight: bold;
      color: #1a2e1a;
      text-transform: uppercase;
      letter-spacing: 0.5pt;
      line-height: 1.1;
    }

    .pdf-subtitulo {
      font-size: 8pt;
      color: #555;
      margin-top: 3pt;
    }

    /* ---- META LINHA ---- */
    .pdf-meta {
      font-size: 8.5pt;
      color: #333;
      margin-bottom: 10pt;
      display: flex;
      gap: 20pt;
      flex-wrap: wrap;
    }

    .pdf-meta span   { color: #555; }
    .pdf-meta strong { color: #1a2e1a; }

    /* ---- SEÇÃO ---- */
    .pdf-secao-titulo {
      font-size: 9pt;
      font-weight: bold;
      color: #1a2e1a;
      text-transform: uppercase;
      letter-spacing: 0.5pt;
      margin-bottom: 6pt;
    }

    /* ---- TABELA ---- */
    .pdf-tabela {
      width: 100%;
      border-collapse: collapse;
      font-size: 8.5pt;
      margin-bottom: 12pt;
    }

    .pdf-tabela thead tr { background-color: #1a2e1a; color: #fff; }

    .pdf-tabela thead th {
      padding: 5pt 6pt;
      text-align: left;
      font-weight: bold;
      font-size: 8pt;
      text-transform: uppercase;
      letter-spacing: 0.3pt;
      border: none;
    }

    .pdf-tabela thead th.right  { text-align: right; }
    .pdf-tabela thead th.center { text-align: center; }

    .pdf-tabela tbody tr:nth-child(odd)  { background: #fff; }
    .pdf-tabela tbody tr:nth-child(even) { background: #f5f5f5; }

    .pdf-tabela tbody td {
      padding: 4.5pt 6pt;
      border: none;
      color: #222;
    }

    .pdf-tabela tbody td.right  { text-align: right; }
    .pdf-tabela tbody td.center { text-align: center; }
    .pdf-tabela tbody td.bold   { font-weight: bold; }

    .pdf-tabela tfoot tr { background: #e8e8e8; }

    .pdf-tabela tfoot td {
      padding: 5pt 6pt;
      font-weight: bold;
      font-size: 9pt;
      color: #1a2e1a;
      border-top: 1pt solid #bbb;
    }

    .pdf-tabela tfoot td.right { text-align: right; }

    /* ---- CAMPOS (grid 2 colunas) ---- */
    .pdf-campos {
      display: grid;
      grid-template-columns: 1fr 1fr;
      gap: 4pt 20pt;
      margin-bottom: 12pt;
      font-size: 8.5pt;
    }

    .pdf-campo label {
      color: #666;
      font-size: 7.5pt;
      text-transform: uppercase;
      letter-spacing: 0.3pt;
      display: block;
      margin-bottom: 1pt;
    }

    .pdf-campo span { color: #1a1a1a; font-weight: bold; }

    /* ---- ASSINATURAS ---- */
    .pdf-assinaturas {
      display: flex;
      gap: 10pt;
      margin-top: 20pt;
    }

    .pdf-assinatura { flex: 1; text-align: center; }

    .pdf-assinatura-linha {
      border-top: 1pt solid #1a2e1a;
      padding-top: 4pt;
      margin-top: 20pt;
    }

    .pdf-assinatura-titulo {
      font-size: 8pt;
      font-weight: bold;
      color: #1a2e1a;
      text-transform: uppercase;
    }

    .pdf-assinatura-nome  { font-size: 7pt; color: #666; margin-top: 2pt; }
    .pdf-assinatura-data  { font-size: 7pt; color: #999; margin-top: 3pt; }

    /* ---- RODAPÉ ---- */
    .pdf-rodape {
      margin-top: auto;
      padding-top: 8pt;
      border-top: 0.5pt solid #ccc;
      display: flex;
      justify-content: space-between;
      font-size: 7pt;
      color: #aaa;
    }
  `;
};

/* ----------------------------------------------------------
   3. Componentes HTML reutilizáveis
---------------------------------------------------------- */
PdfPrint.header = function(logoB64, titulo, subtitulo) {
  const logoHtml = logoB64
    ? `<img src="${logoB64}" class="pdf-logo" alt="Concrem">`
    : `<div style="font-size:18pt;font-weight:bold;color:#1a2e1a;">CONCREM</div>`;
  return `
    <div class="pdf-header">
      <div>${logoHtml}</div>
      <div class="pdf-titulo-wrap">
        <div class="pdf-titulo">${titulo}</div>
        ${subtitulo ? `<div class="pdf-subtitulo">${subtitulo}</div>` : ''}
      </div>
    </div>`;
};

PdfPrint.meta = function(campos) {
  return `
    <div class="pdf-meta">
      ${campos.map(c => `<div><span>${c.label}: </span><strong>${c.valor}</strong></div>`).join('')}
    </div>`;
};

PdfPrint.secao = function(texto) {
  return `<div class="pdf-secao-titulo">${texto}</div>`;
};

PdfPrint.campos = function(campos) {
  return `
    <div class="pdf-campos">
      ${campos.map(c => `
        <div class="pdf-campo">
          <label>${c.label}</label>
          <span>${c.valor}</span>
        </div>`).join('')}
    </div>`;
};

PdfPrint.tabela = function(cabecalhos, linhas, rodape) {
  const thHtml = cabecalhos.map(c =>
    `<th class="${c.classe || ''}">${c.label}</th>`
  ).join('');

  const tbodyHtml = linhas.map(row =>
    `<tr>${row.map(cel => `<td class="${cel.classe || ''}">${cel.valor}</td>`).join('')}</tr>`
  ).join('');

  const tfootHtml = rodape
    ? `<tfoot><tr>${rodape.map(cel => `<td class="${cel.classe || ''}">${cel.valor}</td>`).join('')}</tr></tfoot>`
    : '';

  return `
    <table class="pdf-tabela">
      <thead><tr>${thHtml}</tr></thead>
      <tbody>${tbodyHtml}</tbody>
      ${tfootHtml}
    </table>`;
};

PdfPrint.assinaturas = function(lista) {
  return `
    <div class="pdf-assinaturas">
      ${lista.map(a => `
        <div class="pdf-assinatura">
          <div class="pdf-assinatura-linha">
            <div class="pdf-assinatura-titulo">${a.titulo}</div>
            <div class="pdf-assinatura-nome">${a.nome}</div>
            ${a.data ? `<div class="pdf-assinatura-data">${a.data}</div>` : ''}
          </div>
        </div>`).join('')}
    </div>`;
};

PdfPrint.rodape = function(esquerda, direita) {
  return `
    <div class="pdf-rodape">
      <span>${esquerda || ''}</span>
      <span>${direita || ''}</span>
    </div>`;
};

/* ----------------------------------------------------------
   4. Abrir janela e imprimir
---------------------------------------------------------- */
PdfPrint.abrir = function(htmls) {
  const bodies = Array.isArray(htmls) ? htmls : [htmls];
  const html = `<!DOCTYPE html>
<html lang="pt-BR">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <title>Fluxo Compras — Concrem</title>
  <style>${PdfPrint.getEstilo()}</style>
</head>
<body>
  ${bodies.join('\n')}
  <script>window.onload = function(){ setTimeout(function(){ window.print(); }, 200); };<\/script>
</body>
</html>`;

  const win = window.open('', '_blank');
  if (!win) {
    if (typeof Components !== 'undefined') {
      Components.Toast.error('Pop-up bloqueado. Permita pop-ups para este site.');
    }
    return;
  }
  win.document.write(html);
  win.document.close();
};
