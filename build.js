import esbuild from "esbuild";
import fs from "fs";
import path from "path";
import process from "process";

function build(sourceFile) {
  const outPath = path.join(
    "./build",
    sourceFile.replace(".ts", ".cjs").replace("src/", "")
  );

  console.log(`Building ${sourceFile} ~> ${outPath}`);

  return esbuild
    .build({
      entryPoints: [sourceFile],
      bundle: true,
      outfile: outPath,
      // format: "esm",
      minify: false,
      platform: "node",
      plugins: [],
      external: ["nodeplotlib"],
    })
    .catch(() => process.exit(1));
}

for (const file of fs.readdirSync("./src/tools")) {
  const filePath = path.join("./src/tools", file);
  if (filePath.endsWith(".ts")) {
    build(filePath);
  }
}

build("src/cli/main.ts");
