/**
 * Checks if a photo contains a human face using the browser's FaceDetector API.
 * Falls back gracefully when FaceDetector is not supported.
 */
export async function validateFacePhoto(file: File): Promise<{ valid: boolean; error?: string }> {
  // FaceDetector is only available in Chromium-based browsers
  if (!("FaceDetector" in window)) {
    // Can't validate — let it through with a soft warning
    return { valid: true };
  }

  return new Promise((resolve) => {
    const img = new Image();
    const url = URL.createObjectURL(file);
    img.onload = async () => {
      try {
        // @ts-expect-error FaceDetector not in TS lib yet
        const detector = new window.FaceDetector({ fastMode: false, maxDetectedFaces: 1 });
        const faces = await detector.detect(img);
        URL.revokeObjectURL(url);
        if (faces.length === 0) {
          resolve({ valid: false, error: "Na sliki ni zaznanega obraza. Naloži selfie ali sliko svojega obraza." });
        } else {
          resolve({ valid: true });
        }
      } catch {
        URL.revokeObjectURL(url);
        resolve({ valid: true }); // detection failed — let it through
      }
    };
    img.onerror = () => {
      URL.revokeObjectURL(url);
      resolve({ valid: false, error: "Napaka pri branju slike." });
    };
    img.src = url;
  });
}
