import { useState, useEffect } from "react";
import { ExternalLink, TrendingUp, TrendingDown, Zap, BarChart3, DollarSign, Activity } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { getIndices, getHotNews, type SoSoNews } from "@/lib/sosovalue";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

interface SoSoValueWidgetProps {
  compact?: boolean;
}

function IndexCard({ ticker }: { ticker: string }) {
  const navigate = useNavigate();
  const displayName = ticker.replace("ssi", "").replace(/([A-Z])/g, " $1").trim();
  return (
    <div
      className="p-3 rounded-lg bg-secondary/50 border border-border/50 hover:border-border transition-colors cursor-pointer"
      onClick={() => navigate(`/analyzer?token=${ticker}`)}
    >
      <div className="text-xs font-medium text-foreground">{displayName}</div>
      <div className="text-[10px] text-muted-foreground mt-0.5">{ticker}</div>
    </div>
  );
}

function NewsItem({ news }: { news: SoSoNews }) {
  const time = new Date(parseInt(news.release_time)).toLocaleDateString();
  return (
    <a
      href={news.source_link}
      target="_blank"
      rel="noopener noreferrer"
      className="block p-2 rounded-lg hover:bg-secondary/50 transition-colors group"
    >
      <div className="text-xs font-medium line-clamp-2 group-hover:text-primary transition-colors">
        {news.title}
      </div>
      <div className="flex items-center gap-2 mt-1 text-[10px] text-muted-foreground">
        <span>{time}</span>
      </div>
    </a>
  );
}

export default function SoSoValueWidget({ compact = false }: SoSoValueWidgetProps) {
  const [indices, setIndices] = useState<string[]>([]);
  const [hotNews, setHotNews] = useState<SoSoNews[]>([]);
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();

  useEffect(() => {
    async function fetchData() {
      try {
        const [indicesData, newsData] = await Promise.all([
          getIndices().catch(() => []),
          getHotNews(compact ? 3 : 5).catch(() => []),
        ]);
        setIndices(indicesData.slice(0, 6));
        setHotNews(newsData.slice(0, compact ? 3 : 5));
      } catch (_) { } finally {
        setLoading(false);
      }
    }
    fetchData();
  }, [compact]);

  if (loading) {
    return (
      <Card className="border-border bg-card">
        <CardContent className="flex items-center justify-center py-6">
          <Activity className="h-4 w-4 animate-spin text-primary" />
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="border-t-2 border-t-primary bg-card">
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-primary/10">
              <BarChart3 className="h-3.5 w-3.5 text-primary" />
            </div>
            <div>
              <CardTitle className="text-sm font-semibold">SoSoValue Index</CardTitle>
              <p className="text-[10px] text-muted-foreground">Powered by SoSoValue API</p>
            </div>
          </div>
          <a
            href="https://sosovalue.io"
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center gap-1 text-[10px] text-muted-foreground hover:text-foreground transition-colors"
          >
            <ExternalLink className="h-3 w-3" />
            SoSoValue
          </a>
        </div>
      </CardHeader>

      <CardContent className="space-y-4">
        {!compact && indices.length > 0 && (
          <div>
            <div className="flex items-center gap-1 mb-2">
              <DollarSign className="h-3 w-3 text-muted-foreground" />
              <span className="text-[10px] text-muted-foreground font-medium">Spot Indexes</span>
            </div>
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
              {indices.map(idx => (
                <IndexCard key={idx} ticker={idx} />
              ))}
            </div>
          </div>
        )}

        {hotNews.length > 0 && (
          <div>
            <div className="flex items-center gap-1 mb-2">
              <Zap className="h-3 w-3 text-muted-foreground" />
              <span className="text-[10px] text-muted-foreground font-medium">Hot News</span>
            </div>
            <div className="space-y-1">
              {hotNews.map(n => (
                <NewsItem key={n.id} news={n} />
              ))}
            </div>
          </div>
        )}

        <button
          onClick={() => navigate("/ai?tab=signals")}
          className="w-full flex items-center justify-center gap-2 rounded-lg bg-primary/10 py-2 text-xs font-medium text-primary hover:bg-primary/20 transition-colors"
        >
          <Activity className="h-3 w-3" />
          View AI Signal Center
        </button>
      </CardContent>
    </Card>
  );
}
