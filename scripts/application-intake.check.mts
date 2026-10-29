// node --experimental-strip-types --no-warnings scripts/application-intake.check.mts
import assert from "node:assert/strict";
import * as A from "../src/lib/application-intake.ts";
import { validateResumeUpload } from "../src/lib/security/upload-validation.ts";

const base = { slug: "consultor-abc12345", full_name: "Maria Silva", email: " MARIA@Exemplo.com ", consent_selection: true,
  file: { name: "cv.pdf", mime: "application/pdf", base64: "JVBERi0xLjQK" + "A".repeat(20) } };
const ok = A.ApplicationFormSchema.parse(base);
assert.equal(ok.email, "maria@exemplo.com"); assert.equal(ok.consent_talent_pool, false);
assert.throws(() => A.ApplicationFormSchema.parse({ ...base, consent_selection: false }));
assert.throws(() => A.ApplicationFormSchema.parse({ ...base, email: "x" }));
assert.throws(() => A.ApplicationFormSchema.parse({ ...base, full_name: "M" }));

assert.equal(A.normalizeLinkedin("linkedin.com/in/maria/"), "https://linkedin.com/in/maria");
assert.equal(A.normalizeLinkedin("https://www.linkedin.com/in/x"), "https://www.linkedin.com/in/x");
assert.equal(A.normalizeLinkedin("javascript:alert(1)"), "");
assert.equal(A.normalizeLinkedin("https://evil.com/linkedin.com"), "");
assert.equal(A.normalizeLinkedin("https://linkedin.com.evil.com/x"), "");
assert.equal(A.normalizePhone("+34 600 111 222"), "+34 600 111 222"); assert.equal(A.normalizePhone("abc"), "");

const rows = A.buildConsentRows({ consent_talent_pool: false, consent_client_sharing: false, consent_ai: false });
assert.deepEqual(rows.map((r) => r.purpose_code), ["selection_process"]);
const all = A.buildConsentRows({ consent_talent_pool: true, consent_client_sharing: true, consent_ai: true });
assert.deepEqual(all.map((r) => r.purpose_code), ["selection_process", "talent_pool", "client_sharing", "ai_analysis", "international_transfer"]);

assert.equal(await A.sha256Text("a"), "ca978112ca1bbdcafac231b39a23dc4da786eff8147c4e72b9807785afee48bb");
assert.throws(() => A.decodeBase64("***"));
const pdf = A.decodeBase64(btoa("%PDF-1.4\nhello"));
assert.equal(validateResumeUpload({ filename: "cv.pdf", bytes: pdf }).ok, true);
assert.equal(validateResumeUpload({ filename: "cv.pdf", bytes: A.decodeBase64(btoa("%PDF-1.4 /JavaScript (x)")) }).ok, false);
assert.equal(validateResumeUpload({ filename: "cv.exe", bytes: pdf }).ok, false);
console.log("CANDIDATURAS: TODOS OS TESTES OK");
