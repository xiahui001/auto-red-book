"use client";

import { useEffect, useMemo, useState } from "react";
import { buildMobilePublishActionSteps, type MobilePublishActionStep } from "@/lib/publish/mobile-actions";
import { createStoreZip, type StoreZipEntry } from "@/lib/publish/store-zip";

type MobilePackageData = {
  packageId: string;
  draftId: string;
  accountName: string;
  title: string;
  body: string;
  tags: string[];
  shareText: string;
  deeplinkUrl: string;
  imageUrls: string[];
  imageZipUrl?: string;
};

export default function MobilePublishPage() {
  const [packageData, setPackageData] = useState<MobilePackageData | null>(null);
  const [shareFiles, setShareFiles] = useState<File[] | null>(null);
  const [saveMode, setSaveMode] = useState<"archive" | "share">("archive");
  const [status, setStatus] = useState("正在加载发布包");
  const [busyAction, setBusyAction] = useState<MobilePublishActionStep["key"] | null>(null);

  useEffect(() => {
    const currentUrl = new URL(window.location.href);
    const nextDataUrl = resolvePackageDataUrl(currentUrl);

    if (!nextDataUrl) {
      setStatus("发布包链接无效，请重新生成二维码");
      return;
    }

    void loadPackage(nextDataUrl);
  }, []);

  const tagText = useMemo(() => packageData?.tags.map((tag) => `#${tag}`).join(" ") ?? "", [packageData]);
  const steps = useMemo(
    () => buildMobilePublishActionSteps(packageData?.imageUrls.length ?? 0),
    [packageData?.imageUrls.length]
  );

  useEffect(() => {
    if (!packageData) return;

    let cancelled = false;
    const nextSaveMode = shouldUseSystemShareFiles() ? "share" : "archive";
    setSaveMode(nextSaveMode);
    setShareFiles(null);

    if (!packageData.imageUrls.length) {
      setShareFiles([]);
      return;
    }

    if (nextSaveMode === "archive") {
      setShareFiles([]);
      setStatus("发布包已就绪，请按顺序完成 3 步");
      return;
    }

    setStatus(`正在准备 ${packageData.imageUrls.length} 张图片分享文件`);

    void buildShareFiles(packageData.imageUrls)
      .then((files) => {
        if (cancelled) return;
        setShareFiles(files);
        setStatus(files.length ? "发布包已就绪，请按顺序完成 3 步" : "图片文件未能加载，无法保存到本机");
      })
      .catch((error) => {
        if (cancelled) return;
        setStatus(error instanceof Error ? error.message : "图片文件准备失败，请重新生成发布码");
      });

    return () => {
      cancelled = true;
    };
  }, [packageData]);

  async function loadPackage(nextDataUrl: string) {
    try {
      const response = await fetch(nextDataUrl, { cache: "no-store" });
      if (!response.ok) throw new Error(`发布包数据加载失败：HTTP ${response.status}`);
      const payload = (await response.json()) as MobilePackageData;
      setPackageData(payload);
      setStatus("发布包已就绪，请按顺序完成 3 步");
    } catch (error) {
      setStatus(error instanceof Error ? error.message : "发布包数据加载失败");
    }
  }

  async function saveImagesToPhone() {
    if (!packageData) return;
    setBusyAction("save-images");

    try {
      if (!packageData.imageUrls.length) {
        throw new Error("当前没有配图，请跳过 Step 1，直接复制文案并打开小红书");
      }
      if (saveMode === "archive") {
        await downloadImagePackage(packageData, (completed, total) => {
          setStatus(`正在准备图片包 ${completed}/${total}`);
        });
        setStatus(`已开始下载图片包，解压后按 01-${String(packageData.imageUrls.length).padStart(2, "0")} 选择图片`);
        return;
      }

      setStatus("正在打开系统分享菜单");
      const files = shareFiles;
      if (!files) {
        throw new Error("图片仍在准备，请稍后再点 Step 1");
      }
      if (!navigator.share) throw new Error("当前浏览器不支持系统保存，已准备图片包下载方式");
      if (!files.length) {
        throw new Error("图片文件未能加载，无法保存到本机");
      }
      if (navigator.canShare && !navigator.canShare({ files })) {
        setSaveMode("archive");
        await downloadImagePackage(packageData, (completed, total) => {
          setStatus(`正在准备图片包 ${completed}/${total}`);
        });
        setStatus("当前浏览器不支持多图系统保存，已改为下载图片包");
        return;
      }

      await navigator.share({ files });
      setStatus("系统菜单已打开，请选择保存图片或存储到照片");
    } catch (error) {
      if (saveMode === "share" && shouldFallbackToDownload(error)) {
        setSaveMode("archive");
        await downloadImagePackage(packageData, (completed, total) => {
          setStatus(`正在准备图片包 ${completed}/${total}`);
        });
        setStatus("系统保存不可用，已改为下载图片包");
      } else {
        setStatus(buildSaveErrorMessage(error));
      }
    } finally {
      setBusyAction(null);
    }
  }

  async function copyText() {
    if (!packageData) return;
    setBusyAction("copy-text");

    try {
      await navigator.clipboard.writeText(packageData.shareText);
      setStatus("文案已复制，可以粘贴到小红书发布页");
    } catch {
      setStatus("当前浏览器未授权复制，请长按下方文案手动复制");
    } finally {
      setBusyAction(null);
    }
  }

  function openXhsPostEntry() {
    if (!packageData) return;
    setStatus("正在打开小红书发布入口");
    window.location.href = packageData.deeplinkUrl;
  }

  function runStep(stepKey: MobilePublishActionStep["key"]) {
    if (stepKey === "save-images") void saveImagesToPhone();
    if (stepKey === "copy-text") void copyText();
    if (stepKey === "open-xhs") openXhsPostEntry();
  }

  return (
    <main className="mobile-publish-shell">
      {packageData ? (
        <>
          <header className="mobile-publish-hero">
            <div className="mobile-publish-meta">
              <span>{packageData.accountName || "未绑定账号"}</span>
              <span>{packageData.imageUrls.length} 张图</span>
              <span>{packageData.packageId}</span>
            </div>
            <h1>{packageData.title}</h1>
            <div className="mobile-publish-status">{status}</div>
          </header>

          <section className="mobile-publish-panel mobile-publish-steps">
            {steps.map((step) => (
              <button
                className="mobile-step-button"
                disabled={busyAction !== null || (step.key === "save-images" && saveMode === "share" && shareFiles === null)}
                key={step.key}
                onClick={() => runStep(step.key)}
                type="button"
              >
                <span>{step.stepLabel}</span>
                <strong>{busyAction === step.key ? "处理中" : step.label}</strong>
                <small>{step.detail}</small>
              </button>
            ))}
          </section>

          <section className="mobile-publish-panel">
            <h2>文案</h2>
            <small className="mobile-publish-tags">{tagText}</small>
            <pre>{packageData.shareText}</pre>
          </section>

          <section className="mobile-publish-panel">
            <h2>图片</h2>
            <div className="mobile-publish-images">
              {packageData.imageUrls.map((imageUrl, index) => (
                // eslint-disable-next-line @next/next/no-img-element
                <img alt={`发布图 ${index + 1}`} key={imageUrl} src={imageUrl} />
              ))}
            </div>
          </section>
        </>
      ) : (
        <section className="mobile-publish-panel">
          <h1>手机发布包</h1>
          <p>{status}</p>
        </section>
      )}
    </main>
  );
}

