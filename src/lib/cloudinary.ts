const CLOUD_NAME = import.meta.env.VITE_CLOUDINARY_CLOUD_NAME || "dxoqepdck";
const UPLOAD_PRESET = import.meta.env.VITE_CLOUDINARY_UPLOAD_PRESET || "ml_default";

export const CLOUDINARY_CONFIG = {
  cloudName: CLOUD_NAME,
  uploadPreset: UPLOAD_PRESET,
  apiBase: `https://api.cloudinary.com/v1_1/${CLOUD_NAME}`
};

export const uploadToCloudinary = async (file: File | Blob): Promise<string> => {
  const formData = new FormData();
  formData.append("file", file);
  formData.append("upload_preset", CLOUDINARY_CONFIG.uploadPreset);

  // `/upload` resolves to the image resource type, which rejects video and
  // audio payloads. Reels, story videos and voice notes all go through this
  // helper, so the endpoint has to detect the resource type.
  const response = await fetch(CLOUDINARY_CONFIG.apiBase + "/auto/upload", {
    method: "POST",
    body: formData,
  });

  if (!response.ok) {
    const payload = await response.json().catch(() => null);
    throw new Error(payload?.error?.message || payload?.message || "Cloudinary upload failed");
  }

  const data = await response.json();
  return data.secure_url;
};

