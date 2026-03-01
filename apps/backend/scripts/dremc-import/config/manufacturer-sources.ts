/**
 * Manufacturer Image Sources
 *
 * Maps brand names to their official websites for image sourcing
 */

export const MANUFACTURER_SOURCES: Record<string, {
  website: string;
  code: string;  // SKU prefix code
  imageStrategy: 'scrape' | 'api' | 'manual';
}> = {
  // Top manufacturers
  "Creality": {
    website: "https://www.creality.com",
    code: "CRE",
    imageStrategy: "scrape",
  },
  "LDO": {
    website: "https://www.ldomotors.com",
    code: "LDO",
    imageStrategy: "scrape",
  },
  "Trianglelab": {
    website: "https://trianglelab.net",
    code: "TRI",
    imageStrategy: "scrape",
  },
  "Micro Swiss": {
    website: "https://www.micro-swiss.com",
    code: "MCS",
    imageStrategy: "scrape",
  },
  "Fysetc": {
    website: "https://www.fysetc.com",
    code: "FYS",
    imageStrategy: "scrape",
  },
  "E3D": {
    website: "https://e3d-online.com",
    code: "E3D",
    imageStrategy: "scrape",
  },
  "BIGTREETECH": {
    website: "https://bigtree-tech.com",
    code: "BTT",
    imageStrategy: "scrape",
  },
  "Bondtech": {
    website: "https://bondtech.se",
    code: "BND",
    imageStrategy: "scrape",
  },
  "Phaetus": {
    website: "https://phaetus.com",
    code: "PHA",
    imageStrategy: "scrape",
  },
  "Sovol": {
    website: "https://sovol3d.com",
    code: "SOV",
    imageStrategy: "scrape",
  },
  "Anycubic": {
    website: "https://www.anycubic.com",
    code: "ANY",
    imageStrategy: "scrape",
  },
  "Slice Engineering": {
    website: "https://sliceengineering.com",
    code: "SLE",
    imageStrategy: "scrape",
  },
  "Gates": {
    website: "https://www.gates.com",
    code: "GAT",
    imageStrategy: "manual",
  },
  "CNC Kitchen": {
    website: "https://www.cnckitchen.com",
    code: "CNK",
    imageStrategy: "scrape",
  },
  "Polymaker": {
    website: "https://polymaker.com",
    code: "PLY",
    imageStrategy: "scrape",
  },
  "QIDI TECH": {
    website: "https://qidi3d.com",
    code: "QID",
    imageStrategy: "scrape",
  },
  "Duet3D": {
    website: "https://duet3d.com",
    code: "DU3",
    imageStrategy: "scrape",
  },
  "Mellow3D": {
    website: "https://mellow.li",
    code: "MLW",
    imageStrategy: "scrape",
  },
  "Fabreeko": {
    website: "https://www.fabreeko.com",
    code: "FBK",
    imageStrategy: "scrape",
  },
  "Flashforge": {
    website: "https://www.flashforge.com",
    code: "FLF",
    imageStrategy: "scrape",
  },
  "Artillery 3D": {
    website: "https://artillery3d.com",
    code: "ART",
    imageStrategy: "scrape",
  },
  "GDSTIME": {
    website: "https://gdstime.com",
    code: "GDT",
    imageStrategy: "scrape",
  },
  "West3D": {
    website: "https://west3d.com",
    code: "W3D",
    imageStrategy: "scrape",
  },
  "Mean Well": {
    website: "https://www.meanwell.com",
    code: "MNW",
    imageStrategy: "manual",
  },
};

/**
 * Get manufacturer code for SKU generation
 */
export function getManufacturerCode(brandName: string): string {
  const source = MANUFACTURER_SOURCES[brandName];
  if (source) return source.code;

  // Generate fallback code from name
  return brandName
    .toUpperCase()
    .replace(/[^A-Z]/g, '')
    .slice(0, 3);
}

/**
 * Check if brand should be imported
 */
export function shouldImportBrand(brandName: string): boolean {
  const excludedBrands = ['DREMC', 'DREMC-STORE'];
  return !excludedBrands.includes(brandName);
}
