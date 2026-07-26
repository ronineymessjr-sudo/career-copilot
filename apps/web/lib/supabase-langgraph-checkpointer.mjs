import { BaseCheckpointSaver, WRITES_IDX_MAP, copyCheckpoint } from "@langchain/langgraph-checkpoint";
import { dataRequest } from "@/lib/supabase-control";

const FORBIDDEN_KEYS = new Set(["__proto__", "prototype", "constructor"]);

function safeKey(value, name, allowEmpty = false) {
  const text = String(value ?? "");
  if ((!allowEmpty && !text) || text.length > 255 || FORBIDDEN_KEYS.has(text)) {
    throw new Error(`Invalid ${name}`);
  }
  return text;
}

function bytesToBase64(value) {
  const bytes = typeof value === "string" ? new TextEncoder().encode(value) : value;
  let binary = "";
  for (let index = 0; index < bytes.length; index += 1) binary += String.fromCharCode(bytes[index]);
  return btoa(binary);
}

function base64ToBytes(value) {
  const binary = atob(String(value ?? ""));
  const bytes = new Uint8Array(binary.length);
  for (let index = 0; index < binary.length; index += 1) bytes[index] = binary.charCodeAt(index);
  return bytes;
}

function configuration(config) {
  const configurable = config?.configurable ?? {};
  return {
    threadId: safeKey(configurable.thread_id, "thread_id"),
    checkpointNs: safeKey(configurable.checkpoint_ns ?? "", "checkpoint_ns", true),
    checkpointId: configurable.checkpoint_id ? safeKey(configurable.checkpoint_id, "checkpoint_id") : "",
  };
}

export class SupabaseCheckpointSaver extends BaseCheckpointSaver {
  constructor(auth, serde) {
    super(serde);
    this.auth = auth;
  }

  async getTuple(config) {
    const { threadId, checkpointNs, checkpointId } = configuration(config);
    const filters = [
      `user_id=eq.${encodeURIComponent(this.auth.userId)}`,
      `thread_id=eq.${encodeURIComponent(threadId)}`,
      `checkpoint_ns=eq.${encodeURIComponent(checkpointNs)}`,
    ];
    if (checkpointId) filters.push(`checkpoint_id=eq.${encodeURIComponent(checkpointId)}`);
    const rows = await dataRequest(this.auth, `langgraph_checkpoints?select=*&${filters.join("&")}&order=created_at.desc&limit=1`);
    const row = rows?.[0];
    if (!row) return undefined;
    const [checkpoint, metadata] = await Promise.all([
      this.serde.loadsTyped(row.checkpoint_type, base64ToBytes(row.checkpoint_payload)),
      this.serde.loadsTyped(row.metadata_type, base64ToBytes(row.metadata_payload)),
    ]);
    const writes = await dataRequest(
      this.auth,
      `langgraph_writes?select=*&user_id=eq.${encodeURIComponent(this.auth.userId)}&thread_id=eq.${encodeURIComponent(threadId)}&checkpoint_ns=eq.${encodeURIComponent(checkpointNs)}&checkpoint_id=eq.${encodeURIComponent(row.checkpoint_id)}&order=task_id.asc,idx.asc`,
    );
    const pendingWrites = [];
    for (const write of writes ?? []) {
      pendingWrites.push([
        write.task_id,
        write.channel,
        await this.serde.loadsTyped(write.value_type, base64ToBytes(write.value_payload)),
      ]);
    }
    const tuple = {
      config: {
        configurable: {
          ...config.configurable,
          thread_id: threadId,
          checkpoint_ns: checkpointNs,
          checkpoint_id: row.checkpoint_id,
        },
      },
      checkpoint,
      metadata,
      pendingWrites,
    };
    if (row.parent_checkpoint_id) {
      tuple.parentConfig = {
        configurable: {
          ...config.configurable,
          thread_id: threadId,
          checkpoint_ns: checkpointNs,
          checkpoint_id: row.parent_checkpoint_id,
        },
      };
    }
    return tuple;
  }

