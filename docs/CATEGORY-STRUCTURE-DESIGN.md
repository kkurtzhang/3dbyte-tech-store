# DREMC Category Structure Design

**Created:** Feb 18, 2026
**Based on:** DREMC category extraction data

---

## 🗂️ Categories (Hierarchical)

### Level 1: Main Categories
```
/
├── 3d-printers/           # Printer kits (22 products)
├── filament/              # All filament types (77+ products)
├── spare-parts/           # Replacement parts (367+ products)
├── electronics/           # Boards, displays, power (305+ products)
├── motion/                # Belts, rails, bearings, motors (150+ products)
├── build-plates/          # PEI, flex plates (102+ products)
├── tools/                 # 3D printing tools (50 products)
├── accessories/           # Misc accessories
└── upgrade-kits/          # Upgrade packages (75 products)
```

### Level 2: Subcategories

#### `/filament/`
```
/filament
├── pla/                   # PLA, PLA+, PLA-HS
├── petg/                  # PETG, PET
├── abs-asa/               # ABS, ASA
├── tpu/                   # Flexible filaments
├── specialty/             # PC, Nylon, Carbon Fiber, etc.
└── bundles/               # Filament packs
```

#### `/spare-parts/`
```
/spare-parts
├── hotends/               # Complete hotend assemblies
├── nozzles/               # All nozzle types
├── extruders/             # Complete extruder units
├── thermistors/           # Temperature sensors
├── heater-cartridges/     # Heating elements
├── heater-blocks/         # Heater blocks
├── heat-breaks/           # Heat break tubes
├── beds/                  # Bed plates
├── bed-leveling/          # BlTouch, probes
├── silicone-socks/        # Hotend socks
├── ptfe-tubes/            # Bowden tubes
└── hardware/              # Screws, nuts, bolts
```

#### `/electronics/`
```
/electronics
├── mainboards/            # Control boards
├── displays/              # LCD, touch screens
├── stepper-drivers/       # Motor drivers
├── power-supplies/        # PSUs
├── fans/                  # Cooling fans
├── sensors/               # Limit switches, probes
├── development-boards/    # Arduino, Raspberry Pi
└── wiring/                # Cables, connectors
```

#### `/motion/`
```
/motion
├── linear-rails/          # MGN rails
├── belts/                 # Timing belts
├── bearings/              # Linear bearings
├── pulleys/               # Idler pulleys
├── motors/                # Stepper motors
├── couplings/             # Shaft couplers
└── pom-wheels/            # V-slot wheels
```

#### `/build-plates/`
```
/build-plates
├── pei-plates/            # PEI spring steel
├── glass-plates/          # Glass beds
├── magnetic-systems/      # Magnetic bases
└── adhesives/             # Glue, tape
```

#### `/tools/`
```
/tools
├── hand-tools/            # Wrenches, pliers
├── measuring/             # Calipers, gauges
├── maintenance/           # Cleaning, lubrication
└── end-mills/             # CNC bits
```

---

## 📦 Collections (Curated Groups)

Collections are marketing-focused groupings that span categories:

### By Printer Brand
| Collection | Description |
|------------|-------------|
| Creality Ender 3 Series | All Ender 3 compatible products |
| Creality K1 Series | K1, K1C, K1 Max products |
| Voron Printers | Voron 0, 2.4, Trident compatible |
| Bambu Lab Compatible | X1, P1, A1 series products |
| Prusa Compatible | MK3, MK4, Mini products |
| Anycubic Products | Kobra, S1 series |

### By Use Case
| Collection | Description |
|------------|-------------|
| High-Temperature Printing | Products for 250°C+ printing |
| Abrasive Filament Ready | Hardened/ruby nozzles, etc. |
| Beginner Friendly | Easy to install, forgiving |
| Direct Drive Upgrades | DD extruders and hotends |
| Bowden Upgrades | Bowden-optimized parts |
| High Speed Printing | High-flow nozzles, etc. |

### By Brand (Featured)
| Collection | Description |
|------------|-------------|
| LDO Motors | Official LDO products |
| E3D Official | E3D hotends, nozzles |
| Bondtech | Premium extruders |
| BIGTREETECH | Mainboards, electronics |
| Micro Swiss | Upgrade parts |

---

## 🏷️ Tags (Flexible Labels)

### Tag Category 1: Printer Compatibility
**Format:** `{brand}-{model}`

| Tag | Description |
|-----|-------------|
| `creality-ender-3` | Ender 3, Pro, V2 |
| `creality-ender-3-s1` | Ender 3 S1, Pro, Plus |
| `creality-ender-3-v3` | V3, V3 SE, V3 KE |
| `creality-k1` | K1, K1C, K1 Max |
| `creality-cr-10` | CR-10 series |
| `voron-0` | Voron 0, 0.1, 0.2 |
| `voron-2.4` | Voron 2.4 |
| `voron-trident` | Voron Trident |
| `bambu-x1` | X1, X1C, X1E |
| `bambu-p1` | P1P, P1S |
| `bambu-a1` | A1, A1 Mini |
| `prusa-mk3` | MK3, MK3S+ |
| `prusa-mk4` | MK4 |
| `anycubic-kobra` | Kobra 2, 3 |
| `sovol-sv06` | SV06, SV07 |
| `qidi-q1` | Q1 Pro, Plus4 |

