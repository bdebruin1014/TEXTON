import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import cookieParser from "cookie-parser";
import cors from "cors";
import express, { type NextFunction, type Request, type Response } from "express";
import { v4 as uuidv4 } from "uuid";

// ---------------------------------------------------------------------------
// Environment
// ---------------------------------------------------------------------------

const SUPABASE_URL = process.env.SUPABASE_URL ?? "";
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY ?? "";
const SESSION_SECRET = process.env.SESSION_SECRET ?? "change-me";
const PORT = Number(process.env.PORT ?? 3001);
const CORS_ORIGIN = process.env.CORS_ORIGIN ?? "http://localhost:5173";

if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) {
  console.error("Missing SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY");
  process.exit(1);
}

// ---------------------------------------------------------------------------
// Supabase admin client (service-role key — bypasses RLS)
// ---------------------------------------------------------------------------

const supabase: SupabaseClient = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, {
  auth: { autoRefreshToken: false, persistSession: false },
});

// ---------------------------------------------------------------------------
// Session store (in-memory — swap for Redis in production)
// ---------------------------------------------------------------------------

interface Session {
  userId: string;
  email: string;
  expiry: number;
}

const sessions = new Map<string, Session>();

const SESSION_TTL_MS = 8 * 60 * 60 * 1000; // 8 hours

function authenticateSession(req: Request): Session {
  const sessionId = req.cookies?.kova_dav_session;
  if (!sessionId) {
    throw new Error("No session");
  }
  const session = sessions.get(sessionId);
  if (!session || session.expiry < Date.now()) {
    sessions.delete(sessionId!);
    throw new Error("Session expired");
  }
  return session;
}

// ---------------------------------------------------------------------------
// Express app
// ---------------------------------------------------------------------------

const app = express();

app.use(
  cors({
    origin: CORS_ORIGIN,
    credentials: true,
  }),
);

app.use(cookieParser(SESSION_SECRET));

// Parse raw body for PUT (file uploads from Office)
app.use("/files", express.raw({ type: () => true, limit: "100mb" }));

// JSON parsing for auth endpoints
app.use("/auth", express.json());

// ---------------------------------------------------------------------------
// POST /auth/session — Create a WebDAV session
// ---------------------------------------------------------------------------

app.post("/auth/session", async (req: Request, res: Response): Promise<void> => {
  try {
    const authHeader = req.headers.authorization;
    if (!authHeader?.startsWith("Bearer ")) {
      res.status(401).json({ error: "Missing Bearer token" });
      return;
    }

    const accessToken = authHeader.slice(7);

    // Validate the user's JWT with Supabase
    const {
      data: { user },
      error,
    } = await supabase.auth.getUser(accessToken);

    if (error || !user) {
      res.status(401).json({ error: "Invalid token" });
      return;
    }

    // Create session
    const sessionId = uuidv4();
    const session: Session = {
      userId: user.id,
      email: user.email ?? "",
      expiry: Date.now() + SESSION_TTL_MS,
    };

    sessions.set(sessionId, session);

    // Set HTTP-only cookie
    res.cookie("kova_dav_session", sessionId, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "none",
      maxAge: SESSION_TTL_MS,
      path: "/",
    });

    res.json({
      sessionId,
      expiresAt: new Date(session.expiry).toISOString(),
    });
  } catch (err) {
    console.error("Session creation error:", err);
    res.status(500).json({ error: "Internal server error" });
  }
});

// ---------------------------------------------------------------------------
// OPTIONS /files/:documentId/:filename — WebDAV capability discovery
// ---------------------------------------------------------------------------

app.options("/files/:documentId/:filename", (_req: Request, res: Response): void => {
  res.set({
    Allow: "OPTIONS, GET, PUT, LOCK, UNLOCK, PROPFIND",
    DAV: "1, 2",
    "MS-Author-Via": "DAV",
    "Content-Length": "0",
  });
  res.status(200).end();
});

// ---------------------------------------------------------------------------
// GET /files/:documentId/:filename — Download file (Word requests the file)
// ---------------------------------------------------------------------------

