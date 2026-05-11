import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import { Wallet, Bell, Search, Shield, Activity, Plus, Zap } from "lucide-react";
import StatCard from "@/components/dashboard/StatCard";
import SkillCard from "@/components/dashboard/SkillCard";
import NarrativeDetector from "@/components/NarrativeDetector";
import MyAgents from "@/components/MyAgents";
import CreateAgentModal from "@/components/CreateAgentModal";
import AIQueryBox from "@/components/AIQueryBox";
import TrendingFeed from "@/components/TrendingFeed";
import PreloadedTokens from "@/components/PreloadedTokens";
import { useDashboardStats } from "@/hooks/useDashboardStats";
import { useSkillOrchestrator } from "@/hooks/useSkillOrchestrator";

export default function Dashboard() {
  const navigate = useNavigate();
  const [agentModalOpen, setAgentModalOpen] = useState(false);
  const { stats } = useDashboardStats();
  const { skills, runPipeline } = useSkillOrchestrator();

  return (
    <div className="space-y-4 sm:space-y-6">
      <div>
        <h1 className="font-heading text-xl sm:text-2xl font-bold text-foreground">Feed</h1>
        <p className="mt-1 text-xs sm:text-sm text-muted-foreground">Real-time smart money tracking & AI analysis — Powered by AVE Skills</p>
      </div>

      <AIQueryBox />

      <div className="grid grid-cols-2 gap-2 sm:gap-4 xl:grid-cols-4">
        <div className="cursor-pointer" onClick={() => navigate("/smart-money")}>
          <StatCard icon={Wallet} label="Tracked Wallets" value={stats.totalTrackedWallets.toLocaleString()} change="Live" changeType="positive" glowClass="neon-glow-purple" />
        </div>
        <div className="cursor-pointer" onClick={() => navigate("/alerts")}>
          <StatCard icon={Bell} label="Active Alerts" value={stats.activeAlerts.toString()} change="—" changeType="neutral" />
        </div>
        <div className="cursor-pointer" onClick={() => navigate("/analyzer?tab=history")}>
          <StatCard icon={Search} label="Tokens Analyzed" value={stats.tokensAnalyzed.toLocaleString()} change="Live" changeType="positive" />
        </div>
        <div className="cursor-pointer" onClick={() => navigate("/alerts?filter=risk")}>
          <StatCard icon={Shield} label="Risk Events" value={stats.riskEventsToday.toString()} change="—" changeType="neutral" />
        </div>
      </div>

      <PreloadedTokens onSelectToken={(sym) => navigate(`/analyzer?token=${sym}`)} />

      <NarrativeDetector />

      <TrendingFeed />

      <div>
        <div className="flex items-center justify-between px-1 mb-3">
          <div className="flex items-center gap-2">
            <Zap className="h-4 w-4 text-primary" />
            <h3 className="font-heading text-sm font-semibold text-foreground">ChainNova Skills</h3>
            <span className="text-[10px] text-muted-foreground bg-secondary px-2 py-0.5 rounded-full">AI Pipeline</span>
          </div>
          <button
            onClick={() => setAgentModalOpen(true)}
            className="flex items-center gap-1.5 rounded-lg bg-primary/10 px-3 py-1.5 text-xs font-medium text-primary hover:bg-primary/20 transition-colors"
          >
            <Plus className="h-3.5 w-3.5" />
            Create Agent
          </button>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-4 gap-2 sm:gap-3">
          {skills.map((skill, i) => (
            <SkillCard key={skill.skill} skill={skill} index={i} />
          ))}
        </div>
      </div>

      <MyAgents />

      <CreateAgentModal open={agentModalOpen} onClose={() => setAgentModalOpen(false)} />
    </div>
  );
}
