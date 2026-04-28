const path = require("node:path");

const ROOT = __dirname;
const ENV_FILE = path.join(ROOT, ".env");

module.exports = {
  apps: [
    {
      name: "shopee-api",
      cwd: path.join(ROOT, "artifacts/api-server"),
      script: "node",
      args: "--enable-source-maps ./dist/index.mjs",
      env_file: ENV_FILE,
      env: {
        NODE_ENV: "production",
        PORT: "8080",
      },
      instances: 1,
      autorestart: true,
      max_memory_restart: "500M",
      out_file: path.join(ROOT, "logs/shopee-api.out.log"),
      error_file: path.join(ROOT, "logs/shopee-api.err.log"),
      time: true,
    },
    {
      name: "shopee-web",
      cwd: path.join(ROOT, "artifacts/shopee-affiliate"),
      script: "pnpm",
      args: "run serve",
      env_file: ENV_FILE,
      env: {
        NODE_ENV: "production",
        PORT: "25500",
        BASE_PATH: "/",
      },
      instances: 1,
      autorestart: true,
      max_memory_restart: "400M",
      out_file: path.join(ROOT, "logs/shopee-web.out.log"),
      error_file: path.join(ROOT, "logs/shopee-web.err.log"),
      time: true,
    },
  ],
};