function resolvePackageDataUrl(currentUrl: URL) {
  const dataUrl = currentUrl.searchParams.get("data")?.trim();
  if (dataUrl) return dataUrl;

  const packageId = currentUrl.pathname.split("/").filter(Boolean).at(-1)?.trim() ?? "";
  return packageId ? `/api/mobile-publish-packages/${packageId}` : "";
}

function shouldUseSystemShareFiles() {
  return isIosUserAgent() && Boolean(navigator.share);
}

function isIosUserAgent() {
  const userAgent = navigator.userAgent;
  return /iPad|iPhone|iPod/i.test(userAgent) || (navigator.platform === "MacIntel" && navigator.maxTouchPoints > 1);
}

async function downloadImagePackage(
  packageData: MobilePackageData,
  onProgress: (completed: number, total: number) => void
) {
  const filename = `xhs-${packageData.packageId}-images.zip`;
  if (packageData.imageZipUrl) {
    triggerImageDownload(packageData.imageZipUrl, filename);
    return;
  }

  try {
    const archive = await buildClientImageArchive(packageData.imageUrls, onProgress);
    triggerBlobDownload(archive, filename);
  } catch {
    triggerImageDownload(buildImagePackageDownloadUrl(packageData), filename);
  }
}

function triggerImageDownload(url: string, filename: string) {
  const anchor = document.createElement("a");
  anchor.href = url;
  anchor.download = filename;
  anchor.rel = "noopener";
  document.body.appendChild(anchor);
  anchor.click();
  anchor.remove();
}

