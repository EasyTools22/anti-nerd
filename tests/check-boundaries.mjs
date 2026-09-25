import fs from "node:fs";
import path from "node:path";
import assert from "node:assert/strict";
import ts from "typescript";
const root = process.cwd();
const walk = (dir) =>
  fs
    .readdirSync(dir, { withFileTypes: true })
    .flatMap((entry) =>
      entry.isDirectory()
        ? walk(path.join(dir, entry.name))
        : [path.join(dir, entry.name)],
    );
const files = ["app", "components", "lib", "types"]
  .flatMap((dir) => walk(path.join(root, dir)))
  .filter((file) => /\.tsx?$/.test(file));
const parsed = new Map(
  files.map((file) => [
    file,
    ts.createSourceFile(
      file,
      fs.readFileSync(file, "utf8"),
      ts.ScriptTarget.Latest,
      true,
    ),
  ]),
);
function dependencies(file) {
  const result = [];
  function visit(node) {
    if (
      (ts.isImportDeclaration(node) || ts.isExportDeclaration(node)) &&
      node.moduleSpecifier &&
      ts.isStringLiteral(node.moduleSpecifier)
    ) {
      if (node.isTypeOnly || node.importClause?.isTypeOnly) return;
      const bindings = node.importClause?.namedBindings;
      if (
        bindings &&
        ts.isNamedImports(bindings) &&
        !node.importClause.name &&
        bindings.elements.every((e) => e.isTypeOnly)
      )
        return;
      result.push(node.moduleSpecifier.text);
    }
    if (
      ts.isCallExpression(node) &&
      node.expression.kind === ts.SyntaxKind.ImportKeyword &&
      ts.isStringLiteral(node.arguments[0])
    )
      result.push(node.arguments[0].text);
    ts.forEachChild(node, visit);
  }
  visit(parsed.get(file));
  return result;
}
function resolve(from, id) {
  const base = id.startsWith("@/")
    ? path.join(root, id.slice(2))
    : id.startsWith(".")
      ? path.resolve(path.dirname(from), id)
      : null;
  return (
    base &&
    [
      base + ".ts",
      base + ".tsx",
      path.join(base, "index.ts"),
      path.join(base, "index.tsx"),
    ].find((p) => parsed.has(p))
  );
}
for (const file of files.filter((f) => f.includes("/lib/server/")))
  assert.ok(
    dependencies(file).includes("server-only"),
    `Missing server-only marker: ${file}`,
  );
let clients = 0;
for (const [file, source] of parsed) {
  if (
    !source.statements.some(
      (s) =>
        ts.isExpressionStatement(s) &&
        ts.isStringLiteral(s.expression) &&
        s.expression.text === "use client",
    )
  )
    continue;
  clients++;
  const seen = new Set();
  function check(current) {
    if (seen.has(current)) return;
    seen.add(current);
    // Next compiles module-level Server Actions to client references, not bundled server code.
    // The production bundle scan below independently verifies the boundary.
    if (
      parsed
        .get(current)
        .statements.some(
          (s) =>
            ts.isExpressionStatement(s) &&
            ts.isStringLiteral(s.expression) &&
            s.expression.text === "use server",
        )
    )
      return;
    assert.ok(
      !current.includes("/lib/server/"),
      `Client ${file} reaches server module ${current}`,
    );
    for (const id of dependencies(current)) {
      assert.notEqual(id, "server-only", `Client ${file} reaches server-only`);
      const target = resolve(current, id);
      if (target) check(target);
    }
  }
  check(file);
}
const compiled = path.join(root, ".next/static");
assert.ok(
  fs.existsSync(compiled),
  "Run npm run build before checking the production bundles.",
);
const forbidden = [
  "TEST_ONLY_SHOPIFY_SECRET",
  "X-Shopify-Access-Token",
  "SHOPIFY_CLIENT_SECRET",
  "SHOPIFY_VAULT_KEYS",
  "shopify_operation",
  "TEST_ONLY_ACCESS_TOKEN",
  "TEST_ONLY_REFRESH_TOKEN",
  "encryptedPayload",
  "claimApproval(",
  "SUPABASE_SECRET_KEY",
  "CREDENTIAL_KMS_KEY_ID",
  "consume_rate_limit",
];
let bundles = 0;
for (const file of walk(compiled).filter((f) => f.endsWith(".js"))) {
  const text = fs.readFileSync(file, "utf8");
  for (const marker of forbidden)
    assert.ok(
      !text.includes(marker),
      `Server marker ${marker} leaked into ${file}`,
    );
  bundles++;
}
console.log(
  `Boundary checks passed: ${clients} client roots, server-only markers and ${bundles} production JS files; no server credential/transport markers found.`,
);
