import tseslint from 'typescript-eslint';
import tsParser from '@typescript-eslint/parser';
import tsPlugin from '@typescript-eslint/eslint-plugin';
import eslint from '@eslint/js';
import globals from 'globals';
import eslintConfigPrettier from 'eslint-config-prettier';

const tsRulesCombined = tseslint.configs.recommended.reduce(
	(acc, config) => {
		acc.rules = {
			...acc.rules,
			...config.rules
		};
		return acc;
	},
	{ rules: {} }
).rules;

const jsGlobals = {
	...globals.es2022,
	...globals.browser,
	...globals.node,
	// @ts-expect-error @types/eslint seems to be incomplete
	document: 'readonly',
	// @ts-expect-error @types/eslint seems to be incomplete
	navigator: 'readonly',
	// @ts-expect-error @types/eslint seems to be incomplete
	window: 'readonly'
};

export default tseslint.config(
	// These configuration objects, do not contain file pattern matching, so they would apply to all other config objects
	eslint.configs.recommended,

	// This will suppress ESLint problems about rules that are handled by Prettier
	// This will also affect all files types, as this config object does not contain file pattern matching either
	{
		rules: {
			...eslintConfigPrettier.rules
		}
	},

	// JS specific rules
	{
		files: ['**/*.js'],

		languageOptions: {
			parserOptions: {
				ecmaVersion: 2022
			},
			globals: jsGlobals
		},

		plugins: {}
	},

	// TS specific rules
	{
		files: ['**/*.ts', '**/*.mts', '**/*.cts'],

		languageOptions: {
			parser: tsParser, // Use TypeScript parser for TS files
			ecmaVersion: 2022,
			globals: jsGlobals
		},
		plugins: {
			'@typescript-eslint': tsPlugin
		},
		rules: tsRulesCombined
	}
);
