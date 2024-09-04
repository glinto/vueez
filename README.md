# Vueez

Vueez is a minimalistic tool for building and serving Vue applications. It is designed with simplicity in mind, running
on vanilla Node.js and maintaining a very low dependency profile. In fact, it has only three dependencies: Vue,
TypeScript, and esbuild. Vueez itself is intended to be a development dependency and will build a self-sufficient
package. An app built with Vueez does not even require Vue in production.

### Features

Vueez supports:

- Vue apps written in TypeScript
- Single File Components (SFCs)
- Server-Side Rendering (SSR)

In development mode, Vueez can watch, rebuild, and reload server components, though it does not support hot reloading
client-side components and likely never will.

### Why use Vueez? Why is it better than established tools like Vite or Nuxt?

It's not. Vite and Nuxt are better in almost every aspect, especially in terms of completeness and reliability. If
you're satisfied with them, there's no reason to switch to Vueez.

Vueez fills a small niche for religious zero-dependency folks, who want to have full control over their apps and
appreciate lightning fast build times. If you are somewhat embarassed by heavy scaffolded projects, would rather spend
extra time coding than troubleshooting third-party tools that don’t work as expected, then Vueez might be worth a look.

## Installation

You can install Vueez using npm:

```bash
npm install --save-dev vueez
```

## Building a Vue App

To build your first Vue application, create a `build.mjs` script in the root of your project with the following content:

```javascript
import { build } from 'vueez';

build({
	devMode: process.env.NODE_ENV === 'development',
	clientOptions: {
		entryPoints: ['src/client/index.ts'],
		outfile: 'build/client/client.js'
	}
});
```

Then, run the script with `node build.mjs`, and your client app will be built every time you chage the srouce files.

Vueez does not have a configuration file or a command-line tool. These are the kinds of additional functionalities that
simply don't fit the minimalistic concept of Vueez.

### Build options

The build options should be self-explanatory, but you it is worth mentioning whatr devMode means.

In development mode:

- the output bundle will not be minified
- the build will include will include Vue devtools, options API and hydration details for debugging
- the build script will not exit, it will watch for file changes and rebuild as the code changes

### Building with specifig tsconfig settings

If you want to build with specific `tsconfig` settings, you can ioptioanlly specify the `tsconfig` file path in the
build options:

```typescript
clientOptions: {
	entryPoints: ['src/client/index.ts'],
	outfile: 'build/client/client.js',
	tsconfig: 'tsconfig.client.json'
}
```

This comes handy, if you want to have different settings for server and client builds (we will cover server bundles
later). For client builds, you probably want to work with the esm version of Vue which was created for bundlers such as esbuild.
Create a `tsconfig.client.json` file in the project root with the following content:

```json
{
	"extends": "./tsconfig.json",
	"compilerOptions": {
		"paths": {
			"vue": ["../../node_modules/vue/dist/vue.esm-bundler.js"]
		}
	}
}
```
