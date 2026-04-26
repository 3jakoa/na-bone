const fs = require("fs");
const path = require("path");

const appJson = require("./app.json");

function readEnvFile(filePath) {
  if (!fs.existsSync(filePath)) {
    return {};
  }

  return fs
    .readFileSync(filePath, "utf8")
    .split(/\r?\n/)
    .reduce((env, line) => {
      const trimmed = line.trim();

      if (!trimmed || trimmed.startsWith("#")) {
        return env;
      }

      const separatorIndex = trimmed.indexOf("=");

      if (separatorIndex === -1) {
        return env;
      }

      const key = trimmed.slice(0, separatorIndex).trim();
      const rawValue = trimmed.slice(separatorIndex + 1).trim();
      env[key] = rawValue.replace(/^["']|["']$/g, "");

      return env;
    }, {});
}

const sharedEnv = process.env.BONI_BUDDY_MOBILE_ENV_FILE
  ? readEnvFile(process.env.BONI_BUDDY_MOBILE_ENV_FILE)
  : {};
const localEnv = readEnvFile(path.join(__dirname, ".env"));

function getEnv(name) {
  return sharedEnv[name] ?? process.env[name] ?? localEnv[name];
}

module.exports = {
  ...appJson.expo,
  extra: {
    ...appJson.expo.extra,
    supabaseUrl: getEnv("EXPO_PUBLIC_SUPABASE_URL"),
    supabaseAnonKey: getEnv("EXPO_PUBLIC_SUPABASE_ANON_KEY"),
  },
};
