import type { MetadataRoute } from "next";

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "منصة المساجد المتكاملة لإدارة الأداء",
    short_name: "المساجد المتكاملة | الأداء",
    description:
      "منصة المساجد المتكاملة لإدارة الأداء — الإدخال والمتابعة ولوحة القيادة",
    start_url: "/",
    scope: "/",
    display: "standalone",
    orientation: "portrait",
    background_color: "#0B2F38",
    theme_color: "#0B2F38",
    dir: "rtl",
    lang: "ar",
    categories: ["business", "productivity"],
    icons: [
      { src: "/icon-192.png", sizes: "192x192", type: "image/png", purpose: "any" },
      { src: "/icon-512.png", sizes: "512x512", type: "image/png", purpose: "any" },
      {
        src: "/icon-maskable-512.png",
        sizes: "512x512",
        type: "image/png",
        purpose: "maskable",
      },
    ],
  };
}
