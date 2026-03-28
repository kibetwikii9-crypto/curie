"use client";

import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";

export default function AdsPage() {
  const [searchQuery, setSearchQuery] = useState("");
  const [copyHeadline, setCopyHeadline] = useState("");
  const [copyDescription, setCopyDescription] = useState("");
  const [copyCta, setCopyCta] = useState("");
  const [aiGenerating, setAiGenerating] = useState(false);

  // ------------------- QUERIES -------------------

  const { data: brandData } = useQuery({
    queryKey: ["brand"],
    queryFn: async () => {
      const res = await fetch("/api/brand");
      return res.json();
    },
  });

  const { data: insightsData } = useQuery({
    queryKey: ["insights"],
    queryFn: async () => {
      const res = await fetch("/api/insights");
      return res.json();
    },
  });

  const { data: brandAssetsData } = useQuery({
    queryKey: ["brand-assets"],
    queryFn: async () => {
      const res = await fetch("/api/brand-assets");
      return res.json();
    },
  });

  // ------------------- MUTATIONS (SINGLE CLEAN VERSION) -------------------

  const generateCopyMutation = useMutation({
    mutationFn: async (data: any) => {
      const res = await fetch("/api/generate-copy", {
        method: "POST",
        body: JSON.stringify(data),
      });
      return res.json();
    },
    onSuccess: (data) => {
      if (!data?.copy) {
        setAiGenerating(false);
        return;
      }

      switch (data.template_type) {
        case "headline":
          setCopyHeadline(data.copy);
          break;
        case "description":
          setCopyDescription(data.copy);
          break;
        case "cta":
          setCopyCta(data.copy);
          break;
      }

      setAiGenerating(false);
    },
  });

  const createAssetMutation = useMutation({
    mutationFn: async (payload: any) => {
      const res = await fetch("/api/assets", {
        method: "POST",
        body: JSON.stringify(payload),
      });
      return res.json();
    },
  });

  // ------------------- DATA PROCESSING -------------------

  const assetsData = brandAssetsData;

  const filteredAssets = (assetsData?.assets ?? []).filter((asset: any) => {
    if (searchQuery) {
      return asset.title
        .toLowerCase()
        .includes(searchQuery.toLowerCase());
    }
    return true;
  });

  // ------------------- UI -------------------

  return (
    <>
      {/* Header */}
      <div className="bg-gradient-to-r from-purple-500 via-pink-500 to-red-500 rounded-lg p-1 shadow-md">
        <div className="bg-white dark:bg-gray-900 rounded-lg p-6">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-2xl font-bold">Ads Dashboard</h1>
              <p className="text-gray-500">Manage your ads</p>
            </div>
          </div>
        </div>
      </div>

      {/* Search */}
      <input
        type="text"
        placeholder="Search assets..."
        value={searchQuery}
        onChange={(e) => setSearchQuery(e.target.value)}
        className="mt-4 p-2 border rounded w-full"
      />

      {/* Assets */}
      <div className="mt-6 grid grid-cols-1 md:grid-cols-3 gap-4">
        {filteredAssets.map((asset: any) => (
          <div key={asset.id} className="p-4 border rounded shadow-sm">
            <h2 className="font-semibold">{asset.title}</h2>
            <p className="text-sm text-gray-500">{asset.description}</p>
          </div>
        ))}
      </div>
    </>
  );
}
