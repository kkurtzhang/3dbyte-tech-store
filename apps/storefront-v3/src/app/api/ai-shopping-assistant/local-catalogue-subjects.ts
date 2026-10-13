// Public reference identities only; these never select a commerce supplier variant.
const catalogueIds = {
  flowtech: "catalogue_flowtech_m3101",
  orbiter: "catalogue_orbiter_v25",
  sliceTorque: "catalogue_slice_torque_15",
  buildtakPei: "catalogue_buildtak_pei235",
  buildtakSpatula: "catalogue_buildtak_spatula",
  fiberlogyPp: "catalogue_fiberlogy_pp750",
} as const;

export const catalogueSubjects = [
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
  catalogueIds.flowtech,
  catalogueIds.orbiter,
  catalogueIds.sliceTorque,
  catalogueIds.buildtakPei,
  catalogueIds.buildtakSpatula,
  catalogueIds.fiberlogyPp,
] as const;
export type CatalogueGroupKey = (typeof catalogueGroupKeys)[number];
