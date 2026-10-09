// Enforces ADR-0001 module boundaries for apps/api:
//  - a file in src/modules/<a>/ may import another module <b> only via src/modules/<b>/index.ts
//  - files in src/core/ may not import from src/modules/
import path from 'node:path';

const rule = {
  meta: {
    type: 'problem',
    docs: { description: 'Restrict imports across API module boundaries' },
    schema: [],
    messages: {
      deepImport:
        "Module '{{from}}' must import module '{{to}}' through its index.ts facade, not '{{source}}'.",
      coreImportsModule: "core/ must not depend on modules/ (imported '{{source}}').",
    },
  },
  create(context) {
    const filename = context.filename;
    const srcIdx = filename.lastIndexOf(`${path.sep}src${path.sep}`);
    if (srcIdx === -1) return {};
    const srcRoot = filename.slice(0, srcIdx + 5);
    const modulesRoot = path.join(srcRoot, 'modules');
    const coreRoot = path.join(srcRoot, 'core');

    const moduleOf = (p) => {
      const rel = path.relative(modulesRoot, p);
      if (rel.startsWith('..') || path.isAbsolute(rel)) return null;
      return rel.split(path.sep)[0] ?? null;
    };

    const check = (node, source) => {
      if (typeof source !== 'string' || !source.startsWith('.')) return;
      const target = path.resolve(path.dirname(filename), source);
      const targetModule = moduleOf(target);
      if (!targetModule) return;

      if (!path.relative(coreRoot, filename).startsWith('..')) {
        context.report({ node, messageId: 'coreImportsModule', data: { source } });
        return;
      }
      const fromModule = moduleOf(filename);
      if (!fromModule || fromModule === targetModule) return;
      const facade = path.join(modulesRoot, targetModule);
      if (target === facade || target === path.join(facade, 'index')) return;
      context.report({
        node,
        messageId: 'deepImport',
        data: { from: fromModule, to: targetModule, source },
      });
    };

    return {
      ImportDeclaration: (node) => check(node.source, node.source.value),
      ExportNamedDeclaration: (node) => node.source && check(node.source, node.source.value),
      ExportAllDeclaration: (node) => check(node.source, node.source.value),
    };
  },
};

export const moduleBoundariesPlugin = { rules: { 'module-boundaries': rule } };
