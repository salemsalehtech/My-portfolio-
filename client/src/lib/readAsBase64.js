// Reads a File (from an <input type="file">) and resolves with its content as a base64 string,
// without the "data:…;base64," prefix — the format the admin upload routes expect
// ({ data: "<base64>" }). Used by the CV, certificate, blog cover and course cover uploads.
export function readAsBase64(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result).split(",")[1]);
    reader.onerror = () => reject(new Error("Could not read the file"));
    reader.readAsDataURL(file);
  });
}
