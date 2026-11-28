import { defineTheme } from '@astryxdesign/core/theme';
import { neutralTheme } from '@astryxdesign/theme-neutral';

const FALLBACKS = '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Arial, sans-serif';

/**
 * VocabLearning theme: Astryx neutral with VocabLearning's purple as the single
 * accent, Be Vietnam Pro (full Vietnamese diacritics) and friendlier corners.
 * Tuples are [light, dark].
 */
export const vocabTheme = defineTheme({
    name: 'vocab',
    extends: neutralTheme,
    typography: {
        scale: { base: 15, ratio: 1.2 },
        body: { family: 'Be Vietnam Pro', fallbacks: FALLBACKS },
        heading: { family: 'Be Vietnam Pro', fallbacks: FALLBACKS, weights: { 1: 'bold', 2: 'bold', 3: 'bold', 4: 'bold' } },
    },
    tokens: {
        // Crisp cool-slate studio canvas (Light); deep plum-ink night surface (Dark).
        '--color-background-body': ['#f5f7fb', '#0e0a19'],
        '--color-background-surface': ['#ffffff', '#1b1330'],
        '--color-background-card': ['#ffffff', '#1b1330'],
        '--color-background-popover': ['#ffffff', '#241a42'],
        '--color-background-muted': ['#f2eef9', '#171129'],
        '--color-background-inverted': ['#1d1038', '#2a1f4a'],
        '--color-overlay': ['rgba(17, 10, 34, 0.52)', 'rgba(6, 4, 14, 0.78)'],
        '--color-on-dark': ['#ffffff', '#f5f1ff'],
        '--color-on-light': ['#1d1038', '#f5f1ff'],

        '--color-accent': ['#6d28d9', '#a78bfa'],
        '--color-accent-muted': ['#efe9fb', '#2a1f4a'],
        '--color-text-accent': ['#6d28d9', '#c4b5fd'],
        '--color-icon-accent': ['#6d28d9', '#a78bfa'],
        '--color-on-accent': ['#ffffff', '#130926'],

        '--color-text-primary': ['#1d1038', '#f5f1ff'],
        '--color-text-secondary': ['#4a3b6e', '#beb1de'],
        '--color-border': ['#e2dce8', '#33274f'],
        '--color-border-emphasized': ['#c9bfd8', '#4d3d73'],

        '--radius-inner': '0.5rem',
        '--radius-element': '0.75rem',
        '--radius-container': '1.125rem',
        '--radius-page': '1.75rem',
    },
    components: {
        // Learners study on phones: primary actions get a full 44px target.
        button: { 'size:lg': { height: '44px', paddingInline: '20px' } },
        'text-input': { 'size:lg': { height: '44px' } },
        selector: { 'size:lg': { height: '44px' } },
    },
});