app.get("/files/:documentId/:filename", async (req: Request, res: Response): Promise<void> => {
  try {
    const session = authenticateSession(req);
    const { documentId } = req.params;

    // Look up document metadata
    const { data: doc, error: docError } = await supabase.from("documents").select("*").eq("id", documentId).single();

    if (docError || !doc) {
      res.status(404).json({ error: "Document not found" });
      return;
    }

    // Download from Supabase Storage
    const { data: fileData, error: downloadError } = await supabase.storage
      .from(doc.storage_bucket ?? "documents")
      .download(doc.storage_path);

    if (downloadError || !fileData) {
      console.error("Download error:", downloadError);
      res.status(500).json({ error: "Failed to download file" });
      return;
    }

    const buffer = Buffer.from(await fileData.arrayBuffer());

    res.set({
      "Content-Type": doc.content_type ?? "application/octet-stream",
      "Content-Length": String(buffer.length),
      "Content-Disposition": `attachment; filename="${doc.file_name ?? req.params.filename}"`,
      "Last-Modified": new Date(doc.updated_at ?? doc.created_at).toUTCString(),
      ETag: `"${doc.version ?? 1}"`,
    });

    res.send(buffer);
  } catch (err: any) {
    if (err.message === "No session" || err.message === "Session expired") {
      res.status(401).json({ error: err.message });
      return;
    }
    console.error("GET file error:", err);
    res.status(500).json({ error: "Internal server error" });
  }
});

// ---------------------------------------------------------------------------
// PUT /files/:documentId/:filename — Save file back (Word saves)
// ---------------------------------------------------------------------------

app.put("/files/:documentId/:filename", async (req: Request, res: Response): Promise<void> => {
  try {
    const session = authenticateSession(req);
    const { documentId } = req.params;

    // Look up document metadata
    const { data: doc, error: docError } = await supabase.from("documents").select("*").eq("id", documentId).single();

    if (docError || !doc) {
      res.status(404).json({ error: "Document not found" });
      return;
    }

    const body: Buffer = Buffer.isBuffer(req.body) ? req.body : Buffer.from(req.body);

    // Upload to Supabase Storage (overwrite)
    const { error: uploadError } = await supabase.storage
      .from(doc.storage_bucket ?? "documents")
      .upload(doc.storage_path, body, {
        upsert: true,
        contentType: doc.content_type ?? "application/octet-stream",
      });

    if (uploadError) {
      console.error("Upload error:", uploadError);
      res.status(500).json({ error: "Failed to upload file" });
      return;
    }

    // Update document metadata
    const newVersion = (doc.version ?? 1) + 1;
    const { error: updateError } = await supabase
      .from("documents")
      .update({
        file_size: body.length,
        version: newVersion,
        updated_at: new Date().toISOString(),
        updated_by: session.userId,
      })
      .eq("id", documentId);

    if (updateError) {
      console.error("Metadata update error:", updateError);
    }

    // Log activity
    await supabase.from("document_activity").insert({
      document_id: documentId,
      user_id: session.userId,
      action: "edited",
      details: {
        source: "webdav",
        version: newVersion,
        file_size: body.length,
      },
    });

    res.status(204).end();
  } catch (err: any) {
    if (err.message === "No session" || err.message === "Session expired") {
      res.status(401).json({ error: err.message });
      return;
    }
    console.error("PUT file error:", err);
    res.status(500).json({ error: "Internal server error" });
  }
});

// ---------------------------------------------------------------------------
// LOCK /files/:documentId/:filename — Office locks file before editing
// ---------------------------------------------------------------------------

app.lock("/files/:documentId/:filename", async (req: Request, res: Response): Promise<void> => {
  try {
    const session = authenticateSession(req);
    const { documentId } = req.params;

    const lockToken = `opaquelocktoken:${uuidv4()}`;

    // Update document lock state
    const { error: lockError } = await supabase
      .from("documents")
      .update({
        is_locked: true,
        locked_by: session.userId,
        locked_at: new Date().toISOString(),
        lock_token: lockToken,
      })
      .eq("id", documentId);

    if (lockError) {
      console.error("Lock error:", lockError);
      res.status(500).json({ error: "Failed to lock document" });
      return;
    }

    // Log activity
    await supabase.from("document_activity").insert({
      document_id: documentId,
      user_id: session.userId,
      action: "locked",
      details: { source: "webdav", lock_token: lockToken },
    });

    // Return WebDAV lock discovery XML
    const lockXml = `<?xml version="1.0" encoding="utf-8"?>
<D:prop xmlns:D="DAV:">
  <D:lockdiscovery>
    <D:activelock>
      <D:locktype><D:write/></D:locktype>
      <D:lockscope><D:exclusive/></D:lockscope>
      <D:depth>0</D:depth>
      <D:owner>
        <D:href>${session.email}</D:href>
      </D:owner>
      <D:timeout>Second-28800</D:timeout>
      <D:locktoken>
        <D:href>${lockToken}</D:href>
      </D:locktoken>
    </D:activelock>
  </D:lockdiscovery>
</D:prop>`;

    res.set({
      "Content-Type": "application/xml; charset=utf-8",
      "Lock-Token": `<${lockToken}>`,
    });
    res.status(200).send(lockXml);
  } catch (err: any) {
    if (err.message === "No session" || err.message === "Session expired") {
      res.status(401).json({ error: err.message });
      return;
    }
    console.error("LOCK error:", err);
    res.status(500).json({ error: "Internal server error" });
  }
});

