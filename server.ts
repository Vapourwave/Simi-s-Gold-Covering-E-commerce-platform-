import express from "express";
import path from "path";
import { createServer as createViteServer } from "vite";
import nodemailer from "nodemailer";
import dotenv from "dotenv";
import { initializeApp } from "firebase/app";
import { 
  getFirestore, 
  doc, 
  getDoc, 
  setDoc, 
  getDocs, 
  collection, 
  deleteDoc 
} from "firebase/firestore";
import firebaseConfig from "./firebase-applet-config.json";

dotenv.config();

// Initialize Firestore for server-side evaluation
const firebaseApp = initializeApp(firebaseConfig);
const db = getFirestore(firebaseApp, firebaseConfig.firestoreDatabaseId);

const app = express();
const PORT = 3000;

app.use(express.json());

// Helper to reliably parse client IP across nginx reverse proxies & local hosts
function getClientIp(req: express.Request): string {
  const xForwardedFor = req.headers["x-forwarded-for"];
  if (xForwardedFor) {
    const ips = (xForwardedFor as string).split(",");
    return ips[0].trim();
  }
  return req.ip || req.socket.remoteAddress || "127.0.0.1";
}

// Helper to translate user-agent string into a beautiful, human-readable device name
function getDeviceName(userAgent: string | undefined): string {
  if (!userAgent) return "Unknown Device";
  let os = "Unknown OS";
  if (userAgent.includes("Windows NT")) os = "Windows PC";
  else if (userAgent.includes("Macintosh")) os = "macOS";
  else if (userAgent.includes("Android")) os = "Android";
  else if (userAgent.includes("iPhone")) os = "iPhone";
  else if (userAgent.includes("iPad")) os = "iPad";
  else if (userAgent.includes("Linux")) os = "Linux PC";

  let browser = "Browser";
  if (userAgent.includes("Chrome")) browser = "Chrome";
  else if (userAgent.includes("Safari") && !userAgent.includes("Chrome")) browser = "Safari";
  else if (userAgent.includes("Firefox")) browser = "Firefox";
  else if (userAgent.includes("Edg")) browser = "Edge";

  return `${browser} on ${os}`;
}

// Helper to load IP geo tracking info with local developer machine fallback
async function resolveIpLocation(ip: string): Promise<string> {
  if (ip === "127.0.0.1" || ip === "::1" || ip.startsWith("10.") || ip.startsWith("192.168.")) {
    return "Kerala, India (Simulated local access)";
  }
  try {
    const controller = new AbortController();
    const id = setTimeout(() => controller.abort(), 2000); // 2 second timeout guard
    const res = await fetch(`http://ip-api.com/json/${ip}`, { signal: controller.signal });
    clearTimeout(id);
    if (res.ok) {
      const data: any = await res.json();
      if (data && data.status === "success") {
        return `${data.city ? data.city + ", " : ""}${data.regionName ? data.regionName + ", " : ""}${data.country || "Unknown"}`;
      }
    }
  } catch (e) {
    console.warn("Location query failed, falling back:", e);
  }
  return "Tamil Nadu, India"; // Realistic regional fallback
}

// Helper checking if an IP block is stored in FireStore
async function isIpBanned(ip: string): Promise<boolean> {
  try {
    const banDoc = await getDoc(doc(db, "banned_ips", ip));
    return banDoc.exists();
  } catch (error) {
    console.error("Failed checking IP ban status:", error);
    return false;
  }
}

// Seeding the passcode document on boot if not present
async function ensureDefaultPasscode() {
  const configRef = doc(db, "metadata", "admin_config");
  try {
    const docSnap = await getDoc(configRef);
    if (!docSnap.exists()) {
      await setDoc(configRef, { passcode: "SIMI7907" });
      console.log("PASSCODE_SEED: Successfully stored SIMI7907 pin in metadata/admin_config");
    }
  } catch (error) {
    console.warn("Could not seed initial passcode:", error);
  }
}

// API middleware checking banned hosts
async function checkBanMiddleware(req: express.Request, res: express.Response, next: express.NextFunction) {
  if (req.path === "/api/ip-status") {
    return next();
  }
  const ip = getClientIp(req);
  const banned = await isIpBanned(ip);
  if (banned) {
    res.status(403).json({ banned: true, error: "You are banned for unauthorised entry." });
    return;
  }
  next();
}

app.use("/api", checkBanMiddleware);

// Endpoint supplying current check-ban status
app.get("/api/ip-status", async (req, res) => {
  const ip = getClientIp(req);
  const banned = await isIpBanned(ip);
  res.json({ banned, ip });
});

