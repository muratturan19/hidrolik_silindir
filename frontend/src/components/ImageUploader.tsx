import { useCallback, useState } from 'react';
import { useDropzone } from 'react-dropzone';
import { Upload, FileImage, FileText, X, Loader2, CheckCircle, AlertCircle } from 'lucide-react';
import type { ImageAnalysisResult } from '../types';

interface ImageUploaderProps {
  onAnalysisComplete: (result: ImageAnalysisResult) => void;
  onAnalyze: (file: File) => Promise<ImageAnalysisResult>;
  isLoading?: boolean;
}

export function ImageUploader({
  onAnalysisComplete,
  onAnalyze,
  isLoading = false,
}: ImageUploaderProps) {
  const [file, setFile] = useState<File | null>(null);
  const [preview, setPreview] = useState<string | null>(null);
  const [analyzing, setAnalyzing] = useState(false);
  const [result, setResult] = useState<ImageAnalysisResult | null>(null);
  const [error, setError] = useState<string | null>(null);

  const onDrop = useCallback(async (acceptedFiles: File[]) => {
    const uploadedFile = acceptedFiles[0];
    if (!uploadedFile) return;

    setFile(uploadedFile);
    setError(null);
    setResult(null);

    // Preview oluştur
    const reader = new FileReader();
    reader.onload = () => {
      setPreview(reader.result as string);
    };
    reader.readAsDataURL(uploadedFile);

    // Otomatik analiz başlat
    setAnalyzing(true);
    try {
      const analysisResult = await onAnalyze(uploadedFile);
      setResult(analysisResult);
      onAnalysisComplete(analysisResult);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Analiz sırasında bir hata oluştu');
    } finally {
      setAnalyzing(false);
    }
  }, [onAnalyze, onAnalysisComplete]);

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: {
      'image/*': ['.png', '.jpg', '.jpeg', '.webp'],
      'application/pdf': ['.pdf'],
    },
    maxFiles: 1,
    disabled: isLoading || analyzing,
  });

  const clearFile = () => {
    setFile(null);
    setPreview(null);
    setResult(null);
    setError(null);
  };

  return (
    <div className="space-y-4">
      {!file ? (
        <div
          {...getRootProps()}
          className={`
            relative border-2 border-dashed rounded-xl p-8
            transition-all duration-200 cursor-pointer
            ${isDragActive
              ? 'border-primary-500 bg-primary-50'
              : 'border-gray-200 hover:border-primary-400 hover:bg-gray-50'
            }
          `}
        >
          <input {...getInputProps()} />
          <div className="flex flex-col items-center text-center">
            <div className={`
              p-4 rounded-full mb-4
              ${isDragActive ? 'bg-primary-100' : 'bg-gray-100'}
            `}>
              <Upload className={`h-8 w-8 ${isDragActive ? 'text-primary-600' : 'text-gray-400'}`} />
            </div>
            <p className="text-lg font-medium text-gray-700 mb-1">
              {isDragActive ? 'Dosyayı buraya bırakın' : 'Teknik resmi yükleyin'}
            </p>
            <p className="text-sm text-gray-500">
              PNG, JPG, WEBP veya PDF formatında dosya sürükleyin veya tıklayarak seçin
            </p>
          </div>
        </div>
      ) : (
        <div className="relative border border-gray-200 rounded-xl overflow-hidden">
          {/* Preview */}
          <div className="relative bg-gray-100">
            {file?.type === 'application/pdf' ? (
              // PDF için placeholder
              <div className="w-full h-64 flex flex-col items-center justify-center bg-gradient-to-br from-red-50 to-orange-50">
                <FileText className="h-16 w-16 text-red-500 mb-3" />
                <span className="text-sm font-medium text-gray-700">PDF Dosyası</span>
                <span className="text-xs text-gray-500 mt-1">{file.name}</span>
              </div>
            ) : preview ? (
              <img
                src={preview}
                alt="Teknik Resim"
                className="w-full h-64 object-contain"
              />
            ) : null}

            {/* Clear button */}
            <button
              onClick={clearFile}
              className="absolute top-3 right-3 p-1.5 bg-white rounded-full shadow-md hover:bg-gray-100 transition-colors"
            >
              <X className="h-4 w-4 text-gray-600" />
            </button>

            {/* Analyzing overlay */}
            {analyzing && (
              <div className="absolute inset-0 bg-black/50 flex items-center justify-center">
                <div className="bg-white rounded-lg px-6 py-4 flex items-center gap-3">
                  <Loader2 className="h-5 w-5 animate-spin text-primary-600" />
                  <span className="font-medium">GPT-5.2 analiz ediyor...</span>
                </div>
              </div>
            )}
          </div>

          {/* File info & status */}
          <div className="p-4 bg-white">
            <div className="flex items-center gap-3">
              <FileImage className="h-5 w-5 text-gray-400" />
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-gray-900 truncate">
                  {file.name}
                </p>
                <p className="text-xs text-gray-500">
                  {(file.size / 1024).toFixed(1)} KB
                </p>
              </div>

              {/* Status icon */}
              {result && (
                result.success ? (
                  <div className="flex items-center gap-1.5 text-green-600">
                    <CheckCircle className="h-5 w-5" />
                    <span className="text-sm font-medium">Analiz Tamamlandı</span>
                  </div>
                ) : (
                  <div className="flex items-center gap-1.5 text-red-600">
                    <AlertCircle className="h-5 w-5" />
                    <span className="text-sm font-medium">Analiz Başarısız</span>
                  </div>
                )
              )}
            </div>

            {/* Error message */}
            {error && (
              <div className="mt-3 p-3 bg-red-50 rounded-lg">
                <p className="text-sm text-red-700">{error}</p>
              </div>
            )}

            {/* Analysis notes */}
            {result?.raw_analysis && (
              <div className="mt-3 p-3 bg-blue-50 rounded-lg">
                <p className="text-sm text-blue-700">{result.raw_analysis}</p>
              </div>
            )}

            {/* Confidence score */}
            {result?.success && (
              <div className="mt-3">
                <div className="flex items-center justify-between text-sm mb-1">
                  <span className="text-gray-600">Güven Skoru</span>
                  <span className="font-medium">{(result.confidence * 100).toFixed(0)}%</span>
                </div>
                <div className="h-2 bg-gray-200 rounded-full overflow-hidden">
                  <div
                    className={`h-full rounded-full transition-all duration-500 ${
                      result.confidence > 0.8 ? 'bg-green-500' :
                      result.confidence > 0.6 ? 'bg-yellow-500' : 'bg-red-500'
                    }`}
                    style={{ width: `${result.confidence * 100}%` }}
                  />
                </div>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
