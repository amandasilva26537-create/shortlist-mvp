// node --experimental-strip-types --no-warnings scripts/candidate-contact.check.mts
import assert from "node:assert/strict";
import { validateContact, PROVISIONAL_STATUSES } from "../src/lib/candidate-contact.ts";
assert.deepEqual(validateContact({ email: "ana@x.com", phone: "+55 (11) 91234-5678" }), {});
assert.deepEqual(validateContact({ email: "ana@x.com", phone: "+34 612 345 678" }), {});
assert.ok(validateContact({ email: "", phone: "" }).email && validateContact({ email: "", phone: "" }).phone);
assert.ok(validateContact({ email: "   ", phone: "11912345678" }).email);
assert.ok(validateContact({ email: "ana@x", phone: "11912345678" }).email);
assert.ok(validateContact({ email: "ana@x.com", phone: "123" }).phone);
assert.ok(validateContact({ email: "ana@x.com", phone: "abc123456789" }).phone);
assert.ok(validateContact({ email: null, phone: null }).email);
assert.ok(PROVISIONAL_STATUSES.has("rascunho") && !PROVISIONAL_STATUSES.has("ativo"));
console.log("CONTATO DO CANDIDATO: TODOS OS TESTES OK");
