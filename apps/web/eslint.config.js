// ESLint (flat config): reglas recomendadas de JS, TypeScript y Vue 3. El formato lo decide Prettier
// (.prettierrc.json); eslint-config-prettier apaga las reglas de estilo que chocarían con él.
import js from '@eslint/js'
import prettier from 'eslint-config-prettier'
import vue from 'eslint-plugin-vue'
import tseslint from 'typescript-eslint'

export default tseslint.config(
  { ignores: ['dist/', 'coverage/', 'public/mockServiceWorker.js', 'src/graphql/tipos.ts'] },
  js.configs.recommended,
  ...tseslint.configs.recommended,
  ...vue.configs['flat/recommended'],
  {
    files: ['**/*.vue'],
    languageOptions: { parserOptions: { parser: tseslint.parser } },
  },
  {
    rules: {
      // TypeScript ya detecta identificadores sin declarar; esta regla da falsos positivos con globals del DOM.
      'no-undef': 'off',
      // Los nombres de las vistas son de una palabra en algunos casos de la librería (Boton, Chip, Badge).
      'vue/multi-word-component-names': 'off',
    },
  },
  prettier,
)
