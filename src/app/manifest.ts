import type { MetadataRoute } from "next";

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "Photobooth · Tribiz Fest 2026",
    short_name: "Photobooth",
    description:
      "Photobooth Tribiz Fest 2026: foto berurutan, bingkai seru, stiker & aksesori.",
    start_url: "/",
    display: "standalone",
    orientation: "portrait",
    background_color: "#fbf3df",
    theme_color: "#0d0e3c",
    icons: [
      { src: "/icon.svg", sizes: "any", type: "image/svg+xml", purpose: "any" },
    ],
  };
}
