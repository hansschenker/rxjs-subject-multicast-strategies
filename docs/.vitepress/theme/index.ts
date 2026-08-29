import DefaultTheme from 'vitepress/theme';
import type { Theme } from 'vitepress';
import ResetFlagsPlayground from './components/ResetFlagsPlayground.vue';

const theme: Theme = {
  extends: DefaultTheme,
  enhanceApp({ app }) {
    app.component('ResetFlagsPlayground', ResetFlagsPlayground);
  },
};

export default theme;
