COLE O CONTEUDO DESTA PASTA DENTRO DE:
C:\Users\Johann\planejador-3d

ANTES:
1) Seu .env.local deve existir na raiz do projeto com:
NEXT_PUBLIC_SUPABASE_URL=...
NEXT_PUBLIC_SUPABASE_ANON_KEY=...

2) No Supabase Authentication:
- habilite Email/Password
- se quiser cadastro liberado, deixe signup habilitado

DEPOIS:
1) Abra o terminal em C:\Users\Johann\planejador-3d
2) Rode:
npm install @supabase/supabase-js
3) Rode:
npm run dev

ROTAS PRINCIPAIS:
- /login
- /cadastro
- /dashboard
- /clientes
- /filamentos
- /estoque
- /componentes
- /arquivos-3mf
- /impressoras
- /pedidos
- /plano-producao
- /execucoes
- /falhas
- /cotacoes
