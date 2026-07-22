import type { NextConfig } from "next";
import type { RemotePattern } from "next/dist/shared/lib/image-config";

function buildUploadRemotePattern(
  urlValue: string | undefined,
): RemotePattern | undefined {
  if (!urlValue) {
    return undefined;
  }

  try {
    const parsedUrl = new URL(urlValue);
    const protocol =
      parsedUrl.protocol === "https:" ? "https" : parsedUrl.protocol === "http:" ? "http" : undefined;

    if (!protocol) {
      return undefined;
    }

    return {
      protocol,
      hostname: parsedUrl.hostname,
      port: parsedUrl.port,
      pathname: "/uploads/**",
    };
  } catch {
    return undefined;
  }
}

const uploadRemotePatterns: RemotePattern[] = [
  buildUploadRemotePattern(process.env.NEXT_PUBLIC_API_BASE_URL),
  buildUploadRemotePattern("http://localhost:4000"),
].filter((pattern): pattern is RemotePattern => Boolean(pattern));

const nextConfig: NextConfig = {
  eslint: {
    ignoreDuringBuilds: true,
  },
  images: {
    remotePatterns: uploadRemotePatterns,
  },
};

export default nextConfig;