### Tag Category 2: Material Type
**Format:** `material-{type}`

| Tag | Description |
|-----|-------------|
| `material-brass` | Brass nozzles, etc. |
| `material-stainless` | Stainless steel |
| `material-hardened-steel` | Hardened steel nozzles |
| `material-ruby` | Ruby-tipped nozzles |
| `material-tungsten` | Tungsten carbide |
| `material-pcd` | Polycrystalline diamond |
| `material-aluminum` | Aluminum parts |
| `material-carbon-fiber` | CF reinforced |

### Tag Category 3: Feature Tags
**Format:** `feature-{name}`

| Tag | Description |
|-----|-------------|
| `feature-high-flow` | High flow rate |
| `feature-all-metal` | All-metal hotend |
| `feature-direct-drive` | Direct drive compatible |
| `feature-bowden` | Bowden compatible |
| `feature-volcano` | Volcano compatible |
| `feature-revo` | E3D Revo system |
| `feature-reprap` | RepRap/V6 compatible |
| `feature-mk8` | MK8 style |
| `feature-umbilical` | Umbilical/PTFE tube |
| `feature-can-bus` | CAN bus enabled |
| `feature-ams-compatible` | Bambu AMS compatible |
| `feature-cfs-compatible` | Creality CFS compatible |

### Tag Category 4: Application Tags
**Format:** `app-{name}`

| Tag | Description |
|-----|-------------|
| `app-high-temp` | For 250°C+ printing |
| `app-abrasive` | For abrasive filaments |
| `app-flexible` | For TPU/flexible |
| `app-rapid-prototyping` | Fast printing |
| `app-production` | Production-grade |
| `app-enclosed` | For enclosed printers |
| `app-outdoor` | UV/weather resistant |

### Tag Category 5: Form Factor Tags
**Format:** `form-{name}`

| Tag | Description |
|-----|-------------|
| `form-v6` | V6/E3D form factor |
| `form-volcano` | Volcano form factor |
| `form-super-volcano` | Super Volcano |
| `form-revo-micro` | Revo Micro |
| `form-revo-six` | Revo Six |
| `form-mk8` | MK8 form factor |
| `form-creality-proprietary` | Creality specific |

### Tag Category 6: Size Tags
**Format:** `size-{dimension}`

| Tag | Description |
|-----|-------------|
| `size-0.2mm` | 0.2mm nozzle |
| `size-0.4mm` | 0.4mm nozzle |
| `size-0.6mm` | 0.6mm nozzle |
| `size-0.8mm` | 0.8mm nozzle |
| `size-1.0mm` | 1.0mm nozzle |
| `size-1.75mm` | 1.75mm filament |
| `size-2.85mm` | 2.85mm filament |

### Tag Category 7: Voltage Tags
**Format:** `voltage-{v}`

| Tag | Description |
|-----|-------------|
| `voltage-12v` | 12V systems |
| `voltage-24v` | 24V systems |
| `voltage-110v` | 110V AC |
| `voltage-220v` | 220V AC |

---

## 🎨 Implementation in Medusa

### Category Structure (product_categories)
```typescript
// Example: Create hotend category
{
  name: "Hotends",
  handle: "hotends",
  parent_category_id: "spare-parts", // nested under spare-parts
  metadata: {
    description: "Complete hotend assemblies and kits"
  }
}
```

### Collection Structure (product_collections)
```typescript
// Example: Voron Compatible collection
{
  title: "Voron Compatible",
  handle: "voron-compatible",
  metadata: {
    description: "Products compatible with Voron printers",
    image: "/collections/voron.jpg"
  }
}
```

### Brand Structure (custom entity)
```typescript
// Example: LDO brand
{
  name: "LDO",
  handle: "ldo",
  website: "https://ldomotors.com",
  logo: "/brands/ldo.png",
  description: "Premium stepper motors and printer kits"
}
```

### Tag Application (product_tags)
```typescript
// Example: Product with multiple tags
{
  tags: [
    { value: "creality-ender-3" },
    { value: "material-hardened-steel" },
    { value: "feature-high-flow" },
    { value: "app-abrasive" },
    { value: "size-0.4mm" }
  ]
}
```

---

## 📊 Summary Stats

| Structure | Count |
|-----------|-------|
| Main Categories | 9 |
| Subcategories | 40+ |
| Collections | 20+ |
| Tag Categories | 7 |
| Individual Tags | 100+ |
| Brands to Import | 57 |

---

## ✅ Next Steps

1. **Approve** this structure
2. **Create categories** in Medusa admin
3. **Create collections** in Medusa
4. **Create brands** as custom entity
5. **Define tags** in product schema
6. **Begin product import** with proper tagging

---

*Designed by @Architect - 3DByte Tech Store*
