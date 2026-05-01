import { Router, type IRouter, type Request, type Response } from "express";
import { Readable } from "stream";
import multer from "multer";
import {
  MissingSupabaseStorageConfigError,
  uploadAdImagesForUser,
} from "../lib/supabaseStorage";
import {
  MissingObjectStorageConfigError,
  ObjectStorageService,
  ObjectNotFoundError,
} from "../lib/objectStorage";

const router: IRouter = Router();
const objectStorageService = new ObjectStorageService();
const upload = multer({
  storage: multer.memoryStorage(),
  limits: {
    files: 10,
    fileSize: 5 * 1024 * 1024,
  },
});

function requireAuth(req: Request, res: Response): number | null {
  if (!req.session.userId) {
    res.status(401).json({ error: "يرجى تسجيل الدخول" });
    return null;
  }
  return req.session.userId;
}

const getMissingConfigResponse = (error: MissingObjectStorageConfigError) => ({
  error: "Object storage is not configured",
  code: "OBJECT_STORAGE_NOT_CONFIGURED",
  missingEnvVar: error.missingEnvVar,
});

router.post("/storage/uploads/ad-images", upload.array("images", 10), async (req: Request, res: Response) => {
  const userId = requireAuth(req, res);
  if (!userId) return;

  const files = (req.files as Express.Multer.File[] | undefined) ?? [];
  if (files.length === 0) {
    res.status(400).json({ error: "يرجى اختيار صورة واحدة على الأقل" });
    return;
  }

  if (files.length > 10) {
    res.status(400).json({ error: "الحد الأقصى للصور هو 10" });
    return;
  }

  for (const file of files) {
    if (!file.mimetype || !file.mimetype.startsWith("image/")) {
      res.status(400).json({ error: `الملف ${file.originalname} ليس صورة صالحة` });
      return;
    }
  }

  try {
    const imageUrls = await uploadAdImagesForUser(
      userId,
      files.map((file) => ({ buffer: file.buffer, mimetype: file.mimetype })),
    );
    res.json({ imageUrls });
  } catch (error) {
    if (error instanceof MissingSupabaseStorageConfigError) {
      req.log.warn(
        {
          reason: error.message,
          missingEnvVar: error.missingEnvVar,
        },
        "Supabase storage config missing while uploading ad images",
      );
      res.status(503).json({
        error: "خدمة رفع الصور غير متاحة حالياً",
        code: "SUPABASE_STORAGE_NOT_CONFIGURED",
        missingEnvVar: error.missingEnvVar,
      });
      return;
    }
    if (error instanceof MissingObjectStorageConfigError) {
      req.log.warn(
        {
          reason: error.message,
          missingEnvVar: error.missingEnvVar,
        },
        "Object storage config missing while uploading ad images",
      );
      res.status(503).json(getMissingConfigResponse(error));
      return;
    }
    req.log.error({ err: error }, "Error uploading ad images");
    res.status(500).json({ error: "تعذر رفع الصور، يرجى المحاولة مرة أخرى" });
  }
});

/**
 * GET /storage/public-objects/*
 *
 * Serve public assets from PUBLIC_OBJECT_SEARCH_PATHS.
 * These are unconditionally public — no authentication or ACL checks.
 * IMPORTANT: Always provide this endpoint when object storage is set up.
 */
router.get("/storage/public-objects/*filePath", async (req: Request, res: Response) => {
  try {
    const raw = req.params.filePath;
    const filePath = Array.isArray(raw) ? raw.join("/") : raw;
    const file = await objectStorageService.searchPublicObject(filePath);
    if (!file) {
      res.status(404).json({ error: "File not found" });
      return;
    }

    const response = await objectStorageService.downloadObject(file);

    res.status(response.status);
    response.headers.forEach((value, key) => res.setHeader(key, value));

    if (response.body) {
      const nodeStream = Readable.fromWeb(response.body as ReadableStream<Uint8Array>);
      nodeStream.pipe(res);
    } else {
      res.end();
    }
  } catch (error) {
    if (error instanceof MissingObjectStorageConfigError) {
      req.log.warn(
        {
          filePath: req.params.filePath,
          reason: error.message,
          missingEnvVar: error.missingEnvVar,
        },
        "Object storage config missing while serving public object",
      );
      res.status(503).json(getMissingConfigResponse(error));
      return;
    }
    req.log.error({ err: error }, "Error serving public object");
    res.status(500).json({ error: "Failed to serve public object" });
  }
});

/**
 * GET /storage/objects/*
 *
 * Serve object entities from PRIVATE_OBJECT_DIR.
 * These are served from a separate path from /public-objects and can optionally
 * be protected with authentication or ACL checks based on the use case.
 */
router.get("/storage/objects/*path", async (req: Request, res: Response) => {
  try {
    const raw = req.params.path;
    const wildcardPath = Array.isArray(raw) ? raw.join("/") : raw;
    const objectPath = `/objects/${wildcardPath}`;
    const objectFile = await objectStorageService.getObjectEntityFile(objectPath);

    // --- Protected route example (uncomment when using replit-auth) ---
    // if (!req.isAuthenticated()) {
    //   res.status(401).json({ error: "Unauthorized" });
    //   return;
    // }
    // const canAccess = await objectStorageService.canAccessObjectEntity({
    //   userId: req.user.id,
    //   objectFile,
    //   requestedPermission: ObjectPermission.READ,
    // });
    // if (!canAccess) {
    //   res.status(403).json({ error: "Forbidden" });
    //   return;
    // }

    const response = await objectStorageService.downloadObject(objectFile);

    res.status(response.status);
    response.headers.forEach((value, key) => res.setHeader(key, value));

    if (response.body) {
      const nodeStream = Readable.fromWeb(response.body as ReadableStream<Uint8Array>);
      nodeStream.pipe(res);
    } else {
      res.end();
    }
  } catch (error) {
    if (error instanceof ObjectNotFoundError) {
      req.log.warn({ err: error }, "Object not found");
      res.status(404).json({ error: "Object not found" });
      return;
    }
    if (error instanceof MissingObjectStorageConfigError) {
      req.log.warn(
        {
          filePath: req.params.path,
          reason: error.message,
          missingEnvVar: error.missingEnvVar,
        },
        "Object storage config missing while serving object",
      );
      res.status(503).json(getMissingConfigResponse(error));
      return;
    }
    req.log.error({ err: error }, "Error serving object");
    res.status(500).json({ error: "Failed to serve object" });
  }
});

router.use((err: unknown, _req: Request, res: Response, next: (err?: unknown) => void) => {
  if (err instanceof multer.MulterError) {
    if (err.code === "LIMIT_FILE_SIZE") {
      res.status(400).json({ error: "حجم الصورة يتجاوز الحد المسموح (5MB)" });
      return;
    }
    if (err.code === "LIMIT_FILE_COUNT") {
      res.status(400).json({ error: "الحد الأقصى للصور هو 10" });
      return;
    }
    res.status(400).json({ error: "ملفات الصور غير صالحة" });
    return;
  }
  next(err);
});

export default router;
