module.exports = {
  apps: [{
    name: 'minesweeper-game',
    script: 'npm',
    args: 'start',
    cwd: process.cwd(),
    env: {
      NODE_ENV: 'production',
      PORT: 3000,
      PRIVATE_KEY: process.env.PRIVATE_KEY || 'your_deployment_private_key_here',
      SERVER_PRIVATE_KEY: process.env.SERVER_PRIVATE_KEY || 'your_server_private_key_here',
      NEXTAUTH_URL: process.env.NEXTAUTH_URL || 'http://localhost:3000',
      NEXT_PUBLIC_MINESWEEPER_CONTRACT: process.env.NEXT_PUBLIC_MINESWEEPER_CONTRACT || '0x4bE377d2bf2b3412b6eBF1b179314fd90adf9C27',
      NEXT_PUBLIC_FMH_TOKEN_CONTRACT: process.env.NEXT_PUBLIC_FMH_TOKEN_CONTRACT || '0x83aB028468ef2a5495Cc7964B3266437956231E2',
      NEXT_PUBLIC_CHAIN_ID: process.env.NEXT_PUBLIC_CHAIN_ID || '10143',
      NEXT_PUBLIC_NETWORK_NAME: process.env.NEXT_PUBLIC_NETWORK_NAME || 'Monad Testnet',
      MONAD_TESTNET_RPC: process.env.MONAD_TESTNET_RPC || 'https://testnet-rpc.monad.xyz',
      MONAD_RPC_URL: process.env.MONAD_RPC_URL || 'https://testnet-rpc.monad.xyz',
      DISABLE_ESLINT: process.env.DISABLE_ESLINT || 'true',
      GENERATE_SOURCEMAP: process.env.GENERATE_SOURCEMAP || 'false',
      NEXT_TELEMETRY_DISABLED: process.env.NEXT_TELEMETRY_DISABLED || '1'
    },
    instances: 1,
    autorestart: true,
    watch: false,
    max_memory_restart: '1G',
    error_file: './logs/err.log',
    out_file: './logs/out.log',
    log_file: './logs/combined.log',
    time: true,
    log_date_format: 'YYYY-MM-DD HH:mm:ss Z'
  }]
};