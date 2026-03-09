const API = "http://localhost:3000/api/files";
const fileList = document.getElementById("file-list");
const uploadForm = document.getElementById("upload-form");
const fileInput = document.getElementById("file-input");
const descriptionInput = document.getElementById("description-input");

function formatSize(bytes) {
  if (bytes === 0) return "0 B";
  const units = ["B", "KB", "MB", "GB"];
  const i = Math.floor(Math.log(bytes) / Math.log(1024));
  return (bytes / Math.pow(1024, i)).toFixed(i > 0 ? 1 : 0) + " " + units[i];
}

function formatDate(dateStr) {
  return new Date(dateStr).toLocaleDateString("id-ID", { day: "numeric", month: "short", year: "numeric" });
}

async function loadFiles() {
  try {
    const res = await fetch(API);
    const files = await res.json();
    fileList.innerHTML = "";
    if (files.length === 0) {
      fileList.innerHTML = `<tr><td colspan="5" class="text-center text-muted py-3">Belum ada file</td></tr>`;
      return;
    }
    files.forEach(f => {
      fileList.innerHTML += `
        <tr>
          <td><i class="bi bi-file-earmark text-primary me-2"></i>${f.filename}</td>
          <td>${formatSize(f.size)}</td>
          <td>${f.description || "-"}</td>
          <td>${formatDate(f.upload_date)}</td>
          <td class="text-end">
            <div class="btn-group btn-group-sm me-1">
              <button type="button" class="btn btn-outline-primary dropdown-toggle" data-bs-toggle="dropdown">
                <i class="bi bi-download"></i> Download
              </button>
              <ul class="dropdown-menu">
                <li><a class="dropdown-item" href="#" onclick="downloadFile('${f.id}')"><i class="bi bi-download me-2"></i>Download</a></li>
                <li><a class="dropdown-item" href="#" onclick="directDownload('${f.s3_url}')"><i class="bi bi-box-arrow-up-right me-2"></i>Direct Download</a></li>
              </ul>
            </div>
            <button class="btn btn-sm btn-outline-danger" onclick="deleteFile('${f.id}')">
              <i class="bi bi-trash"></i>
            </button>
          </td>
        </tr>`;
    });
  } catch (err) {
    console.error(err);
  }
}

uploadForm.addEventListener("submit", async (e) => {
  e.preventDefault();
  if (!fileInput.files[0]) return alert("Pilih file terlebih dahulu");
  const formData = new FormData();
  formData.append("file", fileInput.files[0]);
  formData.append("description", descriptionInput.value);
  try {
    const res = await fetch(API + "/upload", { method: "POST", body: formData });
    if (!res.ok) throw new Error("Upload gagal");
    fileInput.value = "";
    descriptionInput.value = "";
    loadFiles();
  } catch (err) {
    alert(err.message);
  }
});

async function downloadFile(id) {
  try {
    const res = await fetch(API + "/" + id + "/download");
    const data = await res.json();
    window.open(data.downloadUrl, "_blank");
  } catch (err) {
    alert("Download gagal");
  }
}

function directDownload(s3Url) {
  // TODO: implementasi via AWS SDK JS dengan IAM GET-only
  window.open(s3Url, "_blank");
}

async function deleteFile(id) {
  if (!confirm("Yakin ingin menghapus file ini?")) return;
  try {
    await fetch(API + "/" + id, { method: "DELETE" });
    loadFiles();
  } catch (err) {
    alert("Hapus gagal");
  }
}

loadFiles();
