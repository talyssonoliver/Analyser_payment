/**
 * API Route: Create Analysis with File Upload
 * Implements database-first architecture for file uploads
 *
 * Flow:
 * 1. Create pending analysis record in database
 * 2. Upload files to Supabase Storage
 * 3. Save file metadata to database
 * 4. Return analysis ID for navigation
 */

import { type NextRequest, NextResponse } from "next/server";
import { analysisRepository } from "@/lib/repositories/analysis-repository";
import { fileStorageService } from "@/lib/services/file-storage-service";
import { createClient } from "@/lib/supabase/server";

export async function POST(request: NextRequest) {
  try {
    // 1. Authenticate user
    const supabase = await createClient();
    const {
      data: { session },
      error: authError,
    } = await supabase.auth.getSession();

    if (authError || !session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const userId = session.user.id;

    // 2. Parse form data
    const formData = await request.formData();
    const source = (formData.get("source") as string) || "upload";
    const inputMethod = (formData.get("inputMethod") as string) || "upload";
    const fingerprint = formData.get("fingerprint") as string | null;

    // Get uploaded files
    const files: File[] = [];
    let fileIndex = 0;
    while (formData.has(`file_${fileIndex}`)) {
      const file = formData.get(`file_${fileIndex}`) as File;
      if (file) {
        files.push(file);
      }
      fileIndex++;
    }

    if (files.length === 0) {
      return NextResponse.json({ error: "No files provided" }, { status: 400 });
    }

    console.log(`📤 API: Creating analysis with ${files.length} files for user ${userId}`);

    // 3. Create pending analysis record
    const analysisResult = await analysisRepository.createAnalysis({
      userId,
      fingerprint: fingerprint || undefined,
      source: source as "upload" | "manual" | "import",
      periodStart: new Date().toISOString(), // Will be updated after file processing
      periodEnd: new Date().toISOString(),
      rulesVersion: 9,
      workingDays: 0,
      totalConsignments: 0,
      metadata: {
        uploadMethod: inputMethod,
        filesCount: files.length,
        createdVia: "api",
      },
    });

    if (analysisResult.isFailure) {
      console.error("Failed to create analysis:", analysisResult.error);
      return NextResponse.json(
        { error: analysisResult.error.message },
        { status: analysisResult.error.statusCode || 500 }
      );
    }

    const analysis = analysisResult.data;
    const analysisId = analysis.id;

    console.log(`✅ Created analysis record: ${analysisId}`);

    // 4. Upload files to Supabase Storage
    const uploadResult = await fileStorageService.uploadFiles(userId, analysisId, files);

    if (uploadResult.isFailure) {
      console.error("Failed to upload files:", uploadResult.error);

      // Cleanup: delete the analysis record since file upload failed
      await analysisRepository.deleteAnalysis(analysisId);

      return NextResponse.json(
        { error: `File upload failed: ${uploadResult.error.message}` },
        { status: uploadResult.error.statusCode || 500 }
      );
    }

    const uploadedFiles = uploadResult.data;

    console.log(`✅ Uploaded ${uploadedFiles.length} files to storage`);

    // 5. Save file metadata to database
    const fileRecords = uploadedFiles.map((file) => {
      // Detect file type from name
      const detectType = (name: string): "runsheet" | "invoice" | "other" => {
        const lower = name.toLowerCase();
        if (
          lower.includes("runsheet") ||
          lower.includes("run_sheet") ||
          lower.includes("run-sheet")
        ) {
          return "runsheet";
        }
        if (lower.includes("invoice") || lower.includes("bill") || lower.includes("dv_")) {
          return "invoice";
        }
        return "other";
      };

      return {
        storage_path: file.storagePath,
        original_name: file.fileName,
        file_size: file.size,
        file_hash: file.hash,
        mime_type: file.type,
        file_type: detectType(file.fileName),
      };
    });

    const fileMetadataResult = await analysisRepository.createAnalysisFiles(
      analysisId,
      fileRecords
    );

    if (fileMetadataResult.isFailure) {
      console.error("Failed to save file metadata:", fileMetadataResult.error);

      // Cleanup: delete files from storage and analysis record
      await fileStorageService.deleteAnalysisFiles(userId, analysisId);
      await analysisRepository.deleteAnalysis(analysisId);

      return NextResponse.json(
        { error: `Failed to save file metadata: ${fileMetadataResult.error.message}` },
        { status: fileMetadataResult.error.statusCode || 500 }
      );
    }

    console.log(`✅ Saved file metadata for ${fileRecords.length} files`);

    // 6. Return success response with analysis ID
    return NextResponse.json({
      success: true,
      analysisId,
      filesUploaded: uploadedFiles.length,
      message: "Analysis created and files uploaded successfully",
    });
  } catch (error) {
    console.error("API Error:", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Internal server error" },
      { status: 500 }
    );
  }
}

// Handle preflight requests
export async function OPTIONS() {
  return NextResponse.json({}, { status: 200 });
}
