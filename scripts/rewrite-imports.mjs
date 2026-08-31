import path from 'node:path';
import fs from 'node:fs';
import { fileURLToPath } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');

function walk(dir, out = []) {
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    if (entry.name === 'node_modules' || entry.name === 'dist') continue;
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) walk(full, out);
    else if (/\.(tsx?)$/.test(entry.name)) out.push(full);
  }
  return out;
}

function resolveToAlias(file, importPath) {
  const fileDir = path.dirname(file);
  if (!importPath.startsWith('.')) return null;

  const resolved = path.normalize(path.join(fileDir, importPath));
  const sharedSrc = path.join(root, 'packages/shared/src');
  const agentSrc = path.join(root, 'apps/agent/src');
  const adminSrc = path.join(root, 'apps/admin/src');

  if (resolved.startsWith(sharedSrc)) {
    const rel = path.relative(sharedSrc, resolved).replace(/\\/g, '/');
    return `@vkyc/shared/${rel}`;
  }

  if (resolved.startsWith(agentSrc)) {
    const rel = path.relative(agentSrc, resolved).replace(/\\/g, '/');
    return `@agent/${rel}`;
  }

  if (resolved.startsWith(adminSrc)) {
    const rel = path.relative(adminSrc, resolved).replace(/\\/g, '/');
    return `@admin/${rel}`;
  }

  return null;
}

function rewriteFile(file) {
  let content = fs.readFileSync(file, 'utf8');
  const original = content;

  content = content.replace(/from ['"](\.[^'"]+)['"]/g, (match, importPath) => {
    const alias = resolveToAlias(file, importPath);
    if (!alias) return match;
    if (
      file.includes(`${path.sep}packages${path.sep}shared${path.sep}`) &&
      alias.startsWith('@vkyc/shared/')
    ) {
      const fileDir = path.dirname(file);
      const sharedSrc = path.join(root, 'packages/shared/src');
      const resolved = path.normalize(path.join(fileDir, importPath));
      if (resolved.startsWith(sharedSrc)) return match;
    }
    return `from '${alias}'`;
  });

  if (content !== original) {
    fs.writeFileSync(file, content);
    console.log('updated', path.relative(root, file));
  }
}

const targets = [
  path.join(root, 'packages/shared/src'),
  path.join(root, 'apps/agent/src'),
  path.join(root, 'apps/admin/src'),
];

for (const dir of targets) {
  if (!fs.existsSync(dir)) continue;
  for (const file of walk(dir)) rewriteFile(file);
}
