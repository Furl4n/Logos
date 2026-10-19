# Frontend — Logos

Base em React, TypeScript, Vite, Tailwind CSS e React Router.

## Executar

```bash
cd frontend
npm ci
npm run dev
```

Use `npm run build` para compilar a aplicação.

## Organização

- `src/routes`: configuração centralizada das rotas e provedor do roteador.
- `src/components/ui`: botão, ícones, modal e seletor compartilhados.
- `src/styles/base.css`: Tailwind, tema visual e estilos globais.
- `src/App.tsx`: entrada do roteador na aplicação.
- `src/main.tsx`: inicialização do React e importação dos estilos.

A estrutura segue a organização do frontend do ControlaPET. As telas e os
componentes de domínio serão adicionados em pastas próprias.
