# Aplicar correção cirúrgica: remover Peso estimado e validar estoque

```powershell
cd "C:\Users\Johann\planejador-3d"

Expand-Archive -Path ".\fix-alerta-estoque-plano-cirurgico.zip" -DestinationPath "." -Force
node .\scripts\apply-fix-alerta-estoque-plano-cirurgico.mjs
Remove-Item -Recurse -Force .\scripts

npm run build

git add src/app/plano-producao/page.tsx
git commit -m "Remove peso estimado e adiciona alerta de estoque no plano"
git push

Get-ChildItem -Filter *.zip -ErrorAction SilentlyContinue | Remove-Item -Force
```

## O que esta correção faz

- Remove somente o campo visual **Peso estimado (g)** do formulário **Adicionar pedido ao plano**.
- Remove o envio de `peso_estimado_g` no payload do plano.
- Ao selecionar um pedido, busca o estoque inteiro pela API `/api/estoque` já existente.
- Cruza:
  - pedido selecionado;
  - Arquivo 3MF do pedido;
  - componente do Arquivo 3MF;
  - filamentos 1 a 8 do componente;
  - gramas de cada filamento;
  - quantidade do componente no 3MF;
  - estoque por `id_filamento`.
- Exibe alerta informando se existe estoque suficiente ou insuficiente para imprimir.

Não altera SQL, API, tabela, rota ou lógica de outros módulos.
