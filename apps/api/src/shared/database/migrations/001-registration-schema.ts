import type { QueryInterface, Sequelize } from "sequelize";

export const registrationSeedData = {
  families: [
    {
      familyId: "family-grace",
      familyCode: "FAM-GRACE",
      familyName: "Grace Household",
    },
    {
      familyId: "family-covenant",
      familyCode: "FAM-COVENANT",
      familyName: "Covenant Family",
    },
    {
      familyId: "family-living-water",
      familyCode: "FAM-LIVING-WATER",
      familyName: "Living Water Home",
    },
  ],
  departments: [
    {
      departmentId: "dept-technical",
      departmentCode: "DEPT-TECHNICAL",
      departmentName: "Technical",
    },
    {
      departmentId: "dept-choir",
      departmentCode: "DEPT-CHOIR",
      departmentName: "Choir",
    },
    {
      departmentId: "dept-ushers",
      departmentCode: "DEPT-USHERS",
      departmentName: "Ushers",
    },
    {
      departmentId: "dept-media",
      departmentCode: "DEPT-MEDIA",
      departmentName: "Media",
    },
    {
      departmentId: "dept-sunday-school",
      departmentCode: "DEPT-SUNDAY-SCHOOL",
      departmentName: "Sunday School",
    },
    {
      departmentId: "dept-children",
      departmentCode: "DEPT-CHILDREN",
      departmentName: "Children",
    },
    {
      departmentId: "dept-teens",
      departmentCode: "DEPT-TEENS",
      departmentName: "Teens",
    },
  ],
  units: [
    {
      unitId: "unit-prayer",
      unitCode: "UNIT-PRAYER",
      unitName: "Prayer",
    },
    {
      unitId: "unit-protocol",
      unitCode: "UNIT-PROTOCOL",
      unitName: "Protocol",
    },
    {
      unitId: "unit-evangelism",
      unitCode: "UNIT-EVANGELISM",
      unitName: "Evangelism",
    },
    {
      unitId: "unit-security",
      unitCode: "UNIT-SECURITY",
      unitName: "Security",
    },
    {
      unitId: "unit-sanitation",
      unitCode: "UNIT-SANITATION",
      unitName: "Sanitation",
    },
    {
      unitId: "unit-drama",
      unitCode: "UNIT-DRAMA",
      unitName: "Drama",
    },
  ],
  churchRoles: [
    {
      churchRoleId: "role-member",
      roleCode: "ROLE-MEMBER",
      roleName: "Member",
    },
    {
      churchRoleId: "role-worker",
      roleCode: "ROLE-WORKER",
      roleName: "Worker",
    },
    {
      churchRoleId: "role-leader",
      roleCode: "ROLE-LEADER",
      roleName: "Leader",
    },
    {
      churchRoleId: "role-pastor",
      roleCode: "ROLE-PASTOR",
      roleName: "Pastor",
    },
  ],
};

export async function up(sequelize: Sequelize) {
  const queryInterface = sequelize.getQueryInterface();

  await createFamiliesTable(queryInterface);
  await createDepartmentsTable(queryInterface);
  await createUnitsTable(queryInterface);
  await createChurchRolesTable(queryInterface);
  await createMembersTable(queryInterface);
  await createTemporaryMediaAssetsTable(queryInterface);
  await seedLookupTables(queryInterface);
}

async function createFamiliesTable(queryInterface: QueryInterface) {
  await queryInterface.sequelize.query(`
    CREATE TABLE IF NOT EXISTS families (
      family_id VARCHAR(36) NOT NULL PRIMARY KEY,
      family_code VARCHAR(50) NULL UNIQUE,
      family_name VARCHAR(150) NOT NULL,
      created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
      updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
    )
  `);
}

async function createDepartmentsTable(queryInterface: QueryInterface) {
  await queryInterface.sequelize.query(`
    CREATE TABLE IF NOT EXISTS departments (
      department_id VARCHAR(36) NOT NULL PRIMARY KEY,
      department_code VARCHAR(50) NULL UNIQUE,
      department_name VARCHAR(150) NOT NULL UNIQUE,
      created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
      updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
    )
  `);
}

async function createUnitsTable(queryInterface: QueryInterface) {
  await queryInterface.sequelize.query(`
    CREATE TABLE IF NOT EXISTS units (
      unit_id VARCHAR(36) NOT NULL PRIMARY KEY,
      unit_code VARCHAR(50) NULL UNIQUE,
      unit_name VARCHAR(150) NOT NULL UNIQUE,
      created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
      updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
    )
  `);
}

async function createChurchRolesTable(queryInterface: QueryInterface) {
  await queryInterface.sequelize.query(`
    CREATE TABLE IF NOT EXISTS church_roles (
      church_role_id VARCHAR(36) NOT NULL PRIMARY KEY,
      role_code VARCHAR(50) NULL UNIQUE,
      role_name VARCHAR(150) NOT NULL UNIQUE,
      created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
      updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
    )
  `);
}

