import { ChurchRole, Department, Family, Unit, } from "../../shared/database/models/index.js";
import { captureRequirements, ministryPlacementCatalog, } from "./options.data.js";
function mergePlacementOptions(dynamicOptions, fallbackOptions, type) {
    const mergedOptions = new Map();
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
    return [...mergedOptions.values()].sort((left, right) => left.label.localeCompare(right.label));
}
export async function getRegistrationMeta() {
    const [families, departments, units, churchRoles] = await Promise.all([
        Family.findAll({ order: [["familyName", "ASC"]] }),
        Department.findAll({ order: [["departmentName", "ASC"]] }),
        Unit.findAll({ order: [["unitName", "ASC"]] }),
        ChurchRole.findAll({ order: [["roleName", "ASC"]] }),
    ]);
    const departmentOptions = mergePlacementOptions(departments.map((item) => ({
        id: item.departmentId,
        label: item.departmentName,
    })), ministryPlacementCatalog.filter((item) => item.kind === "department"), "department");
    const unitOptions = mergePlacementOptions(units.map((item) => ({
        id: item.unitId,
        label: item.unitName,
    })), ministryPlacementCatalog.filter((item) => item.kind === "unit"), "unit");
    return {
        families: families.map((item) => ({
            id: item.familyId,
            label: item.familyName,
        })),
        departments: departmentOptions,
        units: unitOptions,
        departmentUnits: [...departmentOptions, ...unitOptions].sort((left, right) => left.label.localeCompare(right.label)),
        churchRoles: churchRoles.map((item) => ({
            id: item.churchRoleId,
            label: item.roleName,
        })),
        captureRequirements,
    };
}
