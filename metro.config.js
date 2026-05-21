const { getDefaultConfig } = require("expo/metro-config");
const { withNativeWind } = require("nativewind/metro");
const path = require("path");

const config = getDefaultConfig(__dirname);

// Replace @opentelemetry/api with shim to avoid Hermes dynamic import() issues
const opentelemetryShim = path.resolve(__dirname, "src", "lib", "opentelemetry-shim.ts");
config.resolver = {
  ...config.resolver,
  resolveRequest: (context, moduleName, platform) => {
    if (moduleName === "@opentelemetry/api") {
      return { filePath: opentelemetryShim, type: "sourceFile" };
    }
    return context.resolveRequest(context, moduleName, platform);
  },
};

module.exports = withNativeWind(config, {
  input: path.resolve(__dirname, "src", "styles", "global.css"),
});
