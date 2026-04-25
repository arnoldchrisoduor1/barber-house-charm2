import chapter01 from './content/chapter-01.html?raw'
import chapter02 from './content/chapter-02.html?raw'
import chapter03 from './content/chapter-03.html?raw'
import chapter04 from './content/chapter-04.html?raw'
import chapter05 from './content/chapter-05.html?raw'
import chapter06 from './content/chapter-06.html?raw'
import chapter07 from './content/chapter-07.html?raw'
import homeInner from './content/home.html?raw'
import unifiedBody from './content/unified-body.html?raw'

export const homeHeroInnerHtml = homeInner
export const unifiedBodyHtml = unifiedBody

export const chapterHtml: Record<string, string> = {
  '1': chapter01,
  '2': chapter02,
  '3': chapter03,
  '4': chapter04,
  '5': chapter05,
  '6': chapter06,
  '7': chapter07,
}

export const chapterTitles: Record<string, string> = {
  '1': 'Chapter 1 — Implementation plan',
  '2': 'Chapter 2 — Backend & API',
  '3': 'Chapter 3 — Frontend',
  '4': 'Chapter 4 — Data & storage',
  '5': 'Chapter 5 — System overview',
  '6': 'Chapter 6 — Navigation matrix',
  '7': 'Chapter 7 — Costs & infrastructure',
}
