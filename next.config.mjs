import fs from "fs";
import path from "path";

const isStubMode = process.env.STUB_MODE !== "false";
const ensureStub = (pkg) => {
  if (!isStubMode) return null;
  const exists = fs.existsSync(path.join(process.cwd(), "node_modules", pkg));
  return exists ? null : path.join(process.cwd(), "stubs", `${pkg.replace(/[\/\\]/g, "-")}.ts`);
};

/** @type {import('next').NextConfig} */
const nextConfig = {
  images: {
    unoptimized: true,
  },
  typescript: {},
  webpack: (config) => {
    const aliases = {
      "next-intl": ensureStub("next-intl"),
      "react-hook-form": ensureStub("react-hook-form"),
      "@hookform/resolvers/zod": ensureStub("hookform-resolvers-zod"),
      zod: ensureStub("zod"),
      "@radix-ui/react-slot": ensureStub("@radix-ui/react-slot"),
      "class-variance-authority": ensureStub("class-variance-authority"),
      "@radix-ui/react-checkbox": ensureStub("@radix-ui/react-checkbox"),
      "lucide-react": ensureStub("lucide-react"),
      "@radix-ui/react-tabs": ensureStub("@radix-ui/react-tabs"),
      "@radix-ui/react-accordion": ensureStub("@radix-ui/react-accordion"),
      "@radix-ui/react-toast": ensureStub("@radix-ui/react-toast"),
      clsx: ensureStub("clsx"),
      "tailwind-merge": ensureStub("tailwind-merge"),
      "@aws-sdk/client-s3": ensureStub("@aws-sdk/client-s3"),
      "@aws-sdk/s3-request-presigner": ensureStub("@aws-sdk/s3-request-presigner"),
      "@aws-sdk/client-ses": ensureStub("@aws-sdk/client-ses"),
      "@aws-sdk/client-textract": ensureStub("@aws-sdk/client-textract"),
      stripe: ensureStub("stripe"),
      "@prisma/client": ensureStub("@prisma/client"),
    };

    config.resolve.alias = config.resolve.alias || {};
    Object.entries(aliases).forEach(([key, target]) => {
      if (target) {
        config.resolve.alias[key] = target;
      }
    });
    return config;
  },
};

export default nextConfig;
