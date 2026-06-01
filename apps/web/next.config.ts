import type { NextConfig } from "next";
import path from "node:path";

const nextConfig: NextConfig = {
  // 모노레포 루트를 명시해 멀티 루트(여러 lockfile) 추론 경고를 제거
  turbopack: {
    root: path.join(__dirname, "..", ".."),
  },
};

export default nextConfig;
