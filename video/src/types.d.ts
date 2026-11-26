// Os ficheiros .txt entram como texto (ver remotion.config.ts).
declare module "*.txt" {
  const content: string;
  export default content;
}
