import fs from "node:fs";
import path from "node:path";
import ts from "/opt/nvm/versions/node/v22.16.0/lib/node_modules/typescript/lib/typescript.js";

const root = path.resolve(process.argv[2] || "apps/web");
const files = [];
function walk(dir){
  for(const entry of fs.readdirSync(dir,{withFileTypes:true})){
    const full=path.join(dir,entry.name);
    if(entry.isDirectory()) walk(full);
    else if(/\.(ts|tsx)$/.test(entry.name) && !entry.name.endsWith(".d.ts")) files.push(full);
  }
}
walk(root);
let errors=0;
for(const file of files){
  const source=fs.readFileSync(file,"utf8");
  const result=ts.transpileModule(source,{compilerOptions:{jsx:ts.JsxEmit.Preserve,target:ts.ScriptTarget.ES2022,module:ts.ModuleKind.ESNext},fileName:file,reportDiagnostics:true});
  for(const d of result.diagnostics || []){
    errors++;
    console.error(`${file}: ${ts.flattenDiagnosticMessageText(d.messageText," ")}`);
  }
}
if(errors) process.exit(1);
console.log(`Validated ${files.length} TypeScript/TSX files`);