async function createMembersTable(queryInterface: QueryInterface) {
  await queryInterface.sequelize.query(`
    CREATE TABLE IF NOT EXISTS members (
      member_id VARCHAR(36) NOT NULL PRIMARY KEY,
      membership_id VARCHAR(32) NOT NULL UNIQUE,
      first_name VARCHAR(100) NOT NULL,
      middle_name VARCHAR(100) NULL,
      surname VARCHAR(100) NOT NULL,
      gender ENUM('MALE', 'FEMALE') NOT NULL,
      date_of_birth DATE NOT NULL,
      phone_number VARCHAR(30) NOT NULL,
      email VARCHAR(191) NULL UNIQUE,
      address TEXT NOT NULL,
      occupation VARCHAR(150) NULL,
      marital_status ENUM('SINGLE', 'MARRIED', 'DIVORCED', 'WIDOWED') NOT NULL,
      wedding_anniversary DATE NULL,
      date_joined_church DATE NOT NULL,
      water_baptized TINYINT(1) NOT NULL,
      born_again TINYINT(1) NOT NULL,
      worker_status ENUM('WORKER', 'NON_WORKER') NOT NULL,
      membership_status ENUM('ACTIVE', 'INACTIVE', 'NEW_MEMBER', 'TRANSFERRED') NOT NULL,
      family_id VARCHAR(36) NULL,
      department_id VARCHAR(36) NULL,
      unit_id VARCHAR(36) NULL,
      church_role_id VARCHAR(36) NOT NULL,
      emergency_contact_name VARCHAR(150) NOT NULL,
      emergency_contact_phone VARCHAR(30) NOT NULL,
      emergency_contact_relationship VARCHAR(80) NOT NULL,
      medical_notes TEXT NULL,
      profile_photo_asset_id VARCHAR(36) NOT NULL,
      registration_status ENUM('COMPLETED') NOT NULL DEFAULT 'COMPLETED',
      created_by_user_id VARCHAR(64) NULL,
      created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
      updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
      INDEX idx_members_phone_number (phone_number),
      INDEX idx_members_name (surname, first_name),
      INDEX idx_members_family_id (family_id),
      INDEX idx_members_department_id (department_id),
      INDEX idx_members_unit_id (unit_id),
      INDEX idx_members_church_role_id (church_role_id),
      CONSTRAINT fk_members_family FOREIGN KEY (family_id) REFERENCES families(family_id) ON DELETE SET NULL ON UPDATE CASCADE,
      CONSTRAINT fk_members_department FOREIGN KEY (department_id) REFERENCES departments(department_id) ON DELETE SET NULL ON UPDATE CASCADE,
      CONSTRAINT fk_members_unit FOREIGN KEY (unit_id) REFERENCES units(unit_id) ON DELETE SET NULL ON UPDATE CASCADE,
      CONSTRAINT fk_members_church_role FOREIGN KEY (church_role_id) REFERENCES church_roles(church_role_id) ON DELETE RESTRICT ON UPDATE CASCADE
    )
  `);
}

async function createTemporaryMediaAssetsTable(queryInterface: QueryInterface) {
  await queryInterface.sequelize.query(`
    CREATE TABLE IF NOT EXISTS temporary_media_assets (
      asset_id VARCHAR(36) NOT NULL PRIMARY KEY,
      owner_user_id VARCHAR(64) NOT NULL,
      member_id VARCHAR(36) NULL,
      asset_type ENUM('PROFILE_PHOTO', 'FACE_CAPTURE') NOT NULL,
      storage_key VARCHAR(255) NOT NULL,
      preview_url VARCHAR(255) NOT NULL,
      mime_type VARCHAR(100) NOT NULL,
      file_size_bytes BIGINT NOT NULL,
      capture_pose ENUM('LOOK_FORWARD', 'TURN_LEFT', 'TURN_RIGHT', 'LOOK_UP', 'LOOK_DOWN', 'SMILE', 'NEUTRAL', 'SLIGHT_LEFT', 'SLIGHT_RIGHT') NULL,
      capture_sequence INT NULL,
      upload_status ENUM('UPLOADED', 'COMMITTED', 'FAILED', 'EXPIRED') NOT NULL DEFAULT 'UPLOADED',
      expires_at DATETIME NOT NULL,
      created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
      updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
      INDEX idx_temp_media_owner_user_id (owner_user_id),
      INDEX idx_temp_media_member_id (member_id),
      INDEX idx_temp_media_asset_status (asset_type, upload_status),
      INDEX idx_temp_media_expires_at (expires_at),
      CONSTRAINT fk_temp_media_member FOREIGN KEY (member_id) REFERENCES members(member_id) ON DELETE SET NULL ON UPDATE CASCADE
    )
  `);
}

async function seedLookupTables(queryInterface: QueryInterface) {
  for (const item of registrationSeedData.families) {
    await queryInterface.sequelize.query(
      `
        INSERT IGNORE INTO families (family_id, family_code, family_name, created_at, updated_at)
        VALUES (?, ?, ?, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
      `,
      { replacements: [item.familyId, item.familyCode, item.familyName] },
    );
  }

  for (const item of registrationSeedData.departments) {
    await queryInterface.sequelize.query(
      `
        INSERT IGNORE INTO departments (department_id, department_code, department_name, created_at, updated_at)
        VALUES (?, ?, ?, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
      `,
      {
        replacements: [
          item.departmentId,
          item.departmentCode,
          item.departmentName,
        ],
      },
    );
  }

  for (const item of registrationSeedData.units) {
    await queryInterface.sequelize.query(
      `
        INSERT IGNORE INTO units (unit_id, unit_code, unit_name, created_at, updated_at)
        VALUES (?, ?, ?, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
      `,
      { replacements: [item.unitId, item.unitCode, item.unitName] },
    );
  }

  for (const item of registrationSeedData.churchRoles) {
    await queryInterface.sequelize.query(
      `
        INSERT IGNORE INTO church_roles (church_role_id, role_code, role_name, created_at, updated_at)
        VALUES (?, ?, ?, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
      `,
      { replacements: [item.churchRoleId, item.roleCode, item.roleName] },
    );
  }
}
