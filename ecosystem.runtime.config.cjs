module.exports = {
  apps: [{
    name: "copilot-runtime",
    script: "./server/index.ts",
    interpreter: "node",
    node_args: "--conditions=react-server --import tsx",
    cwd: __dirname,
    instances: 1,
    exec_mode: "fork",
    watch: false,
    max_memory_restart: "800M",
    env: {
      NODE_ENV: "production",
    },
    log_date_format: "YYYY-MM-DD HH:mm:ss Z",
    error_file: "./logs/err.log",
    out_file: "./logs/out.log",
    merge_logs: true,
  }],
};
