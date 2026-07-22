import {
  ChurchRole,
  Department,
  Family,
  Unit,
} from "../../shared/database/models/index.js";
import {
  captureRequirements,
  ministryPlacementCatalog,
  type MinistryPlacementKind,
} from "./options.data.js";

type OptionItem = {
  id: string;
  label: string;
  type?: MinistryPlacementKind;
};

function mergePlacementOptions(
  dynamicOptions: OptionItem[],
  fallbackOptions: ReadonlyArray<{
    id: string;
    label: string;
    kind: MinistryPlacementKind;
  }>,
  type: MinistryPlacementKind,
) {
  const mergedOptions = new Map<string, OptionItem>();

  for (const item of fallbackOptions) {
    mergedOptions.set(item.id, {
      id: item.id,
      label: item.label,
      type: item.kind,
    });
  }

  for (const item of dynamicOptions) {
    mergedOptions.set(item.id, {
      id: item.id,
      label: item.label,
      type,
    });
  }

  return [...mergedOptions.values()].sort((left, right) =>
    left.label.localeCompare(right.label),
  );
}

export async function getRegistrationMeta() {
  const [families, departments, units, churchRoles] = await Promise.all([
    Family.findAll({ order: [["familyName", "ASC"]] }),
    Department.findAll({ order: [["departmentName", "ASC"]] }),
    Unit.findAll({ order: [["unitName", "ASC"]] }),
    ChurchRole.findAll({ order: [["roleName", "ASC"]] }),
  ]);

  const departmentOptions = mergePlacementOptions(
    departments.map<OptionItem>((item) => ({
      id: item.departmentId,
      label: item.departmentName,
    })),
    ministryPlacementCatalog.filter((item) => item.kind === "department"),
    "department",
  );
  const unitOptions = mergePlacementOptions(
    units.map<OptionItem>((item) => ({
      id: item.unitId,
      label: item.unitName,
    })),
    ministryPlacementCatalog.filter((item) => item.kind === "unit"),
    "unit",
  );

  return {
    families: families.map<OptionItem>((item) => ({
      id: item.familyId,
      label: item.familyName,
    })),
    departments: departmentOptions,
    units: unitOptions,
    departmentUnits: [...departmentOptions, ...unitOptions].sort((left, right) =>
      left.label.localeCompare(right.label),
    ),
    churchRoles: churchRoles.map<OptionItem>((item) => ({
      id: item.churchRoleId,
      label: item.roleName,
    })),
    captureRequirements,
  };
}
