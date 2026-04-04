import { fileURLToPath } from "url";
import { dirname } from "path";
import { chdir } from "process";
import { createRequire } from "module";

const __dirname = dirname(fileURLToPath(import.meta.url));
chdir(__dirname);
process.argv = [process.argv[0], process.argv[1], "dev", "--webpack"];

const require = createRequire(import.meta.url);
require(__dirname + "/node_modules/next/dist/bin/next");
