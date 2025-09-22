'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { FileUpload } from '@/components/analysis/file-upload';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Label } from '@/components/ui/label';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Progress } from '@/components/ui/progress';
import { AlertCircle, Info } from 'lucide-react';
import { toast } from '@/hooks/use-toast';

interface UpdateAnalysisDialogProps {
  analysisId: string;
  isOpen: boolean;
  onClose: () => void;
  onSuccess?: () => void;
}

type MergeStrategy = 'smart' | 'add' | 'replace' | 'max';

export function UpdateAnalysisDialog({
  analysisId,
  isOpen,
  onClose,
  onSuccess
}: UpdateAnalysisDialogProps) {
  const [files, setFiles] = useState<File[]>([]);
  const [mergeStrategy, setMergeStrategy] = useState<MergeStrategy>('smart');
  const [isProcessing, setIsProcessing] = useState(false);
  const [progress, setProgress] = useState(0);
  const [error, setError] = useState<string | null>(null);
  const router = useRouter();

  const handleFilesSelected = (selectedFiles: File[]) => {
    setFiles(selectedFiles);
    setError(null);
  };

  const handleSubmit = async () => {
    if (files.length === 0) {
      setError('Please select at least one file to upload');
      return;
    }

    setIsProcessing(true);
    setProgress(0);
    setError(null);

    try {
      // Convert files to base64
      const fileData = await Promise.all(
        files.map(async (file) => {
          const arrayBuffer = await file.arrayBuffer();
          const base64 = btoa(
            new Uint8Array(arrayBuffer).reduce(
              (data, byte) => data + String.fromCharCode(byte),
              ''
            )
          );
          
          // Detect file type from name
          const fileType = file.name.toLowerCase().includes('invoice') ? 'invoice' : 'runsheet';
          
          return {
            name: file.name,
            type: fileType,
            content: base64
          };
        })
      );

      setProgress(30);

      // Send update request
      const response = await fetch(`/api/analysis/${analysisId}/update`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          files: fileData,
          mergeStrategy
        }),
      });

      setProgress(80);

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to update analysis');
      }

      const result = await response.json();
      setProgress(100);

      toast({
        title: 'Analysis Updated',
        description: `Updated ${result.updatedEntries} entries and created ${result.createdEntries} new entries.`,
      });

      // Refresh the page to show updated data
      if (onSuccess) {
        onSuccess();
      } else {
        router.refresh();
      }
      
      onClose();
    } catch (err) {
      console.error('Error updating analysis:', err);
      setError(err instanceof Error ? err.message : 'Failed to update analysis');
    } finally {
      setIsProcessing(false);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-[600px]">
        <DialogHeader>
          <DialogTitle>Update Analysis</DialogTitle>
          <DialogDescription>
            Add new files to this analysis. The system will intelligently merge the data with existing entries.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-6 py-4">
          {/* File Upload */}
          <div>
            <Label className="text-base font-semibold mb-2 block">Upload Files</Label>
            <FileUpload
              onFilesAdded={handleFilesSelected}
              accept=".pdf"
              multiple
              maxFiles={10}
            />
            {files.length > 0 && (
              <div className="mt-2 text-sm text-muted-foreground">
                {files.length} file{files.length > 1 ? 's' : ''} selected
              </div>
            )}
          </div>

          {/* Merge Strategy */}
          <div>
            <Label className="text-base font-semibold mb-2 block">Payment Merge Strategy</Label>
            <RadioGroup value={mergeStrategy} onValueChange={(value) => setMergeStrategy(value as MergeStrategy)}>
              <div className="space-y-3">
                <div className="flex items-start space-x-2">
                  <RadioGroupItem value="smart" id="smart" className="mt-1" />
                  <div className="grid gap-1">
                    <Label htmlFor="smart" className="font-medium cursor-pointer">
                      Smart Merge (Recommended)
                    </Label>
                    <p className="text-sm text-muted-foreground">
                      Intelligently decides whether to add or replace payments based on amount differences
                    </p>
                  </div>
                </div>
                
                <div className="flex items-start space-x-2">
                  <RadioGroupItem value="add" id="add" className="mt-1" />
                  <div className="grid gap-1">
                    <Label htmlFor="add" className="font-medium cursor-pointer">
                      Add Payments
                    </Label>
                    <p className="text-sm text-muted-foreground">
                      Add new payment amounts to existing amounts
                    </p>
                  </div>
                </div>
                
                <div className="flex items-start space-x-2">
                  <RadioGroupItem value="replace" id="replace" className="mt-1" />
                  <div className="grid gap-1">
                    <Label htmlFor="replace" className="font-medium cursor-pointer">
                      Replace Payments
                    </Label>
                    <p className="text-sm text-muted-foreground">
                      Replace existing payment amounts with new ones
                    </p>
                  </div>
                </div>
                
                <div className="flex items-start space-x-2">
                  <RadioGroupItem value="max" id="max" className="mt-1" />
                  <div className="grid gap-1">
                    <Label htmlFor="max" className="font-medium cursor-pointer">
                      Use Maximum
                    </Label>
                    <p className="text-sm text-muted-foreground">
                      Keep the higher of the existing or new payment amount
                    </p>
                  </div>
                </div>
              </div>
            </RadioGroup>
          </div>

          {/* Info Alert */}
          <Alert>
            <Info className="h-4 w-4" />
            <AlertDescription>
              <strong>How it works:</strong> Runsheet data will update consignment counts and expected amounts. 
              Invoice data will update payment amounts based on your selected merge strategy.
            </AlertDescription>
          </Alert>

          {/* Error Alert */}
          {error && (
            <Alert variant="destructive">
              <AlertCircle className="h-4 w-4" />
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          )}

          {/* Progress */}
          {isProcessing && (
            <div className="space-y-2">
              <Progress value={progress} />
              <p className="text-sm text-muted-foreground text-center">
                Processing files...
              </p>
            </div>
          )}
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={onClose} disabled={isProcessing}>
            Cancel
          </Button>
          <Button onClick={handleSubmit} disabled={isProcessing || files.length === 0}>
            {isProcessing ? 'Processing...' : 'Update Analysis'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}