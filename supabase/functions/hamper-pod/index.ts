import { createClient } from "npm:@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
};

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  try {
    const authHeader = req.headers.get("Authorization") ?? "";
    const token = authHeader.replace(/^Bearer\s+/i, "");
    if (!token) return json({ error: "Not authenticated" }, 401);

    const url = Deno.env.get("SUPABASE_URL")!;
    let secretKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "";
    const secretKeys = Deno.env.get("SUPABASE_SECRET_KEYS");
    if (!secretKey && secretKeys) {
      try { secretKey = JSON.parse(secretKeys)["default"] ?? ""; } catch { /* ignored */ }
    }
    if (!secretKey) throw new Error("Server storage credentials are unavailable");

    const admin = createClient(url, secretKey, { auth: { persistSession: false, autoRefreshToken: false } });
    const { data: userData, error: userError } = await admin.auth.getUser(token);
    const user = userData.user;
    if (userError || !user) return json({ error: "Not authenticated" }, 401);

    const { data: member, error: memberError } = await admin
      .from("hamper_app_users").select("user_id,active").eq("user_id", user.id).eq("active", true).maybeSingle();
    if (memberError || !member) return json({ error: "Not authorised for hamper application" }, 403);

    const bucket = "hamper-pods";

    if (req.method === "GET") {
      const requestUrl = new URL(req.url);
      const podId = requestUrl.searchParams.get("podId");
      if (!podId) return json({ error: "podId is required" }, 400);
      const { data: pod, error: podError } = await admin.from("hamper_pods")
        .select("id,order_id,storage_path,display_filename").eq("id", podId).single();
      if (podError || !pod) return json({ error: "POD not found" }, 404);
      const { data: signed, error: signedError } = await admin.storage.from(bucket).createSignedUrl(pod.storage_path, 300);
      if (signedError) throw signedError;
      return json({ url: signed.signedUrl, filename: pod.display_filename });
    }

    if (req.method !== "POST") return json({ error: "Method not allowed" }, 405);

    const form = await req.formData();
    const orderId = String(form.get("orderId") ?? "");
    const signedBy = String(form.get("signedBy") ?? "").trim();
    const podDate = String(form.get("podDate") ?? "").trim() || null;
    const file = form.get("file");
    if (!orderId) return json({ error: "orderId is required" }, 400);
    if (!(file instanceof File)) return json({ error: "POD file is required" }, 400);
    if (file.size <= 0) return json({ error: "POD file is empty" }, 400);
    if (file.size > 10 * 1024 * 1024) return json({ error: "POD file must be 10 MB or smaller" }, 400);

    const allowed = new Set(["application/pdf", "image/jpeg", "image/png"]);
    if (file.type && !allowed.has(file.type)) return json({ error: "POD must be a PDF, JPG or PNG" }, 400);

    const { data: order, error: orderError } = await admin.from("hamper_orders")
      .select("id,order_number,fulfilment_method,status").eq("id", orderId).single();
    if (orderError || !order) return json({ error: "Order not found" }, 404);

    const { data: buckets, error: bucketListError } = await admin.storage.listBuckets();
    if (bucketListError) throw bucketListError;
    if (!(buckets ?? []).some((b) => b.name === bucket)) {
      const { error: bucketError } = await admin.storage.createBucket(bucket, { public: false });
      if (bucketError && !String(bucketError.message).toLowerCase().includes("already")) throw bucketError;
    }

    const ext = (file.name.split(".").pop() || "pdf").replace(/[^a-z0-9]/gi, "").toLowerCase() || "pdf";
    const storagePath = `${orderId}/${crypto.randomUUID()}.${ext}`;
    const { error: uploadError } = await admin.storage.from(bucket).upload(storagePath, await file.arrayBuffer(), {
      contentType: file.type || "application/octet-stream", cacheControl: "3600", upsert: false,
    });
    if (uploadError) throw uploadError;

    const { data: pod, error: podError } = await admin.from("hamper_pods").insert({
      order_id: orderId, storage_path: storagePath,
      display_filename: file.name || `${order.order_number}-POD.${ext}`,
      uploaded_by_user_id: user.id, signed_by: signedBy || null, pod_date: podDate,
    }).select("id,display_filename,created_at").single();

    if (podError) {
      await admin.storage.from(bucket).remove([storagePath]);
      throw podError;
    }

    await admin.from("hamper_order_events").insert({
      order_id: orderId, event_type: "pod_uploaded",
      event_data: { pod_id: pod.id, filename: pod.display_filename }, created_by_user_id: user.id,
    });

    if (order.fulfilment_method === "green_acres" && order.status === "delivered") {
      await admin.from("hamper_orders").update({ status: "completed", completed_at: new Date().toISOString() }).eq("id", orderId);
      await admin.from("hamper_order_events").insert({
        order_id: orderId, event_type: "completed", event_data: { reason: "pod_uploaded" }, created_by_user_id: user.id,
      });
    }

    return json({ ok: true, pod });
  } catch (error) {
    console.error(error);
    return json({ error: error instanceof Error ? error.message : "Unexpected error" }, 500);
  }
});
