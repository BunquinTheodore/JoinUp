const fs = require('fs');
const path = require('path');
const dotenv = require('dotenv');

const appJson = require('./app.json');

const envPath = path.join(__dirname, '.env');
const localEnv = fs.existsSync(envPath) ? dotenv.parse(fs.readFileSync(envPath)) : {};

const fallbackSupabaseUrl = 'https://jxxcrkjfsspicjrtallf.supabase.co';
const fallbackSupabaseKey = 'sb_publishable_zDSqtc-I-NZmuntxq_ULBw_Vqy7Yhoo';

function readEnv(name) {
  return process.env[name] ?? localEnv[name];
}

module.exports = ({ config } = {}) => {
  const baseConfig = config ?? appJson.expo;

  return {
    ...baseConfig,
    extra: {
      ...(baseConfig.extra ?? {}),
      supabaseUrl: readEnv('EXPO_PUBLIC_SUPABASE_URL') ?? fallbackSupabaseUrl,
      supabaseAnonKey: readEnv('EXPO_PUBLIC_SUPABASE_KEY') ?? fallbackSupabaseKey,
      EXPO_PUBLIC_SUPABASE_URL: readEnv('EXPO_PUBLIC_SUPABASE_URL') ?? fallbackSupabaseUrl,
      EXPO_PUBLIC_SUPABASE_KEY: readEnv('EXPO_PUBLIC_SUPABASE_KEY') ?? fallbackSupabaseKey,
    },
  };
};