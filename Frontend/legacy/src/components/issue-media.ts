/**
 * Picks the picture shown on an issue card.
 *
 * Order of preference:
 *   1. the issue's first image attachment - a real photo of the real problem
 *   2. a stock image matched on keywords in the category name and title
 *   3. nothing, and the caller falls back to the grey placeholder icon
 *
 * The stock images are matched on KEYWORDS, not on exact category names,
 * because categories are created by admins at runtime and there is no reason
 * they would happen to match these five filenames.
 *
 * Note on step 1: the issue list endpoint does not return attachments, so on a
 * list card this effectively always lands on step 2. The attachment path is
 * what runs in the detail modal, and on cards if the list ever starts carrying
 * attachments.
 */
import crosswalkUrl from "../../assets/images/cards/crosswalk.jpg";
import potholeUrl from "../../assets/images/cards/pothole.webp";
import streetlightUrl from "../../assets/images/cards/streetlight.jpg";
import trafficLightUrl from "../../assets/images/cards/traffic-light.webp";
import waterLeakUrl from "../../assets/images/cards/water-leak.webp";
import type { Attachment, Issue } from "../models";

interface StockImage {
  /** Matched against the lower-cased category name and title. */
  keywords: string[];
  url: string;
  alt: string;
  /** Drives the existing issue-card-media--* style hook. */
  style: string;
}

/** First match wins, so the more specific entries come first. */
const STOCK_IMAGES: StockImage[] = [
  {
    keywords: ["water", "leak", "pipe", "drain", "sewage", "flood"],
    url: waterLeakUrl,
    alt: "Water leaking across a road surface",
    style: "water"
  },
  {
    keywords: ["traffic light", "traffic signal", "signal", "junction"],
    url: trafficLightUrl,
    alt: "A traffic signal at an intersection",
    style: "night"
  },
  {
    keywords: ["crosswalk", "crossing", "pedestrian", "zebra", "sidewalk", "pavement"],
    url: crosswalkUrl,
    alt: "A pedestrian crossing",
    style: "road"
  },
  {
    keywords: ["street light", "streetlight", "lamp", "lighting", "light"],
    url: streetlightUrl,
    alt: "A street light at dusk",
    style: "night"
  },
  {
    keywords: ["pothole", "road", "asphalt", "pavement damage", "street"],
    url: potholeUrl,
    alt: "A pothole in a road surface",
    style: "road"
  }
];

export interface IssueImage {
  url: string;
  alt: string;
  style: string;
  previewLabel: string;
}

function firstImageAttachment(attachments: Attachment[] | undefined): Attachment | null {
  if (!Array.isArray(attachments)) {
    return null;
  }
  return attachments.find((attachment) => attachment.fileType === "Image") ?? null;
}

function matchStockImage(haystack: string): StockImage | null {
  const text = haystack.toLocaleLowerCase();
  return STOCK_IMAGES.find((image) => image.keywords.some((word) => text.includes(word))) ?? null;
}

/** Returns null when there is nothing better than the placeholder. */
export function resolveIssueImage(issue: Issue): IssueImage | null {
  // An explicit ui.imageUrl always wins - it is how a page can override.
  if (issue.ui?.imageUrl) {
    return {
      url: issue.ui.imageUrl,
      alt: issue.ui.imageAlt || issue.title,
      style: issue.ui.imageStyle || "document",
      previewLabel: issue.ui.previewLabel || "Issue photo"
    };
  }

  const attachment = firstImageAttachment(issue.attachments);
  if (attachment?.fileUrl) {
    return {
      url: attachment.fileUrl,
      alt: `Photo attached to ${issue.title}`,
      style: "document",
      previewLabel: "Citizen photo"
    };
  }

  const stock = matchStockImage(`${issue.categoryName ?? ""} ${issue.title ?? ""}`);
  if (stock) {
    return {
      url: stock.url,
      alt: stock.alt,
      style: stock.style,
      // Labelled so nobody mistakes a stock photo for the citizen's own.
      previewLabel: "Category image"
    };
  }

  return null;
}
