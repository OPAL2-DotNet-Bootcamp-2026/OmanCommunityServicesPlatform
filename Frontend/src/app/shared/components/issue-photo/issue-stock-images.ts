/**
 * Chooses the picture on an issue card:
 *   1. ui.imageUrl, when a page set one (the loaded photo attachment)
 *   2. the first image attachment - the citizen's own photo
 *   3. a stock image matched on keywords in the category and title
 *   4. nothing: the card shows the grey placeholder icon
 * Stock images match KEYWORDS, not exact category names, because admins create
 * categories at runtime.
 */
import { type Issue } from "../../../core/models/issue.model";

export interface IssueImage {
  url: string;
  alt: string;
  /** issue-card-media--{style}: road / water / night / document. */
  style: string;
  previewLabel: string;
}

interface StockImage {
  keywords: string[];
  url: string;
  alt: string;
  style: string;
}

/** First match wins, so the more specific entries come first. Files are in public/images/cards. */
const STOCK_IMAGES: StockImage[] = [
  { keywords: ["water", "leak", "pipe", "drain", "sewage", "flood"], url: "/images/cards/water-leak.webp", alt: "Water leaking across a road surface", style: "water" },
  { keywords: ["traffic light", "traffic signal", "signal", "junction"], url: "/images/cards/traffic-light.webp", alt: "A traffic signal at an intersection", style: "night" },
  { keywords: ["crosswalk", "crossing", "pedestrian", "zebra", "sidewalk", "pavement"], url: "/images/cards/crosswalk.jpg", alt: "A pedestrian crossing", style: "road" },
  { keywords: ["street light", "streetlight", "lamp", "lighting", "light"], url: "/images/cards/streetlight.jpg", alt: "A street light at dusk", style: "night" },
  { keywords: ["pothole", "road", "asphalt", "pavement damage", "street"], url: "/images/cards/pothole.webp", alt: "A pothole in a road surface", style: "road" }
];

/** Null when there is nothing better than the placeholder. skipUrl drops an image that failed to load. */
export function resolveIssueImage(issue: Issue, skipUrl = ""): IssueImage | null {
  if (issue.ui?.imageUrl && issue.ui.imageUrl !== skipUrl) {
    return {
      url: issue.ui.imageUrl,
      alt: issue.ui.imageAlt || issue.title,
      style: issue.ui.imageStyle || "document",
      previewLabel: issue.ui.previewLabel || "Issue photo"
    };
  }

  const attachment = issue.attachments?.find((item) => item.fileType === "Image" && item.fileUrl !== skipUrl);
  if (attachment?.fileUrl) {
    return { url: attachment.fileUrl, alt: `Photo attached to ${issue.title}`, style: "document", previewLabel: "Citizen photo" };
  }

  const text = `${issue.categoryName ?? ""} ${issue.title ?? ""}`.toLocaleLowerCase();
  const stock = STOCK_IMAGES.find((image) => image.keywords.some((word) => text.includes(word)));
  // Labelled "Category image" so nobody mistakes a stock photo for the citizen's own.
  return stock ? { url: stock.url, alt: stock.alt, style: stock.style, previewLabel: "Category image" } : null;
}
