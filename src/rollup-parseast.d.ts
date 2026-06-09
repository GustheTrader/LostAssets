declare module "rollup/parseAst" {
  export function parseAst(code: string): any;
  export function parseAstAsync(code: string): Promise<any>;
}
