const { getDefaultConfig } = require('expo/metro-config');

const config = getDefaultConfig(__dirname);

// Resolve @opentelemetry/api (optional dep do Supabase) como módulo vazio
// para evitar erro no build web/metro
config.resolver.resolveRequest = (context, moduleName, platform) => {
  if (moduleName === '@opentelemetry/api') {
    return { type: 'empty' };
  }
  return context.resolveRequest(context, moduleName, platform);
};

module.exports = config;
