"use client";

import Image from "next/image";
import { LoaderCircle, Trash2, UploadCloud } from "lucide-react";
import { useRef, type ChangeEvent } from "react";

type ProfilePhotoUploaderProps = {
  previewUrl?: string;
  isUploading: boolean;
  error?: string;
  onUpload: (file: File) => Promise<void>;
  onRemove: () => Promise<void>;
};

export function ProfilePhotoUploader({
  previewUrl,
  isUploading,
  error,
  onUpload,
  onRemove,
}: ProfilePhotoUploaderProps) {
  const inputRef = useRef<HTMLInputElement | null>(null);

  async function handleFileChange(event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];

    if (!file) {
      return;
    }

    await onUpload(file);
    event.target.value = "";
  }

  return (
    <div className="grid gap-4 rounded-[24px] border border-white/10 bg-white/4 p-5 lg:grid-cols-[1.1fr_0.9fr]">
      <button
        type="button"
        onClick={() => inputRef.current?.click()}
        className="group flex min-h-64 flex-col items-center justify-center rounded-[20px] border border-dashed border-amber-200/30 bg-[#101b3d] px-6 py-10 text-center transition hover:border-amber-300/60 hover:bg-[#15214b]"
      >
        {isUploading ? (
          <LoaderCircle className="h-10 w-10 animate-spin text-amber-300" />
        ) : (
          <UploadCloud className="h-10 w-10 text-amber-300" />
        )}
        <p className="mt-4 font-medium text-white">
          {previewUrl ? "Replace profile photo" : "Upload profile photo"}
        </p>
        <p className="mt-2 max-w-xs text-sm leading-6 text-slate-300">
          Accepts JPG or PNG up to 5MB. The uploaded photo is stored as a
          temporary media asset until registration is submitted.
        </p>
      </button>

      <div className="rounded-[20px] border border-white/10 bg-[#08112b] p-4">
        <div className="relative flex min-h-64 items-center justify-center overflow-hidden rounded-[18px] bg-white/5">
          {previewUrl ? (
            <Image
              src={previewUrl}
              alt="Profile preview"
              fill
              className="object-cover"
              sizes="(max-width: 1024px) 100vw, 30vw"
            />
          ) : (
            <p className="px-6 text-center text-sm text-slate-400">
              No profile photo uploaded yet.
            </p>
          )}
        </div>

        <div className="mt-4 flex items-center justify-between gap-3">
          <p className="text-xs uppercase tracking-[0.24em] text-slate-400">
            Temporary upload
          </p>
          {previewUrl ? (
            <button
              type="button"
              onClick={onRemove}
              className="inline-flex items-center gap-2 rounded-full border border-rose-300/30 px-3 py-1.5 text-xs font-medium text-rose-100 transition hover:bg-rose-300/10"
            >
              <Trash2 className="h-3.5 w-3.5" />
              Remove
            </button>
          ) : null}
        </div>

        {error ? (
          <p className="mt-3 rounded-2xl border border-rose-300/20 bg-rose-300/10 px-3 py-2 text-sm text-rose-100">
            {error}
          </p>
        ) : null}
      </div>

      <input
        ref={inputRef}
        type="file"
        accept="image/png,image/jpeg"
        className="hidden"
        onChange={handleFileChange}
      />
    </div>
  );
}
