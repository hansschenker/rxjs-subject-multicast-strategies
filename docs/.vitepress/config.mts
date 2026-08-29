import { defineConfig } from 'vitepress';

export default defineConfig({
  title: 'RxJS Subject Multicast Strategies',
  description:
    'Every RxJS multicasting strategy from the multicast era to the configurable share() of RxJS 7 — mechanics, runnable samples, and the migration map.',
  base: '/rxjs-subject-multicast-strategies/', // GitHub Pages project site
  // Raw research notes live alongside the site source but are not pages:
  srcExclude: ['**/notebooklm-chat-*.md', '**/All_notes_*.md', '**/Demystifying_*.md'],
  themeConfig: {
    nav: [
      { text: 'Guide', link: '/guide/fundamentals' },
      { text: 'Migration', link: '/guide/migration' },
    ],
    sidebar: [
      {
        text: 'Foundations',
        items: [
          { text: 'The Multicasting Problem', link: '/guide/fundamentals' },
          { text: 'The Subject Router Algebra', link: '/guide/router-algebra' },
        ],
      },
      {
        text: 'The Classic Era (RxJS 4–6)',
        items: [
          { text: 'multicast & ConnectableObservable', link: '/guide/multicast' },
          { text: 'The publish Family', link: '/guide/publish-variants' },
          { text: 'share()', link: '/guide/share-classic' },
          { text: 'shareReplay()', link: '/guide/sharereplay' },
        ],
      },
      {
        text: 'Cheat Sheets',
        items: [
          { text: 'Refactoring Cheat Sheet', link: '/guide/cheatsheet-refactoring' },
          { text: 'Router Algebra Reference', link: '/guide/cheatsheet-router-algebra' },
        ],
      },
      {
        text: 'The Modern Era (RxJS 7)',
        items: [
          { text: 'connectable()', link: '/guide/connectable' },
          { text: 'connect()', link: '/guide/connect' },
          { text: 'share() with Config', link: '/guide/share-config' },
          { text: 'Reset Flags Playground', link: '/guide/playground' },
          { text: 'Migration Guide', link: '/guide/migration' },
        ],
      },
    ],
    outline: 'deep',
    socialLinks: [
      { icon: 'github', link: 'https://github.com/hansschenker/rxjs-subject-multicast-strategies' },
    ],
  },
});
