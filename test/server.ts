import { ColyseusTestServer, boot } from "@colyseus/testing";

import { __setVerifierForTest } from "../src/auth.js";
import appConfig from "../src/app.config.js";

// One test server for every test file: booting appConfig twice in one mocha run breaks the second
// boot. Mocha's --exit tears it down at the end.
let server: Promise<ColyseusTestServer<typeof appConfig>> | null = null;
// Tokens "tok-<id>" verify as account <id>; anything else is rejected (src/auth.ts).
__setVerifierForTest(async (t) => (t.startsWith("tok-") ? { id: t.slice(4) } : null));
export const testServer = () => (server ??= boot(appConfig));