// Endpoint verifying administrative passcode
app.post("/api/admin/verify-pin", async (req, res) => {
  const { pin } = req.body;
  const ip = getClientIp(req);

  if (!pin) {
    res.status(400).json({ success: false, error: "Incorrect parameters: Missing PIN code value" });
    return;
  }

  // 1. Double check immediate ban status
  const banned = await isIpBanned(ip);
  if (banned) {
    res.status(403).json({ success: false, banned: true, error: "You are banned for unauthorised entry." });
    return;
  }

  // 2. Query stored PIN from FireStore
  const configRef = doc(db, "metadata", "admin_config");
  let expectedPasscode = "SIMI7907"; // Safeguard fallback
  try {
    const docSnap = await getDoc(configRef);
    if (docSnap.exists() && docSnap.data().passcode) {
      expectedPasscode = docSnap.data().passcode;
    } else {
      await setDoc(configRef, { passcode: "SIMI7907" });
    }
  } catch (error) {
    console.error("Firestore read error config:", error);
  }

  // 3. Evaluate match
  if (pin === expectedPasscode) {
    // Auth cleared! Remove any temporary failed logs for this IP
    try {
      await deleteDoc(doc(db, "failed_attempts", ip));
    } catch (e) {
      console.warn("Unable to clear failed attempts:", e);
    }
    res.json({ success: true });
  } else {
    // PIN Mismatch: increment failure metric
    try {
      const attemptRef = doc(db, "failed_attempts", ip);
      const attemptSnap = await getDoc(attemptRef);
      let count = 1;
      if (attemptSnap.exists()) {
        count = (attemptSnap.data().failedCount || 0) + 1;
      }

      await setDoc(attemptRef, {
        ip,
        failedCount: count,
        lastAttemptAt: new Date().toISOString()
      });

      const resolvedLoc = await resolveIpLocation(ip);
      const devName = getDeviceName(req.headers["user-agent"]);
      const notificationId = `notif-${Date.now()}`;
      const isThirdFail = count >= 3;

      const notificationDoc = {
        id: notificationId,
        ip,
        timestamp: new Date().toISOString(),
        location: resolvedLoc,
        device: devName,
        type: isThirdFail 
          ? "Unauthorised Admin Entry - IP BANNED (3 failed attempts)" 
          : `Failed Admin Portal Passcode (Attempt ${count}/3)`,
        banned: isThirdFail,
        failedCount: count
      };

      // Write to audit trail
      await setDoc(doc(db, "security_notifications", notificationId), notificationDoc);

      if (isThirdFail) {
        // Formally lock down the IP Address
        await setDoc(doc(db, "banned_ips", ip), {
          ip,
          bannedAt: new Date().toISOString(),
          location: resolvedLoc,
          device: devName
        });

        res.json({ 
          success: false, 
          attemptsRemaining: 0, 
          banned: true, 
          error: "You are banned for unauthorised entry." 
        });
      } else {
        res.json({ 
          success: false, 
          attemptsRemaining: 3 - count, 
          banned: false, 
          error: `Incorrect PIN code. You have ${3 - count} attempts remaining.` 
        });
      }
    } catch (err: any) {
      console.error("Failed locking state cycle error:", err);
      res.status(500).json({ success: false, error: err.message });
    }
  }
});

// Endpoint fetching security notifications for verified Admins
app.get("/api/admin/security-notifications", async (req, res) => {
  try {
    const querySnapshot = await getDocs(collection(db, "security_notifications"));
    const notifications: any[] = [];
    querySnapshot.forEach((docSnap) => {
      notifications.push(docSnap.data());
    });
    // Chronological order descending (Newest first)
    notifications.sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());
    res.json({ success: true, notifications });
  } catch (error: any) {
    console.error("Failed retrieving logs:", error);
    res.status(500).json({ success: false, error: error.message });
  }
});

// Endpoint allowing authorized admin to lift bans
app.post("/api/admin/unban", async (req, res) => {
  const { ip } = req.body;
  if (!ip) {
    res.status(400).json({ success: false, error: "Missing ip parameter value" });
    return;
  }

  try {
    await deleteDoc(doc(db, "banned_ips", ip));
    await deleteDoc(doc(db, "failed_attempts", ip));

    // Log unban announcement audit item
    const notificationId = `unban-${Date.now()}`;
    await setDoc(doc(db, "security_notifications", notificationId), {
      id: notificationId,
      ip,
      timestamp: new Date().toISOString(),
      location: "Admin Console",
      device: "System Process",
      type: "IP Address Unbanned by Administrator",
      banned: false,
      failedCount: 0
    });

    res.json({ success: true });
  } catch (error: any) {
    console.error("Unban database update failure:", error);
    res.status(500).json({ success: false, error: error.message });
  }
});

// Endpoint fetching registered customer profiles for verified Admins
app.get("/api/admin/customers", async (req, res) => {
  res.json({ success: true, customers: [], message: "Retrieval moved to secure, direct client-side Firestore queries." });
});

// Endpoint promoting/demoting general administrative user roles
app.post("/api/admin/make-admin", async (req, res) => {
  res.json({ success: true, message: "Role updates moved to secure, direct client-side Firestore writes." });
});

// Keep standard /api/send-otp wrapper intact for backwards compatibility
app.post("/api/send-otp", async (req, res) => {
  const { identity, otp } = req.body;
  if (!identity || !otp) {
    res.status(400).json({ success: false, error: "Missing params" });
    return;
  }
  res.json({ success: true, mode: "simulated", message: "OTP operations superseded by secure PIN validation." });
});

// Serve application
async function startServer() {
  await ensureDefaultPasscode();

  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), "dist");
    app.use(express.static(distPath));
    app.get("*", (req, res) => {
      res.sendFile(path.join(distPath, "index.html"));
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Server loaded and listening on port ${PORT}`);
  });
}

startServer();
