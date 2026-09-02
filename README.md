# Multas Cruzeiro

Aplicação móvel instalável (PWA) para gerir as multas da A.D. Cruzeiro Silvalde.

## Funcionalidades

- Registo rápido de multas fixas, por minuto e com valor variável.
- Plantel inicial com 22 jogadores e 4 elementos da equipa técnica.
- Pagamentos automáticos de abertura, fecho e mensalidade da caixa.
- Fecho mensal com prazo de pagamento de 7 dias.
- Duplicação única dos valores que continuem por pagar depois do prazo.
- Confirmação individual de pagamentos e histórico mensal.
- Gestão de membros, preços e estado da época.
- Instalação no ecrã inicial do telemóvel e cópia de segurança em JSON.

## Desenvolvimento

```bash
npm install
npm run dev
```

Para validar uma versão de produção:

```bash
npm test
npm run build
```

## Acessos e persistência

- O link público abre sempre em modo de consulta.
- A área de administrador exige palavra-passe e usa uma sessão segura em cookie `HttpOnly`.
- Apenas pedidos autenticados podem alterar multas, pagamentos ou definições.
- Os dados partilhados são guardados num Vercel Blob privado ligado ao projeto.
- A opção **Definições → Exportar cópia de segurança** continua disponível ao administrador.

## Publicação no Vercel

O projeto inclui a configuração de build em `vercel.json`. Depois de autenticar a CLI, publica com:

```bash
vercel --prod
```

As variáveis `ADMIN_PASSWORD`, `SESSION_SECRET` e `BLOB_READ_WRITE_TOKEN` são configuradas diretamente no Vercel e nunca devem ser adicionadas ao repositório.

Produção: [multas-cruzeiro.vercel.app](https://multas-cruzeiro.vercel.app)
