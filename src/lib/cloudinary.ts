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

  const response = await fetch(CLOUDINARY_CONFIG.apiBase + "/upload", {
    method: "POST",
    body: formData,
  });

  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.message || "Cloudinary upload failed");
  }

  const data = await response.json();
  return data.secure_url;
};

