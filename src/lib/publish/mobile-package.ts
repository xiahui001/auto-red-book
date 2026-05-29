import { buildEventwangMediaUrl } from "../collectors/eventwang-gallery";
import { WORKFLOW_IMAGES_PER_DRAFT } from "../workflow/run-config";

export type MobilePublishImageRef = {
  url?: string;
  localPath?: string;
  prompt?: string;
};

export type MobilePublishDraft = {
  id: string;
  accountName?: string;
  title: string;
  body: string;
  tags?: string[];
  generatedImages?: MobilePublishImageRef[];
  publishImages?: MobilePublishImageRef[];
};

export type MobilePublishPackage = {
  packageId: string;
  draftId: string;
  accountName: string;
  title: string;
  body: string;
  tags: string[];
  shareText: string;
  deeplinkUrl: string;
  imageUrls: string[];
  imageFiles: Array<{
    url: string;
    localPath?: string;
    filename: string;
  }>;
};

export const REQUIRED_MOBILE_PUBLISH_IMAGE_COUNT = WORKFLOW_IMAGES_PER_DRAFT;

export function selectMobilePublishImages(draft: MobilePublishDraft, maxImages = REQUIRED_MOBILE_PUBLISH_IMAGE_COUNT) {
  const source = draft.publishImages?.length ? draft.publishImages : draft.generatedImages ?? [];
  const seen = new Set<string>();
  const selected: Array<{ url: string; localPath?: string; filename: string }> = [];

  for (const [index, image] of source.entries()) {
    const url = image.url?.trim();
    const localPath = image.localPath?.trim();
    if (!url && !localPath) continue;

    const dedupeKey = localPath || url || "";
    if (seen.has(dedupeKey)) continue;
    seen.add(dedupeKey);

    selected.push({
      url: url || buildEventwangMediaUrl(localPath || ""),
      localPath: localPath || undefined,
      filename: buildImageFilename(draft.id, index, localPath || url || "")
    });

    if (selected.length >= maxImages) break;
  }

  return selected.filter((item) => Boolean(item.url));
}

export function buildXhsDiscoverPostUrl() {
  return "xhsdiscover://post";
}

export function buildMobilePublishPackage(draft: MobilePublishDraft, packageId: string): MobilePublishPackage {
  const title = draft.title.trim();
  const body = draft.body.trim();
  const tags = dedupeTags(draft.tags ?? []);
  const imageFiles = selectMobilePublishImages(draft, REQUIRED_MOBILE_PUBLISH_IMAGE_COUNT);
  const imageUrls = imageFiles.map((image) => image.url);

  return {
    packageId,
    draftId: draft.id,
    accountName: draft.accountName?.trim() || "",
    title,
    body,
    tags,
    shareText: buildShareText(title, body, tags),
    deeplinkUrl: buildXhsDiscoverPostUrl(),
    imageUrls,
    imageFiles
  };
}

