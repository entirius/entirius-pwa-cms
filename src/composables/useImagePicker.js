import { ref, computed, onBeforeUnmount } from "vue";
import { downscaleImage } from "@/utils/imageDownscale";

// Precedent: ProductFiles.vue MAX_FILE_SIZE. Rejected before the browser
// ever decodes the file (canvas decode of a huge file is the expensive part).
const MAX_FILE_SIZE = 20 * 1024 * 1024;

// Exported for unit testing — pulls the first pasted image out of a
// ClipboardEvent's clipboardData, trying `.files` before `.items`.
export function extractImageFile(clipboardData) {
  if (!clipboardData) return null;
  const files = clipboardData.files;
  if (files && files.length) {
    const fileHit = Array.from(files).find((f) => f.type?.startsWith("image/"));
    if (fileHit) return fileHit;
  }
  const items = clipboardData.items;
  if (!items) return null;
  for (const item of items) {
    if (item.kind === "file" && item.type?.startsWith("image/")) {
      return item.getAsFile();
    }
  }
  return null;
}

/**
 * Drop/paste/pick an image, downscale it client-side (never uploaded at full
 * resolution) and expose a preview. `remoteImageUrl` is an optional ref to a
 * pre-existing remote picture (e.g. an atlas source photo) shown until the
 * operator picks a local file or removes it. `initialImage` is an optional,
 * already-downscaled Blob restoring an earlier pick (Find after back-navigation);
 * its preview object-URL is created fresh — the previous one was revoked on unmount.
 *
 * Usage (Options API — setup return pattern):
 *   setup(props) {
 *     return useImagePicker(computed(() => props.imageUrl))
 *   }
 */
export function useImagePicker(remoteImageUrl, initialImage = null) {
  const imageBlob = ref(initialImage);
  const localPreviewUrl = ref(
    initialImage ? URL.createObjectURL(initialImage) : ""
  );
  const imageRemoved = ref(false);
  const imageError = ref("");

  const previewUrl = computed(() => {
    if (localPreviewUrl.value) return localPreviewUrl.value;
    if (!imageRemoved.value && remoteImageUrl?.value)
      return remoteImageUrl.value;
    return "";
  });

  function revokeLocalPreview() {
    if (localPreviewUrl.value) URL.revokeObjectURL(localPreviewUrl.value);
    localPreviewUrl.value = "";
  }

  async function setImage(file) {
    if (!file || !file.type?.startsWith("image/")) return;
    imageError.value = "";
    if (file.size > MAX_FILE_SIZE) {
      imageError.value = "lookup.box.image_too_large";
      return;
    }
    try {
      const blob = await downscaleImage(file);
      revokeLocalPreview();
      imageBlob.value = blob;
      localPreviewUrl.value = URL.createObjectURL(blob);
      imageRemoved.value = false;
    } catch {
      imageError.value = "lookup.box.image_error";
    }
  }

  function removeImage() {
    revokeLocalPreview();
    imageBlob.value = null;
    imageRemoved.value = true;
  }

  function onPaste(event) {
    const file = extractImageFile(event.clipboardData);
    if (!file) return;
    event.preventDefault();
    setImage(file);
  }

  onBeforeUnmount(revokeLocalPreview);

  return {
    imageBlob,
    previewUrl,
    imageRemoved,
    imageError,
    setImage,
    removeImage,
    onPaste,
  };
}
