import fs from "fs";
import path from "path";

/**
 * Deletes files from the filesystem.
 * @param files Array of file paths or Multer file objects
 */
export const deleteFiles = (
  files: (string | Express.Multer.File | undefined)[],
) => {
  files.forEach((file) => {
    if (!file) return;

    const filePath = typeof file === "string" ? file : file.path;

    // Normalize path (Multer might provide relative path, or we might have /uploads/...)
    // In this project, uploads are in 'uploads/stores'
    // If it's our DB path '/uploads/stores/filename', we need to remove leading slash
    const relativePath = filePath.startsWith("/")
      ? filePath.slice(1)
      : filePath;
    const absolutePath = path.resolve(process.cwd(), relativePath);

    if (fs.existsSync(absolutePath)) {
      try {
        fs.unlinkSync(absolutePath);
      } catch (err) {
        console.error(`Failed to delete file: ${absolutePath}`, err);
      }
    }
  });
};