// ---------------------------------------------------------------------------
// UNLOCK /files/:documentId/:filename — Office unlocks file after editing
// ---------------------------------------------------------------------------

app.unlock("/files/:documentId/:filename", async (req: Request, res: Response): Promise<void> => {
  try {
    const session = authenticateSession(req);
    const { documentId } = req.params;

    // Clear lock fields
    const { error: unlockError } = await supabase
      .from("documents")
      .update({
        is_locked: false,
        locked_by: null,
        locked_at: null,
        lock_token: null,
      })
      .eq("id", documentId);

    if (unlockError) {
      console.error("Unlock error:", unlockError);
      res.status(500).json({ error: "Failed to unlock document" });
      return;
    }

    // Log activity
    await supabase.from("document_activity").insert({
      document_id: documentId,
      user_id: session.userId,
      action: "unlocked",
      details: { source: "webdav" },
    });

    res.status(204).end();
  } catch (err: any) {
    if (err.message === "No session" || err.message === "Session expired") {
      res.status(401).json({ error: err.message });
      return;
    }
    console.error("UNLOCK error:", err);
    res.status(500).json({ error: "Internal server error" });
  }
});

// ---------------------------------------------------------------------------
// PROPFIND /files/:documentId/:filename — WebDAV property query
// ---------------------------------------------------------------------------

app.propfind("/files/:documentId/:filename", async (req: Request, res: Response): Promise<void> => {
  try {
    const session = authenticateSession(req);
    const { documentId, filename } = req.params;

    // Look up document metadata
    const { data: doc, error: docError } = await supabase.from("documents").select("*").eq("id", documentId).single();

    if (docError || !doc) {
      res.status(404).json({ error: "Document not found" });
      return;
    }

    const lastModified = new Date(doc.updated_at ?? doc.created_at).toUTCString();
    const contentLength = doc.file_size ?? 0;
    const contentType = doc.content_type ?? "application/octet-stream";
    const etag = `"${doc.version ?? 1}"`;

    const propXml = `<?xml version="1.0" encoding="utf-8"?>
<D:multistatus xmlns:D="DAV:">
  <D:response>
    <D:href>/files/${documentId}/${encodeURIComponent(filename)}</D:href>
    <D:propstat>
      <D:prop>
        <D:displayname>${filename}</D:displayname>
        <D:getcontenttype>${contentType}</D:getcontenttype>
        <D:getcontentlength>${contentLength}</D:getcontentlength>
        <D:getlastmodified>${lastModified}</D:getlastmodified>
        <D:getetag>${etag}</D:getetag>
        <D:resourcetype/>
        <D:supportedlock>
          <D:lockentry>
            <D:lockscope><D:exclusive/></D:lockscope>
            <D:locktype><D:write/></D:locktype>
          </D:lockentry>
        </D:supportedlock>
      </D:prop>
      <D:status>HTTP/1.1 200 OK</D:status>
    </D:propstat>
  </D:response>
</D:multistatus>`;

    res.set({
      "Content-Type": "application/xml; charset=utf-8",
    });
    res.status(207).send(propXml);
  } catch (err: any) {
    if (err.message === "No session" || err.message === "Session expired") {
      res.status(401).json({ error: err.message });
      return;
    }
    console.error("PROPFIND error:", err);
    res.status(500).json({ error: "Internal server error" });
  }
});

// ---------------------------------------------------------------------------
// Health check
// ---------------------------------------------------------------------------

app.get("/health", (_req: Request, res: Response): void => {
  res.json({ status: "ok", sessions: sessions.size });
});

// ---------------------------------------------------------------------------
// Start server
// ---------------------------------------------------------------------------

app.listen(PORT, () => {
  console.log(`KOVA WebDAV proxy listening on port ${PORT}`);
  console.log(`CORS origin: ${CORS_ORIGIN}`);
  console.log(`Supabase URL: ${SUPABASE_URL}`);
});

// ---------------------------------------------------------------------------
// Periodic session cleanup (every 15 minutes)
// ---------------------------------------------------------------------------

setInterval(
  () => {
    const now = Date.now();
    let cleaned = 0;
    for (const [id, session] of sessions) {
      if (session.expiry < now) {
        sessions.delete(id);
        cleaned++;
      }
    }
    if (cleaned > 0) {
      console.log(`Cleaned ${cleaned} expired sessions. Active: ${sessions.size}`);
    }
  },
  15 * 60 * 1000,
);

// ---------------------------------------------------------------------------
// Extend Express Router to support WebDAV methods
// ---------------------------------------------------------------------------

declare module "express-serve-static-core" {
  interface IRouter {
    lock: express.IRouterMatcher<this>;
    unlock: express.IRouterMatcher<this>;
    propfind: express.IRouterMatcher<this>;
  }
}