  async *list(config, options = {}) {
    const { threadId, checkpointNs } = configuration(config);
    const limit = Math.max(1, Math.min(Number(options.limit ?? 20), 100));
    let resource = `langgraph_checkpoints?select=*&user_id=eq.${encodeURIComponent(this.auth.userId)}&thread_id=eq.${encodeURIComponent(threadId)}&checkpoint_ns=eq.${encodeURIComponent(checkpointNs)}&order=created_at.desc&limit=${limit}`;
    const beforeId = options.before?.configurable?.checkpoint_id;
    if (beforeId) resource += `&checkpoint_id=lt.${encodeURIComponent(String(beforeId))}`;
    const rows = await dataRequest(this.auth, resource);
    for (const row of rows ?? []) {
      const tuple = await this.getTuple({ configurable: { ...config.configurable, checkpoint_id: row.checkpoint_id } });
      if (tuple) yield tuple;
    }
  }

  async put(config, checkpoint, metadata, _newVersions) {
    const { threadId, checkpointNs, checkpointId } = configuration(config);
    const preparedCheckpoint = copyCheckpoint(checkpoint);
    const [[checkpointType, checkpointPayload], [metadataType, metadataPayload]] = await Promise.all([
      this.serde.dumpsTyped(preparedCheckpoint),
      this.serde.dumpsTyped(metadata),
    ]);
    await dataRequest(this.auth, "langgraph_checkpoints?on_conflict=user_id,thread_id,checkpoint_ns,checkpoint_id", {
      method: "POST",
      headers: { Prefer: "resolution=merge-duplicates,return=minimal" },
      body: JSON.stringify([{
        user_id: this.auth.userId,
        thread_id: threadId,
        checkpoint_ns: checkpointNs,
        checkpoint_id: safeKey(checkpoint.id, "checkpoint_id"),
        parent_checkpoint_id: checkpointId || null,
        checkpoint_type: checkpointType,
        checkpoint_payload: bytesToBase64(checkpointPayload),
        metadata_type: metadataType,
        metadata_payload: bytesToBase64(metadataPayload),
      }]),
    });
    return {
      configurable: {
        ...config.configurable,
        thread_id: threadId,
        checkpoint_ns: checkpointNs,
        checkpoint_id: checkpoint.id,
      },
    };
  }

  async putWrites(config, writes, taskId) {
    const { threadId, checkpointNs, checkpointId } = configuration(config);
    const safeTaskId = safeKey(taskId, "task_id");
    if (!checkpointId) throw new Error("checkpoint_id is required for writes");
    const rows = [];
    for (let index = 0; index < writes.length; index += 1) {
      const [channel, value] = writes[index];
      const [valueType, valuePayload] = await this.serde.dumpsTyped(value);
      rows.push({
        user_id: this.auth.userId,
        thread_id: threadId,
        checkpoint_ns: checkpointNs,
        checkpoint_id: checkpointId,
        task_id: safeTaskId,
        idx: WRITES_IDX_MAP[String(channel)] ?? index,
        channel: String(channel),
        value_type: valueType,
        value_payload: bytesToBase64(valuePayload),
      });
    }
    if (!rows.length) return;
    await dataRequest(this.auth, "langgraph_writes?on_conflict=user_id,thread_id,checkpoint_ns,checkpoint_id,task_id,idx", {
      method: "POST",
      headers: { Prefer: "resolution=merge-duplicates,return=minimal" },
      body: JSON.stringify(rows),
    });
  }

  async deleteThread(threadId) {
    const safeThreadId = safeKey(threadId, "thread_id");
    const filter = `user_id=eq.${encodeURIComponent(this.auth.userId)}&thread_id=eq.${encodeURIComponent(safeThreadId)}`;
    await Promise.all([
      dataRequest(this.auth, `langgraph_writes?${filter}`, { method: "DELETE" }),
      dataRequest(this.auth, `langgraph_checkpoints?${filter}`, { method: "DELETE" }),
    ]);
  }
}
