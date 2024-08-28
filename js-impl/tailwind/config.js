// from https://github.com/tailwindlabs/prettier-plugin-tailwindcss/blob/main/src/config.ts
const clearModule = require('clear-module')
const postcss = require('postcss')
const postcssImport = require('postcss-import')
const generateRulesFallback = require('tailwindcss/lib/lib/generateRules').generateRules 
const createContextFallback = require('tailwindcss/lib/lib/setupContextUtils').createContext
const loadConfigFallback = require('tailwindcss/loadConfig')
const resolveConfigFallback = require('tailwindcss/resolveConfig')
const { resolveIn } = require('./resolve.js')

/**
 * @param {string} baseDir 
 * @param {?string} tailwindConfigPath
 * @param {?string} entryPoint
 */
async function loadTailwindConfig(
  baseDir,
  tailwindConfigPath,
  entryPoint,
) {
  let createContext = createContextFallback
  let generateRules = generateRulesFallback
  let resolveConfig = resolveConfigFallback
  let loadConfig = loadConfigFallback
  let tailwindConfig = { content: [] }

  try {
    let pkgFile = resolveIn('tailwindcss/package.json', [baseDir])
    let pkgDir = path.dirname(pkgFile)

    try {
      let v4 = await loadV4(baseDir, pkgDir, entryPoint)
      if (v4) {
        return v4
      }
    } catch {}

    resolveConfig = require(path.join(pkgDir, 'resolveConfig'))
    createContext = require(
      path.join(pkgDir, 'lib/lib/setupContextUtils'),
    ).createContext
    generateRules = require(
      path.join(pkgDir, 'lib/lib/generateRules'),
    ).generateRules

    // Prior to `tailwindcss@3.3.0` this won't exist so we load it last
    loadConfig = require(path.join(pkgDir, 'loadConfig'))
  } catch {}

  if (tailwindConfigPath) {
    clearModule(tailwindConfigPath)
    const loadedConfig = loadConfig(tailwindConfigPath)
    tailwindConfig = loadedConfig.default ?? loadedConfig
  }

  // suppress "empty content" warning
  tailwindConfig.content = ['no-op']

  // Create the context
  let context = createContext(resolveConfig(tailwindConfig))

  return {
    context,
    generateRules,
  }
}

async function loadV4(
  baseDir,
  pkgDir,
  entryPoint,
) {
  // Import Tailwind — if this is v4 it'll have APIs we can use directly
  let pkgPath = resolveIn('tailwindcss', [baseDir])
  let tw = await import(pathToFileURL(pkgPath).toString())

  // This is not Tailwind v4
  if (!tw.__unstable__loadDesignSystem) {
    return null
  }

  // If the user doesn't define an entrypoint then we use the default theme
  entryPoint = entryPoint ?? `${pkgDir}/theme.css`

  // Resolve imports in the entrypoint to a flat CSS tree
  let css = await fs.readFile(entryPoint, 'utf-8')
  let resolveImports = postcss([postcssImport()])
  let result = await resolveImports.process(css, { from: entryPoint })

  // Load the design system and set up a compatible context object that is
  // usable by the rest of the plugin
  let design = await tw.__unstable__loadDesignSystem(result.css, {
    loadPlugin() {
      return () => {}
    },
  })

  return {
    context: {
      getClassOrder: (classList) => design.getClassOrder(classList),
    },

    // Stubs that are not needed for v4
    generateRules: () => [],
  }
}

//function getConfigPath(options: ParserOptions, baseDir: string): string | null {
  //if (options.tailwindConfig) {
    //return path.resolve(baseDir, options.tailwindConfig)
  //}

  //let configPath: string | void = undefined
  //try {
    //configPath = escalade(baseDir, (_dir, names) => {
      //if (names.includes('tailwind.config.js')) {
        //return 'tailwind.config.js'
      //}
      //if (names.includes('tailwind.config.cjs')) {
        //return 'tailwind.config.cjs'
      //}
      //if (names.includes('tailwind.config.mjs')) {
        //return 'tailwind.config.mjs'
      //}
      //if (names.includes('tailwind.config.ts')) {
        //return 'tailwind.config.ts'
      //}
    //})
  //} catch {}

  //if (configPath) {
    //return configPath
  //}

  //return null
//}

//function getEntryPoint(options: ParserOptions, baseDir: string): string | null {
  //if (options.tailwindEntryPoint) {
    //return path.resolve(baseDir, options.tailwindEntryPoint)
  //}

  //return null
//}
//
module.exports = {
  loadTailwindConfig
}
