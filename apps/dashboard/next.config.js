const nextjsMonorepoWorkaroundPlugin = require("@prisma/nextjs-monorepo-workaround-plugin");

module.exports = {
  images: {
    domains: ["cryptologos.cc"],
  },
  webpack: (config, { isServer }) => {
    if (isServer) {
      config.plugins = [
        ...config.plugins,
        new nextjsMonorepoWorkaroundPlugin.PrismaPlugin(),
      ];
    }

    return config;
  },
};