export function buildMobilePublishHtml(pkg: MobilePublishPackage) {
  const payload = JSON.stringify(
    {
      packageId: pkg.packageId,
      draftId: pkg.draftId,
      accountName: pkg.accountName,
      title: pkg.title,
      body: pkg.body,
      tags: pkg.tags,
      shareText: pkg.shareText,
      deeplinkUrl: pkg.deeplinkUrl,
      imageUrls: pkg.imageUrls,
      downloadFilenames: pkg.imageFiles.map((image, index) => image.filename || `xhs-${index + 1}.jpg`)
    },
    null,
    2
  ).replace(/</g, "\\u003c");

  return `<!doctype html>
<html lang="zh-CN">
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1" />
  <title>${escapeHtml(pkg.title)} - 手机发布包</title>
  <style>
    :root { color-scheme: light; }
    * { box-sizing: border-box; }
    body {
      margin: 0;
      font-family: -apple-system,BlinkMacSystemFont,"PingFang SC","Microsoft YaHei",sans-serif;
      background: #f5f1ea;
      color: #1c1a17;
    }
    main {
      max-width: 760px;
      margin: 0 auto;
      padding: 20px 16px 40px;
    }
    header {
      display: grid;
      gap: 12px;
      padding: 18px;
      border: 1px solid rgba(28,26,23,.12);
      border-radius: 18px;
      background: rgba(255,255,255,.78);
    }
    h1 { margin: 0; font-size: 24px; line-height: 1.2; }
    .meta { display:flex; flex-wrap:wrap; gap:8px; color:#675f55; font-size:12px; }
    .pill { padding: 6px 10px; border-radius: 999px; background: rgba(28,26,23,.06); }
    .actions { display:grid; gap:10px; margin-top: 16px; }
    button {
      width: 100%;
      border: 0;
      font: inherit;
    }
    .mobile-publish-fallback {
      display:inline-flex;
      align-items:center;
      justify-content:center;
      min-height: 46px;
      padding: 0 14px;
      border-radius: 12px;
      color:#1c1a17;
      background: rgba(28,26,23,.08);
      font-size: 14px;
      font-weight: 700;
      text-decoration:none;
    }
    .step-button {
      display:grid;
      grid-template-columns: 68px 1fr;
      gap: 4px 12px;
      align-items:center;
      min-height: 78px;
      padding: 14px;
      border: 1px solid rgba(28,26,23,.1);
      border-radius: 14px;
      background:#fff;
      color:#1c1a17;
      text-align:left;
    }
    .step-button span {
      grid-row: span 2;
      display:grid;
      place-items:center;
      width: 68px;
      height: 36px;
      border-radius: 999px;
      background:#1c1a17;
      color:#fff;
      font-size: 12px;
      font-weight: 800;
      text-transform: uppercase;
    }
    .step-button strong { font-size: 16px; line-height: 1.25; }
    .step-button small { color:#685f55; font-size: 13px; line-height: 1.35; }
    .step-button:disabled { cursor: wait; opacity: .72; }
    .layout {
      display:grid;
      gap: 16px;
      margin-top: 16px;
    }
    .panel {
      padding: 16px;
      border: 1px solid rgba(28,26,23,.12);
      border-radius: 18px;
      background: rgba(255,255,255,.78);
    }
    .panel h2 { margin: 0 0 12px; font-size: 16px; }
    pre {
      margin: 0;
      padding: 14px;
      white-space: pre-wrap;
      word-break: break-word;
      border-radius: 14px;
      background: rgba(28,26,23,.06);
      font-size: 14px;
      line-height: 1.7;
    }
    .grid {
      display:grid;
      grid-template-columns: repeat(2, minmax(0, 1fr));
      gap: 10px;
    }
    .grid img {
      width: 100%;
      height: 180px;
      object-fit: cover;
      border-radius: 14px;
      background: #eee;
    }
    .note {
      color:#685f55;
      font-size: 13px;
      line-height: 1.6;
    }
    @media (max-width: 640px) {
      .grid { grid-template-columns: 1fr; }
      .grid img { height: 240px; }
    }
  </style>
</head>
<body>
  <main>
    <header>
      <div class="meta">
        <span class="pill">手机发送包</span>
        <span class="pill">${escapeHtml(pkg.accountName || "未绑定账号")}</span>
        <span class="pill">${pkg.imageUrls.length} 张图</span>
      </div>
      <h1>${escapeHtml(pkg.title)}</h1>
      <div class="note">${escapeHtml(pkg.body)}</div>
      <div class="meta">${pkg.tags.map((tag) => `<span class="pill">#${escapeHtml(tag)}</span>`).join("")}</div>
      <div class="actions" aria-label="手机发布步骤">
        <button class="step-button" id="save-images-btn" type="button">
          <span>Step 1</span>
          <strong>保存图片至手机</strong>
          <small>${pkg.imageUrls.length ? `点一次保存 ${pkg.imageUrls.length} 张图到手机` : "当前无配图，可跳过此步"}</small>
        </button>
        <button class="step-button" id="copy-text-btn" type="button">
          <span>Step 2</span>
          <strong>复制文案</strong>
          <small>复制标题、正文和标签</small>
        </button>
        <button class="step-button" id="open-xhs-btn" type="button">
          <span>Step 3</span>
          <strong>打开小红书发布</strong>
          <small>进入小红书发帖子选择照片的页面</small>
        </button>
      </div>
      <div class="note" id="status">发布包已就绪，请按顺序完成 3 步。</div>
    </header>

    <section class="layout">
      <article class="panel">
        <h2>文案</h2>
        <pre id="copy-source"></pre>
      </article>
      <article class="panel">
        <h2>图片</h2>
        <div class="grid" id="images"></div>
      </article>
    </section>
  </main>

  <script id="package-data" type="application/json">${payload}</script>
  <script>
    const data = JSON.parse(document.getElementById("package-data").textContent);
    const shareSource = document.getElementById("copy-source");
    const status = document.getElementById("status");
    const imagesRoot = document.getElementById("images");
    const saveImagesButton = document.getElementById("save-images-btn");
    const copyTextButton = document.getElementById("copy-text-btn");
    const openXhsButton = document.getElementById("open-xhs-btn");
    let shareFiles = null;
    let shareFilesError = "";

    shareSource.textContent = data.shareText;
    imagesRoot.innerHTML = data.imageUrls.length
      ? data.imageUrls.map((url, index) => (
        '<img alt="图片 ' + (index + 1) + '" src="' + url + '" />'
      )).join("")
      : '<p class="note">当前发布包没有配图，请直接复制文案后在小红书手动补图。</p>';

    async function buildShareFiles(imageUrls) {
      const files = [];
      for (let index = 0; index < imageUrls.length; index += 1) {
        const imageUrl = imageUrls[index];
        const response = await fetch(imageUrl);
        if (!response.ok) continue;
        const blob = await response.blob();
        const mime = blob.type || "image/jpeg";
        const extension = mime.includes("png") ? "png" : mime.includes("webp") ? "webp" : "jpg";
        files.push(new File([blob], 'xhs-' + (index + 1) + '.' + extension, { type: mime }));
      }
      return files;
    }

    function shouldUseSystemShareFiles() {
      return isIosUserAgent() && Boolean(navigator.share);
    }

    function isIosUserAgent() {
      return /iPad|iPhone|iPod/i.test(navigator.userAgent) || (navigator.platform === "MacIntel" && navigator.maxTouchPoints > 1);
    }

    function buildImageDownloadUrl(imageIndex) {
      return data.imageUrls[imageIndex] || "";
    }

    function startBrowserImageDownloads() {
      const batchSize = 2;
      data.imageUrls.forEach((_, index) => {
        const batchIndex = Math.floor(index / batchSize);
        const runDownload = () => triggerImageDownload(
          buildImageDownloadUrl(index),
          data.downloadFilenames[index] || "xhs-" + (index + 1) + ".jpg"
        );
        if (batchIndex === 0) {
          runDownload();
          return;
        }
        window.setTimeout(runDownload, batchIndex * 700);
      });
    }

    function triggerImageDownload(url, filename) {
      const anchor = document.createElement("a");
      anchor.href = url;
      anchor.download = filename;
      anchor.rel = "noopener";
      document.body.appendChild(anchor);
      anchor.click();
      anchor.remove();
    }

    function shouldFallbackToDownload(error) {
      const message = error instanceof Error ? error.message : String(error || "");
      const name = error && typeof error === "object" && "name" in error ? String(error.name) : "";
      return name === "NotAllowedError" || /permission denied|not allowed|not supported|canShare/i.test(message);
    }

    function saveErrorMessage(error) {
      const message = error instanceof Error ? error.message : String(error || "");
      const name = error && typeof error === "object" && "name" in error ? String(error.name) : "";
      if (name === "AbortError") return "已取消系统分享。";
      if (name === "NotAllowedError" || /permission denied/i.test(message)) {
        return "当前浏览器拒绝系统保存，已切换为下载保存。";
      }
      return message || "保存图片失败";
    }

    async function prepareShareFiles() {
      shareFiles = null;
      shareFilesError = "";

      if (!data.imageUrls.length) {
        shareFiles = [];
        return;
      }
      if (!shouldUseSystemShareFiles()) {
        shareFiles = [];
        status.textContent = "发布包已就绪，请按顺序完成 3 步。";
        return;
      }

      saveImagesButton.disabled = true;
      status.textContent = "正在准备 " + data.imageUrls.length + " 张图片分享文件";

      try {
        const files = await buildShareFiles(data.imageUrls);
        shareFiles = files;
        status.textContent = files.length
          ? "发布包已就绪，请按顺序完成 3 步。"
          : "图片文件未能加载，无法保存到手机。";
      } catch (error) {
        shareFilesError = error instanceof Error ? error.message : "图片文件准备失败，请重新生成发布码";
        status.textContent = shareFilesError;
      } finally {
        saveImagesButton.disabled = false;
      }
    }

    void prepareShareFiles();

    saveImagesButton.addEventListener("click", async () => {
      saveImagesButton.disabled = true;
      try {
        if (!data.imageUrls.length) {
          status.textContent = "当前没有配图，请跳过 Step 1，直接复制文案并打开小红书。";
          return;
        }
        if (!shouldUseSystemShareFiles()) {
          startBrowserImageDownloads();
          status.textContent = "已开始下载 " + data.imageUrls.length + " 张图片，完成后在小红书选择“下载”相册。";
          return;
        }
        status.textContent = "正在打开系统分享菜单";
        if (shareFiles === null) {
          throw new Error(shareFilesError || "图片仍在准备，请稍后再点 Step 1");
        }
        const files = shareFiles;
        if (!files.length) {
          throw new Error("图片文件未能加载，无法保存到手机");
        }
        if (navigator.canShare && !navigator.canShare({ files })) {
          startBrowserImageDownloads();
          status.textContent = "当前浏览器不支持多图系统保存，已改为下载 " + data.imageUrls.length + " 张图片。";
          return;
        }
        await navigator.share({ files });
        status.textContent = "系统菜单已打开，请选择保存图片或存储到照片。";
      } catch (error) {
        if (shouldUseSystemShareFiles() && shouldFallbackToDownload(error)) {
          startBrowserImageDownloads();
          status.textContent = "系统保存不可用，已改为下载 " + data.imageUrls.length + " 张图片。";
        } else {
          status.textContent = saveErrorMessage(error);
        }
      } finally {
        saveImagesButton.disabled = false;
      }
    });

    copyTextButton.addEventListener("click", async () => {
      try {
        await navigator.clipboard.writeText(data.shareText);
        status.textContent = "文案已复制，可以粘贴到小红书发布页。";
      } catch (error) {
        status.textContent = "当前浏览器未授权复制，请长按下方文案手动复制。";
      }
    });

    openXhsButton.addEventListener("click", () => {
      status.textContent = "正在打开小红书发布入口。";
      window.location.href = data.deeplinkUrl;
    });
  </script>
</body>
</html>`;
}

function buildShareText(title: string, body: string, tags: string[]) {
  const tagText = tags.map((tag) => `#${tag}`).join(" ");
  return [title, body, tagText].filter(Boolean).join("\n\n").trim();
}

function dedupeTags(tags: string[]) {
  const seen = new Set<string>();
  const result: string[] = [];

  for (const rawTag of tags) {
    const tag = rawTag.replace(/^#+/, "").trim();
    if (!tag || seen.has(tag)) continue;
    seen.add(tag);
    result.push(tag);
  }

  return result;
}

function buildImageFilename(draftId: string, index: number, value: string) {
  const ext = pathExt(value) || "jpg";
  return `${safeSegment(draftId)}-${String(index + 1).padStart(2, "0")}.${ext}`;
}

function pathExt(value: string) {
  const match = value.match(/\.([a-z0-9]+)(?:[?#]|$)/i);
  return match?.[1]?.toLowerCase() || "";
}

function safeSegment(value: string) {
  return value.replace(/[^a-z0-9_-]/gi, "-").slice(0, 32) || "draft";
}

function escapeHtml(value: string) {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

function escapeAttribute(value: string) {
  return escapeHtml(value).replace(/`/g, "&#96;");
}
