"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import {
  ArrowLeft,
  Send,
  ImagePlus,
  Paperclip,
  Video,
  X,
  FileText,
  FileSpreadsheet,
  Presentation,
  FileArchive,
  File,
  Upload,
} from "lucide-react";

interface Category {
  id: number;
  name: string;
  color: string | null;
}

interface UploadedImage {
  filename: string;
  originalName: string;
  filePath: string;
  fileSize: number;
  previewUrl: string; // local object URL for preview
}

interface UploadedAttachment {
  filename: string;
  originalName: string;
  filePath: string;
  fileSize: number;
  fileType: string;
}

function formatFileSize(bytes: number): string {
  if (bytes < 1024) return bytes + " B";
  if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + " KB";
  return (bytes / (1024 * 1024)).toFixed(1) + " MB";
}

function getFileIcon(mimeType: string) {
  if (mimeType.includes("pdf")) return <FileText size={20} className="text-red-500" />;
  if (mimeType.includes("word") || mimeType.includes("msword"))
    return <FileText size={20} className="text-blue-500" />;
  if (mimeType.includes("sheet") || mimeType.includes("excel"))
    return <FileSpreadsheet size={20} className="text-green-500" />;
  if (mimeType.includes("presentation") || mimeType.includes("powerpoint"))
    return <Presentation size={20} className="text-orange-500" />;
  if (mimeType.includes("zip")) return <FileArchive size={20} className="text-yellow-600" />;
  return <File size={20} className="text-gray-400" />;
}

