# 🍔 Dorvan Burger

Uma experiência digital de hamburgueria com cardápio interativo, personalização de produtos e pedidos online.

Projeto de portfólio desenvolvido para demonstrar habilidades em desenvolvimento Front-End, experiência do usuário e integração com backend.

## ✨ Funcionalidades

- Cardápio organizado por categorias.
- Imagens e descrições dos produtos.
- Personalização de hambúrgueres e acompanhamentos.
- Carrinho de compras.
- Checkout com dados do cliente e endereço.
- Simulação de formas de pagamento.
- Confirmação de pedido.
- Interface responsiva para celulares e computadores.

## 🛠️ Tecnologias

**Frontend:** React, TypeScript, Vite e SCSS.

**Backend:** Node.js, PostgreSQL e API REST.

## 🚀 Como executar

### Pré-requisitos

- Node.js
- npm
- PostgreSQL

### Instalar dependências

Execute na pasta principal do projeto:

    npm.cmd --prefix frontend install
    npm.cmd --prefix backend install

### Configurar o ambiente

Utilize o arquivo `.env.example` como referência para criar seu `.env` na raiz do projeto.

Configure as conexões com o PostgreSQL e siga as instruções em `backend/README.md` para preparar o banco de dados.

Nunca publique senhas, tokens ou arquivos `.env`.

### Iniciar o backend

    node --env-file=.env backend/src/server.mjs

### Iniciar o frontend

Em outro terminal:

    npm.cmd --prefix frontend run dev

Acesse o endereço local informado pelo Vite.

## 💳 Pagamentos

O checkout funciona em modo demonstrativo. Nenhuma cobrança real é realizada e dados de cartão não são armazenados.

## 📱 Responsividade

Interface adaptada para dispositivos móveis e computadores.

## 👩‍💻 Desenvolvedora

**Érica Gomes — Front-End Developer**

[GitHub: ericagomes-dev](https://github.com/ericagomes-dev)

---

Projeto desenvolvido para fins de estudo e portfólio.
