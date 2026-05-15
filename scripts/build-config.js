// Gera js/config.js a partir das variáveis de ambiente do Vercel
const fs = require('fs');

const url    = process.env.SUPABASE_URL    || '';
const key    = process.env.SUPABASE_KEY || process.env.SUPABASE_ANON_KEY || '';
const bucket = process.env.SUPABASE_BUCKET || 'concrem-fxcp-arquivos';

if (!url || !key) {
  console.error('ERRO: SUPABASE_URL e SUPABASE_KEY são obrigatórios.');
  process.exit(1);
}

const conteudo = `const CONFIG = {
  SUPABASE_URL:    '${url}',
  SUPABASE_KEY:    '${key}',
  SUPABASE_BUCKET: '${bucket}',
};
`;

fs.writeFileSync('./js/config.js', conteudo, 'utf8');
console.log('✅ js/config.js gerado com sucesso.');
