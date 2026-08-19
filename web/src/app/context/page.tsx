"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";

export default function ContextPage() {
  const router = useRouter();
  const [context, setContext] = useState<any>({
    targetRole: "",
    targetCompanies: "",
    preferredAnswerStyle: "",
    technicalStack: ""
  });
  const [userId, setUserId] = useState("");
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    const token = localStorage.getItem("token");
    if (!token) {
      router.push("/login");
      return;
    }
    
    try {
      const payload = JSON.parse(atob(token.split('.')[1]));
      setUserId(payload.userId);
      
      fetch(`http://localhost:4000/api/context/${payload.userId}`, {
        headers: { "Authorization": `Bearer ${token}` }
      })
      .then(res => res.json())
      .then(data => {
        if (data && !data.error) setContext(data);
      });
    } catch(e) {
      router.push("/login");
    }
  }, [router]);

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    try {
      const res = await fetch(`http://localhost:4000/api/context/${userId}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(context)
      });
      if (res.ok) {
        alert("Context saved successfully!");
      } else {
        alert("Failed to save context");
      }
    } catch (error) {
      console.error(error);
      alert("Network error");
    }
    setSaving(false);
  };

  return (
    <div className="min-h-screen bg-zinc-950 p-8 text-white">
      <div className="max-w-2xl mx-auto">
        <h1 className="text-3xl font-bold mb-2">My Profile & Context</h1>
        <p className="text-zinc-400 mb-8 pb-4 border-b border-zinc-800">
          HireSky AI uses this information to personalize your interview assistant.
        </p>
        
        <form onSubmit={handleSave} className="flex flex-col gap-6">
          <div>
            <label className="block text-sm font-semibold mb-2">Target Role</label>
            <input 
              type="text" 
              placeholder="e.g. Senior Backend Engineer" 
              className="w-full rounded-lg border border-zinc-700 bg-zinc-900 p-3 text-sm outline-none focus:border-blue-500"
              value={context.targetRole || ""} 
              onChange={e => setContext({...context, targetRole: e.target.value})}
            />
          </div>
          
          <div>
            <label className="block text-sm font-semibold mb-2">Technical Stack</label>
            <input 
              type="text" 
              placeholder="e.g. Node.js, TypeScript, PostgreSQL, AWS" 
              className="w-full rounded-lg border border-zinc-700 bg-zinc-900 p-3 text-sm outline-none focus:border-blue-500"
              value={context.technicalStack || ""} 
              onChange={e => setContext({...context, technicalStack: e.target.value})}
            />
          </div>

          <div>
            <label className="block text-sm font-semibold mb-2">Target Companies (Optional)</label>
            <input 
              type="text" 
              placeholder="e.g. Google, Stripe, Meta" 
              className="w-full rounded-lg border border-zinc-700 bg-zinc-900 p-3 text-sm outline-none focus:border-blue-500"
              value={context.targetCompanies || ""} 
              onChange={e => setContext({...context, targetCompanies: e.target.value})}
            />
          </div>

          <div>
            <label className="block text-sm font-semibold mb-2">Preferred AI Answer Style</label>
            <select 
              className="w-full rounded-lg border border-zinc-700 bg-zinc-900 p-3 text-sm outline-none focus:border-blue-500"
              value={context.preferredAnswerStyle || ""}
              onChange={e => setContext({...context, preferredAnswerStyle: e.target.value})}
            >
              <option value="">Select a style</option>
              <option value="concise">Concise & Direct</option>
              <option value="detailed">Detailed with Examples</option>
              <option value="production">Production-Focused (Tradeoffs, Scalability)</option>
              <option value="academic">Academic & Theoretical</option>
            </select>
          </div>

          <button 
            type="submit" 
            disabled={saving}
            className="mt-4 rounded-xl bg-blue-600 py-3 font-semibold text-white transition hover:bg-blue-500 disabled:opacity-50"
          >
            {saving ? "Saving..." : "Save Context"}
          </button>
        </form>
      </div>
    </div>
  );
}