export default function NewPostPage() {
  const params = useParams();
  const router = useRouter();
  const categoryId = params.id as string;

  const [category, setCategory] = useState<Category | null>(null);
  const [title, setTitle] = useState("");
  const [content, setContent] = useState("");
  const [videoUrl, setVideoUrl] = useState("");
  const [images, setImages] = useState<UploadedImage[]>([]);
  const [attachments, setAttachments] = useState<UploadedAttachment[]>([]);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");
  const [uploadingImages, setUploadingImages] = useState(false);
  const [uploadingAttachments, setUploadingAttachments] = useState(false);
  const [imageProgress, setImageProgress] = useState(0);
  const [attachProgress, setAttachProgress] = useState(0);
  const [dragOverImages, setDragOverImages] = useState(false);

  const imageInputRef = useRef<HTMLInputElement>(null);
  const attachInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    fetch(`/api/categories/${categoryId}/posts`)
      .then((res) => res.json())
      .then((data) => {
        if (data.category) setCategory(data.category);
      })
      .catch(() => {});
  }, [categoryId]);

  // Cleanup object URLs on unmount
  useEffect(() => {
    return () => {
      images.forEach((img) => URL.revokeObjectURL(img.previewUrl));
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const uploadFile = useCallback(
    async (file: globalThis.File, type: "image" | "attachment") => {
      const token = localStorage.getItem("token");
      if (!token) throw new Error("请先登录");

      const formData = new FormData();
      formData.append("file", file);
      formData.append("type", type);

      const res = await fetch("/api/upload", {
        method: "POST",
        headers: { Authorization: `Bearer ${token}` },
        body: formData,
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || "上传失败");
      }

      return res.json();
    },
    []
  );

  async function handleImageUpload(files: FileList | null) {
    if (!files || files.length === 0) return;

    const remaining = 9 - images.length;
    if (remaining <= 0) {
      setError("最多上传9张图片");
      return;
    }

    const filesToUpload = Array.from(files).slice(0, remaining);
    setUploadingImages(true);
    setImageProgress(0);
    setError("");

    const newImages: UploadedImage[] = [];
    for (let i = 0; i < filesToUpload.length; i++) {
      try {
        const data = await uploadFile(filesToUpload[i], "image");
        const previewUrl = URL.createObjectURL(filesToUpload[i]);
        newImages.push({ ...data, previewUrl });
        setImageProgress(Math.round(((i + 1) / filesToUpload.length) * 100));
      } catch (err) {
        setError(err instanceof Error ? err.message : "图片上传失败");
      }
    }

    setImages((prev) => [...prev, ...newImages]);
    setUploadingImages(false);
    setImageProgress(0);
    if (imageInputRef.current) imageInputRef.current.value = "";
  }

  async function handleAttachmentUpload(files: FileList | null) {
    if (!files || files.length === 0) return;

    const remaining = 5 - attachments.length;
    if (remaining <= 0) {
      setError("最多上传5个附件");
      return;
    }

    const filesToUpload = Array.from(files).slice(0, remaining);
    setUploadingAttachments(true);
    setAttachProgress(0);
    setError("");

    const newAttachments: UploadedAttachment[] = [];
    for (let i = 0; i < filesToUpload.length; i++) {
      try {
        const data = await uploadFile(filesToUpload[i], "attachment");
        newAttachments.push(data);
        setAttachProgress(Math.round(((i + 1) / filesToUpload.length) * 100));
      } catch (err) {
        setError(err instanceof Error ? err.message : "附件上传失败");
      }
    }

    setAttachments((prev) => [...prev, ...newAttachments]);
    setUploadingAttachments(false);
    setAttachProgress(0);
    if (attachInputRef.current) attachInputRef.current.value = "";
  }

  function removeImage(index: number) {
    setImages((prev) => {
      const removed = prev[index];
      URL.revokeObjectURL(removed.previewUrl);
      return prev.filter((_, i) => i !== index);
    });
  }

  function removeAttachment(index: number) {
    setAttachments((prev) => prev.filter((_, i) => i !== index));
  }

  function handleImageDrop(e: React.DragEvent) {
    e.preventDefault();
    setDragOverImages(false);
    handleImageUpload(e.dataTransfer.files);
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!title.trim() || !content.trim()) return;

    setSubmitting(true);
    setError("");

    try {
      const token = localStorage.getItem("token");
      if (!token) {
        setError("请先登录后再发帖");
        setSubmitting(false);
        return;
      }

      const res = await fetch(`/api/categories/${categoryId}/posts`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          title,
          content,
          video_url: videoUrl.trim() || undefined,
          images: images.map(({ filename, originalName, filePath, fileSize }) => ({
            filename,
            originalName,
            filePath,
            fileSize,
          })),
          attachments: attachments.map(
            ({ filename, originalName, filePath, fileSize, fileType }) => ({
              filename,
              originalName,
              filePath,
              fileSize,
              fileType,
            })
          ),
        }),
      });

      const data = await res.json();

      if (!res.ok) {
        setError(data.error || "发帖失败");
        setSubmitting(false);
        return;
      }

      router.push(`/community/${categoryId}`);
    } catch {
      setError("网络错误，请稍后重试");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="max-w-3xl mx-auto px-4 sm:px-6 py-10 sm:py-14">
      {/* Back link */}
      <Link
        href={`/community/${categoryId}`}
        className="inline-flex items-center gap-1.5 text-sm text-text-muted hover:text-primary transition-colors mb-6"
      >
        <ArrowLeft size={16} />
        返回{category ? `「${category.name}」` : "板块"}
      </Link>

      <div className="card p-6 sm:p-8">
        <h1 className="font-serif text-2xl font-bold mb-6">发布新帖</h1>

        {category && (
          <div className="mb-6 pb-4 border-b border-border-light">
            <span className="text-sm text-text-muted">发布到：</span>
            <span
              className="ml-2 px-2.5 py-1 text-sm rounded-md"
              style={{
                color: category.color || "#8B6F47",
                backgroundColor: `${category.color || "#8B6F47"}15`,
              }}
            >
              {category.name}
            </span>
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-5">
          {/* Title */}
          <div>
            <label
              htmlFor="title"
              className="block text-sm font-medium text-text-primary mb-1.5"
            >
              帖子标题
            </label>
            <input
              id="title"
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="写一个吸引人的标题..."
              maxLength={100}
              className="w-full px-4 py-3 bg-bg border border-border rounded-lg text-text-primary placeholder:text-text-muted focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary/20 transition-colors"
            />
            <div className="text-xs text-text-muted mt-1 text-right">
              {title.length}/100
            </div>
          </div>

          {/* Content */}
          <div>
            <label
              htmlFor="content"
              className="block text-sm font-medium text-text-primary mb-1.5"
            >
              帖子内容
            </label>
            <textarea
              id="content"
              value={content}
              onChange={(e) => setContent(e.target.value)}
              placeholder="分享你的想法、经历、感悟..."
              rows={12}
              className="w-full px-4 py-3 bg-bg border border-border rounded-lg text-text-primary placeholder:text-text-muted resize-y focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary/20 transition-colors"
            />
          </div>

          {/* Image Upload */}
          <div>
            <label className="flex items-center gap-2 text-sm font-medium text-text-primary mb-2">
              <ImagePlus size={16} />
              图片上传
              <span className="text-text-muted font-normal">（最多9张，支持 JPG/PNG/GIF/WebP，单张≤5MB）</span>
            </label>

            {/* Drop zone */}
            <div
              className={`relative border-2 border-dashed rounded-lg p-6 text-center transition-colors cursor-pointer ${
                dragOverImages
                  ? "border-primary bg-primary/5"
                  : "border-border hover:border-primary/50"
              } ${images.length >= 9 ? "opacity-50 pointer-events-none" : ""}`}
              onClick={() => imageInputRef.current?.click()}
              onDragOver={(e) => {
                e.preventDefault();
                setDragOverImages(true);
              }}
              onDragLeave={() => setDragOverImages(false)}
              onDrop={handleImageDrop}
            >
              <Upload size={24} className="mx-auto mb-2 text-text-muted" />
              <p className="text-sm text-text-muted">
                点击或拖拽图片到此处上传
              </p>
              <input
                ref={imageInputRef}
                type="file"
                accept="image/jpeg,image/png,image/gif,image/webp"
                multiple
                className="hidden"
                onChange={(e) => handleImageUpload(e.target.files)}
              />
            </div>

            {/* Upload progress */}
            {uploadingImages && (
              <div className="mt-3">
                <div className="flex items-center justify-between text-xs text-text-muted mb-1">
                  <span>上传中...</span>
                  <span>{imageProgress}%</span>
                </div>
                <div className="h-1.5 bg-border rounded-full overflow-hidden">
                  <div
                    className="h-full bg-primary rounded-full transition-all duration-300"
                    style={{ width: `${imageProgress}%` }}
                  />
                </div>
              </div>
            )}

            {/* Image previews */}
            {images.length > 0 && (
              <div className="mt-3 grid grid-cols-3 sm:grid-cols-4 gap-3">
                {images.map((img, i) => (
                  <div key={i} className="relative group aspect-square">
                    <img
                      src={img.previewUrl}
                      alt={img.originalName}
                      className="absolute inset-0 w-full h-full object-cover rounded-lg"
                    />
                    <button
                      type="button"
                      onClick={() => removeImage(i)}
                      className="absolute -top-2 -right-2 w-6 h-6 bg-error text-white rounded-full flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity shadow-md"
                    >
                      <X size={12} />
                    </button>
                    <div className="absolute bottom-0 left-0 right-0 bg-black/50 text-white text-xs px-2 py-1 rounded-b-lg truncate">
                      {formatFileSize(img.fileSize)}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Attachment Upload */}
          <div>
            <label className="flex items-center gap-2 text-sm font-medium text-text-primary mb-2">
              <Paperclip size={16} />
              文件附件
              <span className="text-text-muted font-normal">（最多5个，支持 PDF/Word/Excel/PPT/ZIP，单个≤20MB）</span>
            </label>

            <button
              type="button"
              onClick={() => attachInputRef.current?.click()}
              disabled={attachments.length >= 5}
              className="inline-flex items-center gap-2 px-4 py-2.5 border border-dashed border-border rounded-lg text-sm text-text-secondary hover:border-primary/50 hover:text-primary transition-colors disabled:opacity-50 disabled:pointer-events-none"
            >
              <Paperclip size={14} />
              选择文件
            </button>
            <input
              ref={attachInputRef}
              type="file"
              accept=".pdf,.doc,.docx,.xls,.xlsx,.ppt,.pptx,.zip"
              multiple
              className="hidden"
              onChange={(e) => handleAttachmentUpload(e.target.files)}
            />

            {/* Upload progress */}
            {uploadingAttachments && (
              <div className="mt-3">
                <div className="flex items-center justify-between text-xs text-text-muted mb-1">
                  <span>上传中...</span>
                  <span>{attachProgress}%</span>
                </div>
                <div className="h-1.5 bg-border rounded-full overflow-hidden">
                  <div
                    className="h-full bg-primary rounded-full transition-all duration-300"
                    style={{ width: `${attachProgress}%` }}
                  />
                </div>
              </div>
            )}

            {/* Attachment list */}
            {attachments.length > 0 && (
              <div className="mt-3 space-y-2">
                {attachments.map((att, i) => (
                  <div
                    key={i}
                    className="flex items-center gap-3 px-3 py-2.5 bg-bg border border-border-light rounded-lg"
                  >
                    {getFileIcon(att.fileType)}
                    <div className="flex-1 min-w-0">
                      <p className="text-sm text-text-primary truncate">
                        {att.originalName}
                      </p>
                      <p className="text-xs text-text-muted">
                        {formatFileSize(att.fileSize)}
                      </p>
                    </div>
                    <button
                      type="button"
                      onClick={() => removeAttachment(i)}
                      className="p-1 text-text-muted hover:text-error transition-colors"
                    >
                      <X size={16} />
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Video URL */}
          <div>
            <label
              htmlFor="videoUrl"
              className="flex items-center gap-2 text-sm font-medium text-text-primary mb-1.5"
            >
              <Video size={16} />
              视频链接
              <span className="text-text-muted font-normal">（可选，支持B站、腾讯视频、YouTube）</span>
            </label>
            <input
              id="videoUrl"
              type="url"
              value={videoUrl}
              onChange={(e) => setVideoUrl(e.target.value)}
              placeholder="粘贴视频链接，如 https://www.bilibili.com/video/BV..."
              className="w-full px-4 py-3 bg-bg border border-border rounded-lg text-text-primary placeholder:text-text-muted focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary/20 transition-colors"
            />
            {videoUrl.trim() && (
              <p className="mt-1.5 text-xs text-text-muted">
                🎬 视频链接将在帖子中展示为可点击的外部链接
              </p>
            )}
          </div>

          {error && <p className="text-sm text-error">{error}</p>}

          <div className="flex items-center justify-end gap-3 pt-2">
            <Link
              href={`/community/${categoryId}`}
              className="px-5 py-2.5 text-sm text-text-secondary border border-border rounded-lg hover:border-primary hover:text-primary transition-colors"
            >
              取消
            </Link>
            <button
              type="submit"
              disabled={submitting || !title.trim() || !content.trim()}
              className="inline-flex items-center gap-2 px-6 py-2.5 bg-primary text-text-inverse text-sm font-medium rounded-lg hover:bg-primary-dark disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            >
              <Send size={14} />
              {submitting ? "发布中..." : "发布帖子"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
