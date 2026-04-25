export const CHAPTER_LINKS: {
  n: 1 | 2 | 3 | 4 | 5 | 6 | 7
  path: string
  short: string
}[] = [
  { n: 1, path: '/chapters/1', short: 'Implementation plan' },
  { n: 2, path: '/chapters/2', short: 'Backend & API' },
  { n: 3, path: '/chapters/3', short: 'Frontend' },
  { n: 4, path: '/chapters/4', short: 'Data & storage' },
  { n: 5, path: '/chapters/5', short: 'System overview' },
  { n: 6, path: '/chapters/6', short: 'Navigation matrix' },
  { n: 7, path: '/chapters/7', short: 'Costs & infrastructure' },
]

export const BRAND_BY_CHAPTER: Record<1 | 2 | 3 | 4 | 5 | 6 | 7, string> = {
  1: 'Full markdown · styled tables · SVG aids',
  2: 'Laravel · routes · diagrams',
  3: 'Next.js target · nav · security',
  4: 'PostgreSQL · Redis · S3',
  5: 'Product purpose · per-Haus · modes',
  6: 'Mode × role × route',
  7: 'TEST / MVP / SCALE',
}
