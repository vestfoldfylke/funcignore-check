import { execSync } from "node:child_process";
import { type Dirent, appendFileSync, cpSync, existsSync, readdirSync, readFileSync, writeFileSync, rmSync } from "node:fs";
import { basename, join, relative, sep } from "node:path";
import ignore, { type Ignore } from "ignore";

const getRelativePathByDirent = (entry: Dirent, root: string) =>
  getRelativePathByString(join(entry.parentPath, entry.name), root);

const getRelativePathByString = (source: string, root: string) =>
  // ignore expects a path with "/" as separator, so the split is needed to support Windows
  relative(root, source).split(sep).join("/");

const projectDirectory: string = process.cwd();

const servicePath: string | undefined = process.env.FULL_PATH_TO_SERVICE;
if (!servicePath) {
  throw new Error("Missing FULL_PATH_TO_SERVICE environment variable.");
}

const serviceName: string = basename(servicePath);

const funcignorePath: string = join(servicePath, ".funcignore");
if (!existsSync(funcignorePath)) {
  throw new Error(`.funcignore path does not exist: ${funcignorePath}`);
}
console.log(`Doing .funcignore check for service at path: ${servicePath}`);

const showRules: boolean = process.env.SHOW_RULES && process.env.SHOW_RULES.trim().toLowerCase() === "true" || false;
const showOutputInConsole: boolean = process.env.SHOW_OUTPUT_IN_CONSOLE && process.env.SHOW_OUTPUT_IN_CONSOLE.trim().toLowerCase() === "true" || false;
const showOutputInFolder: boolean = process.env.SHOW_OUTPUT_IN_FOLDER && process.env.SHOW_OUTPUT_IN_FOLDER.trim().toLowerCase() === "true" || false;
const funcignoreOutputFolder: string = showOutputInFolder && join(projectDirectory, `funcignore-output-${serviceName}`) || "";
if (!showOutputInConsole && !showOutputInFolder) {
  throw new Error("One or both of SHOW_OUTPUT_IN_CONSOLE and SHOW_OUTPUT_IN_FOLDER needs to be configured.");
}

console.log("funcignoreOutputFolder:", funcignoreOutputFolder);

const rules: string[] = readFileSync(funcignorePath, "utf8")
  .split("\n")
  .filter((line: string) => line.trim() !== "");

if (showRules) {
  console.log(".funcignore rules:", rules, "\n");
}

const ignoreEngine: Ignore = ignore().add(rules);

if (showOutputInConsole) {
  const consoleOutputFile: string = `./${serviceName}_console_output.json`;

  if (existsSync(consoleOutputFile)) {
    console.log(`\nRemoving ${consoleOutputFile}\n`);
    rmSync(consoleOutputFile)
  }

  const removed: string[] = readdirSync(servicePath, { recursive: true, withFileTypes: true })
    .filter((entry: Dirent) => entry.isFile())
    .map((entry: Dirent) => getRelativePathByDirent(entry, servicePath))
    .filter((p: string) => ignoreEngine.ignores(p))
    .sort();

  writeFileSync(consoleOutputFile, JSON.stringify(removed, null, 2), "utf8");

  removed.forEach((p: string) => console.log(p));

  console.log(`\n${removed.length} files/folders would have been removed`);
}

if (showOutputInFolder) {
  if (funcignoreOutputFolder === "") {
    throw new Error("Missing OUTPUT_FOLDER environment variable.");
  }

  const folderOutputFile: string = `./${serviceName}_folder_output.txt`;

  console.log("");

  if (existsSync(funcignoreOutputFolder)) {
    console.log("Removing", funcignoreOutputFolder);
    rmSync(funcignoreOutputFolder, { recursive: true, force: true });
  }

  if (existsSync(folderOutputFile)) {
    console.log(`Removing ${folderOutputFile}`);
    rmSync(folderOutputFile)
  }

  appendFileSync(folderOutputFile, "Files removed via cpSync\n-------------------------------------------------------------------------------------------------------------------------\n\n", "utf8");

  cpSync(servicePath, funcignoreOutputFolder, {
    recursive: true,
    filter: (source: string) => {
      const relativePath: string = getRelativePathByString(source, servicePath);
      if (relativePath === "") {
        return true;
      }

      const ignored: boolean = ignoreEngine.ignores(relativePath);
      if (ignored) {
        appendFileSync(folderOutputFile, `${relativePath}\n`, "utf8");
      }

      return !ignored;
    }
  });

  process.chdir(funcignoreOutputFolder);
  console.log(`Installing production dependencies in directory ${process.cwd()}`);
  execSync("npm ci --omit=dev --ignore-scripts --min-release-age=0");
  process.chdir(projectDirectory);

  appendFileSync(folderOutputFile, "\nFiles removed via rmSync after npm i\n-------------------------------------------------------------------------------------------------------------------------\n\n", "utf8");

  const outputFilesToRemove: string[] = readdirSync(funcignoreOutputFolder, { recursive: true, withFileTypes: true })
    .filter((entry: Dirent) => entry.isFile())
    .map((entry: Dirent) => getRelativePathByDirent(entry, funcignoreOutputFolder))
    .filter((p: string) => ignoreEngine.ignores(p));

  outputFilesToRemove.forEach((file: string) => {
    rmSync(join(funcignoreOutputFolder, file))
    appendFileSync(folderOutputFile, `${file}\n`, "utf8");
  });
}
