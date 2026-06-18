/**
 * Static checks — P17 conversation delete-for-me wiring.
 */
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..", "..", "..");

const messages = fs.readFileSync(
  path.join(root, "artifacts/souq/src/pages/messages.tsx"),
  "utf8",
);
const openapi = fs.readFileSync(path.join(root, "lib/api-spec/openapi.yaml"), "utf8");
const customFetch = fs.readFileSync(
  path.join(root, "lib/api-client-react/src/custom-fetch.ts"),
  "utf8",
);
const conversations = fs.readFileSync(
  path.join(root, "artifacts/api-server/src/routes/conversations.ts"),
  "utf8",
);

const snackbar = fs.readFileSync(
  path.join(root, "artifacts/souq/src/components/chat-inbox-delete-undo-snackbar.tsx"),
  "utf8",
);
const bottomNavLayout = fs.readFileSync(
  path.join(root, "artifacts/souq/src/lib/bottom-nav-layout.ts"),
  "utf8",
);

assert.ok(messages.includes("useDeleteConversationForMe"), "messages.tsx must use useDeleteConversationForMe");
assert.ok(messages.includes("useRestoreConversationForMe"), "messages.tsx must use useRestoreConversationForMe");
assert.ok(messages.includes("restoreConversationsToInboxCache"), "messages.tsx must restore inbox cache on undo");
assert.ok(messages.includes("ChatInboxDeleteUndoSnackbar"), "messages.tsx must render bottom undo snackbar");
assert.ok(messages.includes("setDeleteUndoSnack"), "messages.tsx must track delete undo snack state");
assert.ok(snackbar.includes("UNDO_DURATION_MS = 5000"), "delete undo snackbar must last 5 seconds");
assert.ok(snackbar.includes('dir="rtl"'), "delete undo snackbar must use RTL layout");
assert.ok(
  bottomNavLayout.includes("INBOX_UNDO_SNACKBAR_BOTTOM_CLASS"),
  "bottom-nav-layout must define snackbar offset above BottomNav",
);
assert.ok(
  snackbar.includes("INBOX_UNDO_SNACKBAR_BOTTOM_CLASS"),
  "snackbar must sit above BottomNav + safe area",
);
assert.ok(messages.includes("runDeleteConversations"), "messages.tsx must define runDeleteConversations");
assert.ok(
  messages.includes("deleteConversationMutation.mutateAsync"),
  "delete must call deleteConversationMutation",
);
assert.ok(
  !messages.includes('runHideConversations(pendingConfirm.ids, "p5.chat.inbox.delete_success")'),
  "delete confirm must not call runHideConversations",
);

assert.ok(openapi.includes("/conversations/{convId}/delete-for-me"), "openapi delete-for-me");
assert.ok(openapi.includes("/conversations/{convId}/restore-for-me"), "openapi restore-for-me");
assert.ok(openapi.includes("deleteConversationForMe"), "openapi operationId deleteConversationForMe");

assert.ok(conversations.includes("conversationDeletesTable"), "API must use conversationDeletesTable");
assert.ok(conversations.includes("deleteConversationForMeHandler"), "API delete handler");
assert.ok(conversations.includes("conversation_deletes cd"), "inbox SQL must filter deletes");

assert.ok(customFetch.includes("CONV_POST_DELETE_FOR_ME"), "custom-fetch must attach CSRF for delete-for-me");
assert.ok(customFetch.includes("CONV_POST_RESTORE_FOR_ME"), "custom-fetch must attach CSRF for restore-for-me");

const ar = fs.readFileSync(
  path.join(root, "artifacts/souq/src/i18n/locales/ar.json"),
  "utf8",
);
const arJson = JSON.parse(ar);
assert.ok(
  !String(arJson["p5.chat.inbox.delete_confirm_desc_one"] ?? "").includes("الطرف الآخر"),
  "ar delete_confirm_desc_one must not mention other party",
);
assert.ok(
  String(arJson["p5.chat.inbox.delete_confirm_desc_one"] ?? "").includes("قائمة رسائلك"),
  "ar delete_confirm_desc_one must use messages list copy",
);
assert.ok(arJson["p5.chat.inbox.delete_undo_label"], "ar delete_undo_label required");

console.log(JSON.stringify({ ok: true, static: "PASS" }));
