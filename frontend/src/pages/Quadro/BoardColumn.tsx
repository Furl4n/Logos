import { useEffect, useRef } from 'react'
import type { IncidentFilters } from '../../interfaces/Api'
import { useInfiniteIncidentList } from '../../hooks/useIncidentApi'
import IncidentCard from '../../components/incident/IncidentCard'
import { toIncident } from '../../service/incidentMapper'

const pageSize = 20

export default function BoardColumn({ title, assignment, visible, onSelect }: { title: string; assignment: NonNullable<IncidentFilters['assignment']>; visible: boolean; onSelect: (id: string) => void }) {
  const query = useInfiniteIncidentList({ assignment, status: 'ACTIVE', timeOrder: 'newest', pageSize })
  const total = query.data?.pages[0]?.total ?? 0
  const items = [...new Map(query.data?.pages.flatMap(page => page.items).map(item => [item.id, item])).values()]
  const scroll = useRef<HTMLDivElement>(null)
  const sentinel = useRef<HTMLDivElement>(null)
  const { hasNextPage, isFetching, isError, fetchNextPage } = query
  useEffect(() => {
    if (!hasNextPage || isFetching || isError || !sentinel.current) return
    const observer = new IntersectionObserver(entries => {
      if (entries.some(entry => entry.isIntersecting)) void fetchNextPage()
    }, { root: scroll.current, rootMargin: '160px' })
    observer.observe(sentinel.current)
    return () => observer.disconnect()
  }, [hasNextPage, isFetching, isError, fetchNextPage, visible])
  return <section id={`board-${assignment}`} aria-label={title} className={`min-h-0 min-w-0 flex-col rounded-lg border border-line bg-canvas p-3 ${visible ? 'flex' : 'hidden min-[1100px]:flex'}`} aria-busy={query.isFetching}>
    <header className="mb-3 flex shrink-0 items-center justify-between gap-2 px-1">
      <h2 className="text-base font-medium">{title}</h2>
      {query.data && <span className="rounded bg-surface px-2 py-0.5 text-xs font-medium tabular-nums text-muted">{total}</span>}
    </header>
    <div ref={scroll} className="board-scroll min-h-0 flex-1 space-y-2 overflow-y-auto overscroll-contain pr-1">
      {items.map(item => <IncidentCard key={item.id} showPriority incident={toIncident(item)} onSelect={incident => onSelect(incident.id)} />)}
      {query.isPending && <p role="status" className="py-8 text-center text-sm text-muted">Carregando…</p>}
      {query.isError && <div role="alert" className="rounded-md border border-danger-line bg-surface p-3 text-sm"><p>Não foi possível carregar os atendimentos.</p><button type="button" onClick={() => void (query.isFetchNextPageError ? query.fetchNextPage() : query.refetch())} className="mt-2 font-medium text-brand-dark underline">Tentar novamente</button></div>}
      {!query.isPending && !query.isError && !items.length && <p className="rounded-md border border-dashed border-line bg-surface px-3 py-8 text-center text-sm text-muted">Nenhuma ocorrência</p>}
      {query.isFetchingNextPage && <p role="status" className="py-3 text-center text-sm text-muted">Carregando…</p>}
      <div ref={sentinel} aria-hidden="true" className="h-px" />
    </div>
  </section>
}
