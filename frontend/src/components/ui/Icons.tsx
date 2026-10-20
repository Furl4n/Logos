export default function Icon({ name, size = 18 }: { name: string; size?: number }) {
  const paths: Record<string, string> = { grid:'M3 3h7v7H3z M14 3h7v7h-7z M3 14h7v7H3z M14 14h7v7h-7z', search:'M21 21l-5-5 M18 10a8 8 0 1 1-16 0 8 8 0 0 1 16 0', arrow:'m9 5 7 7-7 7', plus:'M12 5v14 M5 12h14', clock:'M21 12a9 9 0 1 1-18 0 9 9 0 0 1 18 0 M12 7v5l3 2', alert:'m12 3 10 18H2Z M12 9v5 M12 17v.1', check:'M21 12a9 9 0 1 1-18 0 9 9 0 0 1 18 0 M8 12l3 3 5-6', truck:'M3 6h12v11H3z M15 10h4l3 4v3h-7 M9 18a2 2 0 1 1-4 0 2 2 0 0 1 4 0 M20 18a2 2 0 1 1-4 0 2 2 0 0 1 4 0', close:'m6 6 12 12 M6 18 18 6' }
  const isArrow = name === 'arrow'
  return <svg width={isArrow ? size * 11 / 24 : size} height={size} viewBox={isArrow ? '7 0 11 24' : '0 0 24 24'} fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d={paths[name]}/></svg>
}
