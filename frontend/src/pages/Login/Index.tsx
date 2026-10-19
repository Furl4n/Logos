import LoginForm from './LoginForm'

export default function Login() {
  return (
    <main className="grid min-h-dvh lg:grid-cols-[1fr_1.15fr]">
      <section aria-label="Logos — gestão de transporte" className="flex flex-col bg-brand-soft px-7 py-8 sm:px-12 lg:px-16 lg:py-12">
        <div aria-label="Logos" className="flex items-center gap-2.5">
          <span aria-hidden="true" className="grid size-9 place-items-center rounded-lg bg-brand text-3xl font-semibold text-white">↗</span>
          <span className="text-4xl font-semibold tracking-tighter">logos<span className="text-brand">.</span></span>
        </div>
        <div className="my-auto hidden max-w-md py-16 lg:block">
          <span className="mb-5 block text-sm font-semibold tracking-widest text-brand-dark">CENTRAL DE OPERAÇÕES</span>
          <h2 className="text-5xl leading-tight font-semibold tracking-tight">Cada ocorrência merece atenção.</h2>
          <p className="mt-6 max-w-sm text-lg leading-relaxed text-muted">Acompanhe incidentes, organize prioridades e mantenha sua operação no caminho.</p>
          <div aria-hidden="true" className="mt-10 h-1 w-12 rounded-full bg-brand" />
        </div>
        <p className="hidden text-sm text-muted lg:block">Gestão de transporte, do registro à resolução.</p>
      </section>
      <section aria-labelledby="login-title" className="flex items-center justify-center px-7 py-12 sm:px-12 lg:py-16">
        <div className="w-full max-w-sm">
          <header className="mb-8">
            <h1 id="login-title" className="text-3xl font-semibold tracking-tight">Acesse sua conta</h1>
            <p className="mt-2 text-base leading-relaxed text-muted">Entre para acompanhar as ocorrências da operação.</p>
          </header>
          <LoginForm />
        </div>
      </section>
    </main>
  )
}
