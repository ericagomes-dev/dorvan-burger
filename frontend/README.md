# Dorvan Burger

Site demonstrativo de hamburgueria, feito com Vite, React, TypeScript e SCSS. O cardápio, o carrinho, a personalização e a revisão do pedido são locais ao navegador. Nenhum pedido é enviado a uma cozinha e não há integração de cobrança.

## Executar o site e o checkout demonstrativo

Instale as dependências do frontend uma vez:

```powershell
cd frontend
npm ci
```

Inicie a API demonstrativa em um terminal:

```powershell
cd backend
npm start
```

Inicie o Vite em outro terminal:

```powershell
cd frontend
npm run dev
```

Durante o desenvolvimento, o Vite encaminha `/api/*` para `http://127.0.0.1:8787`. O checkout envia à API apenas IDs de produtos e quantidades; dados do formulário, adicionais, valores e opções de pagamento não saem do navegador.

## API demonstrativa

O backend independente usa somente APIs nativas do Node.js e inicia em `http://127.0.0.1:8787`:

```powershell
cd backend
npm test
npm start
```

O modo vem exclusivamente do ambiente do servidor em `../.env`. Para começar, copie `../.env.example` para `../.env`; ele mantém `PAYMENTS_MODE=demo` e não contém credenciais. Se a variável estiver ausente ou inválida, o modo efetivo continua sendo demonstração. `VITE_*`, parâmetros de requisição e campos do navegador não podem alterar essa configuração.

Rotas disponíveis:

- `GET /api/payments/status` informa que a API está em demonstração.
- `POST /api/checkout` simula um pedido sem armazenar dados do cliente ou iniciar pagamento.
- `POST /api/payments/preference` sempre bloqueia a criação de preferência nesta versão.

Mesmo com `PAYMENTS_MODE=production`, o backend permanece em modo de demonstração e bloqueia preferências reais. A integração, validação da assinatura do webhook, consulta oficial do pagamento e reconciliação de pedidos ainda não foram implementadas. Não há SDK do Mercado Pago, token no frontend nem chamada à API de cobrança. A constante de integração está deliberadamente fechada no código em `backend/src/payment-policy.mjs`.

## Segurança para uma integração futura

Não habilite pagamentos reais nesta versão. Antes de alterar o bloqueio, implemente e revise pelo menos:

1. Credenciais de produção criadas no ambiente de produção e armazenadas somente no servidor. O Access Token é privado e nunca deve ser exposto ao frontend.
2. `NODE_ENV=production`, URLs públicas HTTPS e `back_urls` validadas para o domínio de produção.
3. Webhook HTTPS de produção configurado para eventos de pagamento, com segredo exclusivo, validação HMAC de `x-signature` e teste de recebimento.
4. Confirmação de estado consultada no backend pelo endpoint oficial de pagamento; redirects do checkout não confirmam pagamento.
5. Idempotência, reconciliação entre notificação/pagamento/pedido, validação dos valores no servidor, proteção contra CSRF/abuso, logs sem segredos/dados de cartão e revisão de segurança.
6. Testes automatizados passando e uma mudança explícita e revisada das travas de integração e webhook no backend.

Consulte a [documentação oficial de credenciais](https://www.mercadopago.com.br/developers/en/docs/your-integrations/credentials), a [visão geral do Checkout Pro](https://www.mercadopago.com.br/developers/en/docs/checkout-pro-preferences/overview) e a [documentação oficial de notificações e validação de Webhooks](https://www.mercadopago.com.br/developers/en/docs/checkout-pro-preferences/payment-notifications). A documentação especifica o Access Token como chave privada de backend; Webhooks de produção usam HTTPS e assinatura, e a notificação deve ser seguida da consulta do pagamento pela API.

## Verificações

```powershell
cd backend
npm test
cd ..\frontend
npm run build
npm run lint
```

O checkout visual mostra “Projeto demonstrativo: nenhum pagamento real será realizado.” Não solicita dados de cartão. A API também rejeita campos de cartão enviados à rota de demonstração.
