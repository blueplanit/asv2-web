const fs = require("node:fs");
const ts = require("typescript");

function loadTypeScriptModule(filePath, dependencies, compilerOptions = {}) {
    const source = fs.readFileSync(filePath, "utf8");
    const compiled = ts.transpileModule(source, {
        compilerOptions: {
            module: ts.ModuleKind.CommonJS,
            target: ts.ScriptTarget.ES2022,
            esModuleInterop: true,
            ...compilerOptions,
        },
        fileName: filePath,
    }).outputText;

    const module = { exports: {} };
    const localRequire = (id) => {
        if (id in dependencies) return dependencies[id];
        throw new Error(`Unexpected dependency in ${filePath}: ${id}`);
    };
    const evaluate = new Function("exports", "require", "module", compiled);
    evaluate(module.exports, localRequire, module);
    return module.exports;
}

module.exports = { loadTypeScriptModule };
