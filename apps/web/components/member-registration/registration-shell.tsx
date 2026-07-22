"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { AlertTriangle, ChevronLeft, ChevronRight, LoaderCircle, Save } from "lucide-react";
import { useRouter } from "next/navigation";
import { useEffect, useMemo, useState } from "react";
import { FormProvider, useForm } from "react-hook-form";
import {
  fetchRegistrationMeta,
  getApiErrorMessage,
  removeTempAsset,
  submitMemberRegistration,
  uploadFaceCapture,
  uploadProfilePhoto,
  type OptionItem,
} from "@/lib/api-client";
import {
  defaultRegistrationValues,
  memberRegistrationSchema,
  type MemberRegistrationFormValues,
} from "@/lib/member-registration-schema";
import {
  FaceEnrollmentPanel,
  type FaceCaptureItem,
} from "./face-enrollment-panel";
import {
  ProgressSidebar,
  type ProgressSidebarStep,
} from "./progress-sidebar";
import { ProfilePhotoUploader } from "./profile-photo-uploader";
import { SectionCard } from "./section-card";

const inputClassName =
  "w-full rounded-2xl border border-white/10 bg-[#08112b] px-4 py-3 text-sm text-white outline-none transition placeholder:text-slate-500 focus:border-amber-300";

export function RegistrationShell() {
  const router = useRouter();
  const form = useForm<MemberRegistrationFormValues>({
    resolver: zodResolver(memberRegistrationSchema),
    defaultValues: defaultRegistrationValues,
  });
  const [meta, setMeta] = useState<{
    families: OptionItem[];
    departmentUnits: OptionItem[];
    churchRoles: OptionItem[];
    captureRequirements: { minImages: number; maxImages: number; supportedPoses: string[] };
  }>();
  const [pageError, setPageError] = useState<string>();
  const [isPageLoading, setIsPageLoading] = useState(true);
  const [isPhotoUploading, setIsPhotoUploading] = useState(false);
  const [isFaceUploading, setIsFaceUploading] = useState(false);
  const [photoPreviewUrl, setPhotoPreviewUrl] = useState<string>();
  const [faceCaptures, setFaceCaptures] = useState<FaceCaptureItem[]>([]);
  const [activeStep, setActiveStep] = useState(0);

  const {
    register,
    handleSubmit,
    trigger,
    watch,
    setValue,
    setError,
    clearErrors,
    formState: { errors, isSubmitting },
  } = form;

  const formValues = watch();
  const maritalStatus = formValues.maritalStatus;
  const hasProfilePhoto = Boolean(formValues.profilePhotoAssetId);
  const captureCount = formValues.faceCaptureAssetIds.length;

  const supportedPoses = useMemo(
    () => meta?.captureRequirements.supportedPoses ?? [],
    [meta],
  );
  const selectedDepartmentUnit = useMemo(
    () =>
      meta?.departmentUnits.find((item) => item.id === formValues.departmentOrUnitId),
    [formValues.departmentOrUnitId, meta?.departmentUnits],
  );
  const requiredCaptureCount = meta?.captureRequirements.maxImages ?? 30;

  const personalStepComplete = Boolean(
    formValues.firstName.trim() &&
      formValues.surname.trim() &&
      formValues.dateOfBirth &&
      formValues.phoneNumber.trim() &&
      formValues.address.trim() &&
      (maritalStatus !== "MARRIED" || !formValues.weddingAnniversary || formValues.weddingAnniversary),
  );
  const membershipStepComplete = Boolean(
    formValues.dateJoinedChurch && formValues.churchRoleId,
  );
  const mediaStepComplete = Boolean(
    formValues.emergencyContactName.trim() &&
      formValues.emergencyContactPhone.trim() &&
      formValues.emergencyContactRelationship.trim() &&
      hasProfilePhoto &&
      captureCount >= requiredCaptureCount,
  );
  const reviewStepAvailable = personalStepComplete && membershipStepComplete && mediaStepComplete;
  const unlockedStepIndex = reviewStepAvailable
    ? 3
    : mediaStepComplete
      ? 2
      : membershipStepComplete
        ? 1
        : 0;

  const sidebarSteps: ProgressSidebarStep[] = [
    {
      title: "Personal information",
      description: "Basic identity and contact details",
      complete: personalStepComplete,
      available: true,
    },
    {
      title: "Membership and department/unit",
      description: "Church placement and status details",
      complete: membershipStepComplete,
      available: personalStepComplete,
    },
    {
      title: "Emergency and media",
      description: "Emergency contact, photo, and face capture",
      complete: mediaStepComplete,
      available: personalStepComplete && membershipStepComplete,
    },
    {
      title: "Review and submit",
      description: "Final check before member creation",
      complete: false,
      available: reviewStepAvailable,
    },
  ];

  useEffect(() => {
    async function loadMeta() {
      try {
        const response = await fetchRegistrationMeta();
        setMeta(response);
      } catch {
        setPageError("Unable to load registration options from the API.");
      } finally {
        setIsPageLoading(false);
      }
    }

    void loadMeta();
  }, []);

  useEffect(() => {
    if (!meta) {
      return;
    }

    const selectedPlacement = meta.departmentUnits.find(
      (item) => item.id === formValues.departmentOrUnitId,
    );

    setValue(
      "departmentId",
      selectedPlacement?.type === "department" ? selectedPlacement.id : "",
      { shouldValidate: false },
    );
    setValue(
      "unitId",
      selectedPlacement?.type === "unit" ? selectedPlacement.id : "",
      { shouldValidate: false },
    );
  }, [formValues.departmentOrUnitId, meta, setValue]);

  useEffect(() => {
    setActiveStep((currentStep) => Math.min(currentStep, unlockedStepIndex));
  }, [unlockedStepIndex]);

  async function handleProfileUpload(file: File) {
    setIsPhotoUploading(true);
    setPageError(undefined);

    try {
      const uploaded = await uploadProfilePhoto(file);
      setPhotoPreviewUrl(uploaded.previewUrl);
      setValue("profilePhotoAssetId", uploaded.assetId, { shouldValidate: true });
      clearErrors("profilePhotoAssetId");
    } catch {
      setPageError("Profile photo upload failed. Try again.");
    } finally {
      setIsPhotoUploading(false);
    }
  }

  async function handleRemoveProfilePhoto() {
    const assetId = watch("profilePhotoAssetId");
    if (!assetId) return;

    await removeTempAsset(assetId);
    setPhotoPreviewUrl(undefined);
    setValue("profilePhotoAssetId", "", { shouldValidate: true });
  }

  async function handleFaceCapture(blob: Blob, pose: string, captureSequence: number) {
    setIsFaceUploading(true);
    setPageError(undefined);

    try {
      const uploaded = await uploadFaceCapture(blob, pose, captureSequence);
      setFaceCaptures((currentCaptures) => {
        const nextCaptures = [
          ...currentCaptures,
          {
            assetId: uploaded.assetId,
            previewUrl: uploaded.previewUrl,
            pose: uploaded.pose ?? pose,
            captureSequence: uploaded.captureSequence ?? captureSequence,
          },
        ];

        setValue(
          "faceCaptureAssetIds",
          nextCaptures.map((capture) => capture.assetId),
          { shouldValidate: true },
        );

        return nextCaptures;
      });
      clearErrors("faceCaptureAssetIds");
    } catch (error) {
      const captureError = new Error(
        getApiErrorMessage(
          error,
          "A facial image could not be uploaded. Reposition the member and try again.",
        ),
      );
      captureError.name = "CaptureRejectedError";
      throw captureError;
    } finally {
      setIsFaceUploading(false);
    }
  }

  async function handleRemoveCapture(assetId: string) {
    await removeTempAsset(assetId);
    const nextCaptures = faceCaptures.filter((capture) => capture.assetId !== assetId);
    setFaceCaptures(nextCaptures);
    setValue(
      "faceCaptureAssetIds",
      nextCaptures.map((capture) => capture.assetId),
      { shouldValidate: true },
    );
  }


  async function goToNextStep() {
    const stepFields: Record<number, (keyof MemberRegistrationFormValues)[]> = {
      0: [
        "firstName",
        "middleName",
        "surname",
        "gender",
        "dateOfBirth",
        "phoneNumber",
        "email",
        "address",
        "occupation",
        "maritalStatus",
        "weddingAnniversary",
      ],
      1: [
        "dateJoinedChurch",
        "waterBaptized",
        "bornAgain",
        "workerStatus",
        "membershipStatus",
        "familyId",
        "departmentOrUnitId",
        "churchRoleId",
      ],
      2: [
        "emergencyContactName",
        "emergencyContactPhone",
        "emergencyContactRelationship",
        "medicalNotes",
        "profilePhotoAssetId",
        "faceCaptureAssetIds",
      ],
    };

    const isValid = await trigger(stepFields[activeStep] ?? [], {
      shouldFocus: true,
    });

    if (!isValid) {
      return;
    }

    if (activeStep === 2 && captureCount < requiredCaptureCount) {
      setError("faceCaptureAssetIds", {
        message: `Complete all ${requiredCaptureCount} guided facial captures.`,
      });
      return;
    }

    setActiveStep((currentStep) => Math.min(currentStep + 1, 3));
  }
  async function onSubmit(values: MemberRegistrationFormValues) {
    setPageError(undefined);


    if (!values.profilePhotoAssetId) {
      setError("profilePhotoAssetId", { message: "Profile photo is required." });
      return;
    }

    if (values.faceCaptureAssetIds.length < 30) {
      setError("faceCaptureAssetIds", { message: "Complete all 30 guided facial captures." });
      return;
    }

    try {
      const result = await submitMemberRegistration(values);
      const displayName = `${values.firstName} ${values.surname}`.trim();
      router.push(
        `/dashboard/members/register/success/${result.memberId}?membershipId=${result.membershipId}&fullName=${encodeURIComponent(displayName)}&captureCount=${result.faceCaptureCount}`,
      );
    } catch {
      setPageError("Registration could not be completed. Review the form and retry.");
    }
  }

  function renderPersonalInformationStep() {
    return (
      <SectionCard
        eyebrow="Step 1"
        title="Personal information"
        description="Complete the member identity and contact details before the next step unlocks."
      >
        <div className="grid gap-4 md:grid-cols-2">
          {[
            ["firstName", "First Name"],
            ["middleName", "Middle Name"],
            ["surname", "Surname"],
            ["phoneNumber", "Phone Number"],
            ["email", "Email"],
            ["occupation", "Occupation"],
            ["address", "Address"],
          ].map(([name, label]) => (
            <label key={name} className={name === "address" ? "md:col-span-2" : ""}>
              <span className="mb-2 block text-sm text-slate-300">{label}</span>
              <input
                {...register(name as keyof MemberRegistrationFormValues)}
                className={inputClassName}
              />
              <p className="mt-2 text-xs text-rose-200">
                {String(errors[name as keyof typeof errors]?.message ?? "")}
              </p>
            </label>
          ))}
          <label>
            <span className="mb-2 block text-sm text-slate-300">Gender</span>
            <select {...register("gender")} className={inputClassName}>
              <option value="MALE">Male</option>
              <option value="FEMALE">Female</option>
            </select>
          </label>
          <label>
            <span className="mb-2 block text-sm text-slate-300">Date of Birth</span>
            <input type="date" {...register("dateOfBirth")} className={inputClassName} />
            <p className="mt-2 text-xs text-rose-200">{errors.dateOfBirth?.message}</p>
          </label>
          <label>
            <span className="mb-2 block text-sm text-slate-300">Marital Status</span>
            <select {...register("maritalStatus")} className={inputClassName}>
              {["SINGLE", "MARRIED", "DIVORCED", "WIDOWED"].map((value) => (
                <option key={value} value={value}>
                  {value.replaceAll("_", " ")}
                </option>
              ))}
            </select>
          </label>
          <label>
            <span className="mb-2 block text-sm text-slate-300">Wedding Anniversary</span>
            <input
              type="date"
              disabled={maritalStatus !== "MARRIED"}
              {...register("weddingAnniversary")}
              className={inputClassName}
            />
            <p className="mt-2 text-xs text-rose-200">{errors.weddingAnniversary?.message}</p>
          </label>
        </div>
      </SectionCard>
    );
  }

  function renderMembershipStep() {
    return (
      <SectionCard
        eyebrow="Step 2"
        title="Membership and department/unit"
        description="Keep church placement in one field so department and unit behave as a single ministry assignment."
      >
        <div className="grid gap-4 md:grid-cols-2">
          <div className="rounded-2xl border border-amber-300/20 bg-amber-300/10 px-4 py-3">
            <p className="text-xs uppercase tracking-[0.24em] text-amber-100/80">
              Membership ID
            </p>
            <p className="mt-2 text-lg font-semibold text-amber-50">
              Generated on final submission
            </p>
          </div>
          <label>
            <span className="mb-2 block text-sm text-slate-300">Date Joined Church</span>
            <input type="date" {...register("dateJoinedChurch")} className={inputClassName} />
            <p className="mt-2 text-xs text-rose-200">{errors.dateJoinedChurch?.message}</p>
          </label>
          <label>
            <span className="mb-2 block text-sm text-slate-300">Worker Status</span>
            <select {...register("workerStatus")} className={inputClassName}>
              <option value="WORKER">Worker</option>
              <option value="NON_WORKER">Non Worker</option>
            </select>
          </label>
          <label>
            <span className="mb-2 block text-sm text-slate-300">Membership Status</span>
            <select {...register("membershipStatus")} className={inputClassName}>
              {["NEW_MEMBER", "ACTIVE", "INACTIVE", "TRANSFERRED"].map((value) => (
                <option key={value} value={value}>
                  {value.replaceAll("_", " ")}
                </option>
              ))}
            </select>
          </label>
          <label>
            <span className="mb-2 block text-sm text-slate-300">Family</span>
            <select {...register("familyId")} className={inputClassName}>
              <option value="">Not assigned yet</option>
              {meta?.families.map((item) => (
                <option key={item.id} value={item.id}>
                  {item.label}
                </option>
              ))}
            </select>
          </label>
          <label>
            <span className="mb-2 block text-sm text-slate-300">Department / Unit</span>
            <select {...register("departmentOrUnitId")} className={inputClassName}>
              <option value="">Not assigned yet</option>
              {meta?.departmentUnits.map((item) => (
                <option key={item.id} value={item.id}>
                  {item.label}
                </option>
              ))}
            </select>
          </label>
          <label>
            <span className="mb-2 block text-sm text-slate-300">Role in Church</span>
            <select {...register("churchRoleId")} className={inputClassName}>
              <option value="">Select a role</option>
              {meta?.churchRoles.map((item) => (
                <option key={item.id} value={item.id}>
                  {item.label}
                </option>
              ))}
            </select>
            <p className="mt-2 text-xs text-rose-200">{errors.churchRoleId?.message}</p>
          </label>
          <label className="rounded-2xl border border-white/10 bg-[#08112b] px-4 py-3 text-sm text-slate-200">
            <input type="checkbox" {...register("bornAgain")} className="mr-3" />
            Born Again
          </label>
          <label className="rounded-2xl border border-white/10 bg-[#08112b] px-4 py-3 text-sm text-slate-200">
            <input type="checkbox" {...register("waterBaptized")} className="mr-3" />
            Water Baptized
          </label>
        </div>
      </SectionCard>
    );
  }

  function renderMediaStep() {
    return (
      <SectionCard
        eyebrow="Step 3"
        title="Emergency contact, photo, and face enrollment"
        description="Emergency information, profile image, and all guided facial captures must be complete before review unlocks."
      >
        <div className="grid gap-4 md:grid-cols-2">
          <label>
            <span className="mb-2 block text-sm text-slate-300">Emergency Contact Name</span>
            <input {...register("emergencyContactName")} className={inputClassName} />
            <p className="mt-2 text-xs text-rose-200">{errors.emergencyContactName?.message}</p>
          </label>
          <label>
            <span className="mb-2 block text-sm text-slate-300">Emergency Contact Phone</span>
            <input {...register("emergencyContactPhone")} className={inputClassName} />
            <p className="mt-2 text-xs text-rose-200">{errors.emergencyContactPhone?.message}</p>
          </label>
          <label>
            <span className="mb-2 block text-sm text-slate-300">Relationship</span>
            <input {...register("emergencyContactRelationship")} className={inputClassName} />
            <p className="mt-2 text-xs text-rose-200">
              {errors.emergencyContactRelationship?.message}
            </p>
          </label>
          <label className="md:col-span-2">
            <span className="mb-2 block text-sm text-slate-300">Medical Notes</span>
            <textarea rows={4} {...register("medicalNotes")} className={inputClassName} />
          </label>
        </div>

        <ProfilePhotoUploader
          previewUrl={photoPreviewUrl}
          isUploading={isPhotoUploading}
          error={errors.profilePhotoAssetId?.message}
          onUpload={handleProfileUpload}
          onRemove={handleRemoveProfilePhoto}
        />
        <FaceEnrollmentPanel
          captures={faceCaptures}
          isUploading={isFaceUploading}
          error={errors.faceCaptureAssetIds?.message}
          supportedPoses={supportedPoses}
          onCapture={handleFaceCapture}
          onRemoveCapture={handleRemoveCapture}
        />
      </SectionCard>
    );
  }

  function renderReviewStep() {
    return (
      <SectionCard
        eyebrow="Step 4"
        title="Review and submit"
        description="Confirm the final details before saving the member and committing temporary media assets."
      >
        <div className="grid gap-4 md:grid-cols-2">
          {[
            ["Full name", `${formValues.firstName} ${formValues.middleName} ${formValues.surname}`.replace(/\s+/g, " ").trim()],
            ["Phone number", formValues.phoneNumber],
            ["Email", formValues.email || "Not provided"],
            ["Family", meta?.families.find((item) => item.id === formValues.familyId)?.label ?? "Not assigned"],
            ["Department / Unit", selectedDepartmentUnit?.label ?? "Not assigned"],
            ["Role in church", meta?.churchRoles.find((item) => item.id === formValues.churchRoleId)?.label ?? "Not selected"],
            ["Profile photo", hasProfilePhoto ? "Uploaded" : "Missing"],
            ["Face captures", `${captureCount} / ${requiredCaptureCount}`],
          ].map(([label, value]) => (
            <div
              key={label}
              className="rounded-2xl border border-white/10 bg-[#08112b] px-4 py-4"
            >
              <p className="text-xs uppercase tracking-[0.24em] text-slate-400">{label}</p>
              <p className="mt-2 text-sm text-white">{value}</p>
            </div>
          ))}
        </div>

        <div className="grid gap-4 lg:grid-cols-[1fr_auto] lg:items-center">
          <div className="rounded-2xl border border-white/10 bg-[#08112b] px-4 py-4 text-sm leading-7 text-slate-300">
            Required submission checks: profile photo uploaded, all {requiredCaptureCount} guided
            face captures confirmed, required fields completed, and church role selected.
          </div>
          <button
            type="submit"
            disabled={isSubmitting || !hasProfilePhoto || captureCount < requiredCaptureCount}
            className="inline-flex items-center justify-center gap-2 rounded-full bg-amber-300 px-6 py-3 text-sm font-semibold text-slate-950 transition hover:bg-amber-200 disabled:cursor-not-allowed disabled:bg-slate-400"
          >
            {isSubmitting ? (
              <LoaderCircle className="h-4 w-4 animate-spin" />
            ) : (
              <Save className="h-4 w-4" />
            )}
            {isSubmitting ? "Submitting registration" : "Submit member registration"}
          </button>
        </div>
      </SectionCard>
    );
  }

  if (isPageLoading) {
    return <div className="min-h-screen animate-pulse bg-[#040814]" />;
  }

  if (!meta) {
    return <div className="min-h-screen bg-[#040814] px-6 py-10 text-white">{pageError}</div>;
  }

  return (
    <FormProvider {...form}>
      <div className="min-h-screen bg-[radial-gradient(circle_at_top,#1a2857_0%,#091127_42%,#040814_100%)] px-6 py-10 text-white">
        <div className="mx-auto grid max-w-7xl gap-6 xl:grid-cols-[1.5fr_0.7fr]">
          <form onSubmit={handleSubmit(onSubmit)} className="grid gap-6">
            <div className="rounded-[30px] border border-white/12 bg-white/5 p-6 shadow-[0_24px_120px_rgba(0,0,0,0.35)]">
              <p className="text-xs font-semibold uppercase tracking-[0.32em] text-amber-300/80">Church administration</p>
              <h1 className="mt-3 font-serif text-4xl text-white">Register a new member with guided face enrollment</h1>
              <p className="mt-4 max-w-3xl text-sm leading-7 text-slate-300">Work through the registration one stage at a time. Each next step stays hidden until the current one is complete.</p>
              <div className="mt-5 inline-flex rounded-full border border-amber-300/20 bg-amber-300/10 px-4 py-2 text-sm text-amber-50">
                Step {activeStep + 1} of 4
              </div>
            </div>

            {pageError ? <div className="flex items-center gap-3 rounded-2xl border border-rose-300/20 bg-rose-300/10 px-4 py-3 text-sm text-rose-100"><AlertTriangle className="h-4 w-4" />{pageError}</div> : null}

            {activeStep === 0 ? renderPersonalInformationStep() : null}
            {activeStep === 1 ? renderMembershipStep() : null}
            {activeStep === 2 ? renderMediaStep() : null}
            {activeStep === 3 ? renderReviewStep() : null}

            <div className="flex flex-wrap items-center justify-between gap-3 rounded-[28px] border border-white/12 bg-[#0c1531]/70 p-4 shadow-[0_24px_80px_rgba(4,8,25,0.45)] backdrop-blur">
              <button
                type="button"
                onClick={() => setActiveStep((currentStep) => Math.max(currentStep - 1, 0))}
                disabled={activeStep === 0}
                className="inline-flex items-center gap-2 rounded-full border border-white/14 px-4 py-2 text-sm text-white transition hover:bg-white/10 disabled:cursor-not-allowed disabled:opacity-50"
              >
                <ChevronLeft className="h-4 w-4" />
                Previous step
              </button>

              {activeStep < 3 ? (
                <button
                  type="button"
                  onClick={() => void goToNextStep()}
                  className="inline-flex items-center gap-2 rounded-full bg-amber-300 px-4 py-2 text-sm font-semibold text-slate-950 transition hover:bg-amber-200"
                >
                  Next step
                  <ChevronRight className="h-4 w-4" />
                </button>
              ) : null}
            </div>
          </form>

          <ProgressSidebar
            captureCount={captureCount}
            isSubmitting={isSubmitting}
            currentStep={activeStep}
            steps={sidebarSteps}
            onStepSelect={(stepIndex) => {
              if (sidebarSteps[stepIndex]?.available) {
                setActiveStep(stepIndex);
              }
            }}
          />
        </div>
      </div>
    </FormProvider>
  );
}
