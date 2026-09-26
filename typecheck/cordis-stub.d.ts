/**
 * Typecheck-only stub for the private `@deepseek-ai/cordis` package (not on
 * public npm), so `npm run typecheck` stays self-contained in CI. `DreamSkinCtx`
 * only extends Context and adds its own members, which merges cleanly with
 * this permissive shape.
 */
declare module "@deepseek-ai/cordis" {
  export interface Context {
    [key: string]: unknown;
  }
}
