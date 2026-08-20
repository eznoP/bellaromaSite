# Bellaroma

Site institucional e catálogo da Bellaroma, uma marca de costura artesanal. A página começa em uma casa-ateliê 3D: a rolagem aproxima a câmera, abre a porta e atravessa a entrada até revelar o catálogo.

## Stack

- Next.js 16 com App Router e React 19
- TypeScript e CSS Modules
- React Three Fiber, Drei e Three.js para a casa 3D procedural
- Anime.js 4 para a timeline, o scroll scrubbing e os reveals
- Zod para validar produtos recebidos pelo painel administrativo
- Neon Postgres para persistir o catálogo na Vercel

## Executar

```bash
npm install
cp .env.example .env.local
npm run dev
```

Acesse `http://localhost:3000`.

## Configuração

Preencha estas variáveis em `.env.local`:

```dotenv
DATABASE_URL=postgresql://usuario:senha@host-pooler.neon.tech/neondb?sslmode=require
NEXT_PUBLIC_SITE_URL=https://bellaroma.com.br
NEXT_PUBLIC_WHATSAPP_NUMBER=5531999999999
ADMIN_PASSWORD=uma-senha-forte
ADMIN_SESSION_SECRET=uma-chave-aleatoria-com-32-caracteres-ou-mais
```

O número do WhatsApp deve conter apenas código do país, DDD e número. Sem essa variável, os links abrem o WhatsApp com a mensagem pronta, mas sem um destinatário definido.

`ADMIN_PASSWORD` libera o painel em `/admin`. `ADMIN_SESSION_SECRET` assina a sessão HTTP-only e precisa ter pelo menos 32 caracteres. Gere uma chave, por exemplo, com `openssl rand -base64 32`.

Na Vercel, configure as variáveis em **Settings → Environment Variables** para Production e Preview e faça um novo deployment. A integração do Neon normalmente cria `DATABASE_URL` automaticamente. Nunca use o prefixo `NEXT_PUBLIC_` em credenciais ou segredos.

## Painel administrativo

O painel em `/admin` gerencia a mesma fonte de dados exibida no catálogo. Ele oferece:

- criação e edição com prévia do card;
- publicação e ocultação sem excluir o item;
- duplicação, exclusão e ordenação;
- busca, filtros e indicadores do acervo;
- imagem por URL ou ilustrações procedurais existentes;
- exportação do acervo em JSON.

Os dados ficam na tabela `public.products` do Neon. O esquema é validado na primeira consulta, os seis registros demonstrativos da versão inicial são removidos e o catálogo vazio mostra somente cards visuais de prévia. Produtos criados pelo painel persistem entre deployments da Vercel.

## Experiência 3D

A casa é criada com geometrias leves, sem depender de um arquivo externo. A timeline principal usa `createTimeline()` e `onScroll()` para controlar:

1. Apresentação da fachada e do texto.
2. Aproximação da câmera.
3. Abertura da porta pelo eixo da dobradiça.
4. Travessia da entrada.
5. Transição para o catálogo HTML.

Desktop e mobile usam enquadramentos próprios. Com `prefers-reduced-motion`, o percurso é removido e a casa aparece estaticamente com a porta aberta.

## Substituir assets

- Logo: substitua o conteúdo de `src/components/brand/BrandMark.tsx` quando o arquivo oficial chegar.
- Casa: `src/components/experience/AtelierHouseScene.tsx` concentra o modelo procedural e pode ser trocado por um `.glb` otimizado.
- Produtos: use `/admin`; os desenhos de apoio ficam em `ProductArtwork.tsx`.
- Cores: os tokens da paleta estão em `src/app/globals.css`.

## Verificação

```bash
npm run lint
npm run typecheck
npm run build
```

## Estrutura principal

```text
src/
├── app/                       # Página, metadata e estilos globais
├── components/
│   ├── brand/                 # Placeholder substituível da logo
│   ├── admin/                 # Dashboard, login e editor de produtos
│   ├── catalog/               # Grid e ilustrações de produtos
│   ├── experience/            # Cena 3D e timeline de entrada
│   └── motion/                # KineticTextReveal com Anime.js
└── lib/                       # Neon, domínio, autenticação, persistência e WhatsApp
```
