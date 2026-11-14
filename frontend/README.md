# Frontend Dorvan Burger

Frontend demonstrativo em React, TypeScript, Vite e SCSS. O carrinho e o
checkout de simulação funcionam no navegador sem API ou PostgreSQL. Nenhum
dado pessoal é enviado, nenhum pedido real é registrado e pagamentos não são
processados. O backend permanece no repositório para uma futura versão completa.

## Desenvolvimento local

Requer Node.js 22 ou superior. Não é necessário configurar banco de dados ou
variáveis de ambiente para executar o frontend demonstrativo.

```powershell
cd frontend
npm ci
npm run dev
```

Abra o endereço local mostrado pelo Vite. A base `/dorvan-burger/` é usada
também no desenvolvimento local.

## Build e verificações

```powershell
npm run lint
npm run build
npm run preview
```

O build de produção fica em `dist/` e usa a base `/dorvan-burger/`.

## GitHub Pages

O workflow [`../.github/workflows/deploy.yml`](../.github/workflows/deploy.yml)
compila este frontend e publica `dist/` quando há push para a branch `master`.
Ative o GitHub Pages nas configurações do repositório com **Source: GitHub
Actions**. A publicação requer as permissões Pages e OIDC declaradas no
workflow.

O endereço previsto é https://ericagomes-dev.github.io/dorvan-burger/ e só
estará disponível depois de uma publicação bem-sucedida. Valide o carregamento
dos assets, links e fluxo do carrinho em desktop e dispositivos móveis após o
deploy. O frontend estático não requer secrets.
