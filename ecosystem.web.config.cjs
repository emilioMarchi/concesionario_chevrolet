module.exports = {
  apps: [{
    name: "web-ia",
    script: "server.js",
    cwd: __dirname,
    instances: 1,
    exec_mode: "fork",
    watch: false,
    max_memory_restart: "500M",
    env: {
      NODE_ENV: "production",
      PORT: 3000,
      HOSTNAME: "127.0.0.1",
    },
    log_date_format: "YYYY-MM-DD HH:mm:ss Z",
    error_file: "./logs/err.log",
    out_file: "./logs/out.log",
    merge_logs: true,
  }],
};
