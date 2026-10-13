// Public reference identities only; these never select a commerce supplier variant.
const catalogueIds = {
  panchromaPla: "catalogue_panchroma_basic_black",
  polymakerPetg: "catalogue_polymaker_petg_black",
  magigooPp: "catalogue_magigoo_pp50",
  flowtechCm2: "catalogue_flowtech_cm2_04",
  flowtech: "catalogue_flowtech_m3101",
  orbiter: "catalogue_orbiter_v25",
  sliceTorque: "catalogue_slice_torque_15",
  buildtakPei: "catalogue_buildtak_pei235",
  buildtakSpatula: "catalogue_buildtak_spatula",
  fiberlogyPp: "catalogue_fiberlogy_pp750",
} as const;

export const catalogueSubjects = [
  {
    name: "Panchroma Basic PLA Black",
    pattern: /\bpanchroma\s+basic(?:\s+pla)?\b|\bca19006\b/i,
    groupKey: catalogueIds.panchromaPla,
  },
  {
    name: "Polymaker PETG New Formula Black",
    pattern: /\bpolymaker\s+(?:new\s+formula\s+)?petg\b|\bpb05001\b/i,
    groupKey: catalogueIds.polymakerPetg,
  },
  {
    name: "Magigoo PP 50 mL",
    pattern: /\bmagigoo\s+(?:glide\s+)?pp\b|\b5350583999921\b/i,
    groupKey: catalogueIds.magigooPp,
  },
  {
    name: "FlowTech CM2 M2904-04 nozzle",
    pattern: /\bflowtech\b.*\bcm2\b|\bcm2\b.*\bflowtech\b|\bm2904-04\b/i,
    groupKey: catalogueIds.flowtechCm2,
  },
  {
    name: "Micro Swiss FlowTech M3101",
    pattern: /\bflowtech\b|\bm3101\b/i,
    groupKey: catalogueIds.flowtech,
  },
  {
    name: "Orbiter v2.5",
    pattern: /\borbiter\s*v?2[.]5\b|\bldo-obt-v2[.]5\b/i,
    groupKey: catalogueIds.orbiter,
  },
  {
    name: "Slice torque wrench",
    pattern:
      /\bslice(?: engineering)?.*\b(?:torque|wrench)\b|\bp-ntw-ac-0015\b/i,
    groupKey: catalogueIds.sliceTorque,
  },
  {
    name: "BuildTak PEI 235 sheet",
    pattern: /\bbuildtak\b.*\bpei\b|\bpttapepei235\b/i,
    groupKey: catalogueIds.buildtakPei,
  },
  {
    name: "BuildTak Spatula",
    pattern: /\bbuildtak\b.*\bspatula\b|\btlspatulabt\b/i,
    groupKey: catalogueIds.buildtakSpatula,
  },
  {
    name: "Fiberlogy PP Graphite 750 g",
    pattern: /\bfiberlogy\b.*\bpp\b|\bmisc-fil-fib-078\b/i,
    groupKey: catalogueIds.fiberlogyPp,
  },
] as const;
export const catalogueGroupKeys = [
  catalogueIds.panchromaPla,
  catalogueIds.polymakerPetg,
  catalogueIds.magigooPp,
  catalogueIds.flowtechCm2,
  catalogueIds.flowtech,
  catalogueIds.orbiter,
  catalogueIds.sliceTorque,
  catalogueIds.buildtakPei,
  catalogueIds.buildtakSpatula,
  catalogueIds.fiberlogyPp,
] as const;
export type CatalogueGroupKey = (typeof catalogueGroupKeys)[number];