function triggerBlobDownload(blob: Blob, filename: string) {
  const url = URL.createObjectURL(blob);
  triggerImageDownload(url, filename);
  window.setTimeout(() => URL.revokeObjectURL(url), 30_000);
}

function buildImagePackageDownloadUrl(packageData: MobilePackageData) {
  return packageData.imageZipUrl || `/api/mobile-publish-packages/${encodeURIComponent(packageData.packageId)}/images.zip`;
}

async function buildClientImageArchive(
  imageUrls: string[],
  onProgress: (completed: number, total: number) => void
) {
  let completed = 0;
  const entries = await mapWithConcurrency(imageUrls, 3, async (imageUrl, index): Promise<StoreZipEntry> => {
    const response = await fetch(imageUrl, { cache: "no-store" });
    if (!response.ok) throw new Error(`图片加载失败：HTTP ${response.status}`);

    const blob = await response.blob();
    const mime = blob.type || response.headers.get("content-type") || "image/jpeg";
    const entry = {
      filename: `${String(index + 1).padStart(2, "0")}.${extensionForImage(mime, imageUrl)}`,
      data: new Uint8Array(await blob.arrayBuffer())
    };
    completed += 1;
    onProgress(completed, imageUrls.length);
    return entry;
  });

  return new Blob([createStoreZip(entries)], { type: "application/zip" });
}

async function mapWithConcurrency<T, R>(items: T[], concurrency: number, worker: (item: T, index: number) => Promise<R>) {
  const results = new Array<R>(items.length);
  let nextIndex = 0;
  const workerCount = Math.min(Math.max(1, concurrency), items.length);

  await Promise.all(
    Array.from({ length: workerCount }, async () => {
      while (nextIndex < items.length) {
        const currentIndex = nextIndex;
        nextIndex += 1;
        results[currentIndex] = await worker(items[currentIndex], currentIndex);
      }
    })
  );

  return results;
}

function extensionForImage(contentType: string, sourceName: string) {
  const lowerType = contentType.toLowerCase();
  if (lowerType.includes("png")) return "png";
  if (lowerType.includes("webp")) return "webp";
  if (lowerType.includes("gif")) return "gif";

  const match = sourceName.match(/\.([a-z0-9]+)(?:[?#]|$)/i);
  const sourceExtension = match?.[1]?.toLowerCase() || "";
  if (["jpg", "jpeg", "png", "webp", "gif"].includes(sourceExtension)) {
    return sourceExtension === "jpeg" ? "jpg" : sourceExtension;
  }

  return "jpg";
}

function shouldFallbackToDownload(error: unknown) {
  const message = error instanceof Error ? error.message : String(error || "");
  const name = typeof error === "object" && error !== null && "name" in error ? String(error.name) : "";
  return name === "NotAllowedError" || /permission denied|not allowed|not supported|canShare/i.test(message);
}

function buildSaveErrorMessage(error: unknown) {
  const message = error instanceof Error ? error.message : String(error || "");
  const name = typeof error === "object" && error !== null && "name" in error ? String(error.name) : "";

  if (name === "AbortError") {
    return "已取消系统分享";
  }

  if (name === "NotAllowedError" || /permission denied/i.test(message)) {
    return "当前浏览器拒绝系统保存，已切换为下载保存";
  }

  return message || "保存图片失败";
}

async function buildShareFiles(imageUrls: string[]) {
  const files: File[] = [];

  for (let index = 0; index < imageUrls.length; index += 1) {
    const imageUrl = imageUrls[index];
    const response = await fetch(imageUrl);
    if (!response.ok) continue;

    const blob = await response.blob();
    const mime = blob.type || "image/jpeg";
    const extension = mime.includes("png") ? "png" : mime.includes("webp") ? "webp" : "jpg";
    files.push(new File([blob], `xhs-${index + 1}.${extension}`, { type: mime }));
  }

  return files;
}
