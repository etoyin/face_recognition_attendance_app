import { DataTypes, Model, } from "sequelize";
export class Family extends Model {
}
export class Department extends Model {
}
export class Unit extends Model {
}
export class ChurchRole extends Model {
}
export class Member extends Model {
}
export class TemporaryMediaAsset extends Model {
}
let initialized = false;
export function initializeModels(sequelize) {
    if (initialized) {
        return;
    }
    Family.init({
        familyId: {
            type: DataTypes.STRING(36),
            primaryKey: true,
            field: "family_id",
        },
        familyCode: {
            type: DataTypes.STRING(50),
            allowNull: true,
            unique: true,
            field: "family_code",
        },
        familyName: {
            type: DataTypes.STRING(150),
            allowNull: false,
            field: "family_name",
        },
        createdAt: {
            type: DataTypes.DATE,
            allowNull: false,
            field: "created_at",
        },
        updatedAt: {
            type: DataTypes.DATE,
            allowNull: false,
            field: "updated_at",
        },
    }, { sequelize, tableName: "families" });
    Department.init({
        departmentId: {
            type: DataTypes.STRING(36),
            primaryKey: true,
            field: "department_id",
        },
        departmentCode: {
            type: DataTypes.STRING(50),
            allowNull: true,
            unique: true,
            field: "department_code",
        },
        departmentName: {
            type: DataTypes.STRING(150),
            allowNull: false,
            unique: true,
            field: "department_name",
        },
        createdAt: {
            type: DataTypes.DATE,
            allowNull: false,
            field: "created_at",
        },
        updatedAt: {
            type: DataTypes.DATE,
            allowNull: false,
            field: "updated_at",
        },
    }, { sequelize, tableName: "departments" });
    Unit.init({
        unitId: {
            type: DataTypes.STRING(36),
            primaryKey: true,
            field: "unit_id",
        },
        unitCode: {
            type: DataTypes.STRING(50),
            allowNull: true,
            unique: true,
            field: "unit_code",
        },
        unitName: {
            type: DataTypes.STRING(150),
            allowNull: false,
            unique: true,
            field: "unit_name",
        },
        createdAt: {
            type: DataTypes.DATE,
            allowNull: false,
            field: "created_at",
        },
        updatedAt: {
            type: DataTypes.DATE,
            allowNull: false,
            field: "updated_at",
        },
    }, { sequelize, tableName: "units" });
    ChurchRole.init({
        churchRoleId: {
            type: DataTypes.STRING(36),
            primaryKey: true,
            field: "church_role_id",
        },
        roleCode: {
            type: DataTypes.STRING(50),
            allowNull: true,
            unique: true,
            field: "role_code",
        },
        roleName: {
            type: DataTypes.STRING(150),
            allowNull: false,
            unique: true,
            field: "role_name",
        },
        createdAt: {
            type: DataTypes.DATE,
            allowNull: false,
            field: "created_at",
        },
        updatedAt: {
            type: DataTypes.DATE,
            allowNull: false,
            field: "updated_at",
        },
    }, { sequelize, tableName: "church_roles" });
    Member.init({
        memberId: {
            type: DataTypes.STRING(36),
            primaryKey: true,
            field: "member_id",
        },
        membershipId: {
            type: DataTypes.STRING(32),
            allowNull: false,
            unique: true,
            field: "membership_id",
        },
        firstName: {
            type: DataTypes.STRING(100),
            allowNull: false,
            field: "first_name",
        },
        middleName: {
            type: DataTypes.STRING(100),
            allowNull: true,
            field: "middle_name",
        },
        surname: {
            type: DataTypes.STRING(100),
            allowNull: false,
            field: "surname",
        },
        gender: {
            type: DataTypes.ENUM("MALE", "FEMALE"),
            allowNull: false,
            field: "gender",
        },
        dateOfBirth: {
            type: DataTypes.DATEONLY,
            allowNull: false,
            field: "date_of_birth",
        },
        phoneNumber: {
            type: DataTypes.STRING(30),
            allowNull: false,
            field: "phone_number",
        },
        email: {
            type: DataTypes.STRING(191),
            allowNull: true,
            unique: true,
            field: "email",
        },
        address: {
            type: DataTypes.TEXT,
            allowNull: false,
            field: "address",
        },
        occupation: {
            type: DataTypes.STRING(150),
            allowNull: true,
            field: "occupation",
        },
        maritalStatus: {
            type: DataTypes.ENUM("SINGLE", "MARRIED", "DIVORCED", "WIDOWED"),
            allowNull: false,
            field: "marital_status",
        },
        weddingAnniversary: {
            type: DataTypes.DATEONLY,
            allowNull: true,
            field: "wedding_anniversary",
        },
        dateJoinedChurch: {
            type: DataTypes.DATEONLY,
            allowNull: false,
            field: "date_joined_church",
        },
        waterBaptized: {
            type: DataTypes.BOOLEAN,
            allowNull: false,
            field: "water_baptized",
        },
        bornAgain: {
            type: DataTypes.BOOLEAN,
            allowNull: false,
            field: "born_again",
        },
        workerStatus: {
            type: DataTypes.ENUM("WORKER", "NON_WORKER"),
            allowNull: false,
            field: "worker_status",
        },
        membershipStatus: {
            type: DataTypes.ENUM("ACTIVE", "INACTIVE", "NEW_MEMBER", "TRANSFERRED"),
            allowNull: false,
            field: "membership_status",
        },
        familyId: {
            type: DataTypes.STRING(36),
            allowNull: true,
            field: "family_id",
        },
        departmentId: {
            type: DataTypes.STRING(36),
            allowNull: true,
            field: "department_id",
        },
        unitId: {
            type: DataTypes.STRING(36),
            allowNull: true,
            field: "unit_id",
        },
        churchRoleId: {
            type: DataTypes.STRING(36),
            allowNull: false,
            field: "church_role_id",
        },
        emergencyContactName: {
            type: DataTypes.STRING(150),
            allowNull: false,
            field: "emergency_contact_name",
        },
        emergencyContactPhone: {
            type: DataTypes.STRING(30),
            allowNull: false,
            field: "emergency_contact_phone",
        },
        emergencyContactRelationship: {
            type: DataTypes.STRING(80),
            allowNull: false,
            field: "emergency_contact_relationship",
        },
        medicalNotes: {
            type: DataTypes.TEXT,
            allowNull: true,
            field: "medical_notes",
        },
        profilePhotoAssetId: {
            type: DataTypes.STRING(36),
            allowNull: false,
            field: "profile_photo_asset_id",
        },
        registrationStatus: {
            type: DataTypes.ENUM("COMPLETED"),
            allowNull: false,
            field: "registration_status",
        },
        createdByUserId: {
            type: DataTypes.STRING(64),
            allowNull: true,
            field: "created_by_user_id",
        },
        createdAt: {
            type: DataTypes.DATE,
            allowNull: false,
            field: "created_at",
        },
        updatedAt: {
            type: DataTypes.DATE,
            allowNull: false,
            field: "updated_at",
        },
    }, { sequelize, tableName: "members" });
    TemporaryMediaAsset.init({
        assetId: {
            type: DataTypes.STRING(36),
            primaryKey: true,
            field: "asset_id",
        },
        ownerUserId: {
            type: DataTypes.STRING(64),
            allowNull: false,
            field: "owner_user_id",
        },
        memberId: {
            type: DataTypes.STRING(36),
            allowNull: true,
            field: "member_id",
        },
        assetType: {
            type: DataTypes.ENUM("PROFILE_PHOTO", "FACE_CAPTURE"),
            allowNull: false,
            field: "asset_type",
        },
        storageKey: {
            type: DataTypes.STRING(255),
            allowNull: false,
            field: "storage_key",
        },
        previewUrl: {
            type: DataTypes.STRING(255),
            allowNull: false,
            field: "preview_url",
        },
        mimeType: {
            type: DataTypes.STRING(100),
            allowNull: false,
            field: "mime_type",
        },
        fileSizeBytes: {
            type: DataTypes.BIGINT,
            allowNull: false,
            field: "file_size_bytes",
        },
        capturePose: {
            type: DataTypes.ENUM("LOOK_FORWARD", "TURN_LEFT", "TURN_RIGHT", "LOOK_UP", "LOOK_DOWN", "SMILE", "NEUTRAL", "SLIGHT_LEFT", "SLIGHT_RIGHT"),
            allowNull: true,
            field: "capture_pose",
        },
        captureSequence: {
            type: DataTypes.INTEGER,
            allowNull: true,
            field: "capture_sequence",
        },
        uploadStatus: {
            type: DataTypes.ENUM("UPLOADED", "COMMITTED", "FAILED", "EXPIRED"),
            allowNull: false,
            field: "upload_status",
        },
        expiresAt: {
            type: DataTypes.DATE,
            allowNull: false,
            field: "expires_at",
        },
        createdAt: {
            type: DataTypes.DATE,
            allowNull: false,
            field: "created_at",
        },
        updatedAt: {
            type: DataTypes.DATE,
            allowNull: false,
            field: "updated_at",
        },
    }, { sequelize, tableName: "temporary_media_assets" });
    Family.hasMany(Member, { foreignKey: "familyId" });
    Department.hasMany(Member, { foreignKey: "departmentId" });
    Unit.hasMany(Member, { foreignKey: "unitId" });
    ChurchRole.hasMany(Member, { foreignKey: "churchRoleId" });
    Member.belongsTo(Family, { foreignKey: "familyId" });
    Member.belongsTo(Department, { foreignKey: "departmentId" });
    Member.belongsTo(Unit, { foreignKey: "unitId" });
    Member.belongsTo(ChurchRole, { foreignKey: "churchRoleId" });
    Member.hasMany(TemporaryMediaAsset, { foreignKey: "memberId" });
    TemporaryMediaAsset.belongsTo(Member, { foreignKey: "memberId" });
    initialized = true;
}
