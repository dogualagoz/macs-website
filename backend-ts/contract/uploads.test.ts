import { beforeEach, describe, expect, test } from "bun:test";
import { api, resetState, SEED, signedToken, TARGET_URL } from "./client";
import { normalize, normalizeZip } from "./normalize";
const png = new Uint8Array([137, 80, 78, 71, 13, 10, 26, 10, 112, 97, 121, 108, 111, 97, 100]);
const file = (name: string, bytes = png) => ({ name, bytes, type: "image/png" });
const staff = () => signedToken(SEED.mod);
describe("uploads contract", () => {
  beforeEach(resetState);
  test("upload requires authentication", async () => { expect((await api("POST", "/api/upload/", { file: file("a.png") })).status).toBe(401); });
  test.each(["script.sh", "dosya"])("reject extension %s", async name => {
    const r = await api("POST", "/api/upload/", { token: await staff(), file: file(name) }); expect(r.status).toBe(400); expect(r.body).toEqual({ detail: "Sadece resim dosyaları yüklenebilir (jpg, jpeg, png, gif, webp)" });
  });
  test.each([["sahte.png", new TextEncoder().encode("MZ\u0090\u0000 not a png")], ["x.webp", new TextEncoder().encode("RIFF1234WAVE")], ["x.webp", new TextEncoder().encode("RIFF1234WEB")], ["x.png", png.subarray(0, 3)]] as const)("reject invalid image %s %p", async (name, bytes) => {
    const r = await api("POST", "/api/upload/", { token: await staff(), file: file(name, bytes) }); expect(r.status).toBe(400); expect(r.body).toEqual({ detail: "Dosya içeriği geçerli bir resim değil" });
  });
  test.each(["FOTO.PNG", "gecerli.png"])("accept %s with UUID v4 and serve bytes through both mounts", async name => {
    const r = await api("POST", "/api/upload/", { token: await staff(), file: file(name) }); expect(r.status).toBe(200);
    const { url } = r.body as { url: string }; expect(url).toMatch(/^\/uploads\/[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}\.png$/);
    for (const path of [url, `/static${url}`]) { const served = await api("GET", path); expect(served.status).toBe(200); expect(served.body).toEqual(png); }
  });
  test("oversized image gets exact 413", async () => {
    const bytes = new Uint8Array(5242880 + png.length); bytes.set(png);
    const r = await api("POST", "/api/upload/", { token: await staff(), file: file("large.png", bytes) }); expect(r.status).toBe(413); expect(r.body).toEqual({ detail: "Dosya çok büyük. Sınır: 5 MB" });
  });
  test("wrong multipart field gets exact missing-file validation", async () => {
    const body = new FormData(); body.set("dosya", new Blob([png]), "x.png");
    const r = await fetch(`${TARGET_URL}/api/upload/`, { method: "POST", headers: { Authorization: `Bearer ${await staff()}` }, body });
    expect(r.status).toBe(422); expect(normalize("/api/upload/", await r.json())).toEqual({ detail: [{ type: "missing", loc: ["body", "file"], msg: "Field required", input: null }] });
  });
  test("missing static files return JSON 404", async () => {
    for (const path of ["/uploads/yok.png", "/static/uploads/yok.png"]) { const r = await api("GET", path); expect(r.status).toBe(404); expect(r.body).toEqual({ detail: "Not Found" }); }
  });
  test("download-all requires admin", async () => { const r = await api("GET", "/api/upload/download-all", { token: await staff() }); expect(r.status).toBe(403); expect(r.body).toEqual({ detail: "Bu işlem için yetkiniz yok" }); });
  test("download-all is complete ZIP with uploaded filenames at root", async () => {
    const uploaded: { name: string; data: string }[] = [];
    for (const name of ["one.png", "two.png"]) {
      const r = await api("POST", "/api/upload/", { token: await staff(), file: file(name) }); expect(r.status).toBe(200); uploaded.push({ name: (r.body as { url: string }).url.slice(9), data: Buffer.from(png).toString("base64") });
    }
    const r = await api("GET", "/api/upload/download-all", { token: await signedToken(SEED.admin, "admin") }); expect(r.status).toBe(200); expect(r.headers.get("content-type")).toBe("application/zip"); expect(r.headers.get("content-disposition")).toMatch(/filename="macs_uploads_\d{8}_\d{6}\.zip"/);
    expect(r.body).toBeInstanceOf(Uint8Array); const bytes = r.body as Uint8Array; expect([...bytes.slice(0, 4)]).toEqual([80, 75, 3, 4]);
    const entries = normalizeZip(bytes); for (const entry of uploaded) expect(entries).toContainEqual(entry);
  });
});
