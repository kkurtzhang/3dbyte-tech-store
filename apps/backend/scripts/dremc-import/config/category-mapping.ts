/**
 * DREMC → 3DByte Category Mapping
 *
 * Maps DREMC collections to our category structure
 */

export const CATEGORY_MAPPING = {
  // Top-level categories
  "3d-printers": {
    name: "3D Printers",
    description: "Complete 3D printer kits and systems",
    handle: "3d-printers",
    dremcCollections: ["3d-printer-kits"],
    isActive: true,
  },

  filament: {
    name: "Filament",
    description: "3D printing filaments for all applications",
    handle: "filament",
    dremcCollections: ["3d-consumable", "abs-asa-filament-1-75mm"],
    isActive: true,
    children: {
      pla: { name: "PLA", handle: "pla" },
      petg: { name: "PETG", handle: "petg" },
      "abs-asa": { name: "ABS & ASA", handle: "abs-asa" },
      tpu: { name: "TPU", handle: "tpu" },
      specialty: { name: "Specialty", handle: "specialty" },
    },
  },

  "spare-parts": {
    name: "Spare Parts",
    description: "Replacement and upgrade parts for 3D printers",
    handle: "spare-parts",
    dremcCollections: [
      "3d-printer-parts",
      "3d-printer-extruder-spares",
      "3d-printer-wearing-parts",
    ],
    isActive: true,
    children: {
      hotends: {
        name: "Hotends",
        handle: "hotends",
        dremcCollections: ["3d-printer-hotend-accessories", "3d-printer-heat-breaks"],
      },
      nozzles: {
        name: "Nozzles",
        handle: "nozzles",
        dremcCollections: ["3d-printers-nozzles"],
      },
      extruders: {
        name: "Extruders",
        handle: "extruders",
        dremcCollections: ["3d-printer-extruder"],
      },
      thermistors: {
        name: "Thermistors",
        handle: "thermistors",
        dremcCollections: ["3d-printer-thermistor"],
      },
      "heater-cartridges": {
        name: "Heater Cartridges",
        handle: "heater-cartridges",
        dremcCollections: ["3d-printer-heater-cartridge"],
      },
      beds: {
        name: "Beds",
        handle: "beds",
        dremcCollections: ["3d-printer-bed"],
      },
    },
  },

  electronics: {
    name: "Electronics",
    description: "Mainboards, displays, and electronic components",
    handle: "electronics",
    dremcCollections: ["3d-printer-electronics", "3d-printer-mainboard", "3d-printer-displays"],
    isActive: true,
    children: {
      mainboards: { name: "Mainboards", handle: "mainboards" },
      displays: { name: "Displays", handle: "displays" },
      "stepper-drivers": { name: "Stepper Drivers", handle: "stepper-drivers" },
      "power-supplies": { name: "Power Supplies", handle: "power-supplies" },
    },
  },

  motion: {
    name: "Motion",
    description: "Belts, rails, bearings, and motors",
    handle: "motion",
    dremcCollections: [
      "3d-printer-bearing-pom-wheels",
      "3d-printer-fans",
    ],
    isActive: true,
    children: {
      "linear-rails": { name: "Linear Rails", handle: "linear-rails" },
      belts: { name: "Belts", handle: "belts" },
      bearings: { name: "Bearings", handle: "bearings" },
      motors: { name: "Motors", handle: "motors" },
    },
  },

  "build-plates": {
    name: "Build Plates",
    description: "PEI plates, flex plates, and build surfaces",
    handle: "build-plates",
    dremcCollections: ["3d-printer-bed-surface-accessories"],
    isActive: true,
  },

  tools: {
    name: "Tools",
    description: "3D printing tools and accessories",
    handle: "tools",
    dremcCollections: ["3d-printer-tools-and-general-spares"],
    isActive: true,
  },

  accessories: {
    name: "Accessories",
    description: "Miscellaneous 3D printing accessories",
    handle: "accessories",
    dremcCollections: [
      "3d-printer-accessories-and-consumable",
      "3d-printer-silicon-socks",
      "3d-printer-heater-block",
      "3d-printer-bed-probe",
      "3d-printer-toolheads",
    ],
    isActive: true,
  },
} as const;

export type CategoryHandle = keyof typeof CATEGORY_MAPPING;

/**
 * Map a DREMC collection handle to our category
 */
export function mapDremcCollectionToCategory(dremcHandle: string): string | null {
  for (const [categoryHandle, category] of Object.entries(CATEGORY_MAPPING)) {
    if (category.dremcCollections?.includes(dremcHandle)) {
      return categoryHandle;
    }

    // Check children
    if (category.children) {
      for (const [childHandle, child] of Object.entries(category.children)) {
        if (child.dremcCollections?.includes(dremcHandle)) {
          return `${categoryHandle}/${childHandle}`;
        }
      }
    }
  }

  // Default to accessories if no match
  return "accessories";
}
