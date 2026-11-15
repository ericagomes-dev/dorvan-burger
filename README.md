# Dorvan Burger

Cardápio digital de uma hamburgueria fictícia, desenvolvido como projeto de portfólio para demonstrar uma experiência de compra simples, responsiva e intuitiva.

<p align="center">
  <a href="https://ericagomes-dev.github.io/dorvan-burger/"><strong>🍔 Acessar demonstração online</strong></a>
</p>

> **Aviso:** esta é uma demonstração. O carrinho e o checkout são simulados no navegador. Nenhum pedido é enviado ou registrado e nenhum pagamento é processado.

## Visão geral

A interface permite explorar o cardápio, personalizar produtos e revisar um pedido em um fluxo demonstrativo.

### Funcionalidades

- Cardápio organizado por categorias.
- Personalização de ingredientes, adicionais e observações.
- Carrinho com edição de itens e cálculo do total.
- Checkout demonstrativo com opções ilustrativas de pagamento.
- Interface responsiva para computadores e dispositivos móveis.

## Tecnologias

**Frontend**
- React
- TypeScript
- Vite
- SCSS

**Backend (base para evolução futura)**
- Node.js
- PostgreSQL

O backend é mantido no repositório para uma futura versão completa. Ele não é necessário para executar a demonstração online.

## Executar localmente

**Requisito:** Node.js 22 ou superior.

No terminal, execute:

```bash
cd frontend
npm ci
npm run dev
```

O Vite exibirá o endereço local para abrir o projeto no navegador.

### Verificar e gerar a versão de produção

Ainda na pasta `frontend`:

```bash
npm run lint
npm run build
npm run preview
```

Os arquivos gerados ficam na pasta `frontend/dist`.

## Estrutura do projeto

```text
dorvan-burger/
├── frontend/       # Aplicação React
├── backend/        # Base de backend para evolução futura
└── .github/
    └── workflows/  # Publicação automática no GitHub Pages
```

## Publicação

A demonstração é publicada pelo GitHub Pages por meio do workflow de deploy configurado em [\.github/workflows/deploy.yml](./.github/workflows/deploy.yml).

**Demonstração:** https://ericagomes-dev.github.io/dorvan-burger/

## Autoria

**Érica Gomes** — Front-End Developer

- [GitHub](https://github.com/ericagomes-dev)
- [LinkedIn](https://www.linkedin.com/in/ericagomesdev/)
- [E-mail](mailto:ericagomesdev@gmail.com)
