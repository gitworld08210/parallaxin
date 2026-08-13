import { supabase } from "@/integrations/supabase/client";
import { useEffect, useState, useCallback } from "react";

import { useAuth } from "@/contexts/AuthProvider";
import { uploadToCloudinary } from "@/lib/cloudinary";


export type VwApplication = {
  id: string;
  user_id: string;
  full_name: string;
  aadhaar_number: string;
  aadhaar_front_path: string | null;
  aadhaar_back_path: string | null;
  selfie_path: string | null;
  purpose: string;
  contact_phone: string | null;
  status: string;
  review_note: string | null;
  reviewed_at: string | null;
  created_at: string;
};

export type VwAccess = {
  user_id: string;
  is_active: boolean;
  daily_limit: number;
};

export type VwLog = {
  id: string;
  channel: string;
  to_number: string;
  body: string | null;
  status: string;
  error: string | null;
  created_at: string;
};

export const useVirtualWorld = () => {
  const { user } = useAuth();
  const [application, setApplication] = useState<VwApplication | null>(null);
  const [access, setAccess] = useState<VwAccess | null>(null);
  const [logs, setLogs] = useState<VwLog[]>([]);
  const [loading, setLoading] = useState(true);

  const refresh = useCallback(async () => {
    if (!user) {
      setApplication(null);
      setAccess(null);
      setLogs([]);
      setLoading(false);
      return;
    }
    
    try {
      const { collection, query, where, orderBy, limit, getDocs } = await import("firebase/firestore");
      const { db } = await import("@/lib/firebase");
      
      const appSnap = await getDocs(query(collection(db, "virtual_world_applications"), where("user_id", "==", user.id), orderBy("created_at", "desc"), limit(1)));
      const accessSnap = await getDocs(query(collection(db, "virtual_world_access"), where("user_id", "==", user.id), limit(1)));
      const logsSnap = await getDocs(query(collection(db, "virtual_world_logs"), where("user_id", "==", user.id), orderBy("created_at", "desc"), limit(30)));
      
      setApplication(appSnap.docs.length > 0 ? (appSnap.docs[0].data() as VwApplication) : null);
      setAccess(accessSnap.docs.length > 0 ? (accessSnap.docs[0].data() as VwAccess) : null);
      setLogs(logsSnap.docs.map(doc => ({ id: doc.id, ...doc.data() })) as VwLog[]);
    } catch (err) {
      console.error("Error fetching virtual world data:", err);
    } finally {
      setLoading(false);
    }
  }, [user?.id]);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  return { application, access, logs, loading, refresh };
};

export const uploadKycFile = async (userId: string, kind: string, file: File) => {
  return await uploadToCloudinary(file);

};
