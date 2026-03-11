import { readFile } from "fs/promises";
import path from "path";

export type ParsedSrdItem = {
  name: string;
  description?: string;
  category: string;
  price: number;
  priceLabel: string;
  importedSource: string;
  sortOrder: number;
};

const HEADER_LINES = new Set([
  "护甲",
  "价格",
  "护甲等级（AC）",
  "力量",
  "隐匿",
  "重量",
  "名称",
  "伤害",
  "词条",
]);

function normalizeLine(line: string) {
  return line.replace(/\u3000/g, " ").replace(/\s+/g, " ").trim();
}

function isPriceLine(line: string) {
  return /^\d[\d,]*(?:\/\d+)?\s*(gp|sp|cp)$/i.test(line);
}

function isTableTitle(line: string) {
  return line.endsWith("表Armor") || line.endsWith("表Weapons");
}

function getSectionFromTitle(line: string) {
  if (line.endsWith("表Armor")) {
    return "护甲";
  }

  if (line.endsWith("表Weapons")) {
    return "武器";
  }

  return "规则书";
}

function splitBilingualText(text: string) {
  const cleaned = normalizeLine(text);
  const asciiIndex = cleaned.search(/[A-Za-z]/);

  if (asciiIndex <= 0) {
    return { primary: cleaned, secondary: undefined };
  }

  const primary = cleaned.slice(0, asciiIndex).trim();
  const secondary = cleaned.slice(asciiIndex).trim();
  return {
    primary: primary || cleaned,
    secondary: secondary || undefined,
  };
}

function normalizeCategory(line: string) {
  const normalized = splitBilingualText(line).primary.replace(/[：:]+$/, "").trim();
  return normalized || "规则书";
}

function parsePriceValue(priceLabel: string) {
  const match = priceLabel.match(/^([\d,]+)(?:\/\d+)?\s*(gp|sp|cp)$/i);

  if (!match) {
    return 0;
  }

  const rawValue = Number(match[1].replace(/,/g, ""));
  const unit = match[2].toLowerCase();

  if (unit === "gp") {
    return rawValue;
  }

  return 0;
}

export function parseSrdMarkdown(markdown: string) {
  const lines = markdown
    .split(/\r?\n/)
    .map(normalizeLine)
    .filter(Boolean);

  const items: ParsedSrdItem[] = [];
  let currentSection = "规则书";
  let currentCategory = "规则书";
  let sortOrder = 1;

  for (let index = 0; index < lines.length; ) {
    const line = lines[index];
    const nextLine = lines[index + 1];

    if (isTableTitle(line)) {
      currentSection = getSectionFromTitle(line);
      currentCategory = currentSection;
      index += 1;
      continue;
    }

    if (HEADER_LINES.has(line)) {
      index += 1;
      continue;
    }

    if (nextLine && isPriceLine(nextLine)) {
      const { primary, secondary } = splitBilingualText(line);
      const priceLabel = nextLine;
      const details: string[] = [];
      let cursor = index + 2;

      while (cursor < lines.length) {
        const currentLine = lines[cursor];
        const followingLine = lines[cursor + 1];
        const afterFollowingLine = lines[cursor + 2];

        if (isTableTitle(currentLine) || HEADER_LINES.has(currentLine)) {
          break;
        }

        if (
          splitBilingualText(currentLine).secondary &&
          followingLine &&
          afterFollowingLine &&
          !isPriceLine(followingLine) &&
          isPriceLine(afterFollowingLine)
        ) {
          break;
        }

        if (followingLine && isPriceLine(followingLine)) {
          break;
        }

        if (!followingLine && !isPriceLine(currentLine)) {
          details.push(currentLine);
          cursor += 1;
          break;
        }

        if (!isPriceLine(currentLine)) {
          details.push(currentLine);
        }

        cursor += 1;
      }

      if (
        currentSection === "武器" &&
        currentCategory.includes("武器") &&
        details.length > 0 &&
        !/[dD]\d|穿刺|挥砍|钝击|酸|火焰|雷|毒|治疗|特殊|\+/.test(details[0]) &&
        /磅|－/.test(details[0])
      ) {
        currentSection = "用品";
        currentCategory = "冒险用品";
      }

      const compactDetails = [secondary ? `英文 ${secondary}` : null, ...details]
        .filter((value): value is string => Boolean(value))
        .map(normalizeLine);

      items.push({
        name: primary,
        description: compactDetails.length > 0 ? compactDetails.join("；") : undefined,
        category: currentCategory,
        price: parsePriceValue(priceLabel),
        priceLabel,
        importedSource: "SRD",
        sortOrder,
      });

      sortOrder += 1;
      index = cursor;
      continue;
    }

    currentCategory = normalizeCategory(line);
    index += 1;
  }

  return items;
}

export async function loadSrdItemsFromFile() {
  const srdPath = path.join(process.cwd(), "srd.md");
  try {
    const markdown = await readFile(srdPath, "utf8");
    return parseSrdMarkdown(markdown);
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code === "ENOENT") {
      return [];
    }

    throw error;
  }
}
