# Dorvan Burger

## Acessar demonstração online

**Endereço previsto:** [https://ericagomes-dev.github.io/dorvan-burger/](https://ericagomes-dev.github.io/dorvan-burger/)

O endereço só estará disponível depois que o workflow do GitHub Pages concluir
a publicação. Esta versão é demonstrativa: não processa pagamentos nem envia
ou registra pedidos reais.

Cardápio digital com personalização de produtos, carrinho e checkout local
demonstrativo, feito com React, TypeScript, Vite e SCSS. O backend Node.js e
PostgreSQL é mantido para uma futura versão completa e não é necessário para
esta demonstração estática.

## Funcionalidades

- Cardápio por categorias, com imagens e layout responsivo.
- Personalização de ingredientes, adicionais e observações.
- Carrinho com edição de itens e cálculo demonstrativo de totais no navegador.
- Checkout demonstrativo sem enviar dados, gravar pedidos ou iniciar cobranças.

O carrinho e as personalizações são mantidos localmente no navegador. Não
informe dados pessoais reais; as opções de Pix, cartão e dinheiro são
ilustrativas e não aceitam pagamento.

## Executar localmente

Requisito: Node.js 22 ou superior. A demonstração estática não depende do
backend nem de PostgreSQL.

```powershell
cd frontend
npm ci
npm run dev
```

Consulte [frontend/README.md](./frontend/README.md) para build e detalhes da
publicação no GitHub Pages. O backend preservado para a versão futura está
documentado em [backend/README.md](./backend/README.md).

## Verificações

```powershell
cd frontend
npm ci
npm run lint
npm run build
```

Os testes do backend podem ser executados separadamente em `backend`; os que
verificam persistência exigem `TEST_DATABASE_URL` para a base de testes local.

## Publicação

O workflow [.github/workflows/deploy.yml](./.github/workflows/deploy.yml)
compila `frontend` e publica `frontend/dist` no GitHub Pages quando há push
para `master`. Nas configurações do repositório, selecione **Settings >
Pages > Build and deployment > Source: GitHub Actions**. O link previsto só
deve ser anunciado depois de uma execução de deploy bem-sucedida e da validação
do site e da navegação em dispositivos móveis.

Não publique `.env`, senhas, tokens ou credenciais. O frontend estático não
precisa de secrets nem se conecta ao backend.

## Tecnologias

- Frontend: React, TypeScript, Vite e SCSS.
- Backend futuro: Node.js, API HTTP e PostgreSQL.

## Autoria

**Érica Gomes** · [GitHub – ericagomes-dev](https://github.com/ericagomes-dev)
