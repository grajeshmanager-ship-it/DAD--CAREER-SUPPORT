import { NextResponse } from "next/server";

const MAX_PDF_SIZE_BYTES = 5 * 1024 * 1024;
const ALLOWED_MIME_TYPES = ["application/pdf"];
const PDF_MAGIC_BYTES = "%PDF";

export interface ValidationResult {
  valid: boolean;
  error?: NextResponse;
}

export async function validatePdfUpload(file: File): Promise<ValidationResult> {
  if (!file) {
    return {
      valid: false,
      error: NextResponse.json(
        { error: "No file provided", message: "Please upload a PDF file." },
        { status: 400 }
      ),
    };
  }

  if (!ALLOWED_MIME_TYPES.includes(file.type)) {
    return {
      valid: false,
      error: NextResponse.json(
        {
          error: "Invalid file type",
          message: `Only PDF files are accepted. You uploaded: ${file.type || "unknown"}`,
        },
        { status: 400 }
      ),
    };
  }

  if (file.size > MAX_PDF_SIZE_BYTES) {
    const sizeMB = (file.size / (1024 * 1024)).toFixed(1);
    return {
      valid: false,
      error: NextResponse.json(
        {
          error: "File too large",
          message: `Your file is ${sizeMB}MB. Maximum allowed size is 5MB.`,
        },
        { status: 413 }
      ),
    };
  }

  if (file.size === 0) {
    return {
      valid: false,
      error: NextResponse.json(
        { error: "Empty file", message: "The uploaded file is empty." },
        { status: 400 }
      ),
    };
  }

  try {
    const buffer = await file.slice(0, 4).arrayBuffer();
    const header = new TextDecoder().decode(buffer);
    if (!header.startsWith(PDF_MAGIC_BYTES)) {
      return {
        valid: false,
        error: NextResponse.json(
          {
            error: "Invalid PDF",
            message: "The file does not appear to be a valid PDF.",
          },
          { status: 400 }
        ),
      };
    }
  } catch {
    return {
      valid: false,
      error: NextResponse.json(
        { error: "Could not read file", message: "Unable to validate the uploaded file." },
        { status: 400 }
      ),
    };
  }

  return { valid: true };
}
