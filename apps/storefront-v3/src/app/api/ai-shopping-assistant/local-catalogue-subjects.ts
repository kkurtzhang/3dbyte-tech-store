// Public reference identities only; these never select a commerce supplier variant.
export const catalogueSubjects = [
  {
    name: "Micro Swiss FlowTech M3101",
    pattern: /\bflowtech\b|\bm3101\b/i,
    groupKey: "catalogue_flowtech_m3101",
  },
  {
    name: "Orbiter v2.5",
    pattern: /\borbiter\s*v?2[.]5\b|\bldo-obt-v2[.]5\b/i,
    groupKey: "catalogue_orbiter_v25",
  },
  {
    name: "Slice torque wrench",
    pattern:
      /\bslice(?: engineering)?.*\b(?:torque|wrench)\b|\bp-ntw-ac-0015\b/i,
    groupKey: "catalogue_slice_torque_15",
  },
  {
    name: "BuildTak PEI 235 sheet",
    pattern: /\bbuildtak\b.*\bpei\b|\bpttapepei235\b/i,
    groupKey: "catalogue_buildtak_pei235",
  },
  {
    name: "BuildTak Spatula",
    pattern: /\bbuildtak\b.*\bspatula\b|\btlspatulabt\b/i,
    groupKey: "catalogue_buildtak_spatula",
  },
  {
    name: "Fiberlogy PP Graphite 750 g",
    pattern: /\bfiberlogy\b.*\bpp\b|\bmisc-fil-fib-078\b/i,
    groupKey: "catalogue_fiberlogy_pp750",
  },
] as const;
export const catalogueGroupKeys = [
  "catalogue_flowtech_m3101",
  "catalogue_orbiter_v25",
  "catalogue_slice_torque_15",
  "catalogue_buildtak_pei235",
  "catalogue_buildtak_spatula",
  "catalogue_fiberlogy_pp750",
] as const;
export type CatalogueGroupKey = (typeof catalogueGroupKeys)[number];
